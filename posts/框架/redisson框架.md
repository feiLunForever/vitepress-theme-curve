# Redisson框架

## 为什么使用Redisson

### 应用场景

请求 a 的锁过期，但其业务还未执行完毕；请求 b 申请到了锁，其也正在处理业务。如果此时两个请求都同时修改了共享的库存数据，那么就又会出现数据不一致的问题，即仍然存在并发问题。在高并发场景下，问题会被无限大。

### 问题解决

> **对于该问题，可以采用“锁续约”方式解决**。

1. 在当前业务进程开始执行时，fork 出一个子进程，用于启动一个定时任务。
2. 该定时任务的定时时间小于锁的过期时间，其会定时查看处理当前请求的业务进程的锁是否已被删除。
3. 如果已被删除，则子进程结束；如果未被删除，说明当前请求的业务还未处理完毕，则将锁的时间重新设置为“原过期时间”。
4. 这种方式称为锁续约，也称为锁续命。

## Redisson功能介绍

在基于setnx实现的分布式锁中，虽然解决了误删锁和原子性问题，但是还存在以下问题：

1. 重入问题：重入指获取锁的线程再次进入相同锁的代码块中，可以自动获取锁，从而防止了死锁的出现。常见的synchronized和Lock锁都是可重入的。
2. 不可重试：获取锁只尝试一次就返回false，没有重试机制。而我们希望的是，获取锁失败后可以尝试再次获取锁。
3. 超时释放：在加锁的时候添加了过期时间，这样有可能锁是因为超时释放，虽然使用Lua表达式解决了误删，但是代码块因为锁超时释放而没有锁住代码块，难免出现安全隐患。
4. 主从一致性：Redis在集群情况下，向集群写数据时，主机需要异步的将数据同步给从机，而万一在同步过去之前，主机宕机了，就会出现死锁问题。

而 Redisson 提供的分布式锁和多种多样的问题就可以解决上诉问题。

## 可重入锁的实现

Redisson 的分布式锁 RLock 是一种可重入锁。当一个线程获取到锁之后，这个线程可以再次获取本对象上的锁，而其他的线程是不可以的。

- JDK 中的 ReentrantLock 是可重入锁，其是通过 AQS(抽象队列同步器)实现的锁机制
- synchronized 也是可重入锁，其是通过监视器模式(本质是 OS 的互斥锁)实现的锁机制

**在Redisson中，不再用简单的key-value来实现分布式锁。而是使用key-hashMap来实现分布式锁，hashMap中也是key-value组合，key为表示哪个线程持有这把锁，value为锁的重入次数。**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/bddbecf2c19ca58e3708140bfe888615.png" alt="在这里插入图片描述" style="zoom:50%;" />

> 废话不多说, 我们直接进入 Redisson的锁重入源码解读

## 加锁流程分析

### tryLock

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405161732437.png" alt="image-20250405161732437" style="zoom:60%;" />

- waitTime : 获取锁的最大等待时长, 第一次获取锁失败不会立即返回, 而是在等待时间内不断的尝试, 如果这个时间结束了都还没获取成功, 才返回false
- lease : 锁自动失效释放的时间
- unit : 时间单位

### tryAcquire

```java
private Long tryAcquire(long leaseTime, TimeUnit unit, long threadId) {
    
    // 根据传入的租约时间计算锁的过期时间
    long currentTime = System.currentTimeMillis();
    Long ttl = null;
    
    // 如果指定了租约时间
    if (leaseTime != -1) {
        ttl = tryLockInnerAsync(leaseTime, unit, threadId, RedisCommands.EVAL_LONG);
    } 
    // 使用默认的过期时间
    else {
        ttl = tryLockInnerAsync(commandExecutor.getConnectionManager().getCfg().getLockWatchdogTimeout(), 
            TimeUnit.MILLISECONDS, threadId, RedisCommands.EVAL_LONG);
        // 启动看门狗定时续期
        scheduleExpirationRenewal(threadId);
    }
    
    return ttl;
}
```

### tryLockInner

继续看`tryLockInner`方法 - 它是最核心的加锁 Lua 脚本：

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405163511138.png" alt="image-20250405163511138" style="zoom:60%;" />

> lua脚本部分执行成功返回的是nil (类似于我们java中的null), 执行失败了反而返回一个结果 : redis.call ( 'pttl', KEYS[1] ) 也就是锁的剩余的有效期

它的核心逻辑也很简单：**首先检查锁是否存在，如果不存在，则直接加锁，且设置重入次数为1；如果存在，先检查是否是当前线程的锁，如果是，则重入次数+1，如果不是，则返回锁的剩余过期时间。**

### tryLock获取锁失败后续阻塞是如何实现的

如果加锁失败，`tryLockInner` 会返回一个ttl时间，也就是锁的有效期。

**我们现在往回倒一步**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405171938572.png" alt="image-20250405171938572" style="zoom:60%;" />

把RFuture返回以后, 这里就有回到了这里 get(tryAcquireAsync((wait, leaseTime, threadId))

**get方法就是获取阻塞等待RFuther结果, 等待得到的剩余有效期**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405172018656.png" alt="image-20250405172018656" style="zoom:60%;" />

**这时就回到了这里**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405172044357.png" alt="image-20250405172044357" style="zoom:60%;" />

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405172111129.png" alt="image-20250405172111129" style="zoom:60%;" />

这里的subscribe就是订阅释放锁的lua脚本中的publish。

如果等待结束还没有收到通知就取消订阅, 并返回获取锁失败。

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405172142862.png" alt="image-20250405172142862" style="zoom:60%;" />

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405172217459.png" alt="image-20250405172217459" style="zoom:60%;" />

`if (ttl>=0 && ttl < time)`

-  ttl小于time(等待时间), 代表在等待之间锁就已经释放了
-  ttl大于time(等待时间), 如果等了time的时间, 经过time的时间,锁还没有被释放, 也就没必要等了

**如果时间还很充足, 就继续while(true)执行上面的代码, 不停的尝试等待,不断的进行这样的循环**。

```java
public RedissonLockEntry(CompletableFuture<RedissonLockEntry> promise) {
        super();
        this.latch = new Semaphore(0);
        this.promise = promise;
    }
```

> 其中`Semaphore(0)` 表示初始无可用许可证，线程调用 `acquire()` 时会立即阻塞，避免空轮询消耗 CPU 资源。

**这里设计的巧妙之处就在于利用了消息订阅, 信号量的机制, 它不是无休止的这种盲等机制, 也避免了不断的重试, 而是检测到锁被释放才去尝试重新获取, 这对CPU十分的友好。**

## WatchDog 续约源码解读

### 场景

Redisson锁重试的问题是解决了, 但是总会发生一些问题, 如果我们的业务阻塞超时了ttl到期了, 别的线程看见我们的ttl到期了, 他重试他就会拿到本该属于我们的锁, 这时候就有安全问题了, 所以该怎么解决?

我们必须确保锁是业务执行完释放的, 而不是因为阻塞而释放的。

### tryAcquire

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204341854.png" alt="image-20250405204341854" style="zoom:60%;" />

- 当我们没有设置leaseTime的时候, 也就是leaseTime=-1的时候就用看门狗过期时间来获取锁
- watchTimeout默认时间是30s

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204423306.png" alt="image-20250405204423306" style="zoom:60%;" />

- 当ttlRemainingFuture的异步尝试获取锁完成以后, 先判断执行过程中是否有异常, 如果有异常就直接返回了结束执行.
- 如果没有发生异常, 则判断ttlRemaining(剩余有效期)是否为空, 为空的话就代表获取锁成功, 执行锁到期续约的核心方法scheduleExpectationRenew

### **scheduleExpectationRenew**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204526114.png" alt="image-20250405204526114" style="zoom:60%;" />

**这里面的 `EXPIRATION_RENEWAL_MAP` 中的 key 很有意思，我们进去看一下**：

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204623365.png" alt="image-20250405204623365" style="zoom:60%;" />

- 清楚的发现 entryName由 id 和 name 两部分组成
- id就是当前的这个连接的id, name 就是 当前锁的名称

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204704553.png" alt="image-20250405204704553" style="zoom:60%;" />

这就好办了, 我们可以这样理解`getEntryName`**获得的就是锁的名称**, 而这个`EXPIRATION_RENEWAL_MAP`是静态的, 那么`RedissonLock`类的所有实例就都可以看到这个`map`。

而一个RedissonLock类可以创建出很多锁的实例, 每一个锁都会有自己的名字, 那么在这个map中就会有唯一的key也就是getEntryName()与唯一的entry相对应

- 如果是第一次创建`entry`往`map`里放的时候, 这个`entry`肯定不存在, 所以调用的是`putIfAbsent`, 这时候往`map`中放入的就是一个全新的`entry`, 返回值就是`null`
- 如果不是第一次放入,放入的是重入的`entry`的话, `putIfAbsent`返回的就是旧的`oldEntry`

这样做是为了保证同一个锁拿到的永远是同一个`entry`。

### **renewExpectation**

**internalLockLeaseTime是这样来的**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204909871.png" alt="image-20250405204909871" style="zoom:60%;" />

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204928998.png" alt="image-20250405204928998" style="zoom:60%;" />

这个方法主要开启一段定时任务, 不断的去更新有效期, 定时任务的的时间就是 `看门狗时间 / 3`, 也就是10s后刷新有效期。

**10s后做这样一件事**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205024998.png" alt="image-20250405205024998" style="zoom:60%;" />

刷新有效期

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205051894.png" alt="image-20250405205051894" style="zoom:60%;" />

这段lua脚本重置有效期, 满血复活

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205113377.png" alt="image-20250405205113377" style="zoom:60%;" />

这里实现了递归， 一直调用自己,，这就是锁永不过期的原因。

**`那么问题来了，什么时候释放锁呢?`**

当然是在释放锁的时候。

## 解锁流程分析

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205224039.png" alt="image-20250405205224039" style="zoom:60%;" />

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205247088.png" alt="image-20250405205247088" style="zoom:60%;" />

- 先从map中取出任务，先移除任务的线程Id，再取消这个任务，最后再移除entry。

## 总结

### 执行流程

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250406102459833.png" alt="image-20250406102459833" style="zoom:50%;" />

### Redisson分布式锁原理

- 可重入：利用 `hash`结构记录 `线程id` 和 `重入次数`
- 可重试：利用`信号量` 和 `PubSub` 功能实现等待、唤醒，获取锁失败的重试机制
- 超时续约：利用`watchDog`，每隔一段时间（releaseTime)，重置超时时间