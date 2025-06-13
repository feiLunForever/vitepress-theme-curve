# RocketMQ


## 消息队列

> 消息队列理解为一个使用队列来通信的组件。它的本质，就是个转发器，包含发消息、存消息、消费消息的过程

### 使用场景

#### 应用解耦

- 订单系统

  - 用户下单后，消息写入到消息队列，返回下单成功
- 库存系统

  - 订阅下单消息，获取下单信息，进行库存操作

#### 流量削峰

我们做秒杀实现的时候，需要避免流量暴涨，打垮应用系统的风险。可以在应用前面加入消息队列。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613222822054.png" alt="image-20250613222822054" style="zoom:40%;" />

假设秒杀系统每秒最多可以处理 2k 个请求，每秒却有 5k 的请求过来，可以引 入消息队列，秒杀系统每秒从消息队列拉 2k 请求处理得了。有些伙伴担心这样会出现 `消息积压` 的问题：

- 首先秒杀活动不会每时每刻都那么多请求过来，高峰期过去后，积压的请求可以慢慢处理;
- 其次，如果消息队列长度超过最大数量，可以直接抛弃用户请求或跳转到错误页面;

#### 异步处理

我们经常会遇到这样的业务场景:用户注册成功后，给它发个短信和发个邮件。

如果注册信息入库是 30ms，发短信、邮件也是 30ms，三个动作串行执行的 话，会比较耗时，响应 90ms:

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613222846928.png" alt="image-20250613222846928" style="zoom:40%;" />

如果采用并行执行的方式，可以减少响应时间。注册信息入库后，同时异步发 短信和邮件。如何实现异步呢，用消息队列即可，就是说，注册信息入库成功后，写入到消息队列(这个一般比较快，如只需要 3ms)，然后异步读取发邮件和短信。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613222905134.png" alt="image-20250613222905134" style="zoom:40%;" />

#### 消息通讯

消息队列内置了高效的通信机制，可用于消息通讯。如实现点对点消息队列、聊天室等。

## 特点

- 具有高性能、高可靠、高实时、分布式等特点
- 能够保证严格的消息顺序
- 支持拉（pull）和推（push）两种消息模式
- 实时的消息订阅机制
- 亿级消息堆积能力
- RocketMQ 对文件的读写巧妙地利用了操作系统的一些高效文件读写方式(mmap 零拷贝)

## 缺点

- 系统可用性降低  
  系统引入的外部依赖越多，越容易挂掉。本来你就是 A 系统调用 BCD 三个系统的接口就好了，ABCD 四个系统还好好的，没啥问题，你偏加个 MQ 进来，万一 MQ 挂了咋整？MQ 一挂，整套系统崩溃，你不就完了？如何解决消息堆积问题？ 如何保证消息队列的高可用 ？
- 系统复杂度提高  
  硬生生加个 MQ 进来，你怎么[保证消息没有重复消费](https://doocs.github.io/advanced-java/#/docs/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)？怎么做到 信息不丢失？怎么保证消息 顺序消费 ？头大头大，问题一大堆，痛苦不已。
- 一致性问题  
  A 系统处理完了直接返回成功了，人都以为你这个请求就成功了；但是问题是，要是 BCD 三个系统那里，BD 两个系统写库成功了，结果 C 系统写库失败了，咋整？你这数据就不一致了。  
  用 MQ 有个基本原则，就是**数据不能多一条，也不能少一条**，不能多，就是前面说的[重复消费和幂等性问题](https://doocs.github.io/advanced-java/#/docs/high-concurrency/how-to-ensure-that-messages-are-not-repeatedly-consumed)。不能少，就是说这数据别搞丢了。那这个问题你必须得考虑一下。如果说你这个是用 MQ 来传递非常核心的消息，比如说计费、扣费的一些消息，那必须确保这个 MQ 传递过程中**绝对不会把计费消息给**弄丢。

## 角色（架构）

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613222923136.png" alt="image-20250613222923136" style="zoom:80%;" />

### NameServer

**`注册中心`** ，主要提供两个功能：**Broker 管理** 和 **路由信息管理**

- 去中心化，没有主节点
- 单个 `Broker` 结点和所有的 `NameServer` 保持 `长连接`，`Broker` 在启动时会向 `NameServer` 注册，并定时进行 `心跳连接`，且定时同步维护的 `Topic` 到 `NameServer`
- `Producer` 在发送消息前从 `NameServer` 中获取 `Topic` 的 `路由` 信息，也就是发往哪个 `Broker`
- `Consumer` 也会定时从 `NameServer` 获取 `Topic` 的 `路由` 信息

### Broker

`消息存储中心`，主要作用是接收来自 `Producer` 的消息并存储， `Consumer` 从这里取得消息

- 一个 `Topic` 分布在多个 `Broker` 上，一个 `Broker` 可以配置多个 `Topic` ，它们是 `多对多` 的关系
- 如果某个 `Topic` 消息量很大，应该给它多配置几个队列(提高并发能力)，并且 **尽量多分布在不同 **`Broker`** ** 上，以减轻某个 **`Broker`** ** 的压力**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613222940001.png" alt="image-20250613222940001" style="zoom:40%;" />

### Producer

负责产生消息，生产者向消息服务器发送由业务应用程序系统生成的消息。

- **RocketMQ** 提供了三种方式发送消息：同步、异步和单向

  - **单向发送**

    - 单向发送是指只负责发送消息而不等待服务器回应且没有回调函数触发
    - 适用于某些耗时非常短但对可靠性要求并不高的场景
    - 例如日志收集。
  - **同步发送**

    - 同步发送指消息发送方发出数据后会在收到接收方发回响应之后才发下一个数据包。
    - 一般用于重要通知消息
    - 例如重要通知邮件、营销短信。
  - **异步发送**

    - 异步发送指发送方发出数据后，不等接收方发回响应，接着发送下个数据包
    - 一般用于可能链路耗时较长而对响应时间敏感的业务场景
    - 例如用户视频上传后通知启动转码服务。

### Consumer

负责消费消息，消费者从消息服务器拉取信息并将其输入用户应用程序

- 支持以 `push` 推，`pull` 拉两种模式对消息进行消费。
- 支持 `集群方式` 和 `广播方式` 的消费，它提供实时消息订阅机制

## 工作流程

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223023210.png" alt="image-20250613223023210" style="zoom:50%;" />

1. 启动 **Namesrv**，Namesrv 起来后监听端口，等待 Broker、Producer、Consumer 连上来，相当于一个 `路由控制中心`。
2. **Broker** 启动，跟所有的 Namesrv 保持长连接，定时发送心跳包。
   > 心跳包中，包含当前 `Broker` 信息(IP+ 端口等)以及存储所有 `Topic` 信息。 注册成功后，Namesrv 集群中就有 Topic 跟 Broker 的映射关系。
   >

3. 收发消息前，先创建 Topic 。创建 Topic 时，需要指定该 Topic 要存储在哪些 Broker 上。也可以在发送消息时自动创建 Topic。
4. **Producer** 发送消息。
   启动时，先跟 Namesrv 集群中的其中一台建立长连接，并从 Namesrv 中获取当前发送的 Topic 存在哪些 Broker 上，然后跟对应的 Broker 建立长连接，直接向 Broker 发消息。

5. **Consumer** 消费消息。
   Consumer 跟 Producer 类似。跟其中一台 Namesrv 建立长连接，获取当前订阅 Topic 存在哪些 Broker 上，然后直接跟 Broker 建立连接通道，开始消费消息。

## 核心组成部分

### Message

- Message（消息）就是要传输的信息

### Topic

- 一条消息必须有一个主题（Topic），可以看做消息的归类，比如交易消息，物流消息

### Tag

- 一条消息也可以拥有一个可选的标签（Tag），可以看作子主题

### Group

- 每个消费组都消费主题中一份完整的消息，不同消费组之间消费进度彼此不受影响，也就是说，一条消息被 Consumer Group1 消费过，也会给 Consumer Group2 消费
- 消费组中包含多个消费者，同一个组内的消费者是竞争消费的关系，每个消费者负责消费组内的一部分消息。默认情况，如果一条消息被消费者 Consumer1 消费了，那同组的其他消费者就不会再收到这条消息

### Message Queue

- 消息队列，一个 Topic 下可以设置多个消息队列 Message Queue
- 如果一个 Consumer 需要获取 Topic 下所有的消息，就要遍历所有的 Message Queue
- 提高并发

  - 生产者组可以并发写多个队列
  - 消费者组也可以并发消费多个队列

### Offset

- 在 Topic 的消费过程中，由于消息需要被不同的组进行多次消费，所以消费完的消息并不会立即被删除，这就需要 RocketMQ 为每个消费组在每个队列上维护一个消费位移（Consumer Offset），这个位置之前的消息都被消费过，之后的消息都没有被消费过，每成功消费一条消息，消费位置就加一。
- 也可以这么说，Queue 是一个长度无限的数组，**Offset** 就是下标。

## 消费模式

RocketMQ 支持两种消息模式：**集群消费**（ Clustering ）和 **广播消费**（ Broadcasting ）。

### 集群消费

**集群消费**：**同一 Topic 下的一条消息只会被同一消费组中的一个消费者消费**。也就是说，消息被负载均衡到了同一个消费组的多个消费者实例上。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223040455.png" alt="image-20250613223040455" style="zoom:80%;" />

### **广播消费**

**广播消费**：当使用广播消费模式时，每条消息推送给集群内所有的消费者，保证消息至少被每个消费者消费一次。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223055084.png" alt="image-20250613223055084" style="zoom:80%;" />

### 差异点

#### **拷贝订阅关系**

```java
private void copySubscription() throws MQClientException {
    try {
       Map<String, String> sub = this.defaultMQPushConsumer.getSubscription();
       if (sub != null) {
          for (final Map.Entry<String, String> entry : sub.entrySet()) {
              final String topic = entry.getKey();
              final String subString = entry.getValue();
              SubscriptionData subscriptionData = FilterAPI.buildSubscriptionData(topic, subString);
                this.rebalanceImpl.getSubscriptionInner().put(topic, subscriptionData);
            }
        }
       if (null == this.messageListenerInner) {
          this.messageListenerInner = this.defaultMQPushConsumer.getMessageListener();
       }
       // 注意下面的代码 , 集群模式下自动订阅重试主题 
       switch (this.defaultMQPushConsumer.getMessageModel()) {
           case BROADCASTING:
               break;
           case CLUSTERING:
                final String retryTopic = MixAll.getRetryTopic(this.defaultMQPushConsumer.getConsumerGroup());
                SubscriptionData subscriptionData = FilterAPI.buildSubscriptionData(retryTopic, SubscriptionData.SUB_ALL);
                this.rebalanceImpl.getSubscriptionInner().put(retryTopic, subscriptionData);
                break;
            default:
                break;
        }
    } catch (Exception e) {
        throw new MQClientException("subscription exception", e);
    }
}
```

在集群模式下，会自动订阅重试队列，而广播模式下，并没有这段代码。也就是说**广播模式下，不支持消息重试**。

#### **消息进度保存**

广播模式：**消费进度保存在consumer端**。因为广播模式下consumer group中每个consumer都会消费所有消息，但它们的消费进度是不同。所以consumer各自保存各自的消费进度。

集群模式：消费进度保存在broker中。consumer group中的所有consumer共同消费同一个Topic 中的消息，同一条消息只会被消费一次。**消费进度会参与到了消费的负载均衡中，故消费进度是 需要共享的**。

```java
switch (this.defaultMQPushConsumer.getMessageModel()) {
    case BROADCASTING:
        this.offsetStore = new LocalFileOffsetStore(this.mQClientFactory, this.defaultMQPushConsumer.getConsumerGroup());
        break;
    case CLUSTERING:
        this.offsetStore = new RemoteBrokerOffsetStore(this.mQClientFactory, this.defaultMQPushConsumer.getConsumerGroup());
        break;
    default:
        break;
}
this.defaultMQPushConsumer.setOffsetStore(this.offsetStore);
```

#### **负载均衡消费该主题的所有 MessageQueue**

```java
private void rebalanceByTopic(final String topic, final boolean isOrder) {
    switch (messageModel) {
        case BROADCASTING: {
            Set<MessageQueue> mqSet = this.topicSubscribeInfoTable.get(topic);
            if (mqSet != null) {
                boolean changed = this.updateProcessQueueTableInRebalance(topic, mqSet, isOrder);
                // 省略代码
            } else {
                log.warn("doRebalance, {}, but the topic[{}] not exist.", consumerGroup, topic);
            }
            break;
        }
        case CLUSTERING: {
            Set<MessageQueue> mqSet = this.topicSubscribeInfoTable.get(topic);
            List<String> cidAll = this.mQClientFactory.findConsumerIdList(topic, consumerGroup);
            // 省略代码
            if (mqSet != null && cidAll != null) {
                List<MessageQueue> mqAll = new ArrayList<MessageQueue>();
                mqAll.addAll(mqSet);

                Collections.sort(mqAll);
                Collections.sort(cidAll);

                AllocateMessageQueueStrategy strategy = this.allocateMessageQueueStrategy;

                List<MessageQueue> allocateResult = null;
                try {
                     allocateResult = strategy.allocate(
                            this.consumerGroup,
                            this.mQClientFactory.getClientId(),
                            mqAll,
                            cidAll);
                    } catch (Throwable e) {
                        // 省略日志打印代码
                        return;
                    }
                Set<MessageQueue> allocateResultSet = new HashSet<MessageQueue>();
                if (allocateResult != null) {
                    allocateResultSet.addAll(allocateResult);
                }
                boolean changed = this.updateProcessQueueTableInRebalance(topic, allocateResultSet, isOrder);
                //省略代码
            }
            break;
        }
        default:
            break;
    }
}
```

从上面代码我们可以看到消息模式为广播消费模式时，消费者会消费该主题下所有的队列，这一点也可以从本地的进度文件 `offsets.json` 得到印证。

#### **不支持顺序消息**

我们知道**消费消息顺序服务会向 Borker 申请锁** 。消费者根据分配的队列 messageQueue ，向 Borker 申请锁 ，如果申请成功，则会拉取消息，如果失败，则定时任务每隔 20 秒会重新尝试。

但是从上面的代码，我们发现只有在集群消费的时候才会定时申请锁，这样就会导致广播消费时，无法为负载均衡的队列申请锁，导致拉取消息服务一直无法获取消息数据。

笔者修改消费例子，在消息模式为广播模式的场景下，将消费模式从并发消费修改为顺序消费。

```java
consumer.registerMessageListener((MessageListenerOrderly) (msgs, context) -> {
    try {
        for (MessageExt messageExt : msgs) {
            System.out.println(new String(messageExt.getBody()));
        }
    }catch (Exception e) {
        e.printStackTrace();
    }
    return ConsumeOrderlyStatus.SUCCESS;
});
```

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223115573.png" alt="image-20250613223115573" style="zoom:90%;" />

通过 IDEA DEBUG 图，笔者观察到因为负载均衡后的队列无法获取到锁，所以拉取消息的线程无法发起拉取消息请求到 Broker , 也就不会走到消费消息的流程。

因此，**广播消费模式并不支持顺序消息**。

#### **并发消费消费失败时，没有重试**

```java
switch (this.defaultMQPushConsumer.getMessageModel()) {
    case BROADCASTING:
        for (int i = ackIndex + 1; i < consumeRequest.getMsgs().size(); i++) {
            MessageExt msg = consumeRequest.getMsgs().get(i);
            log.warn("BROADCASTING, the message consume failed, drop it, {}", msg.toString());
        }
        break;
    case CLUSTERING:
        List<MessageExt> msgBackFailed = new ArrayList<MessageExt>(consumeRequest.getMsgs().size());
        for (int i = ackIndex + 1; i < consumeRequest.getMsgs().size(); i++) {
            MessageExt msg = consumeRequest.getMsgs().get(i);
            boolean result = this.sendMessageBack(msg, context);
            if (!result) {
                msg.setReconsumeTimes(msg.getReconsumeTimes() + 1);
                msgBackFailed.add(msg);
            }
        }

        if (!msgBackFailed.isEmpty()) {
            consumeRequest.getMsgs().removeAll(msgBackFailed);

            this.submitConsumeRequestLater(msgBackFailed, consumeRequest.getProcessQueue(), consumeRequest.getMessageQueue());
        }
        break;
    default:
        break;
}
```

消费消息失败后，集群消费时，消费者实例会通过 **CONSUMER_SEND_MSG_BACK** 请求，将失败消息发回到 Broker 端。

但在广播模式下，仅仅是打印了消息信息。因此，**广播模式下，并没有消息重试**。

#### **总结**

集群消费和广播消费模式下，各功能的支持情况如下：

|功能|集群消费|广播消费|
| --------------| ------------| ------------|
|顺序消息|支持|不支持|
|重置消费位点|支持|不支持|
|消息重试|支持|不支持|
|消费进度|服务端维护|客户端维护|

## 存储模型

先进入 Broker 的**文件存储**目录。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223141629.png" alt="image-20250613223141629" style="zoom:50%;" />

RocketMQ 采用的是**混合型**的存储结构。

消息存储和下面三个文件关系非常紧密：

1. **数据文件 commitlog**  消息主体以及元数据的存储主体 ；
2. **消费文件 consumequeue**  消息消费队列，引入的目的主要是提高消息消费的性能 ；
3. **索引文件 index**  索引文件，提供了一种可以通过 key 或时间区间来查询消息。

### **数据文件** **commitlog**

RocketMQ 的消息数据都会写入到数据文件中， 我们称之为 commitlog 。

**1、Broker 单个实例下所有的队列共用一个数据文件（commitlog）来存储**

生产者发送消息至 Broker 端，然后 Broker 端使用同步或者异步的方式对消息刷盘持久化，保存至 commitlog 文件中。只要消息被刷盘持久化至磁盘文件 commitlog 中，那么生产者发送的消息就不会丢失。

单个文件大小默认 1G , 文件名长度为 20 位，左边补零，剩余为起始偏移量，比如 00000000000000000000 代表了第一个文件，起始偏移量为 0 ，文件大小为1 G = 1073741824 。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223155020.png" alt="image-20250613223155020" style="zoom:50%;" />

消息是一条一条写入到文件，每条消息的格式是固定的。

这种设计有两个优点：

- 充分利用顺序写，大大提升写入数据的吞吐量；
- 快读定位消息。 因为消息是一条一条写入到 commitlog 文件 ，写入完成后，我们可以得到这条消息的**物理偏移量**。 每条消息的物理偏移量是唯一的， commitlog 文件名是递增的，可以根据消息的物理偏移量通过**二分查找**，定位消息位于那个文件中，并获取到消息实体数据。

### **消费文件** **consumequeue**

**2、Broker 端的后台服务线程会不停地分发请求并异步构建 consumequeue（消费文件）和 indexfile（索引文件）**

> **consumequeue文件是commitlog的索引文件，可以根据consumequeue定位到具体的消息。**

假如有一个 consumerGroup 消费者，订阅主题 my-mac-topic ，因为 commitlog 包含所有的消息数据，查询该主题下的消息数据，需要遍历数据文件 commitlog , 这样的效率是极其低下的。

进入索引文件存储目录 ：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223208590.png" alt="image-20250613223208590" style="zoom:80%;" />

1、消费文件按照主题存储，每个主题下有不同的队列，图中主题 my-mac-topic 有 16 个队列 (0 到 15) ;

2、每个队列目录下 ，存储 consumequeue 文件，每个 consumequeue 文件也是顺序写入，数据格式见下图。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223222136.png" alt="image-20250613223222136" style="zoom:80%;" />

每个 consumequeue 文件包含 30 万个条目，每个条目大小是 20 个字节，每个文件的大小是 30 万 * 20 = 60万字节，每个文件大小约 5.72M 。

和 commitlog 文件类似，consumequeue 文件的名称也是以偏移量来命名的，可以通过消息的逻辑偏移量定位消息位于哪一个文件里。

消费文件按照**主题-队列**来保存 ，这种方式特别适配**发布订阅模型**。

消费者从 Broker 获取订阅消息数据时，不用遍历整个 commitlog 文件，只需要根据逻辑偏移量从 consumequeue 文件查询消息偏移量 ,  最后通过定位到 commitlog 文件， 获取真正的消息数据。

### **索引文件** **indexfile**

除了通过指定Topic进行消息消费外，RocketMQ还提供了根据Key进行消息查询的功能。该查询通过store/index/infdexFile进行索引实现的快速查询。这个indexFile中的索引数据是包含Key的消息被发送到Broker时写入的。如果消息中没有Key，不会被写入。

**索引条目结构**

- 每个Broker包含一组indexFile，每个indexFile都是以该indexFile被创建时的时间戳进行命名的。
- 每个indexFile由三部分组成：indexHeader（索引头），Slots（曹伟），indexes（索引数据）。
- 每个indexFile包含500万个slot，每个slot有可能会挂载很多index索引单元
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223235718.png" alt="image-20250613223235718" style="zoom:70%;" />

> 每个消息在业务层面的唯一标识码要设置到 keys 字段，方便将来定位消息丢失问题。**服务器**会为每个消息创建索引（哈希索引），应用可以通过 topic、key 来查询这条消息内容，以及消息被谁消费。

由于是哈希索引，请务必保证key尽可能唯一，这样可以避免潜在的哈希冲突。

```java
//订单Id   
String orderId = "1234567890";   
message.setKeys(orderId);   
```

从开源的控制台中根据主题和 key 查询消息列表：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223256681.png" alt="image-20250613223256681" style="zoom:50%;" />

进入索引文件目录 ，如下图所以：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223310813.png" alt="image-20250613223310813" style="zoom:50%;" />

索引文件名 fileName 是以创建时的时间戳命名的，固定的单个 IndexFile 文件大小约为 400 M 。

IndexFile 的文件逻辑结构类似于 JDK 的 HashMap 的**数组加链表**结构。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223330411.png" alt="image-20250613223330411" style="zoom:80%;" />

### 文件读写流程

写到这里，我们**粗糙模拟**下 RocketMQ **存储模型如何满足发布订阅模型（集群模式）**  。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223347732.png" alt="image-20250613223347732" style="zoom:90%;" />

1. **发送消息**：`producer` 发送消息到 `Broker` ；

2. **保存消息**：`Broker` 将消息存储到 `commitlog` 文件 ，异步线程会构建消费文件 `consumequeue` ；
    1. `Broker`根据`queueId`，获取到该消息对应索引条目要在`consumequeue`目录中的写入偏移量，即`QueueOffset`
    2. 将`queueId`、`queueOffset`等数据，与消息一起封装为**消息单元**
    3. 将消息单元写入到`commitlog`
    4. 同时，形成消息索引条目,将消息索引条目分发到相应的`consumequeue`
    
3. **消费流程**：

    1. `Consumer`获取到其要消费消息所在`Queue`的**消费偏移量offset**，计算出其要消费消息的 **消息offset**  
        消费offset即消费进度，consumer对某个Queue的消费offset，即消费到了该Queue的第几条消息 ,即已经消费的个数  
        消息offset = 消费offset + 1
    2. `Consumer`向`Broker`发送拉取请求，其中会包含其要拉取消息的`Queue`、消息`offset`及消息 `Tag`。
    3. `Broker`计算在该`consumequeue`中的`queueOffset`。  
        queueOffset = 消息offset * 20字节 (每个消息单元20字节)
    4. 从该`queueOffset`处开始向后查找第一个指定`Tag`的索引条目。
    5. 解析该索引条目的前8个字节，即可定位到该消息在`commitlog`中的**commitlog offset**
    6. 从对应`commitlog`文件中根据`commitlog offset`读取消息单元，并发送给`Consumer`

4. **保存进度**：消费者将消费进度提交到 Broker ，Broker 会将该消费组的消费进度存储在进度文件里。

## **Rebalance 机制**

### 作用

- 一个[Topic](https://so.csdn.net/so/search?q=Topic&spm=1001.2101.3001.7020)下可能会有很多逻辑队列，而消费者又有多个，这样**不同的消费者到底消费哪个队列**呢？
- 如果消费者或者队列扩缩容，**Topic下的队列又该分配给谁**呢？

消费端的负载均衡是指 **将 Broker 端中多个队列按照某种算法分配给同一个消费组中的不同消费者，负载均衡是客户端开始消费的起点**。

> Rebalance机制的本意是为了提升消息的并行消费能力。

如下图所示:

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223406599.png" alt="image-20250613223406599" style="zoom:80%;" />

例如，⼀个Topic下5个队列，在只有1个消费 者的情况下，这个消费者将负责消费这5个队列的消息。

如果此时我们增加⼀个消费者，那么就可以给 其中⼀个消费者分配2个队列，给另⼀个分配3个队列，从而提升消息的并行消费能力。

### 触发时机

负载均衡是每个**客户端独立进行计算**，那么何时触发呢 ？

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223418355.png" alt="image-20250613223418355" style="zoom:90%;" />

- 消费端启动时，立即进行负载均衡；
- 消费端定时任务每隔 20 秒触发负载均衡；
- 消费者上下线，Broker 端通知消费者触发负载均衡。

### 负载均衡流程

负载均衡服务执行逻辑在`doRebalance`函数，里面会对每个消费者组执行负载均衡操作。 也就是一个负载均衡服务是对一个消费者组负责的，那么我们可以想到对[不同的](https://so.csdn.net/so/search?q=%E4%B8%8D%E5%90%8C%E7%9A%84&spm=1001.2101.3001.7020)消费者组使用不同负载均衡策略。consumerTable这个map对象里存储了消费者组对应的的消费者实例。

```java
private ConcurrentMap<String/* group */, MQConsumerInner> consumerTable = new ConcurrentHashMap<String, MQConsumerInner>();
 
public void doRebalance() {
    // 每个消费者组都有负载均衡
    for (Map.Entry<String, MQConsumerInner> entry : this.consumerTable.entrySet()) {
        MQConsumerInner impl = entry.getValue();
        if (impl != null) {
            try {
                impl.doRebalance();
            } catch (Throwable e) {
                log.error("doRebalance exception", e);
            }
        }
    }
}
```

由于每个消费者组可能会消费很多topic,每个topic都有自己的不同队列，所以最终是按topic的维度进行负载均衡。

```java
public void doRebalance(final boolean isOrder) {
    Map<String, SubscriptionData> subTable = this.getSubscriptionInner();
    if (subTable != null) {
        for (final Map.Entry<String, SubscriptionData> entry : subTable.entrySet()) {
            final String topic = entry.getKey();
            try {
                //按topic维度执行负载均衡
                this.rebalanceByTopic(topic, isOrder);
            } catch (Throwable e) {
                if (!topic.startsWith(MixAll.RETRY_GROUP_TOPIC_PREFIX)) {
                    log.warn("rebalanceByTopic Exception", e);
                }
            }
        }
    }
    this.truncateMessageQueueNotMyTopic();
}
```

最终负载均衡逻辑处理 分为`广播消息`和`集群消息`模型两种情况处理。

由于`广播消息`是每个消费者实例都需要消费到，因此逻辑会简单点（不需要分配哪个队列给哪个消费者），我们主要关注`集群消息`模式。

```java
private void rebalanceByTopic(final String topic, final boolean isOrder) {
        switch (messageModel) {
            //广播模型
            case BROADCASTING: {
                Set<MessageQueue> mqSet = this.topicSubscribeInfoTable.get(topic);
                if (mqSet != null) {
                    boolean changed = this.updateProcessQueueTableInRebalance(topic, mqSet, isOrder);
                    if (changed) {
                        this.messageQueueChanged(topic, mqSet, mqSet);
                  
                    }
                }
                break;
            }
            //集群模型
            case CLUSTERING: {
                // 查topic下的消息队列
                Set<MessageQueue> mqSet = this.topicSubscribeInfoTable.get(topic);
                // 查询topic下的所有消费者
                List<String> cidAll = this.mQClientFactory.findConsumerIdList(topic, consumerGroup);
                if (null == mqSet) {
                    if (!topic.startsWith(MixAll.RETRY_GROUP_TOPIC_PREFIX)) {
                        log.warn("doRebalance, {}, but the topic[{}] not exist.", consumerGroup, topic);
                    }
                }
 
                if (mqSet != null && cidAll != null) {
                    List<MessageQueue> mqAll = new ArrayList<MessageQueue>();
                    mqAll.addAll(mqSet);
                    Collections.sort(mqAll);
                    Collections.sort(cidAll);
                    //负载均衡组件
                    AllocateMessageQueueStrategy strategy = this.allocateMessageQueueStrategy;
                    //负载均衡结果
                    List<MessageQueue> allocateResult = strategy.allocate(
                            this.consumerGroup,
                            this.mQClientFactory.getClientId(),
                            mqAll,
                            cidAll);
              
                    Set<MessageQueue> allocateResultSet = new HashSet<MessageQueue>();
                    if (allocateResult != null) {
                        allocateResultSet.addAll(allocateResult);
                    }
                    //负载均衡执行结束后，判断是否有新的消费策略变化，更新拉取策略
                    boolean changed = this.updateProcessQueueTableInRebalance(topic, allocateResultSet, isOrder);
                    if (changed) {
                        //发送更新通知
                        this.messageQueueChanged(topic, mqSet, allocateResultSet);
                    }
                }
                break;
            }
            default:
                break;
        }
    }
```

代码逻辑可以看出负载均衡核心功能的主流程，主要做了4件事情：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223441623.png" alt="image-20250613223441623" style="zoom:50%;" />

#### 负载均衡策略

看负载均衡策略的具体实现前，我们看下RocketMQ中的负载均衡策略顶层接口

```java
 
/**
 * Strategy Algorithm for message allocating between consumers
 */
public interface AllocateMessageQueueStrategy {
 
    /**
     * Allocating by consumer id
     * 给消费者id分配消费队列
     */
    List<MessageQueue> allocate(
        final String consumerGroup, //消费者组
        final String currentCID, //当前消费者id
        final List<MessageQueue> mqAll, //所有的队列
        final List<String> cidAll //所有的消费者
    );
 
}
```

默认共有7种负载均衡策略实现。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223456993.png" alt="image-20250613223456993" style="zoom:50%;" />

其中最常用的两种平均分配算法。

- AllocateMessageQueueAveragely 平均分配
- AllocateMessageQueueAveragelyByCircle 轮流平均分配

为了说明这两种分配算法的分配规则，现在对16 个队列，进行编号，用 q0-q15 表示， 消费者用 c0~c2 表示。

`AllocateMessageQueueAveragely` 分配算法的队列负载机制如下:

c0: q0 q1 q2 q3 q4 q5

c1: q6 q7 q8 q9 q10

c2: q11 q12 q13 q14 q15

> 其算法的特点是用总数除以消费者个数，余数按消费者顺序分配给消费者，故 c0 会多分配一个队列，而且队列分配是连续的

`AlocateMessageQueueAveragelyByCircle` 分配算法的队列负载机制如下:

c0: q0 q3 q6 q9 q12 q15

c1: q1 q4 q7 q10 q13

c2: q2 q5 q8 q11 q14

> 该分配算法的特点就是轮流一个一个分配

#### 消费队列更新

分配到的消息队列集合与 `processQueueTable` 做一个过滤比对操作。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223517567.png" alt="image-20250613223517567" style="zoom:80%;" />

消费者实例内 ，`processQueueTable` [对象存储](https://cloud.tencent.com/product/cos?from_column=20065&amp;from=20065)着当前负载均衡的队列 ，以及该队列的处理队列 `processQueue` (消费快照)。

1. 标红的 Entry 部分表示与分配到的消息队列集合互不包含，则需要将这些红色队列 Dropped 属性为 true , 然后从 `processQueueTable` 对象中移除。
2. 绿色的 Entry 部分表示与分配到的消息队列集合的交集，`processQueueTable` 对象中已经存在该队列。
3. 黄色的 Entry 部分表示这些队列需要添加到 `processQueueTable` 对象中，为每个分配的新队列创建一个消息拉取请求  `pullRequest`  ,  在消息拉取请求中保存一个处理队列 `processQueue` （队列消费快照），内部是红黑树（`TreeMap`），用来保存拉取到的消息。 最后创建拉取消息请求列表，并**将请求分发到消息拉取服务，进入拉取消息环节**。

大白话理解就是这样的：

> 1. **分配到的消息队列集合**：
>
>     - 这是消费者实例从Broker获取到的应该由它负责消费的消息队列列表。
> 2. **`processQueueTable`**：
>
>     - 这是消费者实例内部维护的一个表，记录了它当前正在处理的所有消息队列的状态。
> 3. **过滤比对操作**：
>
>     - 当消费者实例需要重新平衡消息队列（例如，有新的消费者加入或现有消费者离开）时，它需要确定哪些消息队列应该继续由它处理，哪些应该被移交给其他消费者实例。
>     - 过滤比对操作是指消费者实例会比较分配到的消息队列集合与`processQueueTable`中的记录，以确定以下内容：
>
>       - **哪些消息队列是新分配的**：这些队列不在`processQueueTable`中，消费者需要开始从这些队列中拉取消息。
>       - **哪些消息队列不再由当前消费者处理**：这些队列在`processQueueTable`中，但不在新分配的消息队列集合中，消费者需要停止从这些队列中拉取消息，并可能需要将这些队列的处理权移交给其他消费者。
>       - **哪些消息队列继续由当前消费者处理**：这些队列同时出现在分配的消息队列集合和`processQueueTable`中，消费者继续从这些队列中拉取消息。
>
> 通过这样的过滤比对操作，消费者实例可以确保它正确地处理了分配给它的消息队列，并且能够在集群环境中实现负载均衡和故障转移。

### **Rebalance限制**

由于⼀个队列最多分配给⼀个消费者，因此当某个消费者组下的消费者实例数量大于队列的数量时， 多余的消费者实例将分配不到任何队列。

### **Rebalance可能导致的问题**

- `消费暂停`：在只有一个Consumer时，其负责消费所有队列；在新增了一个Consumer后会触发 Rebalance的发生。此时原Consumer就让出部分队列的消费，导致这些队列的消费暂停,等到这些队列分配给新的Consumer 后，这些暂停消费的队列才能继续被消费。
- `消费重复`：Consumer 在消费新分配给自己的队列时，必须接着上一个 Consumer 提交的消费进度的offset 继续消费。然而默认情况下，offset是异步提交的，这个异步性导致上一个Consumer提交到Broker的offset与实际消费的消息并不一致。导致新的Consumer可能会接着已经在老Consumer中消费的消息进行消费, 重复消费消息。
- `消费突刺`：由于Rebalance可能导致重复消费，如果需要重复消费的消息过多，或者因为Rebalance暂停时间过长从而导致积压了部分消息。那么有可能会导致在Rebalance结束之后瞬间需要消费很多消息。

### Rebalance会出现的原因

导致Rebalance产生的原因，无非就两个：消费者所订阅Topic的Queue数量发生变化，或消费者组中消费者的数量发生变化。

**Queue数量发生变化的场景**：

- Broker扩容或缩容
- Broker升级运维
- Broker与NameServer间的网络异常
- Queue扩容或缩容

**消费者数量发生变化的场景**

- Consumer Group扩容或缩容
- Consumer升级重启
- Consumer与NameServer间网络异常

## 长轮询

消费者启动的时候，会创建一个**拉取消息服务 PullMessageService** ，它是一个单线程的服务。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223539351.png" alt="image-20250613223539351" style="zoom:90%;" />

核心流程如下：

1. 负载均衡服务将消息拉取请求放入到拉取请求队列 `pullRequestQueue` , 拉取消息服务从队列中获取**拉取消息请求** ；

2. 拉取消息服务向 `Brorker` 服务发送拉取请求 ，拉取请求的通讯模式是 **异步回调模式** ;

    1. 消费者的拉取消息服务本身就是一个单线程，使用异步回调模式，发送拉取消息请求到 `Broker` 后，**拉取消息线程并不会阻塞** ，可以继续处理队列 `pullRequestQueue` 中的其他拉取任务。

3. `Broker` 收到消费者拉取消息请求后，从存储中查询出消息数据，然后返回给消费者；

4. 消费者的网络通讯层会执行 **拉取回调函数** 相关逻辑，首先会将消息 **数据存储** 在队列消费快照 `processQueue` 里；消费快照使用 **红黑树 msgTreeMap** 存储拉取服务拉取到的消息 。

5. 回调函数将 **消费请求** 提交到 **消息消费服务** ，而消息消费服务会 **异步** 的消费这些消息；

6. 回调函数会将处理中队列的拉取请放入到 **定时任务** 中；

7. **定时任务** 再次将消息拉取请求放入到队列 `pullRequestQueue` 中，**形成了闭环**：负载均衡后的队列总会有任务执行拉取消息请求，不会中断。

> 细心的同学肯定有疑问：**既然消费端是拉取消息，为什么是长轮询呢**<span data-type="text" style="color: var(--b3-font-color13);"> </span>？

虽然拉模式的主动权在消费者这一侧，但是缺点很明显。

因为消费者并不知晓` Broker` 端什么时候有新的消息 ，所以会不停地去 `Broker` 端拉取消息，但拉取频率过高， `Broker` 端压力就会很大，频率过低则会导致消息延迟。

所以 **要想消费消息的延迟低，服务端的推送必不可少**。

下图展示了 RocketMQ 如何通过`长轮询`减小拉取消息的延迟。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223558687.png" alt="image-20250613223558687" style="zoom:90%;" />

核心流程如下：

1. `Broker` 端接收到消费者的拉取消息请求后，拉取消息处理器开始处理请求，根据拉取请求查询消息存储 ；

2. 从消息存储中获取消息数据 ，若存在新消息 ，则将消息数据通过网络返回给消费者。若无新消息，则将拉取请求放入到 **拉取请求表 pullRequestTable** 。

3. **长轮询请求管理服务** `pullRequestHoldService` 每隔 5 秒从拉取请求表中判断拉取消息请求的队列是否有新的消息。

    1. 判定标准是：拉取消息请求的偏移量是否小于当前消费队列最大偏移量，如果条件成立则说明有新消息了。
    2. 若存在新的消息 ,  **长轮询请求管理服务**会触发拉取消息处理器重新处理该拉取消息请求。

4. 当 commitlog 中新增了新的消息，消息分发服务会构建消费文件和索引文件，并且会通知**长轮询请求管理服务**，触发**拉取消息处理器重新处理该拉取消息请求**。

### 总结

- RocketMQ 没有真正意义的 push，都是 pull
- 虽然有 push 类，但实际底层实现采用的是长轮询机制，即拉取方式

### 为什么要主动拉取消息而不是事件监听方式

- 事件驱动方式是建立好长连接，由事件（发送数据）的方式来实时推送
- 如果 broker 主动推送消息的话有可能 push 速度快，消费速度慢的情况，那么就会造成消息在 consumer 端堆积过多，同时又不能被其他 consumer 消费的情况。而 pull 的方式可以根据当前自身情况来拉取，不会造成过多的压力而造成瓶颈，所以采取了 pull 的方式。

## 消费消息

在拉取消息的流程里， Broker 端返回消息数据，消费者的通讯框架层会执行回调函数。

回调线程会将数据存储在队列消费快照 `processQueue`（内部使用**红黑树 msgTreeMap**）里，然后将消息提交到消费消息服务，消费消息服务会 **异步** 消费这些消息。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223619176.png" alt="image-20250613223619176" style="zoom:90%;" />

消息消费服务有两种类型：**并发消费** 和 **顺序消费** 。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223631838.png" alt="image-20250613223631838" style="zoom:90%;" />

### 并发消费

并发消费是指 **消费者将并发消费消息，消费的时候可能是无序的**。

消费消息并发服务启动后，会初始化三个组件：**消费线程池**、**清理过期消息定时任务**、**处理失败消息定时任务**。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223646998.png" alt="image-20250613223646998" style="zoom:90%;" />

核心流程如下：

1. 通讯框架 **回调线程** 会将数据存储在 **消费快照** 里，然后将消息列表 `msgList` 提交到 **消费消息服务**

2. 消息列表 `msgList` 组装成消费对象

3. 将 **消费对象** 提交到 **消费线程池**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223703834.png" alt="image-20250613223703834" style="zoom:80%;" />

我们看到10 条消息被组装成三个消费请求对象，不同的消费线程会执行不同的消费请求对象。

4. **消费线程** 执行 **消息监听器**

![image-20250613223716174](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223716174.png)

执行完消费监听器，会返回消费结果。

![image-20250613223729143](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223729143.png)

5. **处理异常消息**

![image-20250613223738683](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223738683.png)

当消费异常时，异常消息将重新发回 Broker 端的重试队列（ RocketMQ 会为每个 topic 创建一个重试队列，以 `%RETRY%` 开头），达到重试时间后将消息投递到重试队列中进行消费重试。

假如异常的消息发送到 Broker 端失败，则重新将这些失败消息通过**处理失败消息定时任务**重新提交到消息消费服务。

6. **更新本地消费进度**

消费者消费一批消息完成之后，需要保存`消费进度`到进度管理器的本地内存。

首先我们会从队列消费快照 `processQueue` 中移除消息，返回消费快照 `msgTreeMap` 第一个偏移量 ，然后调用消费消息进度管理器 `offsetStore` 更新消费进度。

**待更新的偏移量**是如何计算的呢？

- 场景1：快照中1001（消息1）到1010（消息10）消费了，快照中没有了消息，返回已消费的消息最大偏移量 + 1 也就是1011。

![image-20250613223804755](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223804755.png)

- 场景2：快照中1001（消息1）到1008（消息8）消费了，快照中只剩下两条消息了，返回最小的偏移量 1009。

![image-20250613223817806](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223817806.png)

- 场景3：1001（消息1）在消费对象中因为某种原因一直没有被消费，即使后面的消息1005-1010都消费完成了，返回的最小偏移量是1001。

![image-20250613223829891](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223829891.png)

在场景3，RocketMQ 为了保证消息肯定被消费成功，消费进度只能维持在1001（消息1），直到1004 也被消费完，本地的消费进度才会一下子更新到1011。

假设1001（消息1）还没有消费完成，消费者实例 **突然退出（机器断电，或者被 kill ）** ，就存在重复消费的风险。

因为队列的消费进度还是维持在1001，当队列重新被分配给新的消费者实例的时候，新的实例从 Broker 上拿到的消费进度还是维持在1001，这时候就会又从1001开始消费，1001-1010这批消息实际上已经被消费过还是会投递一次。

所以 **业务必须要保证消息消费的幂等性**。

> 写到这里，我们会有一个疑问：**假设1001（消息1）因为加锁或者消费监听器逻辑非常耗时，导致极长时间没有消费完成，那么消费进度就会一直卡住 ，怎么解决呢 ？**

RocketMQ 提供两种方式一起配合解决：

- **拉取服务根据并发消费间隔配置限流**

  - 拉取消息服务在拉取消息时候，会判断当前队列的 `processQueue` 消费快照里消息的最大偏移量 - 消息的最小偏移量大于消费并发间隔（2000）的时候 , 就会触发 **流控** ,  这样就可以避免消费者无限循环的拉取新的消息。

- **清理过期消息**

  - 消费消息并发服务启动后，会定期扫描所有消费的消息，若当前时间减去开始消费的时间大于消费超时时间，首先会将过期消息发送 `sendMessageBack` 命令发送到 Broker ，然后从快照中删除该消息。

![image-20250613223840654](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223840654.png)

### 顺序消费

顺序消息分为 `全局顺序消息` 和 `分区顺序` 消息：

- 全局顺序消息指某个 Topic 下的所有消息都要保证顺序；

  - 示例：在证券处理中，以人民币兑换美元为 Topic，在价格相同的情况下，先出价者优先处理，则可以按照 FIFO 的方式发布和消费全局顺序消息
- 部分顺序消息只要保证每一组消息被顺序消费即可

  - 对于指定的一个 Topic ，所有消息根据 Sharding Key 进行区块分区，同一个分区内的消息按照严格的先进先出（FIFO）原则进行发布和消费。同一分区内的消息保证顺序，不同分区之间的消息顺序不做要求。
  - 比如订单消息，只要保证同一个订单 ID 个消息能按顺序消费即可

#### 全局顺序消息

- 某个 Topic 下的所有消息都要保证顺序

RocketMQ 默认情况下不保证顺序，比如创建一个 Topic ，默认八个写队列，八个读队列，这时候一条消息可能被写入任意一个队列里；在数据的读取过程中，可能有多个 Consumer ，每个 Consumer 也可能启动多个线程并行处理，所以消息被哪个 Consumer 消费，被消费的顺序和写人的顺序是否一致是不确定的。

##### 实现

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223852520.png" alt="image-20250613223852520" style="zoom:50%;" />

- 把 Topic 的读写队列数设置为 1
- Producer Consumer 的并发设置，也要是一

简单来说，为了保证整个 Topic 全局消息有序，只能消除所有的并发处理，各部分都设置成单线程处理 ，这时候就完全牺牲 RocketMQ 的高并发、高吞吐的特性了。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223910163.png" alt="image-20250613223910163" style="zoom:50%;" />

#### 部分顺序消息

- 每一组消息被顺序消费即可
- 比如订单消息，只要保证同一个订单 ID 个消息能按顺序消费即可

##### 实现

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223921976.png" alt="image-20250613223921976" style="zoom:50%;" />

**顺序消费实际上有两个核心点，一个是生产者有序存储，另一个是消费者有序消费。**

```
生产者有序发送
```

我们知道RocketMQ中生产者生产的消息会放置在某个队列中，基于队列先进先出的特性天然的可以保证存入队列的消息顺序和拉取的消息顺序是一致的，因此，我们只需要保证一组相同的消息按照给定的顺序存入同一个队列中，就能保证生产者有序存储。

普通发送消息的模式下，生产者会采用轮询的方式将消费均匀的分发到不同的队列中，然后被不同的消费者消费，因为一组消息在不同的队列，此时就无法使用 RocketMQ 带来的队列有序特性来保证消息有序性了。

> 因此 `producer` 需要做到把 `同ID ` 的消息发送到同一个 `Message Queue`
>
> - 发送端使用 `MessageQueueSelector` 类来控制 把消息发往哪个 `Message Queue`

```
消费者有序消费
```

> 在消费过程中，要做到从同一个 `Message Queue` 读取的消息顺序处理

`RockerMQ`的`MessageListener`回调函数提供了两种消费模式，有序消费模式`MessageListenerOrderly`和并发消费模式`MessageListenerConcurrently`。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613223950125.png" alt="image-20250613223950125" style="zoom:50%;" />

消费端通过使用 `MessageListenerOrderly` 来解决单 ` Message Queue` 的消息被并发处理的问题

#### 区别

实际上，每一个消费者的的消费端都是采用线程池实现多线程消费的模式，即消费端是多线程消费。虽然`MessageListenerOrderly`被称为有序消费模式，但是仍然是使用的线程池去消费消息。

`MessageListenerConcurrently`是拉取到新消息之后就提交到线程池去消费，而`MessageListenerOrderly`则是通过`加分布式锁`和`本地锁`保证同时只有`一条线程`去消费`一个队列`上的数据。

> 即 **顺序消费** 模式使用 <span data-type="text" style="color: var(--b3-font-color13);">3把锁</span> 来保证消费的顺序性：
>
> ![image-20250613224005822](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224005822.png)
>
> 1. **broker端的分布式锁**
>
>     1. **该分布式锁保证同一个**`consumerGroup`**下同一个**`messageQueue`**只会被分配给一个**`consumer`**实例**
>     2. 为了避免负载均衡等原因引起的变动，消费者会向Broker发送请求对消息队列进行加锁，如果加锁成功，记录到消息队列对应的`ProcessQueue`中的`locked`变量中。
> 2. **messageQueue的本地synchronized锁**
>
>     1. 消费者在处理拉取到的消息时，由于可以开启多线程进行处理，所以处理消息前通过`MessageQueueLock`中的`mqLockTable`获取到了消息队列对应的锁，锁住要处理的消息队列，这里加消息队列锁主要是处理多线程之间的竞争
>     2. **因为顺序消费也是通过线程池消费的，所以这个synchronized锁用来保证同一时刻对于同一个队列只有一个线程去消费它。**
> 3. **ProcessQueue的本地consumeLock**
>
>     1. **这把锁的作用，防止在消费消息的过程中，该消息队列因为发生负载均衡而被分配给其他客户端，进而导致的两个客户端重复消费消息的行为。**
>     2. 在获取到`broker`端的分布式锁以及`messageQueue`的本地`synchronized`锁的之后，在执行真正的消息消费的逻辑`messageListener#consumeMessage`之前，会获取`ProcessQueue`的`consumeLock`，这个本地锁是一个`ReentrantLock`。
>     3. 如果没有这把锁，假设该消息队列因为负载均衡而被分配给其他客户端B，但是由于客户端A正在对于拉取的一批消费消息进行消费，还没有提交消费点位，如果此时客户端A能够直接请求`broker`对该`messageQueue`解锁，这将导致客户端B获取该`messageQueue`的分布式锁，进而消费消息，而这些没有commit的消息将会发送重复消费。

既然如此，负载均衡的时候为什么不使用`MessageQueue`对应的`Object`对象锁进行加锁而要使用`ProcessQueue`中的`consumeLock`消费锁？

这里应该是为了减小锁的粒度，因为消费者在`MessageQueue`对应的`Object`加锁后，还进行了一系列的判断，校验都成功之后获取`ProcessQueue`中的`consumeLock`加锁，之后开始消费消息，消费完毕释放所有的锁。

如果负载均衡使用`MessageQueue`的`Object`对象锁需要等待整个过程结束，锁的粒度较粗，这样显然会降低性能，而如果使用`消息消费锁`，只需要等待第3步和第4步结束就可以获取锁，减少等待的时间，而且消费者在进行消息消费前也会判断`ProcessQueue`是否被移除，所以只要保证`consumeMessage`方法在执行的过程中(消息被消费的过程`)ProcessQueue`不被移除即可。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224025119.png" alt="image-20250613224025119" style="zoom:40%;" />

#### 总结

![image-20250613224047729](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224047729.png)

## 保存进度

RocketMQ 消费者消费完一批数据后， 会将队列的进度保存在本地内存，但还需要将队列的消费进度持久化。

### **集群模式**

![image-20250613224059329](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224059329.png)

集群模式下，分两种场景：

- 拉取消息服务会在拉取消息时，携带该队列的消费进度，提交给 Broker 的**拉取消息处理器**。
- 消费者定时任务，每隔5秒将本地缓存中的消费进度提交到 Broker 的**消费者管理处理器**。

Broker 的这两个处理器都调用消费者进度管理器 `consumerOffsetManager` 的 `commitOffset` 方法，定时任务异步将消费进度持久化到消费进度文件 `consumerOffset.json` 中。

![image-20250613224110638](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224110638.png)

### **广播模式**

广播模式消费进度存储在消费者本地，定时任务每隔 5 秒通过 LocalFileOffsetStore 持久化到本地文件`offsets.json` ，数据格式为 `MessageQueue:Offset`。

![image-20250613224121560](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224121560.png)

广播模式下，消费进度和消费组没有关系，本地文件 `offsets.json` 存储在配置的目录，文件中包含订阅主题中所有的队列以及队列的消费进度。

## **重试机制**

集群消费下，**重试机制**的本质是 RocketMQ 的延迟消息功能。

消费消息失败后，消费者实例会通过 **CONSUMER_SEND_MSG_BACK** 请求，将失败消息发回到 Broker 端。

Broker 端会为每个 `topic` 创建一个**重试队列** ，队列名称是：`%RETRY% + 消费者组名` ，达到重试时间后将消息投递到重试队列中进行消费重试（消费者组会自动订阅重试 Topic）。最多重试消费 `16` 次，重试的时间间隔逐渐变长，若达到最大重试次数后消息还没有成功被消费，则消息将被投递至`死信队列`。

![image-20250613224132820](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224132820.png)

### 延时消息

> 电商的订单超时自动取消，就是一个典型的利用延时消息的例子，用户提交了一个订单，就可以发送一个延时消息，1h 后去检查这个订单的状态，如果还是未付款就取消订单释放库存。

RocketMQ 是支持延时消息的，只需要在生产消息的时候设置消息的延时级别：

```java
// 实例化一个生产者来产生延时消息
DefaultMQProducer producer = new DefaultMQProducer("ExampleProducerGroup");
// 启动生产者
producer.start();
int totalMessagesToSend = 100;
for (int i = 0; i < totalMessagesToSend; i++) {
    Message message = new Message("TestTopic", ("Hello scheduled message " + i).getBytes());
    // 设置延时等级3,这个消息将在10s之后发送(现在只支持固定的几个时间,详看delayTimeLevel)
    message.setDelayTimeLevel(3);
    // 发送消息
    producer.send(message);
}
```

但是目前 RocketMQ 支持的延时级别是有限的：

```java
private String messageDelayLevel = "1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h";
```

### RocketMQ 怎么实现延时消息的？

简单，八个字：`临时存储`+`定时任务`。

- Broker 收到延时消息后，会先发送到主题（`SCHEDULE_TOPIC_XXXX`）的相应时间段的 `Message Queue` 中
- 然后通过一个 `定时任务` 轮询这些 `队列`，到期后，把消息投递到目标 `Topic` 的队列中，然后消费者就可以正常消费这些消息。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224144206.png" alt="image-20250613224144206" style="zoom:50%;" />

## 信息不丢失

### Producer 端

- **同步发送的时候，要注意处理响应结果和异常。如果返回响应 OK，表示消息成功发送到了 Broker，如果响应失败，或者发生其它异常，都应该重试**
- **异步发送的时候，应该在回调方法里检查，如果发送失败或者异常，都应该进行重试**

### Broker 端

- 修改刷盘策略为同步刷盘。默认情况下是异步刷盘的
- 集群部署，主从模式，高可用

### Consumer 端

- 完全消费正常后在进行手动 ack 确认

  - 只有当业务逻辑真正执行成功，我们才能返回 `CONSUME_SUCCESS`
  - 否则我们需要返回 `RECONSUME_LATER`，稍后再试

## 如何实现消息过滤

- Broker 端按照 Consumer 的去重逻辑进行过滤

  - **好处是避免了无用的消息传输到 Consumer 端**
  - **缺点是加重了 Broker 的负担，实现起来相对复杂**
- Consumer 端过滤

  - **根据 Tag 过滤：这是最常见的一种，用起来高效简单**

  ```java
  DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("CID_EXAMPLE");
  consumer.subscribe("TOPIC", "TAGA || TAGB || TAGC");
  ```

  - **SQL 表达式过滤：SQL 表达式过滤更加灵活**

  ```java
  DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("please_rename_unique_group_name_4");
  // 只有订阅的消息有这个属性a, a >=0 and a <= 3
  consumer.subscribe("TopicTest", MessageSelector.bySql("a between 0 and 3");
  consumer.registerMessageListener(new MessageListenerConcurrently() {
      @Override
      public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, ConsumeConcurrentlyContext context) {
          return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
      }
  });
  consumer.start();
  ```

  - **Filter Server 方式：最灵活，也是最复杂的一种方式，允许用户自定义函数进行过滤**

## 分布式事务

在 RocketMQ 中使用的是 **`事务消息 + 事务反查机制`** 来解决分布式事务问题的。

![image-20250613224203227](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224203227.png)

1. 生产者(订单系统)产生消息，发送一条 `半事务` 消息到 `Broker`
2. Producer 端收到响应，消息发送成功，此时消息是半消息，标记为 “`不可投递`” 状态，Consumer 消费不了
3. 生产者执行本地事务(订单创建成功，提交事务消息)
4. 正常情况本地事务执行完成，Producer 向 Broker 发送 `Commit/Rollback`
   - Commit，Broker 端将 `半消息` 标记为 `正常消息`，Consumer 可以消费
   - Rollback，Broker 丢弃此消息

5. 异常情况，Broker 端迟迟等不到二次确认。在一定时间后，会查询所有的 `半消息`，然后到 Producer 端查询 `半消息` 的执行情况
6. Producer 端查询本地事务的状态
7. 根据事务的状态提交 commit/rollback 到 broker 端
8. 如果消息状态更新为可发送，则 MQ 服务器会 push 消息给消费者(购物车系统)。
9. 消费者消费完(即拿到订单消息，清空购物车成功)就应答 ACK

```
那么，如何做到写入消息但是对用户不可见呢？
```

RocketMQ 事务消息的做法是：

- 如果消息是 `half` 消息，将备份原消息的主题与消息消费队列，然后改变主题 为 `RMQ_SYS_TRANS_HALF_TOPIC`。
- 由于消费组未订阅该主题，故消费端无法消费 `half` 类型的消息
- 然后 RocketMQ 会开启一个 `定时任务`，从 Topic 为 `RMQ_SYS_TRANS_HALF_TOPIC` 中拉取消息进行消费，根据生产者组获取一个服务提供者发送 `回查事务状态` 请求，根据事务状态来决定是提交或回滚消息。

## 消费堆积问题

消息积压是因为生产者的生产速度，`大于` 消费者的消费速度。

### 生产者生产太快

- 限流降级
- 增加多个消费者实例去水平扩展增加消费能力来匹配生产的激增

### 消费者消费太慢

- 先检查是否是消费者出现了大量的消费错误
- 临时紧急扩容

  - 先修复 consumer 消费者的问题，以确保其恢复消费速度
  - 然后将现有 consumer 都停掉
  - 新建一个 topic，partition 是原来的 10 倍，临时建立好原先 10 倍的 queue 数量
  - 然后写一个临时的分发数据的 consumer 程序，这个程序部署上去消费积压 的数据，消费之后不做耗时的处理，直接均匀轮询写入临时建立好的 10 倍数 量的 queue
  - 接着临时征用 10 倍的机器来部署 consumer，每一批 consumer 消费一个 临时 queue 的数据。这种做法相当于是临时将 queue 资源和 consumer 资 源扩大 10 倍，以正常的 10 倍速度来消费数据
  - 等快速消费完积压数据之后，得恢复原先部署的架构，重新用原先的 consumer 机器来消费消息

## 高可用

- NameServer 因为是无状态，且不相互通信的，所以只要集群部署就可以保证高可用

- **消息生产的高可用**：创建 topic 时，把 topic 的多个 message queue 创建在多个 broker 组上。这样当一个 broker 组的 master 不可用后，producer 仍然可以给其他组的 master 发送消息
- **消息消费的高可用**：consumer 不需要配置从 master 读还是 slave 读。当 master 不可用或者繁忙的时候 consumer 会被自动切换到从 slave 读。这样当 master 出现故障后，consumer 仍然可以从 slave 读，保证了消息消费的高可用

## RocketMq **性能提升**

`RocketMQ`中，无论是消息本身还是消息索引，都是存储在磁盘上的。其不会影响消息的消费吗？

当然不会。其实`RocketMQ`的性能在目前的MQ产品中性能是非常高的。因为系统通过一系列相关机制大大 提升了性能。

1. 首先，`RocketMQ`主要通过`MappedByteBuffer`对文件进行读写操作。其中，利用了`NIO`中的`FileChannel`模型将磁盘上的物理文件直接映射到用户态的内存地址中（这种`Mmap`的方式减少了传统IO将磁盘文件数据在操作系统内核地址空间的缓冲区和用户应用程序地址空间的缓冲区之间来回进行拷贝的性能开销），将对文件的操作转化为直接对内存地址进行操作，从而极大地提高了文件的读写效率（正因为需要使用`内存映射机制`，故`RocketMQ`的文件存储都使用定长结构来存储，方便一次将整个文件映射至内存）。
2. 其次，`consumequeue`中的数据是`顺序`存放的，使得OS 的`PageCache`的预读取机制，导致对 `consumequeue`文件的读取几乎接近于内存读取，即使在有消息堆积情况下也不会影响性能

## 为什么 RocketMQ 不使用 ZK 作为注册中心呢

### 基于可用性的考虑

- CAP 理论，同时最多只能满足两个点，而 ZK 满足的是 CP，不满足可用性
- zk 选举时，占用太长时间，期间整个集群不可用

### 基于性能的考虑

- NameServer 本身实现轻量级，可水平拓展

### 消息发送应该弱依赖注册中心

- 生产者在第一次发送消息的时候从 NameServer 获取到 Broker 地址后缓存到本地
- 如果 NameServer 整个集群不可用，短时间内对于生产者和消费者并不会产生太大影响

## 集群模式下消费者并发消费流程

![image-20250613224233541](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613224233541.png)

1. 消费者启动后，触发负载均衡服务 ，负载均衡服务为消费者实例分配对应的队列 ；
2. 分配完队列后，负载均衡服务会为每个分配的新队列创建一个消息拉取请求  `pullRequest`  ,  拉取请求保存一个处理队列 `processQueue`，内部是红黑树（`TreeMap`），用来保存拉取到的消息 ；
3. 拉取消息服务单线程从拉取请求队列  `pullRequestQueue` 中弹出拉取消息，执行拉取任务 ，拉取请求是异步回调模式，将拉取到的消息放入到处理队列；
4. 拉取请求在一次拉取消息完成之后会复用，重新被放入拉取请求队列 `pullRequestQueue` 中 ；
5. 拉取完成后，调用消费消息服务  `consumeMessageService ` 的  `submitConsumeRequest ` 方法 ，消费消息服务内部有一个消费线程池；
6. 消费线程池的消费线程从消费任务队列中获取消费请求，执行消费监听器  `listener.consumeMessage` ；
7. 消费完成后，若消费成功，则更新偏移量 `updateOffset`，先更新到内存 `offsetTable`，定时上报到 Broker ；若消费失败，则将失败消费发送到 Broker 。
8. Broker 端接收到请求后， 调用消费进度管理器的 `commitOffset` 方法修改内存的消费进度，定时刷盘到  `consumerOffset.json`。
