# Elasticsearch

## 基础篇

### 为什么需要 ES

- 传统关系型数据库的痛点
  - 模糊匹配，全表扫描
  - 全文搜索，不支持分词器
- Elasticsearch 的优势
  - 简单的 RESTful API，兼容性好
  - 提供更丰富的分词器
  - 近实时查询，Elasticsearch 每隔 1s 把数据存储至系统缓存中，且使用倒排索引提高检索效率
  - 支持相关性搜索，可以根据条件对结果进行打分
  - 天然分布式存储，使用分片支持更大的数据量

### analyzer

##### 常用分词器

- Standard Analyzer
  - 标准分词器，也是默认分词器， 英文转换成小写， 中文只支持单字切分
- Simple Analyzer
  - 简单分词器，通过非字母字符来分割文本信息，英文大写转小写，非英文不进行分词
- IK Analyzer
  - ik_max_word
    - 细粒度切分模式，会将文本做最细粒度的拆分，尽可能多的拆分出词语
  - ik_smart
    - 智能模式，会做最粗粒度的拆分，已被分出的词语将不会再次被其它词语占有

##### 组成

- Charater Filters
  - 处理原始文本，例如去除 HTMl 标签
- Tokenizer
  - 按分词器规则切分单词
- Token Filters
  - 对切分后的单词加工，包括转小写，切除停用词，添加近义词

### keyword 和 text

- keyword
  - 不走分词器
  - 查询效率更高
- text
  - 走分词器

### TF-IDF

- TF = Term Frequency 词频
  - 一个词在这个文档中出现的频率
  - 值越大，说明这文档越匹配， 正向指标
- IDF = Inverse Document Frequency 反向文档频率
  - 简单点说就是一个词在所有文档中都出现，那么这个词不重要
  - 比如“的、了、我、好”这些词所有文档都出现，对检索毫无帮助。反向指标
- TF-IDF = TF / IDF

### 节点角色

- 主节点
- 仅投票主节点
  - 仅参与主节点选举投票，不会被选为主节点，硬件配置可以较低
- 数据节点
  - 数据存储和数据处理比如 CRUD、搜索、聚合
- 协调节点
  - 转发请求，收集数据并返回给客户端

### 分片

- 数据的容器，Index（索引）被分为多个文档碎片存储在分片中，分片又被分配到集群内的各个节点里
- 每个分片都是一个 Lucene 索引实例，能够对 es 集群中的数据子集进行索引并处理相关查询
- 一个分片可以是 主分片（Primary Shard） 或者 副本分片（Replica Shard）
- 写索引数据的时候，只能写在主分片上，然后再同步到副本分片
- 当主分片出现问题的时候，会从可用的副本分片中选举一个新的主分片

#### 询文档时如何找到对应的分片

我们需要查询一个文档的时候，需要先找到其位于那一个分片中。那究竟是如何知道一个文档应该存放在哪个分片中呢?

这个过程是根据路由公式来决定的:

_`shard = hash(routing) % number_of_primary_shards`_

routing 是一个可以配置的变量,默认是使用文档的 id。对 routing 取哈希再除以 number_of_primary_shards(索引创建时指定的分片总数)得到的余数就是对应的分片。

## 文档检索原理

### es 读数据过程

#### 基于文档ID的读取流程（GET by ID）

- 客户端发送请求到任意一个 node，成为 coordinate node
- coordinate node 对 doc id 进行 哈希 路由，将请求转发到对应的 node，此时会使用 round-robin 随机轮询算法，在 primary shard 以及其所有 replica 中随机选择一个，让读请求负载均衡

#### 搜索请求流程（Search - Query and Fetch）

客户端发送请求到任意一个 node，成为 coordinate node

##### Query

- 协调节点 广播到索引中每一个分片（主分片/副本分片）
- 每个分片在本地执行搜索并构建一个匹配文档的大小为 from + size 的 优先队列
- 每个分片返回各自优先队列中 所有文档的 ID 和排序值 给 协调节点
- 协调节点 合并这些值到自己的优先队列中来产生一个 全局排序 后的结果列表

##### Fetch

- 协调节点 辨别出哪些文档需要被取回并向相关的分片提交多个 GET 请求

### 单个节点的读流程

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164400577.png" alt="image-20250613164400577" style="zoom:90%;" />

1. 节点接收到 读数据 请求根据请求中的 `doc_id` 字段从 `translog` 缓存中查询数据，如果查询到数据则直接返回结果。
2. 如果没有查到结果，从磁盘中的 `translog` 查询数据，如果查询到数据则直接返回结果。
3. 如果还没有查到结果，从磁盘中的各个段中查询结果，如果查到数据则直接返回结果。
4. 经过前面的步骤，如果都没查到结果，则返回 null。

> 注意，Elasticsearch 在读取数据时，会先尝试从 `translog` 中获取，再从 `segement` 中获取，这是因为，前面我们讲了对所有文档的写入/修改/删除操作都会先被记录在 `translog` 中，然后再通过 `refresh`、`flush` 操作写入 `segament`，因此，`translog`中会记录着最新的文档数据，所以如果从`translog` 查到了目标数据，直接返回即可，如果没有，再去尝试从 `segament` 中获取。

## 分档存储原理

### es 写数据过程

- 客户端选择一个 node 发送请求过去，这个 node 就是  coordinating node （协调节点）
- coordinating node 对 document 进行路由，将请求转发给对应的 node（有 primary shard）
- 实际的 node 上的 primary shard 处理请求，然后将数据同步到 replica node
- coordinating node 如果发现 primary node 和所有 replica node 都搞定之后，就返回响应结果给客户端

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164547621.png" alt="image-20250613164547621" style="zoom:90%;" />

### 单节点持久化流程

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164638007.png" alt="image-20250613164638007" style="zoom:90%;" />

#### 近实时搜索的原因：Refresh

> ES 是一个近实时的系统，默认的情况下新写入的数据需要一秒后才能被搜索到。而近实时的原因其实跟 Refresh 有关。

先写入内存 buffer 缓冲区，并生成 translog 日志文件

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164717625.png" alt="image-20250613164717625" style="zoom:80%;" />

`refresh`

每隔一秒会创建一个 Segment 文件，将 buffer 中的数据写入这个 segment，并清空 buffer

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164813201.png" alt="image-20250613164813201" style="zoom:90%;" />

此时数据不是直接进入 segment file 磁盘文件，而是先进入 os cache（操作系统缓存）

只要 buffer 中的数据被 refresh 操作刷入 os cache 中，这个数据就可以被搜索到了

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164831475.png" alt="image-20250613164831475" style="zoom:90%;" />

#### 防止数据丢失：Transaction Log

translog 日志文件的作用是什么？你执行 commit 操作之前，数据要么是停留在 buffer 中，要么是停留在 os cache 中，无论是 buffer 还是 os cache 都是内存，一旦这台机器死了，内存中的数据就全丢了。所以需要将数据对应的操作写入一个专门的日志文件 translog 中，一旦此时机器宕机，再次重启的时候，es 会自动读取 translog 日志文件中的数据，恢复到内存 buffer 和 os cache 中去。

translog 其实也是先写入 os cache 的，默认每隔 5 秒刷一次到磁盘中去，所以默认情况下，可能有 5 秒的数据会仅仅停留在 buffer 或者 translog 文件的 os cache 中，如果此时机器挂了，会丢失 5 秒钟的数据。但是这样性能比较好，最多丢 5 秒的数据。也可以将 translog 设置成每次写操作必须是直接 fsync 到磁盘，但是性能会差很多。

实际上你在这里，如果面试官没有问你 es 丢数据的问题，你可以在这里给面试官炫一把，你说，其实 es 第一是准实时的，数据写入 1 秒后可以搜索到；可能会丢失数据的。有 5 秒的数据，停留在 buffer、translog os cache、segment file os cache 中，而不在磁盘上，此时如果宕机，会导致 5 秒的数据丢失。

> 总结一下就是：由于系统先缓冲一段数据才写，且新段不会立即刷入磁盘，这两个过程中如果出现某些意外情况（如主机断电），则会存在丢失数据的风险。通用的做法是记录事务日志，每次对ES进行操作时均记录事务日志，当ES启动的时候，重放translog中所有在最后一次提交后发生的变更操作。

#### 持久化操作：Flush

##### 背景

随着新的数据不断进入 buffer 和 translog，不断将 buffer 数据写入一个又一个新的 segment file 中去，每次 refresh 完 buffer 清空，translog 保留，Translog 也越来越大，需要清理，强制刷盘

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613164926286.png" alt="image-20250613164926286" style="zoom:90%;" />

##### 触发条件

- 大小触发设定的阈值
- 30 分钟

##### 过程

- 写入 segment，清空 buffer（refresh）
- 把这次提交动作之前所有没有落盘的 segment 强制刷盘，确保写入物理文件
- 写入 commit point 文件
- commit point：记录当前所有可用的segment，每个commit point都会维护一个.del文件（es删除数据本质是不属于物理删除），当es做删改操作时首先会在.del文件中声明某个document已经被删除，文件内记录了在某个segment内某个文档已经被删除，当查询请求过来时在segment中被删除的文件是能够查出来的，但是当返回结果时会根据commit point维护的那个.del文件把已经删除的文档过滤掉。
- 清空 Translog，因为 Segment 都已经踏实落地了，之前的 Translog 就不需要了
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165004255.png" alt="image-20250613165004255" style="zoom:90%;" />

#### Segment 文件的清理：Merge

- segment 文件太多了，一秒就产生一个
- 合并这些 segment 文件，把小 segment 整合到一个大的 segment

#### 汇总

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165048012.png" alt="image-20250613165048012" style="zoom:50%;" />

1. 将数据写入内存缓存( `index buffer` )中，并将数据追加到事务日志( `translog` )中

2. 默认每秒执行一次 `refresh` 操作，将内存缓存中的数据refresh到文件系统缓存(OS Cache)中，生成段( `segement` )，并打开该段供用户搜索，同时会清空内存缓存(index buffer)中的数据。

3. 默认每次写入数据后通过 `fsync` 系统调用将内存中的 `translog` 写入( `flush` )到磁盘中。
   - 同步模式是每次写入数据后都会 `fsync` 到磁盘
   - 异步模式是每5秒 `fsync` 到磁盘

4. 默认每30分钟或者 `translog` 大小超过512M 后，就会执行一次 `flush` 将文件系统中的数据写入磁盘。
   - 生成新的段写入磁盘
   - 生成一个新的包含新的段的提交点写入磁盘
   - 删除旧的 `translog`，并生成新的 `translog`

5. Elasticsearch 会开启归并进程，在后台对中小段进行 merge 段合并，减少索引中段的数目，该过程在文件系统缓存和磁盘中都会进行。

### 删除/更新数据底层原理

- 如果是删除操作，commit 的时候会生成一个 .del 文件，里面将某个 doc 标识为 deleted 状态，那么搜索的时候根据 .del 文件就知道这个 doc 是否被删除了。

- 如果是更新操作，就是将原来的 doc 标识为 deleted 状态，然后新写入一条数据。

buffer 每 refresh 一次，就会产生一个 segment file ，所以默认情况下是 1 秒钟一个 segment file ，这样下来 segment file 会越来越多，此时会定期执行 merge。每次 merge 的时候，会将多个 segment file 合并成一个，同时这里会将标识为 deleted 的 doc 给物理删除掉，然后将新的 segment file 写入磁盘，这里会写一个 commit point ，标识所有新的 segment file ，然后打开 segment file 供搜索使用，同时删除旧的 segment file 。

## 集群常见问题与解决方案

### 集群健康状态

从数据完整性的角度划分，集群健康状态分为三种：

- Green，所有的主分片和副分片都正常运行。
- Yellow，所有的主分片都正常运行，但不是所有的副分片都正常运行。这意味着存在单点故障风险。
- Red，有主分片没能正常运行。

每个索引也有上述三种状态，假设丢失了一个副分片，该分片所属的索引和整个集群变为Yellow状态，其他索引仍为Green。

### 如何实现 master 选举

#### 前提

- 只有（node.master: true）的节点才能成为主节点
- 最小主节点数（discovery.zen.minimum_master_nodes）的目的是防止脑裂

#### 选举流程

- 对所有可以成为 master 的节点（node.master: true）根据 nodeId 字典排序，每次选举，每个节点都把自己所知道的节点排序，然后选出第一个（第 0 位）节点，暂且认为它是 master 节点
- 如果对某个节点的投票数达到一定的值（可以成为 master 节点数 n/2+1）并且该节点自己也选举自己，那这个节点就是 master。否则重新选举一直到满足上述条件

### 可用性和一致性间的抉择

CAP 理论定义了：分布式数据存储系统最多只能满足一致性（Consistency）、可用性（Availability）和分区容错性（Partition tolerance）这三项中的两项 。

ES 是一个分布式数据存储系统，当然也要遵循 CAP 理论的。但在现实中网络环境总是不可靠的，所以网络分区总是会出现，那么 P 是我们必须要保证的。在剩下的可用性和一致性中，ES 更倾向于选择可用性。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165356527.png" alt="image-20250613165356527" style="zoom:90%;" />

如上图，数据写入的时候会先在主分片上写缓存、日志，然后再将数据同步到副本分片中。在主分片上写入成功的数据并不能马上被查询到，而是默认每一秒将缓存的数据写到磁盘上，这部分数据才能被检索。所以从这个角度来看，ES 并没有保证强一致性，而更像是最终一致性。默认的情况下，只需要主分片写成功即可，系统并不要求必须有多少个副本分片写入成功才可以。

其实 ES 本身系统的定位就是一个准实时的系统，并没有必要保证强一致性，反而更需要考虑的是可用性。

### 集群扩容

下面是集群由一个节点变成 3 个节点时，主副分片的迁移过程，其中 P 代表主分片，而 R 代表副本分片。

如下图，一开始在 Node1 上有 3 个主分片，但没有副分片：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165428429.png" alt="image-20250613165428429" style="zoom:70%;" />

如下图，当添加第二个节点后，副本分片就被分配到 Node2 了，其中 R0 代表的是 P0 的副本：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165458626.png" alt="image-20250613165458626" style="zoom:70%;" />

如下图，当添加了第三个节点后，索引的所有主副分片都被平均分配到集群的 3 个节点上：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165516475.png" alt="image-20250613165516475" style="zoom:70%;" />

如上图，其中灰色的 P0、R2 分片被迁移走了。可以看到如果其中一个节点挂了，其所有的数据都在其他两个节点上存在，所以不会丢失数据。`在数据迁移的过程中需要保证主分片要均匀分配外，还要保证副本分片不能和它的主分片分配到同一个节点上，否则仍然存在数据丢失的风险。`而当一个主分片异常时，其副本分片可能会被提升为主分片。

### 分片故障迁移

ES 通过副本机制来保障数据的可靠性，当一个数据节点下线后，系统会对这个节点上的主分片进行故障迁移，从而防止数据丢失。

集群扩容的本质就是添加数据节点，而分片故障转移是指在数据节点下线后 ES 自动将下线的主分片重新分配到其他节点，并且产生相应副本分片的过程。主分片的重新分配其实是将某个最具条件的副本分片升级为主分片。下面是分片故障转移过程的一个简单实例。

**主节点下线：**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165608785.png" alt="image-20250613165608785" style="zoom:70%;" />

如上图， 假设集群有 3 个节点，其中索引有 3 个主分片和每个主分片对应一个副本分片，现在 Node1（Master）下线了，集群进行重新选主，Node2 成为了新的 Master。这个时候集群状态为 Red，因为部分主分片没有分配成功。

**主分片迁移（副本分片升级为主分片） ：**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165645740.png" alt="image-20250613165645740" style="zoom:70%;" />

如上图，在 Node2 成为主节点后，下线的 P1 和 P2 开始做迁移，说是迁移其实是将其他节点上最符合条件的副本分片升级为主分片，所以在 Node2 的 R1 成为了 P1，在 Node3 中的 R2 成为了 P2。这个时候集群状态变为 Yellow，因为部分主分片的副本没有分配成功。

**创建新的副本分片：**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165725187.png" alt="image-20250613165725187" style="zoom:70%;" />

如上图，在 R1 和 R2 升级为主分片 P1 和 P2 后，系统会再分配出新的 R1 和 R2，这个时候集群状态变为 Green。

## 优化策略

### 索引优化

- 大量写数据时，使用 Bulk 批量写入
- 副本设为 1，提高写入索引效率
- 增加 refresh_interval 刷盘时间
- 增加 flush_threshold_size，增大 translog 持久化设置大小
- 凌晨 force_merge

### 写入调优

- 副本设为 0
- 写入前 refresh_interval 设为-1，禁止刷新
- 写入过程中：采取 bulk 批量写入
- 写入后恢复副本数和刷新间隔

### 查询优化

- 自定义路由规则
- 控制字段的数量，业务中不使用的字段，就不要索引
- 使用 keyword 数据类型，该类型不会走分词器，效率大大提高
- 尽量避免分页过深

## 深度分页问题

举个例子用来类比：从保存了世界所有国家短跑运动员成绩的索引中查询短跑世界前三，每个国家类比为一个分片的数据，每个国家都会从国家内选出成绩最好的前三位参加最后的竞争，从每个国家选出的前三名放在一起再次选出前三名，此时才能保证是世界的前三名。

### Scroll Search 不推荐

- 上述请求的结果包含一个_scroll_id，应将其传递给 scrollAPI 以检索下一批结果
- scroll API 会创建数据快照，后续的访问将会基于这个快照来进行，所以无法检索新写入的数据。

### Search After

- 上一页的最后一条数据 sort 里面的值来确定下一页的位置
- 不能跳页请求
- 不支持向前搜索，只能向后执行

使用 search_after 必须要设置 from=0;

最后一条数据里拿到 sort 属性的值传入到 search_after;

curl 第一次请求：

```java
index/type/_search?pretty -d
{
  "size": 10,
  "query": {
    "match": {
      "age": "男"
    }
  },
  "sort": [{
    "_uid": {
      "order": "desc"
    }
  }]
}
```

返回：

```java
{
  "took": 28,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": 286,
    "max_score": null,
    "hits": [{
      "_index": "user_member",
      "_type": "member_itu",
      "_id": "123465",
      "_score": null,
      "_source": {
        "userId": "123456",
        "name": "123",
        "updateTime": "2022-12-09 13:05"
      },
      "sort": [
        "123465"
      ]
    }]
  }
}
```

curl 分页第二次请求：

```java
index/type/_search?pretty -d
{
  "size": 10,
  "search_after": ["123456"],
  "query": {
    "match": {
      "age": "男"
    }
  },
  "sort": [{
    "_uid": {
      "order": "desc"
    }
  }]
}
```

分页返回：

```java
{
  "took": 28,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": 286,
    "max_score": null,
    "hits": [{
      "_index": "user_member",
      "_type": "member_itu",
      "_id": "123457",
      "_score": null,
      "_source": {
        "userId": "123457",
        "name": "124",
        "updateTime": "2022-12-09 14:05"
      },
      "sort": [
        "123457"
      ]
    }]
  }
}
```

## 正排索引与倒排索引

### 正排索引

- 将文档 ID 和分词建立关联
- 以 DocID 为索引，查询时需要扫描所有词语，一个一个比较，直至查到关键词，查询效率较低
- 维护成本低，新增数据的时候，只要在末尾新增一个 ID
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165916716.png" alt="image-20250613165916716" style="zoom:80%;" />

### 倒排索引

- 建立分词和 DocID 关系，大大提高查询效率
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613165945435.png" alt="image-20250613165945435" style="zoom:80%;" />
  - 建立倒排索引的成本高。并且，维护起来也比较麻烦

#### 数据结构

- Term（单词）
  - 就是单词，或者叫分词
- 词项索引（Term Index）
  - Term Index存储某些单词的前缀，它在内存中以 有限状态转移器FST（Finite State Transducers）的数据结构保存的，可以更快的找到目标单词
- 词项字典（Term Dictionary）
  - 维护了单词Term的集合。
  - Term Dictionary的单词非常多，所以会对它们进行排序，查找的时候就可以通过二分查找来查，不需要遍历整个Term Dictionary。

- 倒排表（Posting List）
  - 记录了出现过某单词的所有文档ID，和单词在这些文档中出现的位置信息，每条记录叫一个倒排项(Posting)
  - 根据倒排列表，可以知道哪些文档包含目标单词。
  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170119556.png" alt="image-20250613170119556" style="zoom:60%;" />

#### 倒排索引为什么是不可变的

倒排索引被写入磁盘后是不可改变的，它永远不会修改。不变性有重要的价值：

1. 不需要锁。如果你从来不更新索引，你就不需要担心多进程同时修改数据的问题。
2. 一旦索引被读入内核的文件系统缓存，便会留在哪里，由于其不变性。只要文件系统缓存中还有足够的空间，那么大部分读请求会直接请求内存，而不会命中磁盘。这提供了很大的性能提升。
3. 其它缓存(像filter缓存)，在索引的生命周期内始终有效。它们不需要在每次数据改变时被重建，因为数据不会变化。
4. 写入单个大的倒排索引允许数据被压缩，减少磁盘 I/O 和 需要被缓存到内存的索引的使用量。

这样做的缺点也十分明显：如果需要让一个新的文档可被搜索，就需要重建整个倒排索引，这就对一个倒排索引所能包含的数据量造成了很大的限制，要么对索引可被更新的频率造成了很大的限制。

#### 动态更新索引

为了能够在保留倒排索引的不可变性的前提下，实现倒排索引的更新，Elasticsearch采用了 `补充倒排索引` 的方法，通过 `增加新的补充索引来反映新近的修改`，而不是直接重写整个倒排索引。在检索时，每一个倒排索引都会被轮流查询到，从最早的开始查询完后再对结果进行合并，这样就可以避免频繁的重建倒排索引而导致的性能损耗了。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170202512.png" alt="image-20250613170202512" style="zoom:90%;" />

1. `倒排索引` 就是对初始文档集合建立好的索引结构，该索引存在磁盘中，不可改变。
2. `临时索引` 是在内存中实时建立的倒排索引，该索引存储在内存中，当新增文档进入系统，解析文档，之后更新内存中维护的临时索引，文档中出现的每个单词，在其倒排列表末尾追加倒排列表项，随着新加入系统的文档越来越多，临时索引消耗的内存也会随之增加，一旦临时索引将指定的内存消耗光，要考虑将临时索引的内容更新到磁盘索引中，以释放内存空间来容纳后续的新进文档。

3. `已删除文档列表` 则用来存储已被删除的文档的相应文档ID，形成一个文档ID列表。这里需要注意的是：当一篇文档内容被更改，可以认为是旧文档先被删除，之后向系统内增加一篇新的文档，通过这种间接方式实现对内容更改的支持。

当系统发现有新文档进入时，立即将其加入临时索引中。有文档被删除时，则将其加入删除文档队列。文档被更改时，则将原先文档放入删除队列，解析更改后的文档内容，并将其加入临时索引中。通过这种方式可以满足实时性的要求。

如果用户输入查询请求，则搜索引擎同时从倒排索引和临时索引中读取用户查询单词的倒排列表，找到包含用户查询的文档集合，并对两个结果进行合并，之后利用删除文档列表进行过滤，将搜索结果中那些已经被删除的文档从结果中过滤，形成最终的搜索结果，并返回给用户。这样就能够实现动态环境下的准实时搜索功能。

> 注意：在内存中的临时索引是不断变化的，但是这个临时索引一旦写进磁盘，就是不可变的。

### 内部索引优化

Elasticsearch 为了能快速找到某个 Term，先将所有的 Term 排个序，然后根据二分法查找 Term，时间复杂度为 logN，就像通过字典查找一样，这就是 Term Dictionary。

现在再看起来，似乎和传统数据库通过 B-Tree 的方式类似。但是如果 Term 太多，Term Dictionary 也会很大，放内存不现实，于是有了 Term Index。

就像字典里的索引页一样，A 开头的有哪些 Term，分别在哪页，可以理解 Term Index是一棵树。

这棵树不会包含所有的 Term，它包含的是 Term 的一些前缀。通过 Term Index 可以快速地定位到 Term Dictionary 的某个 Offset，然后从这个位置再往后顺序查找。

在内存中用 FST 方式压缩 Term Index，FST 以字节的方式存储所有的 Term，这种压缩方式可以有效的缩减存储空间，使得 Term Index 足以放进内存，但这种方式也会导致查找时需要更多的 CPU 资源。

对于存储在磁盘上的倒排表同样也采用了压缩技术减少存储所占用的空间。

### 倒排索引的实现

#### Term Index 的实现

Term Index 作为 Term Dictionary 的索引，其最好资源消耗小，可以缓存在内存中，而且数据查找要有较低的复杂度。在讨论 Term Index 如何实现前，先来看看下面几个词语：

> coach、cottage
> dock、domain

这两对词语分别有着公共的前缀：co 和 do。如果我们把 Term Dictionary 中的 Term 排序后按公共前缀抽取出来按块存储，而 Term Index 只使用公共前缀做索引，那本身要存储 coach、cottage 两个字符串的索引，现在只需要存储 co 一个就行了。这样的话，拥有同一公共前缀的 Term 越多，实际上就越省空间，并且这种设计在查找的时候复杂度是公共前缀的长度：O(len(prefix)) 。

但是这样的索引有个缺点，它只能找到公共前缀所在的块的地址，所以它既无法判断这个 Term 是否存在，也不知道这个 Term 保存在 Term Dictionary（.tim）文件的具体哪个位置上。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170403275.png" alt="image-20250613170403275" style="zoom:70%;" />

如上图，对于在每个块中如何快速查找到对应的 Term，我们可以使用二分法来搜索，因为 Block 中的数据是有序的。但机智的你是不是也发现可以优化的地方了？因为前缀在 Term Index 中保存了，那么 Block 中就不需要为每个 Term 再保存对应的前缀了，所以 Block中保存的每个 Term 都可以省略掉前缀了，比如，co 前缀的 block1 中保存的内容为 ach、ttage 即可。

**对于前缀索引的实现，业界使用了 FST 算法来解决。**FST（Finite State Transducers）是一种 FSM（Finite State Machines，有限状态机），并且有着类似于 Trie 树的结构。下面来简单了解一下 FST。

##### FST

FST 有以下的特点：

- 通过对 Term Dictionary 数据的前缀复用，压缩了存储空间；
- 高效的查询性能，O(len(prefix))的复杂度；
- 构建后不可变。（事实上，倒排索引一旦生成就不可变了。）

> 事实上，FST 是一种非常复杂的结构，但你可以把它理解为一个占用空间小且高效的 Key-Value 数据结构。Term Index 使用 FST 做实现带来了两个基本功能：
>
> - 快速试错，如果在 FST 上不存在，不需要再遍历整个 Term Dictionary；
> - 快速定位到 Block 的位置，经过 FST 的输出，可以算出 Block 在文件中的位置。

###### 前缀树原理

依次输入：msb、msn、msbtech、wltech

1. 如果出现可以公用的元素，则另开分支将不可以公用的部分进行存储，最后一个节点标记为绿色
2. 在查找时按照从头到尾的顺序进行查找，只有每个节点都符合并且最后一个字母为绿色 final 节点时代表查询成功
3. 若没有可以公用的部分，则单独开分支进行存储，如 wltech

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170500815.png" alt="image-20250613170500815" style="zoom:60%;" />

> 但是此时有一问题，msbtech和wltech在前缀上没有可以公用的部分，但是tech可以公用，此时是否还可以进行优化呢？

###### FSA

接着上图前缀树与红色字体问题，提出当输入 wltech 时，tech 可以复用，得出 FSA 将 tech 直接复用减少存储空间

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170539417.png" alt="image-20250613170539417" style="zoom:90%;" />

注意：当输入 msn 时，如果是前缀树，n 节点会单独新增一个节点表示 final 节点。在使用 FSA 之后 n 节点直接指向最后的 final 节点

> 但是这里又会产生一个问题：wl是否存在呢？因为wl的下一个节点为final节点，中止节点，按理说是应该存在的，但是结果是不存在的

###### FST

至此，FSA已经满足了对Term Dictionary数据高效存储的基本要求，但是仍然不满足的一个问题就是，FSA无法存储key-value的数据类型，所以FST在此基础上为每一个出度添加了一个output属性，用来表示每个term的value值。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170616799.png" alt="image-20250613170616799" style="zoom:90%;" />

FST 会在 final 节点中新增 Final Output 数值，当查找某一字符串的时候，会根据当前字符串的路径相加每个节点中的 value 得到最终值与初始 value 对应判断是否一致。

#### Term Dictionary 的实现

Term Dictionary 保存着 Term 与 Posting List 的关系，存储了 Term 相关的信息，如记录了包含该 Term 的文档数量（DocFreq）、Term 在整个 Segment 中出现的频率等，还保存了指向 Posting List 文件的指针（文档 ID 列表的位置、词频位置等）。

如下图，在对 Term Dictionary 做索引的时候，先将所有的 Term 进行排序，然后将 Term Dictionary 中有共同前缀的 Term 抽取出来进行分块存储，再对共同前缀做索引，最后通过索引就可以找到公共前缀对应的块在 Term Dictionary 文件中的偏移地址。 

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170701712.png" alt="image-20250613170701712" style="zoom:50%;" />

由于每个块中都有共同前缀，所有不需要再保存每个Term的全部内容，只需要保存其后缀即可，而且这些后缀都是排好序的。 

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170727015.png" alt="image-20250613170727015" style="zoom:70%;" />

至此，我们可以通过Term Index 和 Term Dictionary 快速判断一个 Term 是否存在，并且存在的时候还可以快速找到对应的 Posting List 信息。

#### Posting List 的实现

Posting List 并不只是包含文档的 ID，其实 Posting List 包含的信息比较多，如文档 ID、词频、位置等。

因为倒排索引的主要目标就是要找到文档 ID，所以下面讨论 Posting List 的时候我们只关注文档 ID 的信息，其他的就忽略了。前面提到过，Posting List 主要面临着两个问题：

- 如何节省存储？
- 如何快速做交集？

要节省存储，可以对数据进行压缩存储；至于如何做交集，业界应用得比较多的是跳表、Roaring Bitmaps 等技术。

##### 节省存储：整型压缩

###### FOR（Frame Of Reference）

假设我们的商品有 10 亿个，某个 Term 如“小米”，包含当前词项的 docs 假如有 100 万条

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170831799.png" alt="image-20250613170831799" style="zoom:60%;" />

- 倒排表中的 id => [1,2,3…100W]
- 每个 docid 为 int 类型，占用 4 个 Bytes
- 400w ≈ 4MB ，上亿条索引，数据量就太大了

_`那么如何压缩呢？`_

1. bit 压缩

   - int 使用 32 个 bit 存储，最大值就是 2^31-1，之所以是 31 次方是因为 int 是有符号整型，其中一个 bit 用来存储符号位了，但是由于 docId 只有正整型，因此在倒排索引的常经理不必考虑负数的情况。

   - 当前数组中最大值只有 100W，只需要 2 ^n > 100w，n=20，也就是 20 位 bit 就可以表示

2. 转换为差分数组

   - 但此时数组中每个数值都需要使用 20 个 bit 来存储，这显然是极大的浪费，因为数组前段的数值都非常小，仅用很少的 bit 就可以存储

   - 即不存储原本的数值，而是存储每个数值与前一个数字的差值，这时原本的数字组就由[1,2,3…100W] ==> [1,1,1…1]

   - 数组中共包含 100W 个 1，也就是我们存储一百万个数字，只需要用 100 万个 bit

   - 由原来的 3200w 个 bit ==> 100w bit ，数据压缩了 32 倍

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613170951744.png" alt="image-20250613170951744" style="zoom:50%;" />

3. 数组拆分

   - 实际场景中不可能有这么巧合的情况，以[73，300，302，332，343，372]为例

   - 计算差值列表，结果为[73，227，2，30，11，29]

   - 经过计算后，最大值为 227，使用 8 个 bit 来存储

   - 细心思考可以发现，除了 227 意外，其他数字都很小，如果都是用 8 个 bit 来存储，那么显然浪费了不少存储空间

   - 将原本一个数组拆分成[73，227]和[2,30,11,29]两个数组
     - [2,30,11,29]  1bit
     - [73，227] 5bit

> 注意：为什么我们不对每一个数字单独使用其最合适的bit数来存储，这样岂不是更节省空间么？

- 拆分数组时候，我们需要对每个数组数组元素使用的 bit 数进行记录，这个地方也是占用空间的
- 拆分太多，也会造成计算复杂

通过以上分析，就能清楚的感知到，FOR 算法适用于 `稠密数组`。

###### RBM（RoaringBitmap）

> 如果你足够细心，你也许会发现其实上述例子中的数组仍然具有一定的特殊性。没错，他是一个稠密数组，可以理解为是一个取值区间波动不大的数组。如果倒排表中出现这样的情况：[1000W, 2001W, 3003W, 5248W, 9548W, 10212W, … , 21Y]，情况将会特别糟糕，因为我们如果还按照 FOR 的压缩算法对这个数组进行压缩，我们对其计算 dealta list，可以发现其每个项与前一个数字的差值仍然是一个很大的数值，也就意味着 dealta list 的每个元素仍然是需要很多 bit 来存储的。于是 Lucene 对于这种稀疏数组采用了另一种压缩算法：RBM（Roaring Bitmaps）

- RoaringBitmap通过一种称为“分桶”的策略来高效地压缩位图。每个桶对应于位图中的一段连续的位，具体如下：
  1. 分桶：将64位的整数ID划分成高16位和低16位两部分。
     - 高16位称为“键”或“索引”，用于标识不同的桶。
     - 低16位称为“值”，用于在该桶内部标识具体的位。
  2. 桶的类型：
     - ArrayContainer：如果一个桶中只有少数几个位被设置，那么使用一个简单的数组来存储这些值即可。
     - BitmapContainer：如果一个桶中有大量位被设置，那么使用一个传统的位图来存储。
     - RunContainer：如果桶中有连续的位被设置，那么使用一个运行长度编码（Run-Length Encoding, RLE）来存储。
- 一种类似于哈希的结构，key -> 商值，value 是一个容器，保存了当前 Key 值对应的所有模
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613171109838.png" alt="image-20250613171109838" style="zoom:80%;" />

我们有两本书，书籍A和书籍B，以及以下用户借阅记录：

- 用户1借阅了书籍ID为10001的书籍A
- 用户2借阅了书籍ID为20001的书籍B
- 用户3借阅了书籍ID为10002的书籍A
- 用户4借阅了书籍ID为20002的书籍B
- 用户5同时借阅了书籍ID为10001的书籍A和书籍ID为20001的书籍B

> 书籍A的RoaringBitmap:
>   桶0: [1, 3, 5]  // 书籍ID 10001 和 10002 的高16位为 0x0000
>
> 书籍B的RoaringBitmap:
>   桶4: [2, 4, 5]  // 书籍ID 20001 和 20002 的高16位为 0x0004
>
> AND操作结果:
>   由于桶0和桶4不重叠，我们只需要关注这两个桶中的共同元素。
>   在桶0中，用户5同时存在于书籍A的RoaringBitmap中。
>   在桶4中，用户5也同时存在于书籍B的RoaringBitmap中。
>   因此，AND操作的结果是用户5。

现在，我们想要找出同时借阅了书籍A和书籍B的用户。为此，我们需要执行AND操作。

> 书籍A的RoaringBitmap:
>   桶0: [1, 3, 5]
>
> 书籍B的RoaringBitmap:
>   桶4: [2, 4, 5]
>
> AND操作结果:
>   由于桶0和桶4重叠，我们需要检查这两个桶中的共同元素。
>   在桶0中，用户5同时存在于书籍A的RoaringBitmap中。
>   在桶4中，用户5也同时存在于书籍B的RoaringBitmap中。
>   因此，AND操作的结果是用户5。

##### 文档 ID 列表的交集求解

如果你需要检索朝代是唐代、诗人姓李、诗名中包含“明月”的诗，这时候系统会返回 3 条包含对应文档 ID 的列表，如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613171440309.png" alt="image-20250613171440309" style="zoom:70%;" />

 如果直接循环 3 个数组求交集，并不是很高效，下面对其进行优化。

###### 位图

如果我们将列表的数据改造成位图会如何？假如有两个 posting list A 、B 和它们生成的位图如下：

> A = [2, 3, 5] => BitmapA = [0, 0, 1, 1, 0, 1]
> B = [1, 2, 5] => BitmapB = [0, 1, 1, 0, 0, 1]
>
> BitmapA AND BitmapB = [0, 0, 1, 0, 0, 1]

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613171514630.png" alt="image-20250613171514630" style="zoom:70%;" />

生成位图的方法其实很简单：Bitmap[A[i]] = 1，其他为 0 即可。这样我们可以将 A、B 两个位图对应的位置直接做 AND 位运算，由于位图的长度是固定的，所以两个位图的 AND 运算的复杂度也是固定的，并且由于 CPU 执行位运算效率非常高，所以在位图不是特别大的情况下，使用位图求解交集是非常高效的。

但是位图也有其致命的弱点，总结下来有这几点：

- 位图可能会消耗大量的空间。即使位图只需要 1 bit 就可以表示相对应的元素是否存在，但是如果列表中有一个元素特别大，例如数组 [1, 65535]，则需要 65535 bit 来表示。如果用 int32 类型的数组来表示的话，一个位图就需要 512M（2^32 bit = 2^29 Byte = 512M），如果有 N 个这样的列表，需要的存储空间为 N * 512M，这个空间开销是非常可怕的！
- 位图只适合于数据稠密的场景。
- 位图只适合存储简单整型类型的数据，对于复杂的对象类型无法处理，或者说复杂的类型本身就无法在 CPU 上直接使用 AND 这样的操作符。

业界中为了解决位图空间消耗大的问题，会使用一种压缩位图技术，也就是 Roaring Bitmap 来代替简单的位图。

###### Roaring Bitmaps

它会把一个 32 位的整数分成两个部分：高 16 位和低 16 位。然后将高 16 位作为一个数值存储到有序数组里，这个数组的每一个元素都是一个块。而低 16 位则存储到 2^16 的位图中去，将对应的位置设置为 1。这样每个块对应一个位图，如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613171543883.png" alt="image-20250613171543883" style="zoom:80%;" />

Roaring Bitmaps 通过拆分数据，形成按需分配的有序数组 + Bitmaps 的形式来节省空间。其中一个 Bitmaps 最多 2^16 个 bit，共消耗 8K。而由于每个块中存的是整数，每个数需要 2 个字节来存储即可，这样的整数共有 2^16 个，所以有序数组最多消耗 2 Byte * 2^16 = 128K 的存储空间。由于存储块的有序数组是按需分配的，所以 Roaring Bitmaps 的存储空间由数据量来决定，而 Bitmaps 的存储空间则是由最大的数来决定。举个例子就是，数组[0, 2^32 - 1]，使用 Bitmaps 的话需要 512M 来存储，而 Roaring Bitmaps只需要 2 * (2 Byte + 8K)。

由于 Roaring Bitmaps 由有序数组加上 Bitmaps 构成，所以要确认一个数是否在 Roaring Bitmaps 中，需要通过两次查询才能得到结果。先以高 16 位在有序数组中进行二分查找，其复杂度为 O(log n)；如果存在，则再拿低 16 位在对应的 Bitmaps 中查找，判断对应的位置是否为 1 即可，此时复杂度为 O(1)。所以，Roaring Bitmaps 可以做到节省空间的同时，还有着高效的检索能力。

## 集群启动流程

集群启动的整体流程如下图所示。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613171649726.png" alt="image-20250613171649726" style="zoom:70%;" />

### 选举主节点

假设有若干节点正在启动，**集群启动的第一件事是从已知的活跃机器列表中选择一个作为主节点，选主之后的流程由主节点触发。**

ES 的选主算法是基于 `Bully` 算法的改进，主要思路是对 节点ID 排序，取 ID 值最大的节点作为 Master，每个节点都运行这个流程。

> 是不是非常简单。选主的目的是确定唯一的主节点，初学者可能认为选举出的主节点应该持有最新的元数据信息，实际上这个问题在实现上被分解为两步：先确定唯一的、大家公认的主节点，再想办法把最新的机器元数据复制到选举出的主节点上。

基于节点ID排序的简单选举算法有 **三个附加约定条件**：

- 参选人数需要过半，达到 `quorum` (多数)后就选出了临时的主。
  - 为什么是临时的? 每个节点运行排序取最大值的算法，结果不一定相同。
  - 举个例子，集群有5台主机，节点ID分别是1、2、3、4、5。当产生网络分区或节点启动速度差异较大时，节点1看到的节点列表是1、2、3、4，选出4；节点2看到的节点列表是2、3、4、5，选出5。结果就不一致了，由此产生下面的第二条限制。
- 得票数需过半。
  - 某节点被选为主节点，必须判断加入它的节点数过半，才确认 Master 身份。
- 当探测到节点离开事件时，必须判断当前节点数是否过半。
  - 如果达不到 `quorum`，则放弃 Master身份，重新加入集群。
  - 如果不这么做，则设想以下情况：假设5台机器组成的集群产生网络分区，2台一组，3台一组，产生分区前，Master 位于2台中的一个，此时3台一组的节点会重新并成功选取 Master，产生双主，俗称脑裂。

### 选举集群元信息

1. Master节点的独立性：
   - 被选出的 Master 节点与集群元信息的新旧程度无关。
   - 当选出 Master 节点后，其首要任务是选举元信息。
2. 元信息的收集与广播：
   - Master 节点会要求所有具有Master资格的节点发送各自存储的元信息。
   - 所有节点必须回复，无论成功还是失败，且没有超时限制。
   - 收集到的有效元信息总数必须达到指定数量。
   - 根据版本号（较大的版本号）确定最新的元信息，并将其广播给所有节点。
3. 集群元信息选举的级别：
   - 包括集群级元信息和索引级元信息。
     - 集群级元信息涉及集群状态和索引元数据。
     - 索引级元信息涉及分片分配信息和副本状态。
   - 不包含 shard 存储位置信息，这些信息以节点磁盘存储的为准，需要节点主动上报。
4. 集群一致性与选举规则：
   - 参与选举的元信息数量需要过半，以保证集群一致性。
   - Master 发布集群状态成功的规则是等待发布成功的节点数过半。
   - 在选举过程中，不接受新节点的加入请求。
5. Master 节点的后续操作：
   - 选举完毕后，Master 节点发布首次集群状态。
   - 然后开始选举 shard 级别的元信息，以确保集群的完整性和一致性。

### Allocation 过程

选举 `shard` 级元信息，构建内容路由表，是在 `allocation` 模块完成的。 在初始阶段，所有的 `shard` 都处于 `UNASSIGNED` (未分配)状态。ES中通过分配过程决定哪个分片位于哪个节点，重构内容路由表。此时，首先要做的是分配主分片。

#### 选主分片

1. Master 发起分配请求：
   - Master 节点不知道主分片的位置，因此它向集群的所有数据节点询问并期望得到指定数据量的响应。
   - 是不是效率有些低？这种询问量 = shard数 * 节点数。所以说我们最好控制 shard 的总规模别太大。

1. 主分片选举策略：
   - 在ES 5.x 以下的版本中，主分片的选取是通过比较各个分片的 元信息版本号 来决定的。
   - 在ES 5.x及以后的版本中，每个 shard 都有一个UUID，Master节点会记录哪个分片是最新的。
     - 因为ES是先写主分片，再由主分片节点转发请求去写副分片，所以主分片所在节点肯定是最新的
     - 主分片选举过程是通过集群级元信息中记录的“最新主分片的列表”来确定主分片的：汇报信息中存在，并且这个列表中也存在。
     - 通过 `allocator` 得到这个列表，然后对每个节点依次执行 `decider` ，只要有一个 `decider` 拒绝，就拒绝执行本次分配。决策之后的结果可能会有多个节点，取第一个。

至此，主分片选取完成。然后，将相关内容路由信息添加到集群中，Master 把新的集群状态广播下去，当数据节点发现某个分片分配给自己，开始执行分片的`recovery`。

#### 选副分片

主分片选举完成后，从上一个过程汇总的 `shard` 信息中选择一个副本作为副分片。如果汇总信息中不存在，则分配一个全新副本。

> 最后，`allocation` 过程中允许新启动的节点加入集群。

### Index recovery

分片分配成功后进入 `recovery` 流程。

- 主分片的 `recovery` 不会等待其副分片分配成功才开始 `recovery` 。
- 它们是独立的流程，只是副分片的 `recovery` 需要主分片恢复完毕才开始。

#### 为什么需要 recovery？

- 对于主分片来说
  - 可能有一些数据没来得及刷盘；
- 对于副分片来说
  - 一是没刷盘
  - 二是主分片写完了，副分片还没来得及写，主副分片数据不一致。

#### 快速恢复的四个标识

##### 每个写操作的标识（Sequence ID）

通过使用唯一的 `Sequence ID` 来标记每个写入操作，可以对索引的操作做总排序。`Sequence ID` 逻辑上由 `Primary Term` 和 `Sequence Number` 组成。

- `Sequence Number`，由 `Primary` 分配和管理，每次写入操作后会自加。`Sequence Number` 既然由 `Primary` 分配，所以其跟 `Primary` 的任期（`Term`）挂钩。
- `Primary Term`，代表的是主分片的一个版本，由 Master 节点进行分配。当一个分片被提升为主分片时，`Primary Term` 就会递增，然后会持久化到集群状态中去。

虽然有了 Primary Term 和 Sequence Number，但怎么比较两个写入操作的“大小”呢？每次写操作时，主分片在转发数据时都会带上 Primary Term 和 Sequence Number，那么在比较两个操作 Operation1 和 Operation2 时，可以这样判断：

- 如果 Operation1.term < Operation2.term
  - 则 Operation1 < Operation2
- 如果 (Operation1.term == Operation2.term && Operation1.seq_id < Operation2.seq_id)
  - 则 Operation1 < Operation2

有了 Primary Term + Sequence Number，系统可以检测出分片副本的差异，可以加速数据恢复的过程。

##### synid（同步标志）

为了解决副本分片恢复过程第一阶段 时间太长 而引入了synced flush，默认情况下5分钟没有写入操作的索引被标记inactive(不活跃)，执行synced flush，生成一个唯一的synid(同步标志)，写入分片的所有副本中。

这个syncid是分片级，意味着拥有相同syncid的分片具有相同的Lucene索引。

##### 全局检查点（GlobalCheckpoint）

全局检查点 是所有活跃分片历史都已经对齐、持久化成功的序列号，所以小于全局检查点的操作都已经在所有副本上处理完了。当主副本下线后，系统只需要比较新的主副本与其他从副本间最后一个全局检查点之后的操作即可。

##### 本地检查点（LocalCheckpoint）

本地检查点 代表着本副本中所有小于这个值的操作都已经处理完毕了（写 Lucene 和 Translog 都成功了）

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613172243531.png" alt="image-20250613172243531" style="zoom:80%;" />

有了全局检查点后，系统就可以实现 `增量数据复制` 了，系统只需要比较副本间最后一个全局检查点即可知道差异的数据，并且对其增量复制。

#### 主分片recovery

由于每次写操作都会记录事务日志( `translog` )， 事务日志中记录了哪种操作，以及相关的数据。因此将最后一次提交(`Lucene` 的一次提交就是一次 `fsync` 刷盘的过程)之后的 `translog` 中进行重放，建立 `Lucene` 索引，如此完成主分片的 `recovery`。

判定条件就是本地的 `checkpoint` 之后的 `translog`，都要进行重放

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613172335378.png" alt="image-20250613172335378" style="zoom:80%;" />

#### 副分片recovery

副分片恢复的核心思想是从主分片拉取 `Lucene` 分段和 `translog` 进行恢复。

> 按数据传递的方向，主分片节点称为 `Source`，副分片节点称为 `Target`。

##### 拉取主分片的 `translog` 的原因

- 在副本分片恢复期间，允许新的写操作，这意味着恢复的副分片数据不包括新增的内容。
- 这些新增内容存在于主分片的translog中，因此副分片需要从主分片节点拉取translog进行重放，以获取新增内容。
- 为了保留translog，引入了TranslogDeletionPolicy，它负责维护活跃的translog文件，通过创建快照来保持translog不被清理。

##### 恢复过程的阶段

- phase1：在主分片所在节点，获取translog保留锁，开始保留translog不受刷盘清空的影响。然后调用Lucene接口把shard做快照，快照含有shard中已经刷到磁盘的文件引用，将这些shard数据复制到副本节点。
- phase2：对translog做快照，这个快照包含从phase1开始到执行translog快照期间的新增索引。将这些translog发送到副分片所在节点进行重放。

###### 跳过第一阶段的情况：

第一阶段尤其漫长，因为它需要从主分片拉取全量的数据，在ES 7.x中，跳过phase1的条件：

1. 主副分片有相同的 `synid`
2. 主副分片 `doc` 数量相同
3. 基于源分片的本地 `checkpoint`、`Sequence Number` 和基于目标分片的本地 `checkpoint`、`Sequence Number` 一致

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613172518883.png" alt="image-20250613172518883" style="zoom:80%;" />

#### 需要关注的问题：

##### 分片数据完整性

- 如何确保副分片不丢数据？
- 第二阶段的 `translog` 快照包括第一阶段所有的新增操作。

##### 数据一致性

- 如何维护主副分片的一致性？

- 通过写流程中进行异常处理，对比版本号来过滤掉过期操作。

## 拼写纠错是如何实现的

拼写纠错是基于编辑距离来实现;编辑距离是一种标准的方法，它用来表示经过插入、删除和替换操作从一个字符串转换到另外一个字符串的最小操作步数;

```java
    class Solution {
        public int minDistance(String word1, String word2) {
            int m = word1.length(), n = word2.length();
            int[][] memo = new int[m][n];
            for (int[] row : memo) {
                Arrays.fill(row, -1); // -1 代表未计算
            }
            return dp(word1, m - 1, word2, n - 1, memo);
        }

        /**
         * 返回 s1[0..i] 和 s2[0..j-1] 最小编辑距离
         *
         * @param s1
         * @param i
         * @param s2
         * @param j
         * @param memo
         * @return
         */
        private int dp(String s1, int i, String s2, int j, int[][] memo) {
            if (i == -1) return j + 1; // s1 串结束，直接取剩余s2的长度
            if (j == -1) return i + 1; // s2 串结束，直接取剩余s1的长度
            if (memo[i][j] != -1) return memo[i][j];
            if (s1.charAt(i) == s2.charAt(j)) { // s1[i] == s2[j] ，i和j各自-1，往前走
                memo[i][j] = dp(s1, i - 1, s2, j - 1, memo);
            } else {
                memo[i][j] = min(
                        dp(s1, i, s2, j - 1, memo) + 1, // 插入
                        dp(s1, i - 1, s2, j, memo) + 1, // 删除
                        dp(s1, i - 1, s2, j - 1, memo) + 1 // 替换
                );
            }
            return memo[i][j];
        }

        private int min(int a, int b, int c) {
            return Math.min(Math.min(a, b), c);
        }
    }
```

## 在并发情况下，Elasticsearch 如果保证读写一致

1. 可以通过版本号使用乐观并发控制，以确保新版本不会被旧版本覆盖，由应用层来处理具体的冲突;
2. 另外对于写操作，一致性级别支持 quorum/one/all，默认为 quorum，即只有当大多数分片可用时才允许写操作。但即使大多数可用，也可能存在因为网络等原因导致写入副本失败，这样该副本被认为故障，分片将会在一个不同的节点上重建。
3. 对于读操作，可以设置 replication 为 sync(默认)，这使得操作在主分片和副本分片都完成后才会返回;如果设置 replication 为 async 时，也可以通过设置搜索请求参数_preference 为 primary 来查 询主分片，确保文档是最新版本。

## 聚合结果为何不准确

### Terms 聚合的结果不准确的原因

需要注意的是，我们说的聚合结果不准确是发生在分组聚合的 Terms 聚合 API 中的。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613172641976.png" alt="image-20250613172641976" style="zoom:90%;" />

**协调节点会从每个分片的 top n 数据中最终排序出 top n，但每个分片的 top n 并不一定是全量数据的 top n。**

我们通过一个例子来讲解：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613172717904.png" alt="image-20250613172717904" style="zoom:90%;" />

如上图，对于总量数据来说，数据排序为：A(20)、B(16)、D(8)、C(7)，top 3 为：A(20)、B(16)、D(8) 。而聚合得出的错误 top 3 为：A(20)、B(16)、C(5) 。因为在 P0 分片的 top 3 丢掉了 D(4), 而 P1 分片中返回 top 3 中丢掉了 C(2)，而丢掉的这部分数据恰好会影响最终的结果。

### 解决方案

在解了 Terms 聚合的整个原理后，我们得出了造成 Terms 聚合结果不准确的原因有以下两个：

1. 数据进行了分片存储
2. 每个分片返回 top n，并且从所有分片的 top n 中排序后最终选出 top n。而 **每个分片的 top n 并不一定是全量数据的 top n**。

> 那要解决这个问题也很好办，对症下药就可以了：

1. **数据不要分片存储**

但是这种方案就一定程度上牺牲了 ES 的分布式特性，所以这种方式只能在数据规模小的时候使用。

2. **每个分片返回足够多的分组**

例如查询结果要返回 top 3，我们在每个分片上返回 top 20，或者每个分片返回全量的分组数据。

