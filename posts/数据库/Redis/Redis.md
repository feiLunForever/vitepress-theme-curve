# redis

## redis 基础

### 什么是 Redis？

Redis 是一种基于内存的数据库，对数据的读写操作都是在内存中完成，因此**读写速度非常快**，常用于**缓存，消息队列、分布式锁等场景**。

Redis 提供了多种数据类型来支持不同的业务场景，比如 String(字符串)、Hash(哈希)、 List (列表)、Set(集合)、Zset(有序集合)、Bitmaps（位图）、HyperLogLog（基数统计）、GEO（地理信息）、Stream（流），并且对数据类型的操作都是 **原子性** 的，因为执行命令由单线程负责的，不存在并发竞争的问题。

除此之外，Redis 还支持**事务 、持久化、Lua 脚本、多种集群方案（主从复制模式、哨兵模式、切片机群模式）、发布/订阅模式，内存淘汰机制、过期删除机制**等等。

### Redis 和 Memcached 有什么区别？

很多人都说用 Redis 作为缓存，但是 Memcached 也是基于内存的数据库，为什么不选择它作为缓存呢？要解答这个问题，我们就要弄清楚 Redis 和 Memcached 的区别。 Redis 与 Memcached **共同点**：

1.  都是基于内存的数据库，一般都用来当做缓存使用。
2.  都有过期策略。
3.  两者的性能都非常高。

Redis 与 Memcached **区别**：

*   Redis 支持的数据类型更丰富（String、Hash、List、Set、ZSet），而 Memcached 只支持最简单的 key-value 数据类型；
*   Redis 支持数据的持久化，可以将内存中的数据保持在磁盘中，重启的时候可以再次加载进行使用，而 Memcached 没有持久化功能，数据全部存在内存之中，Memcached 重启或者挂掉后，数据就没了；
*   Redis 原生支持集群模式，Memcached 没有原生的集群模式，需要依靠客户端来实现往集群中分片写入数据；
*   Redis 支持发布订阅模型、Lua 脚本、事务等功能，而 Memcached 不支持；

### 为什么用 Redis 作为 MySQL 的缓存？

主要是因为 **Redis 具备「高性能」和「高并发」两种特性**。

_**1、Redis 具备高性能**_

假如用户第一次访问 MySQL 中的某些数据。这个过程会比较慢，因为是从硬盘上读取的。将该用户访问的数据缓存在 Redis 中，这样下一次再访问这些数据的时候就可以直接从缓存中获取了，操作 Redis 缓存就是直接操作内存，所以速度相当快。

如果 MySQL 中的对应数据改变的之后，同步改变 Redis 缓存中相应的数据即可，不过这里会有 Redis 和 MySQL 双写一致性的问题，后面我们会提到。

_**2、 Redis 具备高并发**_

单台设备的 Redis 的 QPS（Query Per Second，每秒钟处理完请求的次数） 是 MySQL 的 10 倍，Redis 单机的 QPS 能轻松破 10w，而 MySQL 单机的 QPS 很难破 1w。

所以，直接访问 Redis 能够承受的请求是远远大于直接访问 MySQL 的，所以我们可以考虑把数据库中的部分数据转移到缓存中去，这样用户的一部分请求会直接到缓存这里而不用经过数据库。

### Redis 的 Hash 冲突

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250612183257785.png" alt="image-20250612183257785" style="zoom:80%;" />

- 用一张全局的哈希来保存所有的键值对
- 链式哈希
- rehash 操作

### 事务

> Redis 事务提供了一种将多个命令请求打包的功能。然后，再按顺序执行打包的所有命令，并且不会被中途打断。

- MULTI
  - 标记一个事务块的开始
- EXEC
  - 执行所有事务块内的命令
- DISCARD
  - 取消事务，放弃执行事务块内的所有命令
- WATCH
  - 监视 key ，如果在事务执行之前，该 key 被其他命令所改动，那么事务将被打断。
- UNWATCH
  - 取消 WATCH 命令对所有 key 的监视

Redis 是不支持 roll back 的，因而不满足原子性的（而且不满足持久性）

具体过程：

- 服务端收到客户端请求，事务以MULTI开始
- 如果正处于事务状态时，则会把后续命令放入队列同时返回给客户端QUEUED，反之则直接执行这 个命令
- 当收到客户端的EXEC命令时，才会将队列里的命令取出、顺序执行，执行完将当前状态从事务状态改为非事务状态
- 如果收到 DISCARD 命令，放弃执行队列中的命令，可以理解为Mysql的回滚操作，并且将当前的状态从事务状态改为非事务状态

> WATCH 监视某个key，该命令只能在MULTI命令之前执行。如果监视的key被其他客户端修改，EXEC将会放弃执行队列中的所有命令。UNWATCH 取消监视之前通过WATCH 命令监视的key。通过执行EXEC 、DISCARD 两个命令之前监视的key也会被取消监视。

## Redis 数据结构

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/9fa26a74965efbf0f56b707a03bb9b7f-20230309232459468.png" style="zoom:35%;" />

Redis 五种数据类型的应用场景：

*   String 类型的应用场景：缓存对象、常规计数、分布式锁、共享 session 信息等。
*   List 类型的应用场景：消息队列（但是有两个问题：1. 生产者需要自行实现全局唯一 ID；2. 不能以消费组形式消费数据）等。
*   Hash 类型：缓存对象、购物车等。
*   Set 类型：聚合计算（并集、交集、差集）场景，比如点赞、共同关注、抽奖活动等。
*   Zset 类型：排序场景，比如排行榜、电话和姓名排序等。

Redis 后续版本又支持四种数据类型，它们的应用场景如下：

*   BitMap：二值状态统计的场景，比如签到、判断用户登陆状态、连续签到用户总数等；
*   HyperLogLog：海量数据基数统计的场景，比如百万级网页 UV 计数等；
*   GEO：存储地理位置信息的场景，比如滴滴叫车；
*   Stream：消息队列，相比于基于 List 类型实现的消息队列，有这两个特有的特性：自动生成全局唯一消息ID，支持以消费组形式消费数据。

### string

#### 底层数据结构

- String 类型的底层的数据结构实现主要是 int 和 SDS（简单动态字符串）。
- 字符串对象的内部编码（encoding）有 3 种 ：`int`、`raw` 和 `embstr`。

##### C 语言字符串的不足

- 获取字符串长度的时间复杂度为 O（N）
- 字符串的结尾是以 “\0” 字符标识，字符串里面不能包含有 “\0” 字符，因此不能保存二进制数据；
- 无扩容

##### 内部实现

1. 如果一个字符串对象保存的是整数值，并且这个整数值可以用 `long` 类型来表示，那么字符串对象会将整数值保存在字符串对象结构的 `ptr` 属性里面（将 `void*` 转换成 `long`），并将字符串对象的编码设置为 `int`。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/int-20250610205505969.png" alt="img" style="zoom:30%;" />

2. 如果字符串对象保存的是一个字符串，并且这个字符申的长度小于等于 32 字节，那么字符串对象将使用一个简单动态字符串（SDS）来保存这个字符串，并将对象的编码设置为 `embstr`， `embstr ` 编码是专门用于保存短字符串的一种优化编码方式：

![](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/embstr.png)

3. 如果字符串对象保存的是一个字符串，并且这个字符串的长度大于 32 字节，那么字符串对象将使用一个简单动态字符串（SDS）来保存这个字符串，并将对象的编码设置为`raw`：

![](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/raw-20250610205825879.png)

可以看到 `embstr` 和 `raw` 编码都会使用 `SDS` 来保存值，但不同之处在于 `embstr` 会通过一次内存分配函数来分配一块连续的内存空间来保存 `redisObject` 和 `SDS`，而 `raw` 编码会通过调用两次内存分配函数来分别分配两块空间来保存 `redisObject` 和 `SDS`

Redis这样做会有很多好处：

*   `embstr` 编码将创建字符串对象所需的内存分配次数从  `raw`  编码的两次降低为一次；
*   释放 `embstr` 编码的字符串对象同样只需要调用一次内存释放函数；
*   因为 `embstr` 编码的字符串对象的所有数据都保存在一块连续的内存里面可以更好的利用 CPU 缓存提升性能。

但是 `embstr` 也有缺点的：

*   如果字符串的长度增加需要重新分配内存时，整个 `redisObject` 和 `sds` 都需要重新分配空间，所以 **`embstr` 编码的字符串对象实际上是只读的**，redis 没有为 `embstr` 编码的字符串对象编写任何相应的修改程序。当我们对 `embstr` 编码的字符串对象执行任何修改命令（例如 append）时，程序会先将对象的编码从 `embstr` 转换成 `raw`，然后再执行修改命令。

#### 扩容规则

- 如果所需的 sds 长度小于 1 MB，那么最后的扩容是按照翻倍扩容来执行的，即 2 倍的 newlen
- 如果所需的 sds 长度超过 1 MB，那么最后的扩容长度应该是 newlen + 1MB。

#### 常用指令

普通字符串的基本操作：

```shell
# 设置 key-value 类型的值
> SET name lin
OK
# 根据 key 获得对应的 value
> GET name
"lin"
# 判断某个 key 是否存在
> EXISTS name
(integer) 1
# 返回 key 所储存的字符串值的长度
> STRLEN name
(integer) 3
# 删除某个 key 对应的值
> DEL name
(integer) 1 
```

批量设置 :

```shell
# 批量设置 key-value 类型的值
> MSET key1 value1 key2 value2 
OK
# 批量获取多个 key 对应的 value
> MGET key1 key2 
1) "value1"
2) "value2" 
```

计数器（字符串的内容为整数的时候可以使用）：

```shell
# 设置 key-value 类型的值
> SET number 0
OK
# 将 key 中储存的数字值增一
> INCR number
(integer) 1
# 将key中存储的数字值加 10
> INCRBY number 10
(integer) 11
# 将 key 中储存的数字值减一
> DECR number
(integer) 10
# 将key中存储的数字值键 10
> DECRBY number 10
(integer) 0 
```

过期（默认为永不过期）：

```shell
# 设置 key 在 60 秒后过期（该方法是针对已经存在的key设置过期时间）
> EXPIRE name  60 
(integer) 1
# 查看数据还有多久过期
> TTL name 
(integer) 51

#设置 key-value 类型的值，并设置该key的过期时间为 60 秒
> SET key  value EX 60
OK
> SETEX key  60 value
OK 
```

不存在就插入：

```
# 不存在就插入（not exists）
>SETNX key value
(integer) 1 
```

#### 应用场景

##### 缓存对象

使用 String 来缓存对象有两种方式：

*   直接缓存整个对象的 JSON，命令例子： `SET user:1 '{"name":"xiaolin", "age":18}'`。
*   采用将 key 进行分离为 user:ID:属性，采用 MSET 存储，用 MGET 获取各属性值，命令例子： `MSET user:1:name xiaolin user:1:age 18 user:2:name xiaomei user:2:age 20`。

##### 常规计数

因为 Redis 处理命令是单线程，所以执行命令的过程是原子的。因此 String 数据类型适合计数场景，比如计算访问次数、点赞、转发、库存数量等等。

比如计算文章的阅读量：

```shell
# 初始化文章的阅读量
> SET aritcle:readcount:1001 0
OK
#阅读量+1
> INCR aritcle:readcount:1001
(integer) 1
#阅读量+1
> INCR aritcle:readcount:1001
(integer) 2
#阅读量+1
> INCR aritcle:readcount:1001
(integer) 3
# 获取对应文章的阅读量
> GET aritcle:readcount:1001
"3" 
```

##### 分布式锁

SET 命令有个 NX 参数可以实现「key不存在才插入」，可以用它来实现分布式锁：

*   如果 key 不存在，则显示插入成功，可以用来表示加锁成功；
*   如果 key 存在，则会显示插入失败，可以用来表示加锁失败。

一般而言，还会对分布式锁加上过期时间，分布式锁的命令如下：

```shell
SET lock_key unique_value NX PX 10000 
```

*   lock\_key 就是 key 键；
*   unique\_value 是客户端生成的唯一的标识；
*   NX 代表只在 lock\_key 不存在时，才对 lock\_key 进行设置操作；
*   PX 10000 表示设置 lock\_key 的过期时间为 10s，这是为了避免客户端发生异常而无法释放锁。

而解锁的过程就是将 lock\_key 键删除，但不能乱删，要保证执行操作的客户端就是加锁的客户端。所以，解锁的时候，我们要先判断锁的 unique\_value 是否为加锁客户端，是的话，才将 lock\_key 键删除。

可以看到，解锁是有两个操作，这时就需要 Lua 脚本来保证解锁的原子性，因为 Redis 在执行 Lua 脚本时，可以以原子性的方式执行，保证了锁释放操作的原子性。

```lua
// 释放锁时，先比较 unique_value 是否相等，避免锁的误释放
if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
else
    return 0
end 
```

这样一来，就通过使用 SET 命令和 Lua 脚本在 Redis 单节点上完成了分布式锁的加锁和解锁。

##### 共享 Session 信息

通常我们在开发后台管理系统时，会使用 Session 来保存用户的会话(登录)状态，这些 Session 信息会被保存在服务器端，但这只适用于单系统应用，如果是分布式系统此模式将不再适用。

例如用户一的 Session 信息被存储在服务器一，但第二次访问时用户一被分配到服务器二，这个时候服务器并没有用户一的 Session 信息，就会出现需要重复登录的问题，问题在于分布式系统每次会把请求随机分配到不同的服务器。

分布式系统单独存储 Session 流程图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/Session1.png" style="zoom:50%;" />

因此，我们需要借助 Redis 对这些 Session 信息进行统一的存储和管理，这样无论请求发送到那台服务器，服务器都会去同一个 Redis 获取相关的 Session 信息，这样就解决了分布式系统下 Session 存储的问题。

分布式系统使用同一个 Redis 存储 Session 流程图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/Session2.png" style="zoom:70%;" />

### list

> List 列表是简单的字符串列表，**按照插入顺序排序**，可以从头部或尾部向 List 列表添加元素。
>
> 列表的最大长度为 `2^32 - 1`，也即每个列表支持超过 `40 亿`个元素。

#### 内部实现

List 类型的底层数据结构是由 **双向链表 或 压缩列表** 实现的：

*   元素个数 < 512 && 每个元素 < 64 字节，Redis 会使用 `压缩列表` 作为 List 类型的底层数据结构
*   否则，Redis 会使用**双向链表**作为 List 类型的底层数据结构；

> 但是**在 Redis 3.2 版本之后，List 数据类型底层数据结构就只由  `quicklist` 实现了，替代了 双向链表 和 压缩列表**。

##### ziplist（压缩列表）

###### 结构设计

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610212001079.png" alt="image-20250610212001079" style="zoom:70%;" />

- 连续内存块组成的顺序型数据结构（类似数组）
- 压缩列表在表头有三个字段：
  - `zlbytes`，记录整个压缩列表占用对内存字节数；
  - `zltail`，记录压缩列表「尾部」节点距离起始地址由多少字节，也就是列表尾的偏移量；
  - `zllen`，记录压缩列表包含的节点数量；
  - `zlend`，标记压缩列表的结束点
- 压缩列表节点（`entry`）
  - `prevlen`，记录了「前一个节点」的长度，目的是为了实现从后向前遍历；
  - `encoding`，记录了当前节点实际数据的「类型和长度」，类型主要有两种：字符串和整数。
  - `data`，记录了当前节点的实际数据，类型和长度都由 `encoding` 决定；

###### 缺点

- 查找复杂度高
  - 在压缩列表中，如果我们要查找定位第一个元素和最后一个元素，可以通过表头三个字段（`zllen`）的长度直接定位，复杂度是 O(1)。
  - 而查找其他元素时，就没有这么高效了，只能逐个查找，此时的复杂度就是 O(N) 了，因此压缩列表不适合保存过多的元素。
- `连锁更新`
  - 压缩列表新增某个元素或修改某个元素时，如果空间不不够，压缩列表占用的内存空间就需要重新分配
  - 而当新插入的元素较大时，可能会导致后续元素的 `prevlen` 占用空间都发生变化，从而引起「`连锁更新`」问题，导致每个元素的空间都要重新分配，造成访问压缩列表性能的下降。

###### 连锁更新

压缩列表节点的 `prevlen` 属性会根据前一个节点的长度进行不同的空间大小分配：

- 如果前一个节点的长度 < `254` 字节，那么 `prevlen` 属性需要用  `1 字节` 的空间来保存这个长度值；
- 如果前一个节点的长度 >= `254` 字节，那么 `prevlen` 属性需要用  `5 字节` 的空间来保存这个长度值；

现在假设一个压缩列表中有多个连续的、长度在 250～253 之间的节点，如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610213441297.png" alt="image-20250610213441297" style="zoom:40%;" />

因为这些节点长度值 < 254 字节，所以 `prevlen` 属性需要用 `1 字节` 的空间来保存这个长度值。

这时，如果将一个长度 >= `254` 字节的新节点加入到 `压缩列表` 的表头节点，即新节点将成为 `e1` 的前置节点，如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610213550473.png" alt="image-20250610213550473" style="zoom:40%;" />

因为 e1 节点的 `prevlen` 属性只有  `1 个字节` 大小，无法保存新节点的长度，此时就需要对压缩列表的空间重分配操作，并将 `e1` 节点的 `prevlen` 属性从原来的 `1 字节` 大小扩展为 `5 字节` 大小。

多米诺牌的效应就此开始。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610213633823.png" alt="image-20250610213633823" style="zoom:40%;" />

`e1` 原本的长度在 250～253 之间，因为刚才的扩展空间，此时 e1 的长度就大于等于 254 了，因此原本 `e2` 保存 e1 的 `prevlen` 属性也必须从 `1 字节` 扩展至 `5 字节` 大小。

正如扩展 `e1` 引发了对 `e2` 扩展一样，扩展 `e2` 也会引发对 `e3` 的扩展，而扩展 `e3` 又会引发对 `e4` 的扩展.... 一直持续到结尾。

**这种在特殊情况下产生的连续多次空间扩展操作就叫做「`连锁更新`」**，就像多米诺牌的效应一样，第一张牌倒下了，推动了第二张牌倒下；第二张牌倒下，又推动了第三张牌倒下....

##### listpack

`listpack` 采用了压缩列表的很多优秀的设计，比如还是用一块连续的内存空间来紧凑地保存数据，并且为了节省内存的开销，`listpack` 节点会采用不同的编码方式保存不同大小的数据。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610220300103.png" alt="image-20250610220300103" style="zoom:50%;" />

`listpack` 只记录当前节点的长度，当我们向 `listpack` 加入一个新元素的时候，不会影响其他节点的长度字段的变化，从而避免了压缩列表的连锁更新问题。

> Redis 7.0 中，压缩列表数据结构已经废弃了，交由 listpack 数据结构来实现了

##### 双向链表

###### 结构设计

```c++
typedef struct listNode {
    //前置节点
    struct listNode *prev;
    //后置节点
    struct listNode *next;
    //节点的值
    void *value;
} listNode;
```

Redis 在 `listNode` 结构体基础上又封装了 `list` 这个数据结构，这样操作起来会更方便。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610213857794.png" alt="image-20250610213857794" style="zoom:60%;" />

###### 优缺点

Redis 的链表实现优点如下：

- `listNode` 链表节点的结构里带有 `prev` 和 `next` 指针，获取某个节点的前置节点或后置节点的时间复杂度只需 O(1)，而且这两个指针都可以指向 NULL，所以链表是无环链表；
- `list` 结构因为提供了表头指针 `head` 和表尾节点 `tail`，所以获取链表的表头节点和表尾节点的时间复杂度只需 O(1)；
- `list` 结构因为提供了链表节点数量 `len`，所以获取链表中的节点数量的时间复杂度只需 O(1)；
- `listNode` 链表节使用 `void*` 指针保存节点值，并且可以通过 `list` 结构的 `dup`、`free`、`match` 函数指针为节点设置该节点类型特定的函数，因此链表节点可以保存各种不同类型的值；

链表的缺陷也是有的：

- 链表每个节点之间的内存都是不连续的，意味着 `无法很好利用 CPU 缓存` 。能很好利用 CPU 缓存的数据结构就是数组，因为数组的内存是连续的，这样就可以充分利用 CPU 缓存来加速访问。
- 还有一点，保存一个链表节点的值都需要一个链表节点结构头的分配，`内存开销较大`。

##### quicklist

###### 结构设计

`quicklist` 就是「双向链表 + 压缩列表」组合，因为一个 `quicklist` 就是一个链表，而链表中的每个元素又是一个压缩列表。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610214132922.png" alt="image-20250610214132922" style="zoom:70%;" />

`压缩列表` 是通过 紧凑型 的内存布局节省了内存开销，但是因为它的结构设计，如果保存的元素数量增加，或者元素变大了，压缩列表会有「`连锁更新`」的风险，一旦发生，会造成性能下降。

`quicklist` 解决办法，通过控制每个链表节点中的 `压缩列表` 的大小或者元素个数，来规避 `连锁更新` 的问题。因为 `压缩列表` 元素越少或越小，连锁更新带来的影响就越小，从而提供了更好的访问性能。

#### 常用命令

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/list.png" style="zoom:25%;" />

```shell
# 将一个或多个值value插入到key列表的表头(最左边)，最后的值在最前面
LPUSH key value [value ...] 
# 将一个或多个值value插入到key列表的表尾(最右边)
RPUSH key value [value ...]
# 移除并返回key列表的头元素
LPOP key     
# 移除并返回key列表的尾元素
RPOP key 

# 返回列表key中指定区间内的元素，区间以偏移量start和stop指定，从0开始
LRANGE key start stop

# 从key列表表头弹出一个元素，没有就阻塞timeout秒，如果timeout=0则一直阻塞
BLPOP key [key ...] timeout
# 从key列表表尾弹出一个元素，没有就阻塞timeout秒，如果timeout=0则一直阻塞
BRPOP key [key ...] timeout 
```

#### 应用场景

##### 消息队列

消息队列在存取消息时，必须要满足三个需求，分别是 **消息保序、处理重复的消息 和 保证消息可靠性**。

Redis 的 `List` 和 `Stream` 两种数据类型，就可以满足消息队列的这三个需求。

_1、如何满足消息保序需求？_

List 本身就是按 先进先出 的顺序对数据进行存取的，所以，如果使用 List 作为消息队列保存消息的话，就已经能满足消息保序的需求了。

List 可以使用 `LPUSH` + ` RPOP`（或者反过来，`RPUSH` + `LPOP`）命令实现消息队列。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/list消息队列.png" style="zoom:20%;" />

*   生产者使用 `LPUSH key value[value...]` 将消息插入到队列的头部，如果 key 不存在则会创建一个空的队列再插入消息。

*   消费者使用 `RPOP key` 依次读取队列的消息，先进先出。

> 不过，在消费者读取数据时，有一个潜在的性能风险点。

在生产者往 `List` 中写入数据时，`List` 并不会主动地通知消费者有新消息写入，如果消费者想要及时处理消息，就需要在程序中不停地调用 `RPOP` 命令（比如使用一个 `while(1)` 循环）。如果有新消息写入，`RPOP` 命令就会返回结果，否则，`RPOP` 命令返回空值，再继续循环。

所以，即使没有新消息写入 `List` ，消费者也要不停地调用 `RPOP` 命令，这就会导致消费者程序的 `CPU` 一直消耗在执行 `RPOP` 命令上，带来不必要的性能损失。

为了解决这个问题，Redis 提供了 `BRPOP` 命令。**`BRPOP` 命令也称为阻塞式读取，客户端在没有读到队列数据时，自动阻塞，直到有新的数据写入队列，再开始读取新数据**。和消费者程序自己不停地调用 `RPOP` 命令相比，这种方式能节省 CPU 开销。

<img src="https://cdn.xiaolincoding.com/gh/xiaolincoder/redis/数据类型/消息队列.png" style="zoom:25%;" />

_2、如何处理重复的消息？_

消费者要实现重复消息的判断，需要 2 个方面的要求：

*   每个消息都有一个全局的 ID。
*   消费者要记录已经处理过的消息的 ID。
    *   当收到一条消息后，消费者程序就可以对比收到的消息 ID  和 记录的已处理过的消息 ID，来判断当前收到的消息有没有经过处理。
    *   如果已经处理过，那么，消费者程序就不再进行处理了。

但是 **List 并不会为每个消息生成 ID 号，所以我们需要自行为每个消息生成一个全局唯一ID**，生成之后，我们在用 `LPUSH` 命令把消息插入 List 时，需要在消息中包含这个全局唯一 ID。

例如，我们执行以下命令，就把一条全局 ID 为 111000102、库存量为 99 的消息插入了消息队列：

```shell
> LPUSH mq "111000102:stock:99"
(integer) 1 
```

_3、如何保证消息可靠性？_

当消费者程序从 List 中读取一条消息后，List 就不会再留存这条消息了。所以，如果消费者程序在处理消息的过程出现了故障或宕机，就会导致消息没有处理完成，那么，消费者程序再次启动后，就没法再次从 List 中读取消息了。

为了留存消息，List 类型提供了 `BRPOPLPUSH` 命令，这个命令的**作用是让消费者程序从一个 List 中读取消息，同时，Redis 会把这个消息再插入到另一个 List（可以叫作备份 List）留存**。

这样一来，如果消费者程序读了消息但没能正常处理，等它重启后，就可以从备份 List 中重新读取消息并进行处理了。

好了，到这里可以知道基于 List 类型的消息队列，满足消息队列的三大需求（消息保序、处理重复的消息和保证消息可靠性）。

*   消息保序：使用 `LPUSH` + `RPOP`；
*   阻塞读取：使用 `BRPOP`；
*   重复消息处理：生产者自行实现全局唯一 ID；
*   消息的可靠性：使用 `BRPOPLPUSH`

> List 作为消息队列有什么缺陷？

**List 不支持多个消费者消费同一条消息**，因为一旦消费者拉取一条消息后，这条消息就从 List 中删除了，无法被其它消费者再次消费。

要实现一条消息可以被多个消费者消费，那么就要将多个消费者组成一个消费组，使得多个消费者可以消费同一条消息，但是 **List 类型并不支持消费组的实现**。

> 这就要说起 Redis 从 5.0 版本开始提供的 Stream 数据类型了，Stream 同样能够满足消息队列的三大需求，而且它还支持「消费组」形式的消息读取。

### hash

Hash 与 String 对象的区别如下图所示:

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/hash.png" style="zoom:30%;" />

#### 内部实现

##### ziplist（压缩列表）

- 元素个数 < 512 && 元素值 < 64 字节

> **在 Redis 7.0 中，`压缩列表` 数据结构已经废弃了，交由 `listpack` 数据结构来实现了**。

##### hash 表

###### 数据结构

```c++
typedef struct dictht {
    //哈希表数组
    dictEntry **table;
    //哈希表大小
    unsigned long size;  
    //哈希表大小掩码，用于计算索引值
    unsigned long sizemask;
    //该哈希表已有的节点数量
    unsigned long used;
} dictht;
```

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610215625227.png" alt="image-20250610215625227" style="zoom:30%;" />

可以看到，哈希表是一个数组（`dictEntry **table`），数组的每个元素是一个指向「哈希表节点（`dictEntry`）」的指针。

###### rehash

- 给「哈希表 2」 分配空间，一般会比「哈希表 1」 大 2 倍
- 将「哈希表 1 」的数据迁移到「哈希表 2」 中
- 迁移完成后，「哈希表 1 」的空间会被释放，并把「哈希表 2」 设置为「哈希表 1」，然后在「哈希表 2」 新创建一个空白的哈希表，为下次 `rehash` 做准备。

###### 渐进式 rehash

- 为了避免 `rehash` 在数据迁移过程中，因拷贝数据的耗时，影响 Redis 性能的情况，所以 Redis 采用了渐进式 rehash，也就是将数据的迁移的工作不再是一次性迁移完成，而是分多次迁移。
- 给「哈希表 2」 分配空间
- 在 `rehash` 进行期间，每次哈希表元素进行新增、删除、查找或者更新操作时，Redis 除了会执行对应的操作之外，还会顺序将「哈希表 1 」中索引位置上的所有 `key-value` 迁移到「哈希表 2」 上
- 随着处理客户端发起的哈希表操作请求数量越多，最终在某个时间点会把「哈希表 1 」的所有 `key-value` 迁移到「哈希表 2」，从而完成 `rehash` 操作

###### rehash 触发条件

负载因子可以通过下面这个公式计算：

**`负载因子 = hash 表已保存节点数量 / hash 表大小`**

触发 `rehash` 操作的条件，主要有两个：

- 当负载因子大于等于 1 ，并且 Redis 没有在执行 `bgsave` 命令或者 `bgrewiteaof` 命令，也就是没有执行 RDB 快照或没有进行 `AOF` 重写的时候，就会进行 `rehash` 操作。
- 当负载因子大于等于 5 时，此时说明哈希冲突非常严重了，不管有没有有在执行 `RDB` 快照或 `AOF` 重写，都会强制进行 `rehash` 操作。

#### 常用命令

```shell
# 存储一个哈希表key的键值
HSET key field value   
# 获取哈希表key对应的field键值
HGET key field

# 在一个哈希表key中存储多个键值对
HMSET key field value [field value...] 
# 批量获取哈希表key中多个field键值
HMGET key field [field ...]       
# 删除哈希表key中的field键值
HDEL key field [field ...]    

# 返回哈希表key中field的数量
HLEN key       
# 返回哈希表key中所有的键值
HGETALL key 

# 为哈希表key中field键的值加上增量n
HINCRBY key field n 
```

#### 应用场景

##### 缓存对象

Hash 类型的 （key，field， value） 的结构与对象的（对象id， 属性， 值）的结构相似，也可以用来存储对象。

我们以用户信息为例，它在关系型数据库中的结构是这样的：

![](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/用户信息.png)

我们可以使用如下命令，将用户对象的信息存储到 Hash 类型：

```shell
# 存储一个哈希表uid:1的键值
> HMSET uid:1 name Tom age 15
2
# 存储一个哈希表uid:2的键值
> HMSET uid:2 name Jerry age 13
2
# 获取哈希表用户id为1中所有的键值
> HGETALL uid:1
1) "name"
2) "Tom"
3) "age"
4) "15" 
```

Redis Hash 存储其结构如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/hash存储结构.png" style="zoom:30%;" />

在介绍 String 类型的应用场景时有所介绍，String + Json也是存储对象的一种方式，那么存储对象时，到底用 String + json 还是用 Hash 呢？

一般对象用 String + Json 存储，对象中某些频繁变化的属性可以考虑抽出来用 Hash 类型存储。

##### 购物车

以用户 id 为 key，商品 id 为 field，商品数量为 value，恰好构成了购物车的3个要素，如下图所示。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/购物车.png" style="zoom:25%;" />

涉及的命令如下：

*   添加商品：`HSET cart:{用户id} {商品id} 1`
*   添加数量：`HINCRBY cart:{用户id} {商品id} 1`
*   商品总数：`HLEN cart:{用户id}`
*   删除商品：`HDEL cart:{用户id} {商品id}`
*   获取购物车所有商品：`HGETALL cart:{用户id}`

当前仅仅是将 商品ID 存储到了 Redis 中，在回显商品具体信息的时候，还需要拿着 商品 id 查询一次数据库，获取完整的商品的信息。

### set

Set 类型是一个无序并唯一的键值集合，它的存储顺序不会按照插入的先后顺序进行存储。

一个集合最多可以存储 `2^32-1` 个元素。概念和数学中个的集合基本类似，可以交集，并集，差集等等，所以 Set 类型除了支持集合内的增删改查，同时还支持多个集合取交集、并集、差集。

Set 类型和 List 类型的区别如下：

*   List 可以存储重复元素，Set 只能存储非重复元素；
*   List 是按照元素的先后顺序存储元素的，而 Set 则是无序方式存储元素的。

#### 内部实现

##### intset（整数集合 ）

- 如果集合中的元素都是 `整数` 且元素个数小于 `512` 个

```c++
typedef struct intset {
    //编码方式
    uint32_t encoding;
    //集合包含的元素数量
    uint32_t length;
    //保存元素的数组
    int8_t contents[];
} intset;
```

##### hash

如果集合中的元素不满足上面条件，则 Redis 使用**哈希表**作为 Set 类型的底层数据结构。

#### 常用命令

Set 常用操作：

```shell
# 往集合key中存入元素，元素存在则忽略，若key不存在则新建
SADD key member [member ...]
# 从集合key中删除元素
SREM key member [member ...] 
# 获取集合key中所有元素
SMEMBERS key
# 获取集合key中的元素个数
SCARD key

# 判断member元素是否存在于集合key中
SISMEMBER key member

# 从集合key中随机选出count个元素，元素不从key中删除
SRANDMEMBER key [count]
# 从集合key中随机选出count个元素，元素从key中删除
SPOP key [count] 
```

Set 运算操作：

```shell
# 交集运算
SINTER key [key ...]
# 将交集结果存入新集合destination中
SINTERSTORE destination key [key ...]

# 并集运算
SUNION key [key ...]
# 将并集结果存入新集合destination中
SUNIONSTORE destination key [key ...]

# 差集运算
SDIFF key [key ...]
# 将差集结果存入新集合destination中
SDIFFSTORE destination key [key ...] 
```

#### 应用场景

集合的主要几个特性，`无序`、`不可重复`、`支持并交差` 等操作。

因此 Set 类型比较适合用来 `数据去重` 和 保障数据的 `唯一性`，还可以用来统计多个集合的 `交集`、`错集` 和 `并集` 等，当我们存储的数据是无序并且需要去重的情况下，比较适合使用集合类型进行存储。

> 但是要提醒你一下，这里有一个潜在的风险。**Set 的差集、并集和交集的计算复杂度较高，在数据量较大的情况下，如果直接执行这些计算，会导致 Redis 实例阻塞**。

##### 点赞

Set 类型可以保证一个用户只能点一个赞，这里举例子一个场景，key 是文章id，value 是用户id。

`uid:1` 、`uid:2`、`uid:3` 三个用户分别对 article:1 文章点赞了。

```shell
# uid:1 用户对文章 article:1 点赞
> SADD article:1 uid:1
(integer) 1
# uid:2 用户对文章 article:1 点赞
> SADD article:1 uid:2
(integer) 1
# uid:3 用户对文章 article:1 点赞
> SADD article:1 uid:3
(integer) 1 
```

`uid:1` 取消了对 article:1 文章点赞。

```shell
> SREM article:1 uid:1
(integer) 1 
```

获取 article:1 文章所有点赞用户 :

```shell
> SMEMBERS article:1
1) "uid:3"
2) "uid:2" 
```

获取 article:1 文章的点赞用户数量：

```shell
> SCARD article:1
(integer) 2 
```

判断用户 `uid:1` 是否对文章 article:1 点赞了：

```shell
> SISMEMBER article:1 uid:1
(integer) 0  # 返回0说明没点赞，返回1则说明点赞了 
```

##### 共同关注

Set 类型支持交集运算，所以可以用来计算共同关注的好友、公众号等。

key 可以是用户id，value 则是已关注的公众号的id。

`uid:1` 用户关注公众号 id 为 5、6、7、8、9，`uid:2` 用户关注公众号 id 为 7、8、9、10、11。

```shell
# uid:1 用户关注公众号 id 为 5、6、7、8、9
> SADD uid:1 5 6 7 8 9
(integer) 5
# uid:2  用户关注公众号 id 为 7、8、9、10、11
> SADD uid:2 7 8 9 10 11
(integer) 5 
```

`uid:1` 和 `uid:2` 共同关注的公众号：

```shell
# 获取共同关注
> SINTER uid:1 uid:2
1) "7"
2) "8"
3) "9" 
```

给 `uid:2` 推荐 `uid:1` 关注的公众号：

```shell
> SDIFF uid:1 uid:2
1) "5"
2) "6" 
```

验证某个公众号是否同时被 `uid:1` 或 `uid:2` 关注:

```shell
> SISMEMBER uid:1 5
(integer) 1 # 返回0，说明关注了
> SISMEMBER uid:2 5
(integer) 0 # 返回0，说明没关注 
```

##### 抽奖活动

存储某活动中中奖的用户名 ，Set 类型因为有去重功能，可以保证同一个用户不会中奖两次。

key为抽奖活动名，value为员工名称，把所有员工名称放入抽奖箱 ：

```shell
>SADD lucky Tom Jerry John Sean Marry Lindy Sary Mark
(integer) 5 
```

如果允许重复中奖，可以使用 SRANDMEMBER 命令。

```shell
# 抽取 1 个一等奖：
> SRANDMEMBER lucky 1
1) "Tom"
# 抽取 2 个二等奖：
> SRANDMEMBER lucky 2
1) "Mark"
2) "Jerry"
# 抽取 3 个三等奖：
> SRANDMEMBER lucky 3
1) "Sary"
2) "Tom"
3) "Jerry" 
```

如果不允许重复中奖，可以使用 SPOP 命令。

```shell
# 抽取一等奖1个
> SPOP lucky 1
1) "Sary"
# 抽取二等奖2个
> SPOP lucky 2
1) "Jerry"
2) "Mark"
# 抽取三等奖3个
> SPOP lucky 3
1) "John"
2) "Sean"
3) "Lindy" 
```

---------------

### Zset

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/zset.png" style="zoom:30%;" />

Zset 类型（有序集合类型）相比于 Set 类型多了一个排序属性 score（分值），对于有序集合 ZSet 来说，每个存储元素相当于有两个值组成的，一个是有序集合的元素值，一个是排序值。

有序集合保留了集合不能有重复成员的特性（分值可以重复），但不同的是，有序集合中的元素可以排序。

#### 内部实现

##### ziplist（压缩列表）

- 元素个数 < 128 && 元素值 < 64 字节

> **在 Redis 7.0 中，`压缩列表` 数据结构已经废弃了，交由 `listpack` 数据结构来实现了**。

##### skiplist（跳跃表）

###### 数据结构

![image-20250610221821909](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610221821909.png)

```c++
typedef struct zskiplistNode {
    //Zset 对象的元素值
    sds ele;
    //元素权重值
    double score;
    //后向指针
    struct zskiplistNode *backward;
  
    //节点的level数组，保存每层上的前向指针和跨度
    struct zskiplistLevel {
        struct zskiplistNode *forward;
        unsigned long span;
    } level[];
} zskiplistNode;
```

###### 跳表节点查询过程

> 跳跃表的搜索操作从最顶层开始，向右移动，直到找到分值大于或等于搜索值的节点，然后下降一层继续搜索，直到找到目标节点

查找一个跳表节点的过程时，跳表会从头节点的最高层开始，逐一遍历每一层。在遍历某一层的跳表节点时，会用跳表节点中的 SDS 类型的元素和元素的权重来进行判断，共有两个判断条件：

- 如果当前节点的权重「小于」要查找的权重时，跳表就会访问该层上的下一个节点。
- 如果当前节点的权重「等于」要查找的权重时，并且当前节点的 SDS 类型数据「小于」要查找的数据时，跳表就会访问该层上的下一个节点。

如果上面两个条件都不满足，或者下一个节点为空时，跳表就会使用目前遍历到的节点的 level 数组里的下一层指针，然后沿着下一层指针继续查找，这就相当于跳到了下一层接着查找。

举个例子，下图有个 3 层级的跳表。

![image-20250610221921861](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250610221921861.png)

如果要查找「元素：abcd，权重：4」的节点，查找的过程是这样的：

- 先从头节点的最高层开始，L2 指向了「元素：abc，权重：3」节点，这个节点的权重比要查找节点的小，所以要访问该层上的下一个节点；
- 但是该层的下一个节点是空节点（ leve[2]指向的是空节点），于是就会跳到「元素：abc，权重：3」节点的下一层去找，也就是 leve[1];
- 「元素：abc，权重：3」节点的 leve[1] 的下一个指针指向了「元素：abcde，权重：4」的节点，然后将其和要查找的节点比较。虽然「元素：abcde，权重：4」的节点的权重和要查找的权重相同，但是当前节点的 SDS 类型数据「大于」要查找的数据，所以会继续跳到「元素：abc，权重：3」节点的下一层去找，也就是 leve[0]；
- 「元素：abc，权重：3」节点的 leve[0] 的下一个指针指向了「元素：abcd，权重：4」的节点，该节点正是要查找的节点，查询结束。

> 1. 初始化：从跳表的最顶层开始，这通常是跳表的最高层索引。
> 2. 向前跳跃：在当前层找到一个节点，其后面的节点值不大于要查找的值。如果当前节点后面的节点值大于要查找的值，或者当前节点已经是当前层的最后一个节点，则移动到下一层重复查找过程。
> 3. 移动到下一层：如果当前层没有找到合适的节点，或者当前节点的下一个节点值大于要查找的值，则移动到下一层，继续从当前节点或当前节点的下一个节点开始查找。
> 4. 重复查找：在新的层上重复步骤2和步骤3，直到到达跳表的最底层。
> 5. 找到节点：在最底层找到要查找的值，或者确定该值不存在于跳表中。

###### 层数设置过程 

- 在创建节点时候，会生成范围为[0-1]的一个随机数
- 这个随机数小于 0.25（相当于概率 25%），那么层数就增加 1 层
- 继续生成下一个随机数，直到随机数的结果大于 0.25 结束，最终确定该节点的层数
- 每增加一层的概率不超过 25%，层数越高，概率越低，层高最大限制是 64
- **如果层高最大限制是 64，那么在创建跳表「头节点」的时候，就会直接创建 64 层高的头节**

> `查询过程 平均 O(logN)，最坏 O(N) `

###### 为什么用跳表而不用平衡树

- **从内存占用上来比较，跳表比平衡树更灵活一些**
  - 平衡树每个节点包含 2 个指针（分别指向左右子树），而跳表每个节点包含的指针数目平均为 1/(1-p)，具体取决于参数 p 的大小。
  - 如果像 Redis 里的实现一样，取 p=1/4，那么平均每个节点包含 1.33 个指针，比平衡树更有优势。
- **在做范围查找的时候，跳表比平衡树操作要简单**
  - 在平衡树上，我们找到指定范围的小值之后，还需要以中序遍历的顺序继续寻找其它不超过大值的节点
  - 如果不对平衡树进行一定的改造，这里的中序遍历并不容易实现。而在跳表上进行范围查找就非常简单，只需要在找到小值之后，对第 1 层链表进行若干步的遍历就可以实现。
- 从算法实现难度上来比较，跳表比平衡树要简单得多
  - 平衡树的插入和删除操作可能引发子树的调整，逻辑复杂，而跳表的插入和删除只需要修改相邻节点的指针，操作简单又快速。

#### 常用命令

Zset 常用操作：

```shell
# 往有序集合key中加入带分值元素
ZADD key score member [[score member]...]   
# 往有序集合key中删除元素
ZREM key member [member...]                 
# 返回有序集合key中元素member的分值
ZSCORE key member
# 返回有序集合key中元素个数
ZCARD key 

# 为有序集合key中元素member的分值加上increment
ZINCRBY key increment member 

# 正序获取有序集合key从start下标到stop下标的元素
ZRANGE key start stop [WITHSCORES]
# 倒序获取有序集合key从start下标到stop下标的元素
ZREVRANGE key start stop [WITHSCORES]

# 返回有序集合中指定分数区间内的成员，分数由低到高排序。
ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]

# 返回指定成员区间内的成员，按字典正序排列, 分数必须相同。
ZRANGEBYLEX key min max [LIMIT offset count]
# 返回指定成员区间内的成员，按字典倒序排列, 分数必须相同
ZREVRANGEBYLEX key max min [LIMIT offset count] 
```

Zset 运算操作（相比于 Set 类型，ZSet 类型没有支持差集运算）：

```shell
# 并集计算(相同元素分值相加)，numberkeys一共多少个key，WEIGHTS每个key对应的分值乘积
ZUNIONSTORE destkey numberkeys key [key...] 
# 交集计算(相同元素分值相加)，numberkeys一共多少个key，WEIGHTS每个key对应的分值乘积
ZINTERSTORE destkey numberkeys key [key...] 
```

#### 应用场景

Zset 类型（Sorted Set，有序集合） 可以根据元素的权重来排序，我们可以自己来决定每个元素的权重值。比如说，我们可以根据元素插入 Sorted Set 的时间确定权重值，先插入的元素权重小，后插入的元素权重大。

在面对需要展示最新列表、排行榜等场景时，如果数据更新频繁或者需要分页显示，可以优先考虑使用 Sorted Set。

##### 排行榜

有序集合比较典型的使用场景就是排行榜。例如学生成绩的排名榜、游戏积分排行榜、视频播放排名、电商系统中商品的销量排名等。

我们以博文点赞排名为例，小林发表了五篇博文，分别获得赞为 200、40、100、50、150。

```shell
# arcticle:1 文章获得了200个赞
> ZADD user:xiaolin:ranking 200 arcticle:1
(integer) 1
# arcticle:2 文章获得了40个赞
> ZADD user:xiaolin:ranking 40 arcticle:2
(integer) 1
# arcticle:3 文章获得了100个赞
> ZADD user:xiaolin:ranking 100 arcticle:3
(integer) 1
# arcticle:4 文章获得了50个赞
> ZADD user:xiaolin:ranking 50 arcticle:4
(integer) 1
# arcticle:5 文章获得了150个赞
> ZADD user:xiaolin:ranking 150 arcticle:5
(integer) 1 
```

文章 arcticle:4 新增一个赞，可以使用 ZINCRBY 命令（为有序集合key中元素member的分值加上increment）：

```shell
> ZINCRBY user:xiaolin:ranking 1 arcticle:4
"51" 
```

查看某篇文章的赞数，可以使用 ZSCORE 命令（返回有序集合key中元素个数）：

```shell
> ZSCORE user:xiaolin:ranking arcticle:4
"50" 
```

获取小林文章赞数最多的 3 篇文章，可以使用 ZREVRANGE 命令（倒序获取有序集合 key 从start下标到stop下标的元素）：

```shell
# WITHSCORES 表示把 score 也显示出来
> ZREVRANGE user:xiaolin:ranking 0 2 WITHSCORES
1) "arcticle:1"
2) "200"
3) "arcticle:5"
4) "150"
5) "arcticle:3"
6) "100" 
```

获取小林 100 赞到 200 赞的文章，可以使用 ZRANGEBYSCORE 命令（返回有序集合中指定分数区间内的成员，分数由低到高排序）：

```shell
> ZRANGEBYSCORE user:xiaolin:ranking 100 200 WITHSCORES
1) "arcticle:3"
2) "100"
3) "arcticle:5"
4) "150"
5) "arcticle:1"
6) "200" 
```

##### 电话、姓名排序

使用有序集合的 `ZRANGEBYLEX` 或 `ZREVRANGEBYLEX` 可以帮助我们实现电话号码或姓名的排序，我们以 `ZRANGEBYLEX` （返回指定成员区间内的成员，按 key 正序排列，分数必须相同）为例。

> **注意：不要在分数不一致的 SortSet 集合中去使用 ZRANGEBYLEX和 ZREVRANGEBYLEX 指令，因为获取的结果会不准确。** 

_1、电话排序_

我们可以将电话号码存储到 SortSet 中，然后根据需要来获取号段：

```shell
> ZADD phone 0 13100111100 0 13110114300 0 13132110901 
(integer) 3
> ZADD phone 0 13200111100 0 13210414300 0 13252110901 
(integer) 3
> ZADD phone 0 13300111100 0 13310414300 0 13352110901 
(integer) 3 
```

获取所有号码:

```shell
> ZRANGEBYLEX phone - +
1) "13100111100"
2) "13110114300"
3) "13132110901"
4) "13200111100"
5) "13210414300"
6) "13252110901"
7) "13300111100"
8) "13310414300"
9) "13352110901" 
```

获取 132 号段的号码：

```shell
> ZRANGEBYLEX phone [132 (133
1) "13200111100"
2) "13210414300"
3) "13252110901" 
```

获取132、133号段的号码：

```shell
> ZRANGEBYLEX phone [132 (134
1) "13200111100"
2) "13210414300"
3) "13252110901"
4) "13300111100"
5) "13310414300"
6) "13352110901" 
```

_2、姓名排序_

```shell
> zadd names 0 Toumas 0 Jake 0 Bluetuo 0 Gaodeng 0 Aimini 0 Aidehua 
(integer) 6 
```

获取所有人的名字:

```shell
> ZRANGEBYLEX names - +
1) "Aidehua"
2) "Aimini"
3) "Bluetuo"
4) "Gaodeng"
5) "Jake"
6) "Toumas" 
```

获取名字中大写字母A开头的所有人：

```shell
> ZRANGEBYLEX names [A (B
1) "Aidehua"
2) "Aimini" 
```

获取名字中大写字母 C 到 Z 的所有人：

```shell
> ZRANGEBYLEX names [C [Z
1) "Gaodeng"
2) "Jake"
3) "Toumas" 
```

-------------------

### BitMap

#### 内部实现

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/bitmap.png" style="zoom:30%;" />

- String 类型作为底层数据结构实现的一种统计二值状态的数据类型
- String 类型是会保存为二进制的字节数组，所以，Redis 就把字节数组的每个 bit 位利用起来，用来表示一个元素的二值状态，你可以把 Bitmap 看作是一个 bit 数组

#### 常用命令

bitmap 基本操作：

```shell
# 设置值，其中value只能是 0 和 1
SETBIT key offset value

# 获取值
GETBIT key offset

# 获取指定范围内值为 1 的个数
# start 和 end 以字节为单位
BITCOUNT key start end 
```

bitmap 运算操作：

```shell
# BitMap间的运算
# operations 位移操作符，枚举值
  AND 与运算 &
  OR 或运算 |
  XOR 异或 ^
  NOT 取反 ~
# result 计算的结果，会存储在该key中
# key1 … keyn 参与运算的key，可以有多个，空格分割，not运算只能一个key
# 当 BITOP 处理不同长度的字符串时，较短的那个字符串所缺少的部分会被看作 0。返回值是保存到 destkey 的字符串的长度（以字节byte为单位），和输入 key 中最长的字符串长度相等。
BITOP [operations] [result] [key1] [keyn…]

# 返回指定key中第一次出现指定value(0/1)的位置
BITPOS [key] [value] 
```

#### 应用场景

Bitmap 类型非常适合二值状态统计的场景，这里的二值状态就是指集合元素的取值就只有 0 和 1 两种，在记录海量数据时，Bitmap 能够有效地节省内存空间。

##### 签到统计

在签到打卡的场景中，我们只用记录签到（1）或未签到（0），所以它就是非常典型的二值状态。

签到统计时，每个用户一天的签到用 1 个 bit 位就能表示，一个月（假设是 31 天）的签到情况用 31 个 bit 位就可以，而一年的签到也只需要用 365 个 bit 位，根本不用太复杂的集合类型。

假设我们要统计 ID 100 的用户在 2022 年 6 月份的签到情况，就可以按照下面的步骤进行操作。

第一步，执行下面的命令，记录该用户 6 月 3 号已签到。

```shell
SETBIT uid:sign:100:202206 2 1 
```

第二步，检查该用户 6 月 3 日是否签到。

```shell
GETBIT uid:sign:100:202206 2 
```

第三步，统计该用户在 6 月份的签到次数。

```shell
BITCOUNT uid:sign:100:202206 
```

这样，我们就知道该用户在 6 月份的签到情况了。

> 如何统计这个月首次打卡时间呢？

Redis 提供了 `BITPOS key bitValue [start] [end]`指令，返回数据表示 Bitmap 中第一个值为 `bitValue` 的 offset 位置。

在默认情况下， 命令将检测整个位图， 用户可以通过可选的 `start` 参数和 `end` 参数指定要检测的范围。所以我们可以通过执行这条命令来获取 userID = 100 在 2022 年 6 月份**首次打卡**日期：

```shell
BITPOS uid:sign:100:202206 1 
```

需要注意的是，因为 offset 从 0 开始的，所以我们需要将返回的 value + 1 。

##### 判断用户登陆态

Bitmap 提供了 `GETBIT、SETBIT` 操作，通过一个偏移值 offset 对 bit 数组的 offset 位置的 bit 位进行读写操作，需要注意的是 offset 从 0 开始。

只需要一个 key = login\_status 表示存储用户登陆状态集合数据， 将用户 ID 作为 offset，在线就设置为 1，下线设置 0。通过 `GETBIT`判断对应的用户是否在线。 5000 万用户只需要 6 MB 的空间。

假如我们要判断 ID = 10086 的用户的登陆情况：

第一步，执行以下指令，表示用户已登录。

```shell
SETBIT login_status 10086 1 
```

第二步，检查该用户是否登陆，返回值 1 表示已登录。

```shell
GETBIT login_status 10086 
```

第三步，登出，将 offset 对应的 value 设置成 0。

```shell
SETBIT login_status 10086 0 
```

##### 连续签到用户总数

如何统计出这连续 7 天连续打卡用户总数呢？

我们把每天的日期作为 Bitmap 的 key，userId 作为 offset，若是打卡则将 offset 位置的 bit 设置成 1。

key 对应的集合的每个 bit 位的数据则是一个用户在该日期的打卡记录。

一共有 7 个这样的 Bitmap，如果我们能对这 7 个 Bitmap 的对应的 bit 位做 『与』运算。同样的 UserID offset 都是一样的，当一个 userID 在 7 个 Bitmap 对应对应的 offset 位置的 bit = 1 就说明该用户 7 天连续打卡。

结果保存到一个新 Bitmap 中，我们再通过 `BITCOUNT` 统计 bit = 1 的个数便得到了连续打卡 7 天的用户总数了。

Redis 提供了 `BITOP operation destkey key [key ...]`这个指令用于对一个或者多个 key 的 Bitmap 进行位元操作。

*   `operation` 可以是 `and`、`OR`、`NOT`、`XOR`。当 BITOP 处理不同长度的字符串时，较短的那个字符串所缺少的部分会被看作 `0` 。空的 `key` 也被看作是包含 `0` 的字符串序列。

假设要统计 3 天连续打卡的用户数，则是将三个 bitmap 进行 AND 操作，并将结果保存到 destmap 中，接着对 destmap 执行 BITCOUNT 统计，如下命令：

```shell
# 与操作
BITOP AND destmap bitmap:01 bitmap:02 bitmap:03
# 统计 bit 位 =  1 的个数
BITCOUNT destmap 
```

即使一天产生一个亿的数据，Bitmap 占用的内存也不大，大约占 12 MB 的内存（10^8/8/1024/1024），7 天的 Bitmap 的内存开销约为 84 MB。同时我们最好给 Bitmap 设置过期时间，让 Redis 删除过期的打卡数据，节省内存。

### HyperLogLog

- 统计一个集合中不重复的元素个数（不精确）
- 统计规则是基于概率完成的
- 百万级网页 UV 计数

> 在 Redis 里面，**每个 HyperLogLog 键只需要花费 12 KB 内存，就可以计算接近 `2^64` 个不同元素的基数**，和元素越多就越耗费内存的 Set 和 Hash 类型相比，HyperLogLog 就非常节省空间。
>
> 这什么概念？举个例子给大家对比一下。
>
> 用 Java 语言来说，一般 long 类型占用 8 字节，而 1 字节有 8 位，即：1 byte = 8 bit，即 long 数据类型最大可以表示的数是：`2^63-1`。对应上面的`2^64`个数，假设此时有`2^63-1`这么多个数，从 `0 ~ 2^63-1`，按照`long`以及`1k = 1024 字节`的规则来计算内存总数，就是：`((2^63-1) * 8/1024)K`，这是很庞大的一个数，存储空间远远超过`12K`，而 `HyperLogLog` 却可以用 `12K` 就能统计完。

#### 内部实现

HyperLogLog 的实现涉及到很多数学问题，太费脑子了，我也没有搞懂，如果你想了解一下，课下可以看看这个：[HyperLogLog (opens new window)](https://en.wikipedia.org/wiki/HyperLogLog)。

#### 常见命令

HyperLogLog 命令很少，就三个。

```shell
# 添加指定元素到 HyperLogLog 中
PFADD key element [element ...]

# 返回给定 HyperLogLog 的基数估算值。
PFCOUNT key [key ...]

# 将多个 HyperLogLog 合并为一个 HyperLogLog
PFMERGE destkey sourcekey [sourcekey ...] 
```

#### 应用场景

##### 百万级网页 UV 计数

Redis HyperLogLog 优势在于只需要花费 12 KB 内存，就可以计算接近 2^64 个元素的基数，和元素越多就越耗费内存的 Set 和 Hash 类型相比，HyperLogLog 就非常节省空间。

所以，非常适合统计百万级以上的网页 UV 的场景。

在统计 UV 时，你可以用 PFADD 命令（用于向 HyperLogLog 中添加新元素）把访问页面的每个用户都添加到 HyperLogLog 中。

```shell
PFADD page1:uv user1 user2 user3 user4 user5 
```

接下来，就可以用 PFCOUNT 命令直接获得 page1 的 UV 值了，这个命令的作用就是返回 HyperLogLog 的统计结果。

```shell
PFCOUNT page1:uv 
```

不过，有一点需要你注意一下，HyperLogLog 的统计规则是基于概率完成的，所以它给出的统计结果是有一定误差的，标准误算率是 0.81%。

这也就意味着，你使用 HyperLogLog 统计的 UV 是 100 万，但实际的 UV 可能是 101 万。虽然误差率不算大，但是，如果你需要精确统计结果的话，最好还是继续用 Set 或 Hash 类型。

### GEO

Redis GEO 是 Redis 3.2 版本新增的数据类型，主要用于存储地理位置信息，并对存储的信息进行操作。

在日常生活中，我们越来越依赖搜索“附近的餐馆”、在打车软件上叫车，这些都离不开基于位置信息服务（Location-Based Service，LBS）的应用。

LBS 应用访问的数据是和人或物关联的一组经纬度信息，而且要能查询相邻的经纬度范围，GEO 就非常适合应用在 LBS 服务的场景中。

#### 内部实现

GEO 本身并没有设计新的底层数据结构，而是直接使用了 Sorted Set 集合类型。

GEO 类型使用 GeoHash 编码方法实现了经纬度到 `Sorted Set` 中元素权重分数的转换，这其中的两个关键机制就是「对二维地图做区间划分」和「对区间进行编码」。一组经纬度落在某个区间后，就用区间的编码值来表示，并把编码值作为 `Sorted Set` 元素的 `权重分数`。

这样一来，我们就可以把经纬度保存到 `Sorted Set` 中，利用 `Sorted Set` 提供的“按权重进行有序范围查找”的特性，实现 LBS 服务中频繁使用的“搜索附近”的需求。

#### 常用命令

```shell
# 存储指定的地理空间位置，可以将一个或多个经度(longitude)、纬度(latitude)、位置名称(member)添加到指定的 key 中。
GEOADD key longitude latitude member [longitude latitude member ...]

# 从给定的 key 里返回所有指定名称(member)的位置（经度和纬度），不存在的返回 nil。
GEOPOS key member [member ...]

# 返回两个给定位置之间的距离。
GEODIST key member1 member2 [m|km|ft|mi]

# 根据用户给定的经纬度坐标来获取指定范围内的地理位置集合。
GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count] [ASC|DESC] [STORE key] [STOREDIST key] 
```

#### 应用场景

##### 滴滴叫车

这里以滴滴叫车的场景为例，介绍下具体如何使用 GEO 命令：GEOADD 和 GEORADIUS 这两个命令。

假设车辆 ID 是 33，经纬度位置是（116.034579，39.030452），我们可以用一个 GEO 集合保存所有车辆的经纬度，集合 key 是 cars:locations。

执行下面的这个命令，就可以把 ID 号为 33 的车辆的当前经纬度位置存入 GEO 集合中：

```shell
GEOADD cars:locations 116.034579 39.030452 33 
```

当用户想要寻找自己附近的网约车时，LBS 应用就可以使用 GEORADIUS 命令。

例如，LBS 应用执行下面的命令时，Redis 会根据输入的用户的经纬度信息（116.054579，39.030452 ），查找以这个经纬度为中心的 5 公里内的车辆信息，并返回给 LBS 应用。

```shell
GEORADIUS cars:locations 116.054579 39.030452 5 km ASC COUNT 10 
```

-------------------

### Stream

#### 介绍

Redis Stream 是 Redis 5.0 版本新增加的数据类型，Redis 专门为消息队列设计的数据类型。

在 Redis 5.0 Stream 没出来之前，消息队列的实现方式都有着各自的缺陷，例如：

*   发布订阅模式，不能持久化也就无法可靠的保存消息，并且对于离线重连的客户端不能读取历史消息的缺陷；
*   List 实现消息队列的方式不能重复消费，一个消息消费完就会被删除，而且生产者需要自行实现全局唯一 ID。

基于以上问题，Redis 5.0 便推出了 Stream 类型也是此版本最重要的功能，用于完美地实现消息队列，它支持消息的持久化、支持自动生成全局唯一 ID、支持 ack 确认消息的模式、支持消费组模式等，让消息队列更加的稳定和可靠。

#### 常见命令

Stream 消息队列操作命令：

*   XADD：插入消息，保证有序，可以自动生成全局唯一 ID；
*   XLEN ：查询消息长度；
*   XREAD：用于读取消息，可以按 ID 读取数据；
*   XDEL ： 根据消息 ID 删除消息；
*   DEL ：删除整个 Stream；
*   XRANGE ：读取区间消息
*   XREADGROUP：按消费组形式读取消息；
*   XPENDING 和 XACK：
    *   XPENDING 命令可以用来查询每个消费组内所有消费者「已读取、但尚未确认」的消息；
    *   XACK 命令用于向消息队列确认消息处理已完成；

#### 应用场景

##### 消息队列

生产者通过 XADD 命令插入一条消息：

```shell
# * 表示让 Redis 为插入的数据自动生成一个全局唯一的 ID
# 往名称为 mymq 的消息队列中插入一条消息，消息的键是 name，值是 xiaolin
> XADD mymq * name xiaolin
"1654254953808-0" 
```

插入成功后会返回全局唯一的 ID："1654254953808-0"。消息的全局唯一 ID 由两部分组成：

*   第一部分“1654254953808”是数据插入时，以毫秒为单位计算的当前服务器时间；
*   第二部分表示插入消息在当前毫秒内的消息序号，这是从 0 开始编号的。例如，“1654254953808-0”就表示在“1654254953808”毫秒内的第 1 条消息。

消费者通过 XREAD 命令从消息队列中读取消息时，可以指定一个消息 ID，并从这个消息 ID 的下一条消息开始进行读取（注意是输入消息 ID 的下一条信息开始读取，不是查询输入ID的消息）。

```shell
# 从 ID 号为 1654254953807-0 的消息开始，读取后续的所有消息（示例中一共 1 条）。
> XREAD STREAMS mymq 1654254953807-0
1) 1) "mymq"
   2) 1) 1) "1654254953808-0"
         2) 1) "name"
            2) "xiaolin" 
```

如果**想要实现阻塞读（当没有数据时，阻塞住），可以调用 XRAED 时设定 BLOCK 配置项**，实现类似于 BRPOP 的阻塞读取操作。

比如，下面这命令，设置了 BLOCK 10000 的配置项，10000 的单位是毫秒，表明 XREAD 在读取最新消息时，如果没有消息到来，XREAD 将阻塞 10000 毫秒（即 10 秒），然后再返回。

```shell
# 命令最后的“$”符号表示读取最新的消息
> XREAD BLOCK 10000 STREAMS mymq $
(nil)
(10.00s) 
```

Stream 的基础方法，使用 xadd 存入消息和 xread 循环阻塞读取消息的方式可以实现简易版的消息队列，交互流程如下图所示：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/Stream简易.png" style="zoom:60%;" />

> 前面介绍的这些操作 List 也支持的，接下来看看 Stream 特有的功能。

Stream 可以以使用 **XGROUP 创建消费组**，创建消费组之后，Stream 可以使用 XREADGROUP 命令让消费组内的消费者读取消息。

创建两个消费组，这两个消费组消费的消息队列是 mymq，都指定从第一条消息开始读取：

```shell
# 创建一个名为 group1 的消费组，0-0 表示从第一条消息开始读取。
> XGROUP CREATE mymq group1 0-0
OK
# 创建一个名为 group2 的消费组，0-0 表示从第一条消息开始读取。
> XGROUP CREATE mymq group2 0-0
OK 
```

消费组 group1 内的消费者 consumer1 从 mymq 消息队列中读取所有消息的命令如下：

```shell
# 命令最后的参数“>”，表示从第一条尚未被消费的消息开始读取。
> XREADGROUP GROUP group1 consumer1 STREAMS mymq >
1) 1) "mymq"
   2) 1) 1) "1654254953808-0"
         2) 1) "name"
            2) "xiaolin" 
```

**消息队列中的消息一旦被消费组里的一个消费者读取了，就不能再被该消费组内的其他消费者读取了，即同一个消费组里的消费者不能消费同一条消息**。

比如说，我们执行完刚才的 XREADGROUP 命令后，再执行一次同样的命令，此时读到的就是空值了：

```shell
> XREADGROUP GROUP group1 consumer1 STREAMS mymq >
(nil) 
```

但是，**不同消费组的消费者可以消费同一条消息（但是有前提条件，创建消息组的时候，不同消费组指定了相同位置开始读取消息）**。

比如说，刚才 group1 消费组里的 consumer1 消费者消费了一条 id 为 1654254953808-0 的消息，现在用 group2 消费组里的 consumer1 消费者消费消息：

```shell
> XREADGROUP GROUP group2 consumer1 STREAMS mymq >
1) 1) "mymq"
   2) 1) 1) "1654254953808-0"
         2) 1) "name"
            2) "xiaolin" 
```

因为我创建两组的消费组都是从第一条消息开始读取，所以可以看到第二组的消费者依然可以消费 id 为 1654254953808-0 的这一条消息。因此，不同的消费组的消费者可以消费同一条消息。

使用消费组的目的是让组内的多个消费者共同分担读取消息，所以，我们通常会让每个消费者读取部分消息，从而实现消息读取负载在多个消费者间是均衡分布的。

例如，我们执行下列命令，让 group2 中的 consumer1、2、3 各自读取一条消息。

```shell
# 让 group2 中的 consumer1 从 mymq 消息队列中消费一条消息
> XREADGROUP GROUP group2 consumer1 COUNT 1 STREAMS mymq >
1) 1) "mymq"
   2) 1) 1) "1654254953808-0"
         2) 1) "name"
            2) "xiaolin"
# 让 group2 中的 consumer2 从 mymq 消息队列中消费一条消息
> XREADGROUP GROUP group2 consumer2 COUNT 1 STREAMS mymq >
1) 1) "mymq"
   2) 1) 1) "1654256265584-0"
         2) 1) "name"
            2) "xiaolincoding"
# 让 group2 中的 consumer3 从 mymq 消息队列中消费一条消息
> XREADGROUP GROUP group2 consumer3 COUNT 1 STREAMS mymq >
1) 1) "mymq"
   2) 1) 1) "1654256271337-0"
         2) 1) "name"
            2) "Tom" 
```

> 基于 Stream 实现的消息队列，如何保证消费者在发生故障或宕机再次重启后，仍然可以读取未处理完的消息？

Streams 会自动使用内部队列（也称为 PENDING List）留存消费组里每个消费者读取的消息，直到消费者使用 XACK 命令通知 Streams“消息已经处理完成”。

消费确认增加了消息的可靠性，一般在业务处理完成之后，需要执行 XACK 命令确认消息已经被消费完成，整个流程的执行如下图所示：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/消息确认.png" style="zoom:35%;" />

如果消费者没有成功处理消息，它就不会给 Streams 发送 XACK 命令，消息仍然会留存。此时，**消费者可以在重启后，用 XPENDING 命令查看已读取、但尚未确认处理完成的消息**。

例如，我们来查看一下 group2 中各个消费者已读取、但尚未确认的消息个数，命令如下：

```shell
127.0.0.1:6379> XPENDING mymq group2
1) (integer) 3
2) "1654254953808-0"  # 表示 group2 中所有消费者读取的消息最小 ID
3) "1654256271337-0"  # 表示 group2 中所有消费者读取的消息最大 ID
4) 1) 1) "consumer1"
      2) "1"
   2) 1) "consumer2"
      2) "1"
   3) 1) "consumer3"
      2) "1" 
```

如果想查看某个消费者具体读取了哪些数据，可以执行下面的命令：

```shell
# 查看 group2 里 consumer2 已从 mymq 消息队列中读取了哪些消息
> XPENDING mymq group2 - + 10 consumer2
1) 1) "1654256265584-0"
   2) "consumer2"
   3) (integer) 410700
   4) (integer) 1 
```

可以看到，consumer2 已读取的消息的 ID 是 1654256265584-0。

**一旦消息 1654256265584-0 被 consumer2 处理了，consumer2 就可以使用 XACK 命令通知 Streams，然后这条消息就会被删除**。

```shell
> XACK mymq group2 1654256265584-0
(integer) 1 
```

当我们再使用 XPENDING 命令查看时，就可以看到，consumer2 已经没有已读取、但尚未确认处理的消息了。

```shell
> XPENDING mymq group2 - + 10 consumer2
(empty array) 
```

好了，基于 Stream 实现的消息队列就说到这里了，小结一下：

*   消息保序：XADD/XREAD
*   阻塞读取：XREAD block
*   重复消息处理：Stream 在使用 XADD 命令，会自动生成全局唯一 ID；
*   消息可靠性：内部使用 PENDING List 自动保存消息，使用 XPENDING 命令查看消费组已经读取但是未被确认的消息，消费者使用 XACK 确认消息；
*   支持消费组形式消费数据

> Redis 基于 Stream 消息队列与专业的消息队列有哪些差距？

一个专业的消息队列，必须要做到两大块：

*   消息不丢。
*   消息可堆积。

_1、Redis Stream 消息会丢失吗？_

使用一个消息队列，其实就分为三大块：**生产者、队列中间件、消费者**，所以要保证消息就是保证三个环节都不能丢失数据。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/消息队列三个阶段-20250610223909087.png" style="zoom:30%;" />

Redis Stream 消息队列能不能保证三个环节都不丢失数据？

*   Redis 生产者会不会丢消息？生产者会不会丢消息，取决于生产者对于异常情况的处理是否合理。 从消息被生产出来，然后提交给 MQ 的过程中，只要能正常收到 （ MQ 中间件） 的 ack 确认响应，就表示发送成功，所以只要处理好返回值和异常，如果返回异常则进行消息重发，那么这个阶段是不会出现消息丢失的。
*   Redis 消费者会不会丢消息？不会，因为 Stream （ MQ 中间件）会自动使用内部队列（也称为 PENDING List）留存消费组里每个消费者读取的消息，但是未被确认的消息。消费者可以在重启后，用 XPENDING 命令查看已读取、但尚未确认处理完成的消息。等到消费者执行完业务逻辑后，再发送消费确认 XACK 命令，也能保证消息的不丢失。
*   Redis 消息中间件会不会丢消息？**会**，Redis 在以下 2 个场景下，都会导致数据丢失：
    *   AOF 持久化配置为每秒写盘，但这个写盘过程是异步的，Redis 宕机时会存在数据丢失的可能
    *   主从复制也是异步的，[主从切换时，也存在丢失数据的可能 (opens new window)](https://xiaolincoding.com/redis/cluster/master_slave_replication.html#redis-%E4%B8%BB%E4%BB%8E%E5%88%87%E6%8D%A2%E5%A6%82%E4%BD%95%E5%87%8F%E5%B0%91%E6%95%B0%E6%8D%AE%E4%B8%A2%E5%A4%B1)。

可以看到，Redis 在队列中间件环节无法保证消息不丢。像 RabbitMQ 或 Kafka 这类专业的队列中间件，在使用时是部署一个集群，生产者在发布消息时，队列中间件通常会写「多个节点」，也就是有多个副本，这样一来，即便其中一个节点挂了，也能保证集群的数据不丢失。

_2、Redis Stream 消息可堆积吗？_

Redis 的数据都存储在内存中，这就意味着一旦发生消息积压，则会导致 Redis 的内存持续增长，如果超过机器内存上限，就会面临被 OOM 的风险。

所以 Redis 的 Stream 提供了可以指定队列最大长度的功能，就是为了避免这种情况发生。

当指定队列最大长度时，队列长度超过上限后，旧消息会被删除，只保留固定长度的新消息。这么来看，Stream 在消息积压时，如果指定了最大长度，还是有可能丢失消息的。

但 Kafka、RabbitMQ 专业的消息队列它们的数据都是存储在磁盘上，当消息积压时，无非就是多占用一些磁盘空间。

因此，把 Redis 当作队列来使用时，会面临的 2 个问题：

*   Redis 本身可能会丢数据；
*   面对消息挤压，内存资源会紧张；

所以，能不能将 Redis 作为消息队列来使用，关键看你的业务场景：

*   如果你的业务场景足够简单，对于数据丢失不敏感，而且消息积压概率比较小的情况下，把 Redis 当作队列是完全可以的。
*   如果你的业务有海量消息，消息积压的概率比较大，并且不能接受数据丢失，那么还是用专业的消息队列中间件吧。

> 补充：Redis 发布/订阅机制为什么不可以作为消息队列？

发布订阅机制存在以下缺点，都是跟丢失数据有关：

1.  发布/订阅机制没有基于任何数据类型实现，所以不具备「数据持久化」的能力，也就是发布/订阅机制的相关操作，不会写入到 RDB 和 AOF 中，当 Redis 宕机重启，发布/订阅机制的数据也会全部丢失。
2.  发布订阅模式是“发后既忘”的工作模式，如果有订阅者离线重连之后不能消费之前的历史消息。
3.  当消费端有一定的消息积压时，也就是生产者发送的消息，消费者消费不过来时，如果超过 32M 或者是 60s 内持续保持在 8M 以上，消费端会被强行断开，这个参数是在配置文件中设置的，默认值是 `client-output-buffer-limit pubsub 32mb 8mb 60`。

所以，发布/订阅机制只适合即时通讯的场景，比如[构建哨兵集群 (opens new window)](https://xiaolincoding.com/redis/cluster/sentinel.html#%E5%93%A8%E5%85%B5%E9%9B%86%E7%BE%A4%E6%98%AF%E5%A6%82%E4%BD%95%E7%BB%84%E6%88%90%E7%9A%84)的场景采用了发布/订阅机制。

## Redis 线程模型

### Redis 是单线程吗？

**Redis 单线程指的是「接收客户端请求->解析请求 ->进行数据读写等操作->发送数据给客户端」这个过程是由一个线程（主线程）来完成的**，这也是我们常说 Redis 是单线程的原因。

但是，**Redis 程序并不是单线程的**，Redis 在启动的时候，是会**启动后台线程**（BIO）的：

*   **Redis 在 2.6 版本**，会启动 2 个后台线程，分别处理关闭文件、AOF 刷盘这两个任务；
*   **Redis 在 4.0 版本之后**，新增了一个新的后台线程，用来异步释放 Redis 内存，也就是 lazyfree 线程。例如执行 unlink key / flushdb async / flushall async 等命令，会把这些删除操作交给后台线程来执行，好处是不会导致 Redis 主线程卡顿。因此，当我们要删除一个大 key 的时候，不要使用 del 命令删除，因为 del 是在主线程处理的，这样会导致 Redis 主线程卡顿，因此我们应该使用 unlink 命令来异步删除大key。

之所以 Redis 为「关闭文件、AOF 刷盘、释放内存」这些任务创建单独的线程来处理，是因为这些任务的操作都是很耗时的，如果把这些任务都放在主线程来处理，那么 Redis 主线程就很容易发生阻塞，这样就无法处理后续的请求了。

后台线程相当于一个消费者，生产者把耗时任务丢到任务队列中，消费者（BIO）不停轮询这个队列，拿出任务就去执行对应的方法即可。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/后台线程.jpg" style="zoom:50%;" />

关闭文件、AOF 刷盘、释放内存这三个任务都有各自的任务队列：

*   BIO\_CLOSE\_FILE，关闭文件任务队列：当队列有任务后，后台线程会调用 close(fd) ，将文件关闭；
*   BIO\_AOF\_FSYNC，AOF刷盘任务队列：当 AOF 日志配置成 everysec 选项后，主线程会把 AOF 写日志操作封装成一个任务，也放到队列中。当发现队列有任务后，后台线程会调用 fsync(fd)，将 AOF 文件刷盘，
*   BIO\_LAZY\_FREE，lazy free 任务队列：当队列有任务后，后台线程会 free(obj) 释放对象 / free(dict) 删除数据库所有对象 / free(skiplist) 释放跳表对象；

### Redis 单线程模式是怎样的？

Redis 6.0 版本之前的单线模式如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/redis单线程模型.drawio.png" style="zoom:50%;" />

图中的蓝色部分是一个事件循环，是由主线程负责的，可以看到网络 I/O 和命令处理都是单线程。 Redis 初始化的时候，会做下面这几件事情：

*   首先，调用 epoll\_create() 创建一个 epoll 对象和调用 socket() 创建一个服务端 socket
*   然后，调用 bind() 绑定端口和调用 listen() 监听该 socket；
*   然后，将调用 epoll\_ctl() 将 listen socket 加入到 epoll，同时注册「连接事件」处理函数。

初始化完后，主线程就进入到一个**事件循环函数**，主要会做以下事情：

*   首先，先调用**处理发送队列函数**，看是发送队列里是否有任务，如果有发送任务，则通过 write 函数将客户端发送缓存区里的数据发送出去，如果这一轮数据没有发送完，就会注册写事件处理函数，等待 epoll\_wait 发现可写后再处理 。
*   接着，调用 epoll\_wait 函数等待事件的到来：
    *   如果是**连接事件**到来，则会调用**连接事件处理函数**，该函数会做这些事情：调用 accpet 获取已连接的 socket -> 调用 epoll\_ctl 将已连接的 socket 加入到 epoll -> 注册「读事件」处理函数；
    *   如果是**读事件**到来，则会调用**读事件处理函数**，该函数会做这些事情：调用 read 获取客户端发送的数据 -> 解析命令 -> 处理命令 -> 将客户端对象添加到发送队列 -> 将执行结果写到发送缓存区等待发送；
    *   如果是**写事件**到来，则会调用**写事件处理函数**，该函数会做这些事情：通过 write 函数将客户端发送缓存区里的数据发送出去，如果这一轮数据没有发送完，就会继续注册写事件处理函数，等待 epoll\_wait 发现可写后再处理 。

以上就是 Redis 单线模式的工作方式，如果你想看源码解析，可以参考这一篇：[为什么单线程的 Redis 如何做到每秒数万 QPS ？ (opens new window)](https://mp.weixin.qq.com/s/oeOfsgF-9IOoT5eQt5ieyw)

### Redis 采用单线程为什么还这么快？

> 官方使用基准测试的结果是，**单线程的 Redis 吞吐量可以达到 10W/每秒**。

1. 纯内存操作

- 相对于数据存在磁盘的数据库，就省去磁盘磁盘 I/O 的消耗

2. 高效的数据结构

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250612182207136.png" alt="image-20250612182207136" style="zoom:50%;" />

3. 单线程模型

- 避免了 CPU 不必要的上下文切换和竞争锁的消耗

4. IO 多路复用机制

> - 1 个线程可以监视多个文件句柄
> - 一旦某个文件句柄就绪，就能够通知应用程序进行相应的读写操作
> - 而 没有文件句柄就绪时，就会阻塞应用程序，交出 cpu

Redis 服务采用 `Reactor` (非阻塞同步网络模型)的方式来实现网络事件处理器（每一个网络连接其实都对应一个文件描述符）文件事件处理器使用 `I/O` 多路复用模块同时监听多个 `FD`（file discriptor），当 `accept`、`read`、`write` 和 `close`文件事件产生时，文件事件处理器就会回调 `FD` 绑定的事件处理器。

虽然整个文件事件处理器是在单线程上运行的，但是通过 `I/O` 多路复用模块的引入，实现了同时对多个 `FD` 读写的监控，提高了网络通信模型的性能，同时也可以保证整个 Redis 服务实现的简单。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250612182305834.png" alt="image-20250612182305834" style="zoom:30%;" />
    
I/O 多路复用程序：提供 `select`、`epoll`、`evport`、`kqueue` 的实现，会根据当前系统自动选择最佳的方式。

- 负责监听多个套接字，当套接字产生事件时，会向文件事件分派器传送那些产生了事件的套接字。
- 当多个文件事件并发出现时， `I/O` 多路复用程序会将所有产生事件的套接字都放到一个队列里面，然后通过这个队列，以有序、同步、每次一个套接字的方式向文件事件分派器传送套接字：当上一个套接字产生的事件被处理完毕之后，才会继续传送下一个套接字。

5. 底层的存储结构优化

### 为什么采用单线程

- CPU 不会成为 Redis 的制约瓶颈，Redis 主要受内存、网络限制

### 多线程出现的原因

- 只是使用多线程来处理数据的读写和协议解析，执行命令还是使用单线程
- 这些线程负责读取客户端的请求并将其放入队列，以及将响应写回客户端。命令的执行仍然是由主线程（单线程）完成的
- 使用多线程能提升 IO 读写的效率，从而整体提高 redis 的性能

## Redis 持久化

### Redis 如何实现数据不丢失？

Redis 的读写操作都是在内存中，所以 Redis 性能才会高，但是当 Redis 重启后，内存中的数据就会丢失，那为了保证内存中的数据不会丢失，Redis 实现了数据持久化的机制，这个机制会把数据存储到磁盘，这样在 Redis 重启就能够从磁盘中恢复原有的数据。

Redis 共有三种数据持久化的方式：

*   **AOF 日志**：每执行一条写操作命令，就把该命令以追加的方式写入到一个文件里；
*   **RDB 快照**：将某一时刻的内存数据，以二进制的方式写入磁盘；
*   **混合持久化方式**：Redis 4.0 新增的方式，集成了 AOF 和 RDB 的优点；

#### AOF

##### 介绍

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/6f0ab40396b7fc2c15e6f4487d3a0ad7-20230309232240301.png" style="zoom:70%;" />



> 为什么先执行命令，再把数据写入日志

Reids 是先执行写操作命令后，才将该命令记录到 `AOF` 日志里的，这么做其实有两个好处。

*   **避免额外的检查开销**：因为如果先将写操作命令记录到 `AOF` 日志里，再执行该命令的话，如果当前的命令语法有问题，那么如果不进行命令语法检查，该错误的命令记录到 `AOF` 日志里后，Redis 在使用日志恢复数据时，就可能会出错。
*   **不会阻塞当前写操作命令的执行**：因为当写操作命令执行成功后，才会将命令记录到 `AOF` 日志。

当然，这样做也会带来风险：

*   **数据可能会丢失：**  执行写操作命令和记录日志是两个过程，那当 Redis 在还没来得及将命令写入到硬盘时，服务器发生宕机了，这个数据就会有丢失的风险。
*   **可能阻塞其他操作：**  由于写操作命令执行成功后才记录到 `AOF` 日志，所以不会阻塞当前命令的执行，但因为 `AOF` 日志也是在主线程中执行，所以当 Redis 把日志文件写入磁盘的时候，还是会阻塞后续的操作无法执行。

##### AOF 写回策略（持久化策略）

先来看看，Redis 写入 `AOF` 日志的过程，如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/4eeef4dd1bedd2ffe0b84d4eaa0dbdea-20230309232249413.png" style="zoom:50%;" />

具体说说：

1.  Redis 执行完写操作命令后，会将命令追加到 server.aof\_buf 缓冲区；
2.  然后通过 write() 系统调用，将 aof\_buf 缓冲区的数据写入到 AOF 文件，此时数据并没有写入到硬盘，而是拷贝到了内核缓冲区 page cache，等待内核将数据写入硬盘；
3.  具体内核缓冲区的数据什么时候写入到硬盘，由内核决定。

> Redis 提供了 3 种写回硬盘的策略，控制的就是上面说的第三步的过程。 

在 Redis.conf 配置文件中的 `appendfsync` 配置项可以有以下 3 种参数可填：

*   **Always**，这个单词的意思是「总是」，所以它的意思是每次写操作命令执行完后，同步将 AOF 日志数据写回硬盘；
*   **Everysec**，这个单词的意思是「每秒」，所以它的意思是每次写操作命令执行完后，先将命令写入到 AOF 文件的内核缓冲区，然后每隔一秒将缓冲区里的内容写回到硬盘；
*   **No**，意味着不由 Redis 控制写回硬盘的时机，转交给操作系统控制写回的时机，也就是每次写操作命令执行完后，先将命令写入到 AOF 文件的内核缓冲区，再由操作系统决定何时将缓冲区内容写回硬盘。

我也把这 3 个写回策略的优缺点总结成了一张表格：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/98987d9417b2bab43087f45fc959d32a-20230309232253633.png" style="zoom:70%;" />

##### 重写机制

> `AOF` 日志过大，会触发什么机制？

`AOF` 日志是一个文件，随着执行的写操作命令越来越多，文件的大小会越来越大。 如果当 `AOF` 日志文件过大就会带来性能问题，比如重启 Redis 后，需要读 `AOF` 文件的内容以恢复数据，如果文件过大，整个恢复的过程就会很慢。

所以，Redis 为了避免 AOF 文件越写越大，提供了 **`AOF` 重写机制**，当 `AOF` 文件的大小超过所设定的阈值后，Redis 就会启用 `AOF` 重写机制，来压缩 `AOF` 文件。

`AOF` 重写机制是在重写时，读取当前数据库中的所有键值对，然后将每一个键值对用一条命令记录到「新的 `AOF` 文件」，等到全部记录完后，就将新的 `AOF` 文件替换掉现有的 `AOF` 文件。

举个例子，在没有使用重写机制前，假设前后执行了「_set name xiaolin_」和「_set name xiaolincoding_」这两个命令的话，就会将这两个命令记录到 `AOF` 文件。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/723d6c580c05400b3841bc69566dd61b-20230309232257343.png" style="zoom:50%;" />

但是**在使用重写机制后，就会读取 name 最新的 value（键值对） ，然后用一条 「set name xiaolincoding」命令记录到新的 `AOF` 文件**，之前的第一个命令就没有必要记录了，因为它属于「历史」命令，没有作用了。这样一来，一个键值对在重写日志中只用一条命令就行了。

重写工作完成后，就会将新的 `AOF` 文件覆盖现有的 `AOF` 文件，这就相当于压缩了 `AOF` 文件，使得 `AOF` 文件体积变小了。

##### 总结

- 优点
  - `AOF` 可以「更好的保护数据不丢失」
  - `AOF` 是将命令直接追加在文件末尾的，写入性能非常高
- 缺点
  - 对于同一份数据源来说，一般情况下 `AOF` 文件比 `RDB` 数据快照要大
  - 数据恢复比较慢，不适合做冷备
- 持久化策略
  - `always`
    - 每执行一次数据修改命令就将其命令写入到磁盘日志文件上
  - `everysec`
    - 每秒将命令写入到磁盘日志文件上
  - `no`
    - 不主动设置，由操作系统决定什么时候写入到磁盘日志文件上

#### RDB（快照）

##### 介绍

因为 `AOF` 日志记录的是操作命令，不是实际的数据，所以用 `AOF` 方法做故障恢复时，需要全量把日志都执行一遍，一旦 AOF 日志非常多，势必会造成 Redis 的恢复操作缓慢。

为了解决这个问题，Redis 增加了 `RDB` 快照。所谓的快照，就是记录某一个瞬间东西，比如当我们给风景拍照时，那一个瞬间的画面和信息就记录到了一张照片。

所以，`RDB` 快照就是记录某一个瞬间的内存数据，记录的是实际数据，而 `AOF` 文件记录的是命令操作的日志，而不是实际的数据。

因此在 Redis 恢复数据时， `RDB` 恢复数据的效率会比 `AOF` 高些，因为直接将 `RDB` 文件读入内存就可以，不需要像 `AOF` 那样还需要额外执行操作命令的步骤才能恢复数据。

##### RDB 做快照时会阻塞线程吗

Redis 提供了两个命令来生成 `RDB` 文件，分别是 `save` 和 `bgsave`，他们的区别就在于是否在「主线程」里执行：

*   执行了 `save` 命令，就会在主线程生成 `RDB` 文件，由于和执行操作命令在同一个线程，所以如果写入 `RDB` 文件的时间太长，**会阻塞主线程**；
*   执行了 `bgsave` 命令，会创建一个子进程来生成 `RDB` 文件，这样可以**避免主线程的阻塞**；

##### 总结

- 默认持久化方式，通过 `save` 或 `bgsave` 来生成压缩的二进制文件（RDB 文件）
- 优点
  - 将某一时间点 redis 内的所有数据保存下来，当我们做「大型的数据恢复时，RDB 的恢复速度会很快」
  - 由于 `RDB` 的 `FROK` 子进程这种机制，对客户端提供读写服务的影响会非常小
- 缺点
  - 有可能会产生长时间的数据丢失
  - 可能会有长时间停顿
- 触发条件
  - 通过配置文件，设置一定时间后自动执行 `RDB`
  - 如采用主从复制过程，会自动执行 `RDB`
  - Redis 执行 `shutdown` 时，在未开启 `AOF` 后会执行 `RDB`

#### 混合持久化

RDB 优点是数据恢复速度快，但是快照的频率不好把握。频率太低，丢失的数据就会比较多，频率太高，就会影响性能。

AOF 优点是丢失数据少，但是数据恢复不快。

为了集成了两者的优点， Redis 4.0 提出了**混合使用 AOF 日志和内存快照**，也叫混合持久化，既保证了 Redis 重启速度，又降低数据丢失风险。

混合持久化工作在 **AOF 日志重写过程**，当开启了混合持久化时，在 AOF 重写日志时，fork 出来的重写子进程会先将与主线程共享的内存数据以 RDB 方式写入到 AOF 文件，然后主线程处理的操作命令会被记录在重写缓冲区里，重写缓冲区里的增量命令会以 AOF 方式写入到 AOF 文件，写入完成后通知主进程将新的含有 RDB 格式和 AOF 格式的 AOF 文件替换旧的的 AOF 文件。

也就是说，使用了混合持久化，AOF 文件的**前半部分是 RDB 格式的全量数据，后半部分是 AOF 格式的增量数据**。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/f67379b60d151262753fec3b817b8617-20230309232312657.jpeg" style="zoom:70%;" />

这样的好处在于，重启 Redis 加载数据的时候，由于前半部分是 RDB 内容，这样**加载的时候速度会很快**。

加载完 RDB 的内容后，才会加载后半部分的 AOF 内容，这里的内容是 Redis 后台子进程重写 AOF 期间，主线程处理的操作命令，可以使得**数据更少的丢失**。

- **混合持久化优点：** 
  *   混合持久化结合了 RDB 和 AOF 持久化的优点，开头为 RDB 的格式，使得 Redis 可以更快的启动，同时结合 AOF 的优点，有减低了大量数据丢失的风险。


- **混合持久化缺点：** 

  *   AOF 文件中添加了 RDB 格式的内容，使得 AOF 文件的可读性变得很差；

  *   兼容性差，如果开启混合持久化，那么此混合持久化 AOF 文件，就不能用在 Redis 4.0 之前版本了。

## Redis 集群

### 主从复制

#### 过程

- slave 启动，向 master 发送 `sync `命令
- master 收到后，执行 `bgsave` 保存快照，生成全量 `RDB` 文件
- master 把 slave 的写命令记录到缓存
- bgsave 执行完成后，发送 `rdb` 给到 slave，slave 执行
- master 发送缓冲区的写命令给 slave，slave 接收命令并执行，完成复制初始化
- 此后，master 与 slave 就会维护一个 `TCP` 连接， 以后 master 每执行一个写命令都会同步给 slave

#### 优缺点

- master 自动同步 slave，读写分离，分担 master 压力
- 不具备自动容错和恢复功能，master 挂了，需手动指定 master
- master 宕机，如果未同步，可能出现数据不一致问题
- 难以支持在线扩容

#### 存在的问题

- 从节点拉取过期数据
  - 跟过期时间的设置方式有关系，我们一般采用 EXPIRE 和 PEXPIRE，表示从执行命令那个时刻开始，往后延长 ttl 时间。严重依赖于 开始时间 从什么时候算起。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613122256423.png" alt="image-20250613122256423" style="zoom:60%;" />

如上图所示，简单描述下过程：

- 主库在 `t1` 时刻写入一个带过期时间的数据，数据的有效期一直到 `t3`
- 由于网络原因、或者缓存服务器的执行效率，从库的命令并没有立即执行。一直等到了 `t2` 才开始执行， 数据的有效期则会延后到 `t5`
- 如果，此时客户端访问从库，发现数据依然处于有效期内，可以正常使用

#### 解决方案

可以采用 Redis 的另外两个命令，`EXPIREAT` 和 `PEXPIREAT`，相对简单，表示过期时间为一个具体的时间点。避免了对开始时间从什么时候算起的依赖。

- 主从数据不一致
  - 主从服务器之间网络延迟
  - 从库收到主库命令，但是由于单线程，在处理其他耗时命令
- 解决方案
  - 主从服务器尽量部署在同一个机房
  - 主从服务器尽量部署在同一个机房开发一个监控程序，定时拉取主从服务器的进度信息，计算进度差值。如果超过我们设置的阈值，则通知客户端断开从库的连接，全部访问主库

### 哨兵（核心还是主从，新增了哨兵机制）

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/db568766644a4d10b8a91cdd2f8a4070.png" style="zoom:30%;" />

#### 原理

- 3 个定时任务
  - 向主从节点发送 `info` 命令获取最新的主从结构
  - 通过发布订阅获取其他哨兵节点
  - 向其他节点发送 `ping` 命令进行心跳检测，判断是否下线
- 主观下线
  - 其他节点超过一定时间没有回复，主观判断下线
- 客观下线
  - 询问其他哨兵，该节点状态，超过一定数量，客观下线

#### 选举过程（Raft 算法）

- 当哨兵节点检测到主节点不可用时，它们会通过投票机制来选举出一个哨兵节点作为领导者，由领导者负责执行故障转移操作，包括将一个从节点提升为新的主节点，并让其他从节点重新同步新的主节点。
- 第一个发现 master 挂了的哨兵，向每个哨兵发送命令，选取自己
- 其他哨兵如果没有选取过他人，则投一票给他
- 如果超过一半票数，选取成功

#### 优缺点

哨兵模式基于主从复制模式，增加了哨兵来监控与自动处理故障。

- master 挂掉可以自动切换
- 难以在线扩容
- 需要额外的资源启动哨兵

### redis cluster

#### 原理

- 内置了 `16384` 个哈希槽
- put `key-value` 时，先对 key 使用 `crc16` 算法算出一个结果，然后把结果对 `16384` 求余数，这样每个 key 都会对应一个编号 在 0~16383 之间的哈希槽
- redis 会根据节点数量大致均等的将哈希槽映射到不同的节点

> 接下来的问题就是，这些哈希槽怎么被映射到具体的 Redis 节点上的呢？有两种方案：
>
> *   **平均分配：**  在使用 cluster create 命令创建 Redis 集群时，Redis 会自动把所有哈希槽平均分布到集群节点上。比如集群中有 9 个节点，则每个节点上槽的个数为 16384/9 个。
> *   **手动分配：**  可以使用 cluster meet 命令手动建立节点间的连接，组成集群，再使用 cluster addslots 命令，指定每个节点上的哈希槽个数。

#### 优缺点

- 优点

  - 无中心架构，数据按照 slot 分布在多个节点
  - 可线性扩展，节点可动态添加、删除
  - 能够实现自动故障转移，gossip 协议，投票机制完成 slave 到 master 转换

- 缺点

  - slave 充当 “冷备”，不对外提供读、写服务，只作为故障转移使用

  - key 事务操作有限，只支持多 key 在同一节点的事务操作

    - 这是因为Redis集群的数据是通过哈希槽（hash slot）来分布的，每个key都属于一个特定的哈希槽，而每个节点负责一部分哈希槽。事务操作需要保证原子性，即在事务中的所有命令要么全部执行，要么全部不执行。由于Redis集群中的节点是相对独立的，不支持跨节点的原子操作，因此事务操作也被限制在单个节点内。

    - 以下是一个简单的例子来说明这个限制：

      假设我们有一个Redis集群，由三个节点组成：节点A、节点B 和 节点C。每个节点分别负责一部分哈希槽。

      > 节点A: 哈希槽 0-5460
      >
      > 节点B: 哈希槽 5461-10922
      >
      > 节点C: 哈希槽 10923-16383

      现在我们有两个key，key1 和 key2，它们分别属于不同的哈希槽：

      > key1: 属于哈希槽 1000（由节点A负责）
      >
      > key2: 属于哈希槽 6000（由节点B负责）

      以下是一个尝试在Redis集群中执行的事务操作：

      ```powershell
      MULTI
      SET key1 value1
      SET key2 value2
      EXEC
      ```

      由于key1 和 key2分别属于不同的节点（节点A 和 节点B），上述事务操作将会失败，Redis会返回一个错误，指出事务包含的key不在同一个哈希槽中。

  #### 为什么是是 16384 个槽位

  - Redis key 的路由计算公式：slot  = CRC16（key） % 16384
  - CRC16 算法，产生的 hash 值有 16 bit 位，可以产生 65536（2^16）个值 ，也就是说值分布在 0 ~ 65535 之间
  - 心跳包需要把包含槽信息，如果 slots 数量是 65535,65536 / 8(一个字节 8bit) / 1024(1024 个字节 1kB) =8kB ，如果使用 slots 数量是 16384 ，所占空间 = 16384 / 8(每个字节 8bit) / 1024(1024 个字节 1kB) = 2kB
  - 一般情况下 Redis cluster 集群主节点数量基本不可能超过 1000 个，超过 1000 会导致网络拥堵。足够了
  - Redis 主节点的哈希槽配置信息是通过 bitmap 来保存的，槽位越少，bitmap，压缩率越高

#### master 节点间心跳通讯（Gossip）

每个节点周期性地从节点列表中 选择 `k` 个节点，将本节点存储的信息传播出去，直到所有节点信息一致，即 `算法收敛`。

#### 脑裂问题

- min-slaves-to-write 主库能进行数据同步的最少从库数量
- min-slaves-max-lag 主从复制时，从库给主库发送 ACK 最大延迟时间
- 这两个配置项组合后的要求是，主库连接的从库中至少有 N 个从库，和主库进行数据复制时的 ACK 消息延迟不能超过 T 秒，否则，主库就不会再接收客户端的请求了

## Redis 过期删除 与 内存淘汰

### 过期删除策略

Redis 是可以对 key 设置过期时间的，因此需要有相应的机制将已过期的键值对删除，而做这个工作的就是过期键值删除策略。

每当我们对一个 key 设置了过期时间时，Redis 会把该 key 带上过期时间存储到一个**过期字典**（expires dict）中，也就是说「过期字典」保存了数据库中所有 key 的过期时间。

当我们查询一个 key 时，Redis 首先检查该 key 是否存在于过期字典中：

*   如果不在，则正常读取键值；
*   如果存在，则会获取该 key 的过期时间，然后与当前系统时间进行比对，如果比系统时间大，那就没有过期，否则判定该 key 已过期。

Redis 使用的过期删除策略是「**惰性删除+定期删除**」这两种策略配和使用。

- 惰性删除
  - 使用 key 时才进行检查，如果已经过期，则删除
  - 缺点：长时间未访问，一直无法删除
- 定期删除
  - 每隔一段时间做一次检查，删除过期的 key，每次只是随机取一些 key 去检查
- 定时删除
  - 为每个 key 设置过期时间，同时创建一个定时器。一旦到期，立即执行删除
  - 缺点：如果过期键比较多时，占用 CPU 较多，对服务的性能有很大影响

### 内存淘汰机制

_不进行数据淘汰的策略_

- Noeviction：当内存不足时，禁止所有写操作，返回错误。

_在设置了过期时间的数据中进行淘汰：_

*   **volatile-random**：随机淘汰设置了过期时间的任意键值；
*   **volatile-ttl**：优先淘汰更早过期的键值。
*   **volatile-lru**（Redis3.0 之前，默认的内存淘汰策略）：淘汰所有设置了过期时间的键值中，最久未使用的键值；
*   **volatile-lfu**（Redis 4.0 后新增的内存淘汰策略）：淘汰所有设置了过期时间的键值中，最少使用的键值；

_在所有数据范围内进行淘汰：_

*   **allkeys-random**：随机淘汰任意键值;
*   **allkeys-lru**：淘汰整个键值中最久未使用的键值；
*   **allkeys-lfu**（Redis 4.0 后新增的内存淘汰策略）：淘汰整个键值中最少使用的键值。

## Redis 缓存设计

### 集中失效

- `过期时间` = `基础时间` + `随机时间`

### 缓存穿透

- 大量请求的 key 根本不存在于缓存中，导致请求直接到了数据库上

#### 解决方案

- 查存 DB 时，如果数据不存在，预热一个特殊空值到缓存中
- 布隆过滤器 `BloomFilter`
- 在数据库访问前进行校验，对不合法的请求直接 return

#### 布隆过滤器 BloomFilter

- 通过三个 hash 函数对商品 id 计算 hash 值
- 在布隆数组中对应的位值，0 或 1
- 只要有一个不是 1，一定不存在

##### 构建

布隆过滤器本质上是一个 n 位的二进制数组，用 0 和 1 表示。

假如我们以商品为例，有三件商品，商品编码分别为，id1、id2、id3

a）首先，对 id1，进行三次哈希，并确定其在二进制数组中的位置。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613160645359.png" alt="image-20250613160645359" style="zoom:70%;" />

三次哈希，对应的二进制数组下标分别是 2、5、8，将原始数据从 0 变为 1。

b）对 id2，进行三次哈希，并确定其在二进制数组中的位置。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613160717694.png" alt="image-20250613160717694" style="zoom:70%;" />

三次哈希，对应的二进制数组下标分别是 2、7、98，将原始数据从 0 变为 1。

下标 2，之前已经被操作设置成 1，则本次认为是哈希冲突，不需要改动。

> Hash 规则：如果在 Hash 后，原始位它是 0 的话，将其从 0 变为 1；如果本身这一位就是 1 的话，则保持不变。

##### 使用

跟初始化的过程有点类似，当查询一件商品的缓存信息时，我们首先要判断这件商品是否存在。

- 通过三个哈希函数对商品 id 计算哈希值
- 然后，在布隆数组中查找访问对应的位值，0 或 1
- 判断，三个值中，只要有一个不是 1，那么我们认为数据是不存在的。

> 注意：布隆过滤器只能精确判断数据不存在情况，对于存在我们只能说是可能，因为存在 Hash 冲突情况，当然这个概率非常低。

##### 减少误判

- 增加二进制位数组的长度
  - 这样经过 `hash` 后数据会更加的离散化，出现冲突的概率会大大降低
- 增加 `Hash` 的次数
  - 变相的增加数据特征，特征越多，冲突的概率越小

##### 原始数据删除后怎么处理

- 开发定时任务，每隔几个小时，自动创建一个新的布隆过滤器数组，替换老的，有点 `CopyOnWriteArrayList` 的味道
- 布隆过滤器增加一个等长的数组，存储计数器，主要解决冲突问题，每次删除时对应的计数器减一，如果结果为 0，更新主数组的二进制值为 0

### 缓存雪崩

- 缓存在同一时间大面积的失效，后面的请求都直接落到了数据库上，造成数据库短时间内承受大量请求
- 针对 Redis 服务不可用的情况
  - 采用 Redis 集群，避免单机出现问题整个缓存服务都没办法使用
  - 限流，避免同时处理大量的请求
- 针对热点缓存失效的情况
  - 热点缓存设置随机过期时间
  - 采用多级缓存，分层扛压

### Big Key

- 一个 `STRING` 类型的 Key，它的值为 5MB（数据过大）
- 一个 `LIST` 类型的 Key，它的列表数量为 20000个（列表数量过多）
- 一个 `ZSET` 类型的 Key，它的成员数量为 10000个（成员数量过多）
- 一个 `HASH` 格式的 Key，它的成员数量虽然只有 1000个，但这些成员的 value 总大小为 100MB（成员体积过大）

#### 大Key带来的常见问题

- **客户端超时阻塞**。由于 Redis 执行命令是单线程处理，然后在操作大 key 时会比较耗时，那么就会阻塞 Redis，从客户端这一视角看，就是很久很久都没有响应。
- **引发网络阻塞**。每次获取大 key 产生的网络流量较大，如果一个 key 的大小是 1 MB，每秒访问量为 1000，那么每秒会产生 1000MB 的流量，这对于普通千兆网卡的服务器来说是灾难性的。
- **阻塞工作线程**。如果使用 del 删除大 key 时，会阻塞工作线程，这样就没办法处理后续的命令。
- **内存分布不均**。集群模型在 slot 分片均匀情况下，会出现数据和查询倾斜情况，部分有大 key 的 Redis 节点占用内存多，QPS 也会比较大。

#### 常见产生原因

1. 将Redis用在并不适合其能力的场景，造成Key的value过大，如使用String类型的Key存放大体积二进制文件型数据（大Key）
2. 业务上线前规划设计考虑不足没有对Key中的成员进行合理的拆分，造成个别Key中的成员数量过多（大Key）
3. 没有对无效数据进行定期清理，造成如HASH类型Key中的成员持续不断的增加（大Key）
4. 使用LIST类型Key的业务消费侧代码故障，造成对应Key的成员只增不减（大Key）

#### 常见处理办法

1. 对大Key进行拆分

如将一个含有数万成员的HASH Key拆分为多个HASH Key，并确保每个Key的成员数量在合理范围，在Redis Cluster结构中，大Key的拆分对node间的内存平衡能够起到显著作用。

2. 对大Key进行清理

将不适合Redis能力的数据存放至其它存储，并在Redis中删除此类数据。需要注意的是，我们已在上文提到一个过大的Key可能引发Redis集群同步的中断，Redis自4.0起提供了UNLINK命令，该命令能够以非阻塞的方式缓慢逐步的清理传入的Key，通过UNLINK，你可以安全的删除大Key甚至特大Key。

3. 时刻监控Redis的内存水位

突然出现的大Key问题会让我们措手不及，因此，在大Key产生问题前发现它并进行处理是保持服务稳定的重要手段。我们可以通过监控系统并设置合理的Redis内存报警阈值来提醒我们此时可能有大Key正在产生，如：Redis内存使用率超过70%，Redis内存1小时内增长率超过20%等。

通过此类监控手段我们可以在问题发生前解决问题，如：LIST的消费程序故障造成对应Key的列表数量持续增长，将告警转变为预警从而避免故障的发生。

4. 对失效数据进行定期清理

例如我们会在HASH结构中以增量的形式不断写入大量数据而忽略了这些数据的时效性，这些大量堆积的失效数据会造成大Key的产生，可以通过定时任务的方式对失效数据进行清理。在此类场景中，建议使用HSCAN并配合HDEL对失效数据进行清理，这种方式能够在不阻塞的前提下清理无效数据。

### 数据倾斜

由于业务数据特殊性，按照指定的分片规则，可能导致不同的实例上数据分布不均匀，大量的数据集中到了一台或者几台机器节点上计算，从而导致这些节点负载多大，而其他节点处于空闲等待中，导致最终整体效率低下。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613160953743.png" alt="image-20250613160953743" style="zoom:60%;" />

- 存在 big key，拆分
- hashTag 指定 hash 槽不当

### 热点 key

在某个Key接收到的访问次数、显著高于其它Key时，我们可以将其称之为热Key，常见的热Key如：

- 某 Redis实例的每秒总访问量为10000，而其中一个Key的每秒访问量达到了7000（访问次数显著高于其它Key）
- 对一个拥有上千个成员且总大小为1MB的HASH Key每秒发送大量的HGETALL（带宽占用显著高于其它Key）
- 对一个拥有数万个成员的ZSET Key每秒发送大量的ZRANGE（CPU时间占用显著高于其它Key）

#### 热Key带来的常见问题

- 热Key占用大量的Redis CPU时间使其性能变差并影响其它请求；
- Redis Cluset中各node流量不均衡造成Redis Cluster的分布式优势无法被Client利用，一个分片负载很高而其它分片十分空闲从而产生读/写热点问题；
- 在抢购、秒杀活动中，由于商品对应库存Key的请求量过大超出Redis处理能力造成超卖；
- 热Key的请求压力数量超出Redis的承受能力造成缓存击穿，此时大量请求将直接指向后端存储将其打挂并影响到其它业务

#### 热Key的常见产生原因

1. 高并发访问：某个key被频繁访问，例如热点新闻、热门商品信息等。
2. 缓存失效：多个客户端同时访问同一个key，而这个key正好在某个时间点失效，导致大量请求穿透到数据库。
3. 不合理的数据结构或算法：使用了一些导致数据分布不均匀的数据结构或算法，使得某些key成为热点。
4. 业务逻辑设计不当：业务设计时未考虑数据访问的均匀性，导致某些key被频繁访问。

#### 热Key的常见处理办法

- 扩容，增加副本
  - 读写分离：为热点key设置从节点，读操作可以在从节点上进行，减轻主节点的压力。
- 热点key分散：
  - 打散热点：将热点key进行分片处理，比如在key中加入随机前缀或后缀，使得请求分散到不同的Redis节点。
  - 使用哈希标签：在Redis集群中使用哈希标签来确保热点key均匀分布在不同的槽位上。如 `user:{userID%1000}`
- 使用二级缓存，即 JVM 本地缓存，减少 Redis 的读请求

### 常见的缓存更新策略

常见的缓存更新策略共有3种：

*   Cache Aside（旁路缓存）策略；
*   Read/Write Through（读穿 / 写穿）策略；
*   Write Back（写回）策略；

实际开发中，Redis 和 MySQL 的更新策略用的是 Cache Aside，另外两种策略应用不了。

#### 旁路缓存模式（读多写少）

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/6e3db3ba2f829ddc14237f5c7c00e7ce-20230309232338149.png" style="zoom:70%;" />

- 写
  - 先更新 DB，再删除 cache
- 读
  - 从 cache 中读取数据，读取到就直接返回
  - cache 中读取不到的话，就从 DB 中读取数据返回
  - 再把数据放到 cache 中

> 注意，写策略的步骤的顺序不能倒过来，即**不能先删除缓存再更新数据库**，原因是在「读+写」并发的时候，会出现缓存和数据库的数据不一致性的问题。

举个例子，假设某个用户的年龄是 20，请求 A 要更新用户年龄为 21，所以它会删除缓存中的内容。这时，另一个请求 B 要读取这个用户的年龄，它查询缓存发现未命中后，会从数据库中读取到年龄为 20，并且写入到缓存中，然后请求 A 继续更改数据库，将用户的年龄更新为 21。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/cc208c2931b4e889d1a58cb655537767-20230309232342573.png" style="zoom:70%;" />

最终，该用户年龄在缓存中是 20（旧值），在数据库中是 21（新值），缓存和数据库的数据不一致。

#### 读写穿透

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/WriteThrough.jpg" style="zoom:50%;" />

- 写
  - 先查 cache，cache 中不存在，直接更新 DB
  - cache 存在则更新 cache，cache 自己同步 DB
    - （同步更新 cache 和 DB）
- 读
  - 从 cache 中读取数据，读取到就直接返回
  - 读取不到的话，先从 DB 加载，写入到 cache 后返回响应

#### 写回策略（写多）

- cache 不存在，则直接更新 Db
- cache 存在
  - 只更新 cache（将缓存页标记为 `dirty`）
  - 异步批量更新 DB

### 如何保证缓存和数据库数据的一致性

#### 缓存延时双删

- 先删除缓存
- 再更新数据库
- 休眠一会（比如 1 秒），再次删除缓存

#### 删除缓存重试机制

- 写请求更新数据库
- 缓存因为某些原因，删除失败
- 把删除失败的 key 放到消息队列
- 消费消息队列的消息，获取要删除的 key
- 重试删除缓存操作

#### 读取 biglog 异步删除缓存

- 可以使用阿里的 canal 将 binlog 日志采集发送到 MQ 队列里面
- 然后通过 ACK 机制确认处理这条更新消息，删除缓存，保证数据缓存一致性

## Redis 实战

### Redis 如何实现 延迟队列

延迟队列是指把当前要做的事情，往后推迟一段时间再做。延迟队列的常见使用场景有以下几种：

*   在淘宝、京东等购物平台上下单，超过一定时间未付款，订单会自动取消；
*   打车的时候，在规定时间没有车主接单，平台会取消你的单并提醒你暂时没有车主接单；
*   点外卖的时候，如果商家在10分钟还没接单，就会自动取消订单；

在 Redis 可以使用有序集合（`ZSet`）的方式来实现延迟消息队列的，`ZSet` 有一个 `Score` 属性可以用来存储延迟执行的时间。

使用 `zadd score1 value1` 命令就可以一直往内存中生产消息。再利用 `zrangebysocre` 查询符合条件的所有待处理的任务， 通过循环执行队列任务即可。

![](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/延迟队列.png)

### Redisson 原理

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613123729653.png" alt="image-20250613123729653" style="zoom:50%;" />

> 分布式锁可能存在锁过期释放，业务没执行完的问题

- 只要线程一加锁成功，就会启动一个 watch dog 看门狗
- 它是一个后台线程， 会每隔 10 秒检查一下
- 如果线程 1 还持有锁，那么就会不断的延长锁 key 的 生存时间

### Redlock 算法

- 搞多个 Redis master 部署，以保证它们不会同时宕掉
- 并且这些 master 节 点是完全相互独立的，相互之间不存在数据同步
- 同时，需要确保在这多个 master 实例上，是与在 Redis 单实例，使用相同方法来获取和释放锁

#### 实现步骤

- 按顺序向 5 个 master 节点请求加锁
- 根据设置的超时时间来判断，是不是要跳过该 master 节点
- 如果大于等于三个节点加锁成功，并且使用的时间小于锁的有效期，即可认定加锁成功啦
- 如果获取锁失败，解锁
