
# 主从篇

## 主从复制架构概述

主从架构中必须有一个主节点，以及一个或多个从节点，所有的数据都会先写入到主，接着其他从节点会复制主节点上的增量数据，从而保证数据的最终一致性，使用主从复制方案，可以进一步提升数据库的可用性和性能：

- ① 在主节点宕机或故障的情况下，从节点能自动切换成主节点的身份，从而继续对外提供服务。
- ② 提供数据备份的功能，当主节点的数据发生损坏时，从节点中依旧保存着完整数据。
- ③ 可以基于主从实现读写分离，主节点负责处理写请求，从节点处理读请求，进一步提升性能。

但无论任何技术栈的主从架构，都会存在致命硬伤，同时也会存在些许问题需要解决：

- ① 硬伤：木桶效应，一个主从集群中所有节点的容量，受限于存储容量最低的哪台服务器。
- ② 数据一致性问题：由于同步复制数据的过程是基于网络传输完成的，所以存储延迟性。
- ③ 脑裂问题：从节点会通过心跳机制，发送网络包来判断主机是否存活，网络故障情况下会产生多主。

上述提到的三个问题中，第一个问题只能靠加大服务器的硬件配置解决，第二个问题相对来说已经有了很好的解决方案（后续讲解），第三个问题则是部署方式决定的，如果将所有节点都部署在同一网段，基本上不会出现集群脑裂问题。

## 主从复制技术

`MySQL` 本身提供了主从复制的技术支持，所以无需通过第三方技术来协助实现，还记得在[《MySQL日志篇》](https://juejin.cn/post/7157956679932313608#heading-11)中聊到的 `Bin-log` 二进制/变更日志嘛？

`MySQL` 数据复制的过程就是基于该日志完成的，但 `MySQL` 复制数据的过程并非同步，而是异步的方式。

### MySQL数据同步的原理

`MySQL `是基于它自身的 `Bin-log` 日志来完成数据的异步复制，因为 `Bin-log` 日志中会记录所有对数据库产生变更的语句，包括 `DML` 数据变更和 `DDL` 结构变更语句，数据的同步过程如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250528180932022.png" alt="image-20250528180932022" style="zoom:70%;" />

- ① 客户端将写入数据的需求交给主节点，主节点先向自身写入数据。
- ② 数据写入完成后，紧接着会再去记录一份 `Bin-log` 二进制日志。
- ③ 配置主从架构后，主节点上会创建一条专门监听 `Bin-log` 日志的 `log dump` 线程。
- ④ 当 `log dump` 线程监听到日志发生变更时，会通知从节点来拉取数据。
- ⑤ 从节点会有专门的 `I/O` 线程用于等待主节点的通知，当收到通知时会去请求一定范围的数据。
- ⑥ 当从节点在主节点上请求到一定数据后，接着会将得到的数据写入到 `relay-log` 中继日志。
- ⑦ 从节点上也会有专门负责监听 `relay-log` 变更的 `SQL` 线程，当日志出现变更时会开始工作。
- ⑧ 中继日志出现变更后，接着会从中读取日志记录，然后解析日志并将数据写入到自身磁盘中。

### 从节点拉取的数据到底是什么格式？

这里要根据主节点的`Bin-log`日志格式来决定，在《日志篇》中详细聊过这个日志，它会有三种格式，如下：

- `Statment`：记录每一条会对数据库产生变更操作的`SQL`语句（默认格式）。
- `Row`：记录具体出现变更的数据（也会包含数据所在的分区以及所位于的数据页）。
- `Mixed`：`Statment、Row `的结合版，可复制的记录`SQL`语句，不可复制的记录具体数据。

一般在搭建主从架构时，最好将 `Bin-log` 日志调整为 `Mixed` 格式。

## 主从延迟

### 计算公式

> 主备延迟时间计算公式： t3 - t1

- 主库完成一个事务，写入 `binlog`。`binlog` 中有一个时间字段，用于记录主库写入的时间【时刻 t1】
- `binlog` 同步给备库，备库接收并存储到中继日志 【时刻 t2】
- 备库 SQL 执行线程执行 `binlog`，数据写入到备库表中 【时刻 t3】

### 排查方法

- `show slave status`
  - `seconds_behind_master`，表示当前备库延迟了多少秒
- 比较主从库的文件点位

#### 延迟原因

- 备库机器配置差
  - 升级备库的机器配置
- 备库干私活
- 大事务
  - 分批删除，减少大事务

#### 解决方案

- 对数据的 实时性 要求不是很高，比如：大 V 有千万粉丝，发布一条微博，粉丝晚几秒钟收到这条信息，并不会有特别大的影响。这时，可以走 从库。
- 如果对数据的 实时性 要求非常高，比如金融类业务。我们可以在客户端代码标记下，让查询强制走主库
- 可以考虑引入缓存，更新主库后同步写入缓存，保证缓存的及时性
- 减少大事务的执行，尽量控制数量，分批执行
- 为从库增加浮动 IP，并通过脚本检测从库的延迟，延迟大于指定阈值时，将浮动 IP 切换至 Master 库，追平后再切换回从库



