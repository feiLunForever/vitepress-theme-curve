
# MySQL之事务篇

## 事务的ACID原则

`ACID`主要涵盖四条原则，即：

- 原子性（A/Atomicity）

  - > 组成一个事务的一组 `SQL` 要么全部执行成功，要么全部执行失败

  - 使用 `undo log` 实现，如果事务执行出错或者执行了 `rollback`，通过 `undo log` 恢复

- 一致性（C/Consistency）

  - > 一个事务中的所有操作，要么一起改变数据库中的数据，要么都不改变

  - 通过其他三个特性实现

- 隔离性（I/Isolation）

  - > 多个事务之间都是独立的

  - 通过 `锁` 以及 `MVCC` 实现

- 持久性（D/Durability）

  - > 一个事务一旦被提交，它会保持永久性，也就是持久化

  - `redo log` 实现持久化，系统崩了，通过 `redo log` 恢复

### MySQL事务的隔离机制

在`MySQL`中，事务隔离机制分为了四个级别：

- ①`Read uncommitted/RU`：读未提交
- ②`Read committed/RC`：读已提交
- ③`Repeatable read/RR`：可重复读
- ④`Serializable`：序列化/串行化

上述四个级别，越靠后并发控制度越高，也就是在多线程并发操作的情况下，出现问题的几率越小，但对应的也性能越差，`MySQL`的事务隔离级别，默认为第三级别：`Repeatable read`可重复读。

#### 脏写、脏读、幻读、不可重复读问题

- 脏写
  - 是多个事务一起操作同一条数据，就会造成数据覆盖，或者主键冲突的问题，这个问题也被称之为更新丢失问题
- 脏读
  - 事务 `A` 正在访问数据，读到了事务 `B` 未提交事务的数据
  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/10b513008ea35ee880c592a88adcb12f.png" alt="图片" style="zoom:50%;" />
- 不可重复读
  - 同一事务内，多次读取一条记录发现其中某些列的`值被修改`
  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/f5b4f8f0c0adcf044b34c1f300a95abf.png" alt="图片" style="zoom:50%;" />
- 幻读
  - 同一事务内，多次读取发现记录`变多`或者`变少`了
  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/d19a1019dc35dfe8cfe7fbff8cd97e31.png" alt="图片" style="zoom:70%;" />

#### 四大隔离级别

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/4e98ea2e60923b969790898565b4d643.png" alt="图片" style="zoom:60%;" />

- `RU` 读未提交（READ-UNCOMMITTE）

  - 读操作不加锁，写操作加 `X`（排他锁）

  - 由于写使用 `X record` 则不会产生脏写，会产生 脏读、不可重复读、幻读

- `RC` 读已提交（READ-COMMITTED）

  - 读使用 `mvcc`（每次读生成 `read view` 快照，然后依据这个 `快照` 去选择一个可读的数据 `版本` ），写使用 `X record`（排他锁）

  - 会有 不可重复读、幻读

- `RR` 可重复读（REPEATABLE-READ）

  - 读使用 `mvcc`（第一次读生成 `read view`），写使用`X next key`（临键锁，即读操作执行时，不允许其他事务改动数据）

  - 会有 幻读（基本解决）

- 串行化（SERIALIZABLE）

  - 所有写操作加 `临键锁`（具备互斥特性），所有读操作加 `共享锁` 。

  - 由于所有写操作在执行时，都会获取临键锁，所以写-写、读-写、写-读这类并发场景都会互斥，而由于读操作加的是共享锁，因此在Serializable级别中，只有读-读场景可以并发执行。

  - 不会产生脏写、脏读、不可重复读、幻读

> 虽然 `DBMS` 中要求在序列化级别再解决幻读问题，但在MySQL中，`RR` 级别中就已经解决了幻读问题，因此 MySQ L中可以将 `RR` 级别视为最高级别，而Serializable 级别几乎用不到，因为序列化级别中解决的问题，在 `RR` 级别中基本上已经解决了，再将 MySQL 调到 Serializable 级别反而会降低性能。
>
> 当然，`RR` 级别下有些极端的情况，依旧会出现幻读问题，但线上100%不会出现。

#### 小争议：MVCC机制是否彻底解决了幻读问题呢？

MVCC并没有彻底解决幻读问题，在一种奇葩的情况下依旧会出现问题。

```sql
-- 开启一个事务T1
begin;
-- 查询表中 ID>10 的数据
SELECT * FROM `zz_users` where user_id > 10;
```

因为用户表中不存在ID>10的数据，所以T1查询时没有结果。

```sql
-- 再开启一个事务T2
begin;
-- 向表中插入一条 ID=11 的数据
INSERT INTO `zz_users` VALUES(11,"墨竹","男","2222","2022-10-07 23:24:36");
-- 提交事务T2
commit;
```

此时T2事务插入一条ID=11的数据并提交，此时再回到T1事务中：

```sql
-- 在T1事务中，再次查询表中 ID>10 的数据
SELECT * FROM `zz_users` where user_id > 10;
```

结果很明显，依旧未查询到ID>10的数据，因为这里是通过第一次生成的快照文件在读，所以读不到T2新增的“幻影数据”，似乎没问题对嘛？

```sql
-- 在T1事务中，对 ID=11 的数据进行修改
UPDATE `zz_users` SET `password` = "1111" where `user_id` = 11;

-- 在T1事务中，再次查询表中 ID>10 的数据
SELECT * FROM `zz_users` where user_id > 10;
+---------+-----------+----------+----------+---------------------+
| user_id | user_name | user_sex | password | register_time       |
+---------+-----------+----------+----------+---------------------+
|      11 | 墨竹      | 男       | 1111     | 2022-10-07 23:24:36 |
+---------+-----------+----------+----------+---------------------+
```

嗯？！？？此时会发现，T1事务中又能查询到ID=11的这条幻影记录了，这是啥原因导致的呢？因为我们在T1中修改了ID=11的数据，在[《MVCC机制原理剖析》](https://juejin.cn/post/7155359629050904584)中曾讲过MVCC通过快照检索数据的过程，这里T1根据原本的快照文件检索数据时，因为发现ID=11这条数据上的隐藏列trx_id是自己，因此就能看到这条幻影数据了。

> 实际上这个问题有点四不像，可以理解成幻读问题，也可以理解成是不可重复读问题，总之不管怎么说，就是MVCC机制存在些许问题！但这种情况线下一般不会发生，毕竟不同事务之间都是互不相知的，在一个事务中，不可能会去主动修改一条“不存在”的记录。

#### 实现原理

MySQL 的事务机制是基于 `日志` 实现的。

- `start transaction`; 关闭自动提交机制
- 生成 `redo log`（prepare状态），并生成 `undo log`，执行 sql，将数据更新到 `BufferPool` 缓冲区中，生成 `bin log`
- 遇到 `rollback`，在 `undo log` 中找到 撤销sql 执行，将缓冲区数据还原
- 遇到 `commit`，`redo log` 改为 `commit` 状态，异步刷盘

### 事务的恢复机制

当`SQL`执行时，数据还没被刷写到磁盘中，结果数据库宕机了，那数据是不是就丢了啊？毕竟本地磁盘中的数据，在`MySQL`重启后依旧存在，但缓冲区中还未被刷到磁盘的数据呢？

**数据被更新到缓冲区但没刷盘，然后`MySQL`宕机了，`MySQL`会通过日志恢复数据**。

> 这里要注意的是：数据被更新到缓冲区代表着`SQL`执行成功了（已经生成了`redo log` 和 `undo log`），此时客户端会收到`MySQL`返回的写入成功提示，只是没有落盘而言，所以`MySQL`重启后只需要再次落盘即可。
>
> 所以在`MySQL`重启时，依旧可以通过`redo-log`日志重新恢复未落盘的数据，从而确保数据的持久化特性。

那如果在记录`redo-log`日志时，`MySQL`芭比Q了咋整？

如果在记录日志的时候`MySQL`宕机了，这代表着`SQL`都没执行成功，`SQL`没执行成功的话，`MySQL`也不会向客户端返回任何信息，因为`MySQL`一直没返回执行结果，因此会导致客户端连接超时，而一般客户端都会有超时补偿机制的，比如会超时后重试，如果`MySQL`做了热备/灾备，这个重试的时间足够`MySQL`重启完成了，因此用户的操作依旧不会丢失（对于超时补偿机制，在各大数据库连接池中是有实现的）。

## MVCC机制

> MVCC 全称 Multi-Version Concurrency Control（`多版本并发控制`），在数据库管理系统中通过保存数据的多个版本来避免 `读写` 冲突，从而提高并发处理能力。

> - `MVCC` 机制在 `MySQL` 中，仅有 `InnoDB` 引擎支持，而在该引擎中，`MVCC `机制只对 `RC、RR` 两个隔离级别下的事务生效。
>   - 如果是 `RU` 读未提交级别，既然都允许存在 `脏读` 问题、允许一个事务读取另一个事务未提交的数据，那自然可以直接读最新版本的数据，因此无需`MVCC`介入
>   - `Serializable`串行化级别 自然不用多说
> - `RC、RR`两个不同的隔离级别中，`MVCC`的实现也存在些许差异。

`MVCC `机制主要通过 隐藏字段、`Undo-log`日志、`ReadView `这三个东西实现的，因而这三玩意儿也被称为“`MVCC`三剑客”！

### InnoDB表的隐藏字段

建一张表，除了声明的字段，还会有额外隐藏字段：

- `DB_ROW_ID` 隐藏主键
- `Deleted_Bit` 删除标识
- `TRX_ID` 最新事务 ID
- `ROLL_PTR` 回滚指针

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250527142627070.png" alt="image-20250527142627070" style="zoom:95%;" />

#### 隐藏主键 - ROW_ID（6Bytes）

对于`InnoDB`引擎的表而言，由于其表数据是按照聚簇索引的格式存储，因此通常都会选择主键作为聚簇索引列，然后基于主键字段构建索引树，但如若表中未定义主键，则会选择一个具备唯一非空属性的字段，作为聚簇索引的字段来构建树。

> 当两者都不存在时，`InnoDB` 就会隐式定义一个顺序递增的列 `ROW_ID `来作为聚簇索引列。

因此要牢记一点，如果你选择的引擎是 `InnoDB`，就算你的表中未定义主键、索引，其实默认也会存在一个聚簇索引，只不过这个索引在上层无法使用，仅提供给 `InnoDB `构建树结构存储表数据。

#### 删除标识 - Deleted_Bit（1Bytes）

对于一条 `delete` 语句而言，当执行后并不会立马删除表的数据，而是将这条数据的 `Deleted_Bit` 删除标识改为 `1/true`，后续的查询 `SQL` 检索数据时，如果检索到了这条数据，但看到隐藏字段 `Deleted_Bit=1` 时，就知道该数据已经被其他事务 `delete` 了，因此不会将这条数据纳入结果集。

> 但设计 `Deleted_Bit` 这个隐藏字段的好处是什么呢？
>
> 主要是能够有利于聚簇索引，比如当一个事务中删除一条数据后，后续又执行了回滚操作，假设此时是真正的删除了表数据，会发生什么情况呢？
>
> - ① 删除表数据时，有可能会破坏索引树原本的结构，导致出现叶子节点合并的情况。
> - ② 事务回滚时，又需重新插入这条数据，再次插入时又会破坏前面的结构，导致叶子节点分裂。

综上所述，如果执行 `delete` 语句就删除真实的表数据，由于事务回滚的问题，就很有可能导致聚簇索引树发生两次结构调整，这其中的开销可想而知，而且先删除，再回滚，最终树又变成了原状，那这两次树的结构调整还是无意义的。

所以，当执行 `delete `语句时，只会改变将隐藏字段中的删除标识改为 `1/true`，如果后续事务出现回滚动作，直接将其标识再改回 `0/false` 即可，这样就避免了索引树的结构调整。

> 但如若事务删除数据之后提交了事务呢？总不能让这条数据一直留在磁盘吧？毕竟如果所有的 `delete` 操作都这么干，就会导致磁盘爆满~，显然这样是不妥的，因此删除标识为 `1/true` 的数据最终依旧会从磁盘中移除，啥时候移呢？
>
> 为了防止“已删除”的数据占用过多的磁盘空间，`purger `线程会自动清理 `Deleted_Bit=1/true` 的行数据。

#### 最近更新的事务ID - TRX_ID（6Bytes）

`MySQL `对于每一个创建的事务，都会为其分配一个事务 `ID`，事务 `ID` 同样遵循顺序递增的特性，即后来的事务 `ID` 绝对会比之前的 `ID` 要大。

> `MySQL `对于所有包含写入 `SQL` 的事务，会为其分配一个顺序递增的事务 `ID`，但如果是一条 `select` 查询语句，则分配的事务 `ID=0`。

表中的隐藏字段 `TRX_ID`，记录的就是最近一次改动当前这条数据的事务 `ID`，这个字段是实现`MVCC`机制的核心之一。

#### 回滚指针 - ROLL_PTR（7Bytes）

`ROLL_PTR` 全称为 `rollback_pointer`，也就是回滚指针的意思，这个也是表中每条数据都会存在的一个隐藏字段，当一个事务对一条数据做了改动后，都会将旧版本的数据放到 `Undo-log` 日志中，而 `rollback_pointer` 就是一个地址指针，指向 `Undo-log` 日志中旧版本的数据，当需要回滚事务时，就可以通过这个隐藏列，来找到改动之前的旧版本数据，而 `MVCC` 机制也利用这点，实现了行数据的多版本。

### InnoDB引擎的 Undo-log 日志

> 回滚指针使 `undo log` 成为一条链表。

举个例子：

```sql
SELECT * FROM `zz_users` WHERE user_id = 1;
+---------+-----------+----------+----------+---------------------+
| user_id | user_name | user_sex | password | register_time       |
+---------+-----------+----------+----------+---------------------+
|       1 | 熊猫      | 女       | 6666     | 2022-08-14 15:22:01 |
+---------+-----------+----------+----------+---------------------+

UPDATE `zz_users` SET user_name = "竹子" WHERE user_id = 1;
UPDATE `zz_users` SET user_sex = "男" WHERE user_id = 1;
```

那 `Undo-log `日志如下：

![image-20250527155624760](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250527155624760.png)

细说一下执行上述 `update` 语句的详细过程：

- ① 对 `ID=1 `这条要修改的行数据加上 **排他锁**。
- ② 将原本的旧数据拷贝到 `Undo-log` 的 `rollback Segment` 区域。
- ③ 对表数据上的记录进行修改，修改完成后将隐藏字段中的 `trx_id` 改为当前事务`ID`。
- ④ 将隐藏字段中的 `roll_ptr` 指向 `Undo-log` 中对应的旧数据，并在提交事务后 **释放锁**。

> 与之前的删除标识类似，一条数据被 `delete` 后并提交了，最终会从磁盘移除，而 `Undo-log` 中记录的旧版本数据，同样会占用空间，因此在事务提交后也会移除，移除的工作同样由 `purger` 线程负责，`purger `线程内部也会维护一个 `ReadView`，它会以此作为判断依据，来决定何时移除 `Undo` 记录。

### MVCC核心 - ReadView

那究竟什么是 `ReadView` 呢？

就是一个事务在尝试读取一条数据时，`MVCC` 基于当前 `MySQL` 的运行状态生成的快照，也被称之为读视图，即 `ReadView`，在这个快照中记录着当前所有活跃事务的 `ID`（活跃事务是指还在执行的事务，即未结束（提交/回滚）的事务）。

#### 核心四参数

- `creator_trx_id`
  - 代表创建当前这个`ReadView `的事务 `ID`
- `trx_ids`
  - 表示在生成当前`ReadView`时，系统内活跃的事务 `ID `列表
- `up_limit_id`
  - 活跃的事务列表中，最小的事务`ID`。
- `low_limit_id`
  - 生成当前 readview 时，`下一个` 事务分配的 id

上个 `ReadView` 的示意图，来好好理解一下它：

![image-20250527155643218](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250527155643218.png)

假设目前数据库中共有 `T1~T5` 这五个事务，`T1、T2、T4 `还在执行，`T3 `已经回滚，`T5 `已经提交，此时当有一条查询语句执行时，就会利用 `MVCC` 机制生成一个 `ReadView`，由于前面讲过，单纯由一条 `select` 语句组成的事务并不会分配事务 `ID`，因此默认为 `0`，所以目前这个快照的信息如下：

```json
{
    "creator_trx_id" : "0",
    "trx_ids" : "[1,2,4]",
    "up_limit_id" : "1",
    "low_limit_id" : "6"
}
```

#### 实现原理

经过前面的讲解后已得知：

- ① 当一个事务尝试改动某条数据时，会将原本表中的旧数据放入 `Undo-log` 日志中。
- ② 当一个事务尝试查询某条数据时，`MVCC `会生成一个 `ReadView` 快照。

##### readview 可见性算法

- `DB_TRX_ID` < `up_limit_id`
  - 表明生成该版本的事务在生成 `Read View` 前，已经提交(因为事务 ID 是递增的)，所以该版本可以被当前事务访问
- `DB_TRX_ID` >= `low_limit_id`
  - 代表 `DB_TRX_ID` 所在的记录在 `Read View` 生成后才出现的，那对当前事务肯定不可见
- `up_limit_id` <= `DB_TRX_ID` < `low_limit_id`
  - `trx_list.contains(DB_TRX_ID)` && `DB_TRX_ID == creator_trx_id`
    - 代表 `Read View` 生成时刻，这个事务还未提交，且数据是自己生成的，可见
  - `trx_list.contains(DB_TRX_ID)` && `DB_TRX_ID != creator_trx_id`
    - 代表 `Read View` 生成时刻，这个事务还未提交，但数据不是自己生成的，不可见
  - `！trx_list.contains(DB_TRX_ID)`
    - 这个事务在 `Read View` 生成之前 就已经提交了，修改的结果，当前事务是能看见的

说简单一点，就是首先会去获取表中行数据的隐藏列，然后经过上述一系列判断后，可以得知：**目前查询数据的事务到底能不能访问最新版的数据**。如果能，就直接拿到表中的数据并返回，反之，不能则去 `Undo-log` 日志中获取旧版本的数据返回。

> 注意：假设 `Undo-log` 日志中存在版本链怎么办？该获取哪个版本的旧数据呢？

如果 `Undo-log` 日志中的旧数据存在一个版本链时，此时会首先根据隐藏列 `roll_ptr` 找到链表头，然后依次遍历整个列表，从而检索到最合适的一条数据并返回。但在这个遍历过程中，是如何判断一个旧版本的数据是否合适的呢？条件如下：

- 旧版本的数据，其隐藏列 `trx_id` 不能在 `ReadView.trx_ids` 活跃事务列表中。

因为如果旧版本的数据，其 `trx_id` 依旧在 `ReadView.trx_ids` 中，就代表着产生这条旧数据的事务还未提交，自然不能读取这个版本的数据。

> 举例说明：

```sql
-- 事务T1：trx_id=1
UPDATE `zz_users` SET user_name = "竹子" WHERE user_id = 1;
UPDATE `zz_users` SET user_sex = "男" WHERE user_id = 1;
```

```sql
-- 事务T2：trx_id=2
SELECT * FROM `zz_users` WHERE user_id = 1;
```

![image-20250527155656747](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250527155656747.png)

这是由事务 `T1` 生成的版本链，此时 `T2` 生成的 `ReadView` 如下：

```json
{
    "creator_trx_id" : "0",
    "trx_ids" : "[1]",
    "up_limit_id" : "1",
    "low_limit_id" : "2"
}
```

结合这个 `ReadView` 信息，经过前面那一系列判断后，最终会得到：不能读取最新版数据，因此需要去 `Undo-log` 的版本链中读数据，首先根据 `roll_ptr` 找到第一条旧数据：

![image-20250527155705722](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250527155705722.png)

此时发现其 `trx_id=1` ，位于 `ReadView.trx_ids `中，因此不能读取这条旧数据，接着再根据这条旧数据的 `roll_ptr` 找到第二条旧版本数据：

![image-20250527155719863](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250527155719863.png)

这时再看其 `trx_id=null` ，并不位于 `ReadView.trx_ids` 中，`null `表示这条数据在上次 `MySQL` 运行时就已插入了，因此这条旧版本的数据可以被 `T2` 事务读取，最终 `T2` 就会查询到这条数据并返回。

#### RC、RR 不同级别下的 MVCC 机制

- `RC` 读已提交(READ-COMMITTED)
  - 读操作使用 MVCC 机制，每次 SELECT 生成快照，写操作加排他锁
- `RR` 可重复读(REPEATABLE-READ)
  - 读操作使用 MVCC 机制，首次 SELECT 生成快照，写操作加临键锁
  - 之后的快照读使用的都是同一个 Read View，所以对之后的修改不可见
