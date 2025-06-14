
# 分表分库篇

## 为什么需要分表分库

> 总体来说：性能出现瓶颈，并且其他优化手段无法很好的解决问题。

- 单表出现瓶颈：
  - 单表数据量较大，导致读写性能较慢
- 单库出现瓶颈
  - CPU压力过大(busy，load过高)，导致读写性能较慢
  - 内存不足(缓存池命中率较低、磁盘读写IOPS过高)，导致读写性能较慢
  - 磁盘空间不足，导致无法正常写入数据
  - 网络带宽不足，导致读写性能较慢

## 数据量超过多少应该分库分表？

- 看对应业务复杂情况，如果是表字段较为简单，即使数据量超过亿级，整体读写性能也较好，不用分表；
- 如果表比较复杂，可能即使数据量超过百万，读写性能就达到瓶颈。

## 如何选择分库分表

- 只分表：
  - 单表数据量较大，单表读写性能出现瓶颈
  - 数据量太大的话，SQL 的查询就会变慢（2000w级别数据，需要3次IO，层数越多越慢）

- 只分库：
  - 就是一个数据库分成多个数据库，部署到不同机器
  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529132429310.png" alt="image-20250529132429310" style="zoom:50%;" />
  - 业务量剧增，MySQL 单机磁盘容量会撑爆，拆成多个数据库，磁盘使用率大大降低
  - 数据库连接是有限的。在高并发的场景下，大量请求访问数据库，MySQL 单机是扛不住的，将单个数据库拆成多个库（订单库、用户库、商品库），以分担读写压力

- 分库分表
  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529132500314.png" alt="image-20250529132500314" style="zoom:50%;" />
  - 单表数据量较大，单表读写性能出现瓶颈；
  - 数据库(读）写压力较大，数据库出现存储性能瓶颈

## 分表

- 垂直分表
  - 以字段为依据，按照字段的活跃性，将表中字段拆到不同的表(主表和扩展表)中
  - 拆字段
- 水平分表
  - 结构相同，数据不同
  - 比如根据时间

## 分库

- 垂直分库
  - 以表为依据，按照业务归属不同，将不同的表拆分到不同的库中
  - 拆成用户库，平台库等
- 水平分库
  - 结构相同，数据不同
  - 根据时间

## 挑战点

### 水平拆分策略

水分拆分需要考虑的因素有三个：

- 查询操作中的 **路由** 因素；
- 插入操作中的 **热点分散** 因素；
- 技术方案的 **复杂度** 因素。

并且，这三种因素间是一种零和关系，两方所得必为一方所失，这无疑为选择和取舍增加了难度。

基于如上三种因素考虑，共有四种水平拆分策略，即：`Range 拆分`、`Hash 取模拆分`、`Hash 取模 + Range 拆分` 和 `Hash 取模 + 映射表` 拆分。

#### Range 拆分

最常见的就是以日期作为 `Sharding Key`（分片键），进行 `Range` 拆分。

图例如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529132642146.png" alt="image-20250529132642146" style="zoom:90%;" />

- 优点：非常适合于存储 **冷热** 分明的业务数据，几乎所有查询操作全部在热数据表中完成，而冷数据则是以半归档的方式进行存储。
- 缺点：热点数据全部集中在一张表中，在高并发的场景下容易产生性能瓶颈。

#### Hash 取模拆分

最常见的就是以 `ID` 作为 `Sharding Key`，通过 `取模` 的方式拆分，如：主键 ID、用户 ID、商家 ID、课程 ID 等。

图例如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529132731776.png" alt="image-20250529132731776" style="zoom:90%;" />

- 优点：无论是分库还是分表，热点数据都已经全部散开，可以从容应对高并发的场景，不会产生性能瓶颈。
- 缺点：对非 `Sharding Key` 的查询操作不友好，只能将所有库表全部查询一遍，然后再进行多路归并的方式返回结果。而且扩容时，还需要 `数据迁移`

#### Hash 取模 + Range 拆分

最常见的就是：先以 `ID` 作为 `Sharding Key`，通过取模的方式进行首次拆分；然后再以日期作为 `Sharding Key`，进行 `Range` 二次拆分。其实就是上述两种方案的的结合体。

图例如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133021664.png" alt="image-20250529133021664" style="zoom:90%;" />

优点：

- 取模拆分的方式，无论是分库还是分表，热点数据都已经全部散开，可以从容应对高并发的场景，不会产生性能瓶颈。
- `Range` 拆分的方式，使单表数据量级得到很好的控制，而不是随着时间的推移，表中的数据越累积越多。

缺点：

- 对非 `Sharding Key` 的查询操作不友好，只能将所有库表全部查询一遍，然后再进行 `多路归并` 的方式返回结果。
- 相较而言，方案过于复杂。

#### Hash 取模 + 映射表拆分

最常见的就是以 `ID` 作为 `Sharding Key`，通过 `取模` 的方式拆分，然后再通过 `映射表` 的方式进行辅助查询。

图例如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133133108.png" alt="image-20250529133133108" style="zoom:90%;" />

优点：

- 无论是分库还是分表，热点数据都已经全部散开，可以从容应对高并发的场景，不会产生性能瓶颈。
- 通过映射表辅助的方式，可以灵活地构建一对多的查询关系，并且只需要根据映射表关系查询目标库表即可，不需要所有库表全部查询一遍。

缺点：

- 对非 `Sharding Key` 的查询操作不友好，只能将所有库表全部查询一遍，然后再进行 `多路归并` 的方式返回结果。
- 方案过于复杂，且映射表数据量过大，也需要考虑分库分表的可能性。

### 容量预估的前瞻性

我们希望把分库分表的策略一次性做到位，让其至少可承载未来五年的数据量级，而不是由于容量预估不足，导致时隔一年半载地再重来一遍。

因此，在容量预估上，我们不能局限在线性思维中，认为今年业务主表的数据量是 5000 万，那么明年还是 5000 万，而是要把业务增量也考虑进去，这样才算是具备前瞻性的容量预估。

## 大型电商订单数据，分表分库案例

### 背景

某大型电商平台的业务增长迅猛，日订单量已经由两个月前的 5 万单增长到了 30 万单，订单表中的数据已经达到了 6000 多万。按照业务团队的增量计算方式，三个月后日订单量会达到 50 万。

因此，给订单表制定分库分表方案，则成为当前技术团队最重要且紧急的事情。

由于订单数据并没有非常明显的冷热字段和大字段，所以并不需要考虑垂直拆分，只需要考虑进行水平拆分即可。

按照未来 5 年日订单稳定在 100 万来预估，一年有将近 4 亿的订单数据，5 年是 20 亿，正好可以分为 10 个库，每个库有 10 张表，单表在 5 年后达到 2000 万数据。

### 1. 订单 ID 作为 Sharding Key

通过 `订单 ID` 作为 `Sharding Key` 进行分库分表，其中，以 `订单 ID` 的最后一位数字 `取模` 进行分库，以倒数第二位 `取模` 进行分表。

如下图所示：

![image-20250529133236115](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133236115.png)

这个方案的优点是，按照 `订单 ID` 进行分库分表，每个库表中的数据会分散得非常均匀，且热点数据全部散开，不会出现一个数据库读写压力过大导致性能瓶颈，其他数据库却出现资源闲置的情况。

但这个方案很快就被否定了，因为根据订单中心的请求日志分析，大概 55% 的订单查询请求都是根据 `用户 ID`（user_id）进行查询的，而根据 `订单 ID` 进行查询的请求只有 20%。

相当于如果根据订单 ID 进行分表，那么 55% 的根据用户 ID 进行查询的请求需要进行跨库查询，这显然是不行的。

### 2. 用户 ID 作为 Sharding Key

既然根据 `用户 ID` 进行查询的请求比例这么高，那索性换个思路，通过 `用户 ID` 作为 `Sharding Key` 进行分库分表吧。其中，以 `用户 ID`  的最后一位数字 `取模` 进行分库，以倒数第二位 `取模` 进行分表。

如下图所示：

![image-20250529133340430](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133340430.png)

这个方案的优点是，通过 `用户 ID` 作为 `Sharding Key` 进行分库分表，55% 根据用户 ID 进行查询的请求不需要进行跨库查询了。

并且，在用户量级足够多的情况下，每个库表中的数据仍然会分散得非常均匀，且热点数据全部散开，不会出现一个数据库读写压力过大导致性能瓶颈，其他数据库却出现资源闲置的情况。

但问题的影响比例只是被缩小了一些，却依然是存在的，那就是还会有 45% 的查询请求需要跨库查询。

有的同事建议，直接用多堆从库的方式去硬扛剩下的 45% 流量，但立即被否定了。因为无论是查询性能角度，还是硬件成本角度，都存在问题。

我们思考一下，有没有一种方案，既支持以不跨库的方式根据 `用户 ID` 进行查询，也支持以不跨库的方式根据 `订单 ID` 进行查询呢？

### 3. 用户 ID 作为 Sharding Key + 映射表

当然是有的！

“用户 ID 作为 `Sharding Key` + `映射表`”，就是“不跨库根据用户 ID 查询 + 不跨库根据订单 ID 查询”的一种方案。

当我们在创建订单的时候，同时将 `订单 ID` 和 `用户 ID` 的对应关系写入 `映射表` 中，这样根据 `订单 ID` 进行查询的时候，就可以先到 `映射表` 中查询到用户 ID，再通过 `用户 ID` + `订单 ID` 查询到对应的订单数据。

![image-20250529133536783](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133536783.png)

这个技术方案的优点是简单清晰，开发工作量小，缺点是需要多进行一次映射表查询，且映射表的存储也是一种开销。另外，映射表数据量过大，也需要进行分库分表。

### 4. 用户 ID 作为 Sharding Key + 路由键

“`用户 ID` 作为 `Sharding Key` + `路由键`”，则是“不跨库根据用户 ID 查询 + 不跨库根据订单 ID 查询”的另一种方案。

这种方案的实现方式是，将路由键作为 `订单 ID` 的一部分，这样就不需要存储 `订单 ID` 和 `用户 ID` 对应关系的映射表了。

按照我们的这个业务场景，`订单 ID` 的算法如下：

- > 订单 ID = 雪花算法生成的 ID + 用户 ID 的后两位

如上文所述，我们“通过 `用户 ID` 作为` Sharding Key`” 分了 10 个库，每个库有 10 张表，算起来正好是 100 张表，后两位（00～99）恰好够了。

![image-20250529133705649](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133705649.png)

> 需要注意的是，以这种方式生成的 `订单 ID`，MySQL 中的 bigint 数据类型已经存不下了，需要用 decimal(21) 来进行存储。

BTW：方案 3、4 确实有效地解决了“不跨库根据用户 ID 查询 + 不跨库根据订单 ID 查询”的问题，还有 20% 的订单查询请求是根据 `商家 ID`（merchant_id）进行查询的，这该如何解决呢？

### 5. 多 Sharding Key 分库分表

阿里的订单中心是采用三个 `Sharding Key`（订单 ID、用户 ID、商家 ID）分库分表实现的，且每个 `Sharding Key` 所对应的库表都是订单的全量数据。

![image-20250529133931275](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133931275.png)

![image-20250529133940326](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133940326.png)

![image-20250529133949240](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529133949240.png)

这种方式的优点是，不像上文所讲的映射表那样，需要进行二次查询，在性能上是有所提升的。缺点则是，需要耗费更多的存储空间进行冗余数据存储。

另外，这种方案如果通过程序控制，进行多个库的数据写入和修改就不合适了，最好通过 `Binlog` 同步工具 `Canal` 或 `DataBus` 去进行多个库的数据同步。

![image-20250529134012698](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529134012698.png)

### 6. 多 Sharding Key 分库分表 + ElasticSearch

剩下 5% 的订单查询请求是最难解决了，比如：在客服中心系统中，客服人员在进行订单查询的时候，查询项会有十几个，各种查询维度组合多种多样，甚至还需要通过产品关键字进行模糊查询。

这种情况，别说是已经分库分表了，就算在单表中加联合索引都未必能解决问题。这时，我们的订单系统就需要引入 ElasticSearch 了。

相比较于 MySQL 的 B+ Tree 索引，ElasticSearch 的分词器 + 倒排索引机制，更加适合多维复杂查询和全文检索关键字的场景。

![image-20250529134035194](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529134035194.png)

最终，技术团队选择了方案 6——“`多 Sharding Key 分库分表` + `ElasticSearch` ”，作为未来五年订单数据的分库分表方案，也是订单中心系统最为核心的架构设计。

## 十亿级商品数据，分库分表核心流程详解

### 目标评估

- 评估：拆成几个库、几个表
- 目标：读写能力提升2倍、负载降低30%，容量要支持未来3年的发展
- 举例：当前2亿，3年后评估为10亿。分8个表？ 分16个库？
- 解答：一个合理的答案，128个表，16个库。按128个表算，拆分完单表156万，3年后为781万

### 切分策略

#### 范围切分

- 优点：天然水平扩展；单表大小可控
- 缺点：热点数据一般为新增数据，存在明显的写偏移
- 适用场景：数据归档

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529134149876.png" alt="image-20250529134149876" style="zoom:60%;" />

#### 中间表映射

- 优点：灵活；
- 缺点：引入了额外的单点，增加了流程复杂度。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529134204573.png" alt="image-20250529134204573" style="zoom:60%;" />

#### hash切分

- 优点：数据分片比较均匀，不容易出现热点和并发访问的瓶颈；
- 缺点：后续扩容需要迁移数据、存在跨节点查询等问题；
- 适用场景：大部分场景下都能适用。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529134216820.png" alt="image-20250529134216820" style="zoom:60%;" />

### 资源准备、代码改造

- 代码改造：
  - 写入：单写老库、双写、单写新库
  - 读取：读老、读新、部分读老部分读新
  - 灰度：指定门店灰度、比例灰度

- 常见的双写方案
  - 作用：保证增量数据在新库和老库都存在
  - 方案：
    - 同步双写：同步写新库和老库
    - 异步双写：写老库，监听binlog 异步同步到新表
    - 中间件同步工具：通过一定的规则将数据同步到目标库表

- 实现方案：
  - 底层通过AOP方式实现，不会修改全部写逻辑

### 数据一致性校验、优化、补偿

- 作用：确保新库数据正确，达到切读标准、检查是否存在改造遗漏点
- 方案：增量数据校验、全量数据校验、人工抽检
- 核心流程：
  - 读取老库数据
  - 读取新库数据
  - 比较新老库数据，一致则继续比较下一条数据

- 不一致则进行补偿：
  - 新库存在，老库不存在：新库删除数据
  - 新库不存在，老库存在：新库增加数据
  - 新库存在，老库存在：比较所有字段，不一致则将新库更新为老库数据

### 灰度切读

- 作用：开始将读流量切到新库
- 原则：
  - 有问题及时切回老库
  - 灰度放量先慢后快，每次放量观察一段时间
  - 支持灵活的规则：门店维度灰度、百分比灰度

### 反向双写

双写切新库单写这一步不可逆的主要原因是，一旦切为新库单写，旧库的数据就和新库不一致了，这时候就没法再切回旧库了。

所以，问题的关键是，切到新库单写后，需要保证旧库的数据和新库保持同步。那我们的双写就要增加一种过渡状态：就是从双写以旧库为准，过渡到双写以新库为准。然后把比对和补偿程序反过来，用新库的数据补偿旧库的数据。这样就可以做到，一旦出问题，再切回到旧库上了。

### 真正切换

- 停写老库 一到二周后
- 原则：确认老库数据源全部迁移后，停写老库
- 至此，核心拆分流程结束，后续逐步将老数据库资源逐渐下线。

## 遇到的问题

### 分布式id：分库分表后，保证id的唯一性(要保证单调递增)

- 解决方案1：UUID
- 优点：
  - 本地生成，性能高
- 缺点：
  - 更占用存储空间，一般为长度36的字符串
  - 不适合作为MySQL主键
    - 无序性会导致磁盘随机IO、叶分裂等问题
    - 普通索引需要存储主键值，导致B+树“变高”，IO次数变多
  - 基于MAC地址生成的算法可能导致MAC地址泄漏

- 方案2：雪花算法

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250529134234756.png" alt="image-20250529134234756" style="zoom:50%;" />

- 方案3：设置数据库自增起始值和步长，不同节点 id 交叉增长
- 方案4：第三方中间件，redis incr

### 分布式事务

### 跨库join / 分页查询问题

- 方案1：本地实现
  - 跨节点 Join 的问题

- 可以分两次查询实现

- 跨节点的聚合函数问题
  - count,order by,group by
  - 分别在各个节点上得到结果后在应用程序端进行合并

- 方案2：使用搜索引擎支持ES
  - 数据冗余到ES，使用ES支持复杂查询
  - 核心流程：
    - 使用ES查询出关键字段，例如：店铺id和商品id
    - 再使用关键字段去数据库查询完整数据
  - 作用类似二级索引
  - 注意点
    - ES只存储需要搜索的字段
