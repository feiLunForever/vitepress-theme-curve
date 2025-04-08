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

### 加锁流程分析

#### tryLock

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405161732437.png" alt="image-20250405161732437" style="zoom:60%;" />

- waitTime : 获取锁的最大等待时长, 第一次获取锁失败不会立即返回, 而是在等待时间内不断的尝试, 如果这个时间结束了都还没获取成功, 才返回false
- lease : 锁自动失效释放的时间
- unit : 时间单位

#### tryAcquire

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

#### tryLockInner

继续看`tryLockInner`方法 - 它是最核心的加锁 Lua 脚本：

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405163511138.png" alt="image-20250405163511138" style="zoom:60%;" />

> lua脚本部分执行成功返回的是nil (类似于我们java中的null), 执行失败了反而返回一个结果 : redis.call ( 'pttl', KEYS[1] ) 也就是锁的剩余的有效期

它的核心逻辑也很简单：**首先检查锁是否存在，如果不存在，则直接加锁，且设置重入次数为1；如果存在，先检查是否是当前线程的锁，如果是，则重入次数+1，如果不是，则返回锁的剩余过期时间。**

#### tryLock获取锁失败后续阻塞是如何实现的

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

### WatchDog 续约源码解读

#### 场景

Redisson锁重试的问题是解决了, 但是总会发生一些问题, 如果我们的业务阻塞超时了ttl到期了, 别的线程看见我们的ttl到期了, 他重试他就会拿到本该属于我们的锁, 这时候就有安全问题了, 所以该怎么解决?

我们必须确保锁是业务执行完释放的, 而不是因为阻塞而释放的。

#### tryAcquire

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204341854.png" alt="image-20250405204341854" style="zoom:60%;" />

- 当我们没有设置leaseTime的时候, 也就是leaseTime=-1的时候就用看门狗过期时间来获取锁
- watchTimeout默认时间是30s

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405204423306.png" alt="image-20250405204423306" style="zoom:60%;" />

- 当ttlRemainingFuture的异步尝试获取锁完成以后, 先判断执行过程中是否有异常, 如果有异常就直接返回了结束执行.
- 如果没有发生异常, 则判断ttlRemaining(剩余有效期)是否为空, 为空的话就代表获取锁成功, 执行锁到期续约的核心方法scheduleExpectationRenew

#### **scheduleExpectationRenew**

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

#### **renewExpectation**

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

### 解锁流程分析

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205224039.png" alt="image-20250405205224039" style="zoom:60%;" />

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250405205247088.png" alt="image-20250405205247088" style="zoom:60%;" />

- 先从map中取出任务，先移除任务的线程Id，再取消这个任务，最后再移除entry。

### 总结

#### 执行流程

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/image-20250406102459833.png" alt="image-20250406102459833" style="zoom:50%;" />

#### Redisson分布式锁原理

- 可重入：利用 `hash`结构记录 `线程id` 和 `重入次数`
- 可重试：利用`信号量` 和 `PubSub` 功能实现等待、唤醒，获取锁失败的重试机制
- 超时续约：利用`watchDog`，每隔一段时间（releaseTime)，重置超时时间

## 公平锁的实现

所谓公平锁，就是保证客户端获取锁的顺序，跟他们请求获取锁的顺序，是一样的。公平锁需要排队，谁先申请获取这把锁，谁就可以先获取到这把锁，是按照请求的先后顺序来的。

非公平锁使用也很简单：

```java
RLock lock = redisson.getFairLock("anyLock");
lock.lock();
lock.unlock();
```

核心lua脚本代码：

```java
<T> RFuture<T> tryLockInnerAsync(long leaseTime, TimeUnit unit, long threadId, RedisStrictCommand<T> command) {
    internalLockLeaseTime = unit.toMillis(leaseTime);
 
    long currentTime = System.currentTimeMillis();    
    if (command == RedisCommands.EVAL_LONG) {
            return commandExecutor.syncedEval(getRawName(), LongCodec.INSTANCE, command,
                    // remove stale threads
                    // 移除过期线程
                    "while true do " +
                            //list里面是否有线程存在
                        "local firstThreadId2 = redis.call('lindex', KEYS[2], 0);" +
                        "if firstThreadId2 == false then " +
                            //没有，跳出循环
                            "break;" +
                        "end;" +

                            //如果存在，就去zset里面获取这个线程的超时时间
                        "local timeout = tonumber(redis.call('zscore', KEYS[3], firstThreadId2));" +
                        "if timeout <= tonumber(ARGV[4]) then " +
                            // remove the item from the queue and timeout set
                            // NOTE we do not alter any other timeout
                            // 超时就从list以及zset中移除掉
                            "redis.call('zrem', KEYS[3], firstThreadId2);" +
                            "redis.call('lpop', KEYS[2]);" +
                        "else " +
                            "break;" +
                        "end;" +
                    "end;" +

                    // check if the lock can be acquired now
                    // 检查这把锁是否当前可以被获取到
                    // 可以加锁的逻辑判断：当前不存在锁 && (当前不存在等待锁的线程 || 当前等待锁的第一个线程是当前线程)
                    "if (redis.call('exists', KEYS[1]) == 0) " +
                        "and ((redis.call('exists', KEYS[2]) == 0) " +
                            //
                            "or (redis.call('lindex', KEYS[2], 0) == ARGV[2])) then " +

                        // remove this thread from the queue and timeout set
                        // 既然要获取到锁了，那就将当前元素从等待队列和超时队列中移除
                        "redis.call('lpop', KEYS[2]);" +
                        "redis.call('zrem', KEYS[3], ARGV[2]);" +

                        // decrease timeouts for all waiting in the queue
                        // 减少等待队列中其他线程的超时时间
                        // 假设线程 A 持有锁，剩余时间为 T，线程 B 在等待队列中排队，其超时时间设置为 T + 等待时间。
                        // 当线程 A 释放锁后，线程 B 的超时时间需要基于新的锁剩余时间重新计算。
                        "local keys = redis.call('zrange', KEYS[3], 0, -1);" +
                        "for i = 1, #keys, 1 do " +
                            // -300s
                            "redis.call('zincrby', KEYS[3], -tonumber(ARGV[3]), keys[i]);" +
                        "end;" +

                        // acquire the lock and set the TTL for the lease
                        // 获取到了锁，并设置过期时间
                        "redis.call('hset', KEYS[1], ARGV[2], 1);" +
                        "redis.call('pexpire', KEYS[1], ARGV[1]);" +
                        "return nil;" +
                    "end;" +

                    // check if the lock is already held, and this is a re-entry
                    // 检查这把锁是否已经被持有，并且当前线程是否是持有锁的线程
                    "if redis.call('hexists', KEYS[1], ARGV[2]) == 1 then " +
                        // 如果当前线程已经持有锁，那就将锁的持有次数+1，并重新设置过期时间
                        "redis.call('hincrby', KEYS[1], ARGV[2],1);" +
                        "redis.call('pexpire', KEYS[1], ARGV[1]);" +
                        "return nil;" +
                    "end;" +

                    // the lock cannot be acquired
                    // 到这里说明当前线程不能获取到锁，那就将当前线程加入等待队列，并设置超时时间
                    // check if the thread is already in the queue
                    "local timeout = redis.call('zscore', KEYS[3], ARGV[2]);" +
                    "if timeout ~= false then " +
                        // the real timeout is the timeout of the prior thread
                        // in the queue, but this is approximately correct, and
                        // avoids having to traverse the queue
                            //todo
                        "return timeout - tonumber(ARGV[3]) - tonumber(ARGV[4]);" +
                    "end;" +

                    // add the thread to the queue at the end, and set its timeout in the timeout set to the timeout of
                    // the prior thread in the queue (or the timeout of the lock if the queue is empty) plus the
                    // threadWaitTime
                    // 获取等待队列中最后一个元素
                    "local lastThreadId = redis.call('lindex', KEYS[2], -1);" +
                    "local ttl;" +
                    // 如果等待队列中存在元素，那就获取最后一个元素的超时时间
                    // 线程B在等待队列，超时时间是09:30:30 线程C在09:30:00来加锁，线程C的ttl是不是要等线程B释放，所以就是09:30:30 - 09:30:00 = 30s
                    "if lastThreadId ~= false and lastThreadId ~= ARGV[2] then " +
                        "ttl = tonumber(redis.call('zscore', KEYS[3], lastThreadId)) - tonumber(ARGV[4]);" +
                    "else " +
                    // 如果等待队列中不存在元素，那就获取锁的过期时间
                    // 持有的线程是线程A,它的pexpire是09:30:20 ，那么线程B在09:30:10来加锁，09:30:20 - 09:30:10 = 10s
                        "ttl = redis.call('pttl', KEYS[1]);" +
                    "end;" +
                    // 计算一个timeout = ttl + 300000ms + 当前时间
                    "local timeout = ttl + tonumber(ARGV[3]) + tonumber(ARGV[4]);" +
                    "if redis.call('zadd', KEYS[3], timeout, ARGV[2]) == 1 then " +
                        "redis.call('rpush', KEYS[2], ARGV[2]);" +
                    "end;" +
                    "return ttl;",
                    //线程A获取到锁，释放锁是11:01:30。5min 11:06:31
                    // 现在11:01:10 是线程B来获取锁,那线程B的等待时间就是11:01:10 + 20s + 300s
                    // 现在11:01:20 那线程C来获取锁，那线程C的等待时间就是(11:01:10 + 20s + 300s + 300s)
                    // 11:01:30。线程A已经释放锁，线程B来获取锁了，那么线程B是list的第一个，lpop。重新计算后续线程的等待时间
                    //    线程C的等待时间就 = (11:01:10 + 20s + 300s + 300s - 300s)
                    // 11：02：00 线程A才释放锁，线程B这时候才获取到锁，lpop
                    //    线程C的等待时间就 = (11:01:10 + 20s + 300s + 300s - 300s) 线程C只需要等待 11：02：00 + 270s
                    // KEYS[1] = 锁名称 KEYS[2] = redisson_lock_queue_锁名称 KEYS[3] = redisson_lock_timeout_锁名称
                    // redisson_lock_queue_锁名称：是一个list,里面存储的是第一次没有获取到锁的线程，会按照锁的获取顺序一个个的rpush到list里面
                    // redisson_lock_timeout_锁名称：是一个zset，里面存储的是等待锁线程的超时时间，记录每一个线程到什么时间没获取到锁就超时了。分数score就是超时时间
                    // ARGV[1] = 锁过期时间 ARGV[2] = 服务id + 线程id ARGV[3] = 等待时间300000ms ARGV[4]=当前时间
                    Arrays.asList(getRawName(), threadsQueueName, timeoutSetName),
                    unit.toMillis(leaseTime), getLockName(threadId), wait, currentTime);
        }
 
    throw new IllegalArgumentException();
}
```

### **KEYS/ARGV参数分析**

> KEYS = Arrays.asList(getName(), threadsQueueName, timeoutSetName)

- KEYS[1] = getName() = 锁的名字，“anyLock”
- KEYS[2] = threadsQueueName = redisson_lock_queue:{anyLock}，是一个list，里面存储的是第一次没有获取到锁的线程，会按照锁的获取顺序一个个的rpush到list里面
- KEYS[3] = timeoutSetName = redisson_lock_timeout:{anyLock}，是一个zset，里面存储的是等待锁线程的超时时间，记录每一个线程到什么时间没获取到锁就超时了。分数score就是超时时间

> ARGV = internalLockLeaseTime, getLockName(threadId), currentTime + threadWaitTime, currentTime

- ARGV[1] = 30000毫秒
- ARGV[2] = UUID:threadId
- ARGV[3] = 当前时间（10:00:00） + 5000毫秒 = 10:00:05
- ARGV[4] = 当前时间（10:00:00）

### **模拟不同线程获取锁步骤**

1. 客户端A thread01 10:00:00 获取锁(第一次加锁)
2. 客户端B thread02 10:00:10 获取锁
3. 客户端C therad03 10:00:15 获取锁

#### **客户端A thread01 加锁分析**

thread01 在10:00:00 执行加锁逻辑，下面开始一点点分析lua脚本执行代码：

##### 第一步，就是移除过期线程

```java
// remove stale threads
// 移除过期线程
"while true do " +
    //list里面是否有线程存在
    "local firstThreadId2 = redis.call('lindex', KEYS[2], 0);" +
    "if firstThreadId2 == false then " +
        //没有，跳出循环
        "break;" +
    "end;" +

    //如果存在，就去zset里面获取这个线程的超时时间
    "local timeout = tonumber(redis.call('zscore', KEYS[3], firstThreadId2));" +
    "if timeout <= tonumber(ARGV[4]) then " +
        // remove the item from the queue and timeout set
        // NOTE we do not alter any other timeout
        // 超时就从list以及zset中移除掉
      	"redis.call('zrem', KEYS[3], firstThreadId2);" +
      	"redis.call('lpop', KEYS[2]);" +
    "else " +
      	"break;" +
    "end;" +
"end;" +
```

就是从 `redisson_lock_queue:{anyLock}` 这个队列中弹出来第一个元素，刚开始，队列是空的，所以什么都获取不到，此时就会直接退出while true死循环。

##### 第二步，尝试获取锁

```java
	// check if the lock can be acquired now
  // 检查这把锁是否当前可以被获取到
  // 可以加锁的逻辑判断：当前不存在锁 && (当前不存在等待锁的线程 || 当前等待锁的第一个线程是当前线程)
  "if (redis.call('exists', KEYS[1]) == 0) " +
  		"and ((redis.call('exists', KEYS[2]) == 0) " +
  				//
  				"or (redis.call('lindex', KEYS[2], 0) == ARGV[2])) then " +

  		// remove this thread from the queue and timeout set
  		// 既然要获取到锁了，那就将当前元素从等待队列和超时队列中移除
  		"redis.call('lpop', KEYS[2]);" +
  		"redis.call('zrem', KEYS[3], ARGV[2]);" +

  		// decrease timeouts for all waiting in the queue
  		// 减少等待队列中其他线程的超时时间
      // 假设线程 A 持有锁，剩余时间为 T，线程 B 在等待队列中排队，其超时时间设置为 T + 等待时间。
      // 当线程 A 释放锁后，线程 B 的超时时间需要基于新的锁剩余时间重新计算。
  		"local keys = redis.call('zrange', KEYS[3], 0, -1);" +
  		"for i = 1, #keys, 1 do " +
  				// -300s
  				"redis.call('zincrby', KEYS[3], -tonumber(ARGV[3]), keys[i]);" +
  		"end;" +

      // acquire the lock and set the TTL for the lease
      // 获取到了锁，并设置过期时间
      "redis.call('hset', KEYS[1], ARGV[2], 1);" +
      "redis.call('pexpire', KEYS[1], ARGV[1]);" +
      "return nil;" +
  "end;" +
```

这段代码判断逻辑的意思是：

1. `exists anyLock`，锁不存在，也就是没人加锁，刚开始确实是没人加锁的，这个条件肯定是成立的；
2. 或者是`exists redisson_lock_queue:{anyLock}`，这个队列不存在
3. 或者是 `lindex redisson_lock_queue:{anyLock} 0`，队列的第一个元素是UUID:threadId，或者是这个队列存在，但是排在队头的第一个元素，是当前这个线程

那么这个条件整体就可以成立了 anyLock和队列，都是不存在的，所以这个条件肯定会成立。接着执行if中的具体逻辑：

- `lpop redisson_lock_queue:{anyLock}`，弹出队列的第一个元素，现在队列是空的，所以什么都不会干
- `zrem redisson_lock_timeout:{anyLock} UUID:threadId`，从set集合中删除threadId对应的元素，此时因为这个set集合是空的，所以什么都不会干
- `hset anyLock UUID:threadId_01 1`，加锁成功： anyLock: { "UUID_01:threadId_01": 1 }
- `pexpire anyLock 30000`，将这个锁key的生存时间设置为30000毫秒

返回一个nil，在外层代码中，就会认为是加锁成功，此时就会开启一个`watchdog`看门狗定时调度的程序，每隔10秒判断一下，当前这个线程是否还对这个锁key持有着锁，如果是，则刷新锁key的生存时间为30000毫秒。

#### **客户端B thread02 加锁分析**

此时thread01 已经获取到了锁，如果thread02 在10:00:10分来执行加锁逻辑，具体的代码逻辑是怎样执行的呢？

```lua
	// check if the lock can be acquired now
  // 检查这把锁是否当前可以被获取到
  // 可以加锁的逻辑判断：当前不存在锁 && (当前不存在等待锁的线程 || 当前等待锁的第一个线程是当前线程)
  "if (redis.call('exists', KEYS[1]) == 0) " +
  		"and ((redis.call('exists', KEYS[2]) == 0) " +
  				//
  				"or (redis.call('lindex', KEYS[2], 0) == ARGV[2])) then " +
```

第二步中，尝试获取锁，此时anyLock这个锁key已经存在了，说明已经有人加锁了，这个条件首先就肯定不成立了；

接着往下执行，看下另外的逻辑：

##### 第三步，检查这把锁是否已经被持有，并且当前线程是否是持有锁的线程

```java
	// check if the lock is already held, and this is a re-entry
  // 检查这把锁是否已经被持有，并且当前线程是否是持有锁的线程
  "if redis.call('hexists', KEYS[1], ARGV[2]) == 1 then " +
    	// 如果当前线程已经持有锁，那就将锁的持有次数+1，并重新设置过期时间
      "redis.call('hincrby', KEYS[1], ARGV[2],1);" +
      "redis.call('pexpire', KEYS[1], ARGV[1]);" +
      "return nil;" +
  "end;" +
```

判断一下，此时这个第二个客户端是`UUID_02，threadId_02`，此时会判断一下，`hexists anyLock UUID_02:threadId_02`，判断一下在anyLock这个map中，是否存在`UUID_02:threadId_02`这个key？这个条件也不成立。

##### 第四步，计算ttl，放入等待队列

继续执行后续代码：

```lua
// 获取等待队列中最后一个元素
"local lastThreadId = redis.call('lindex', KEYS[2], -1);" +
"local ttl;" +
// 如果等待队列中存在元素，那就获取最后一个元素的超时时间
// 线程B在等待队列，超时时间是09:30:30 线程C在09:30:00来加锁，线程C的ttl是不是要等线程B释放，所以就是09:30:30 - 09:30:00 = 30s
"if lastThreadId ~= false and lastThreadId ~= ARGV[2] then " +
		"ttl = tonumber(redis.call('zscore', KEYS[3], lastThreadId)) - tonumber(ARGV[4]);" +
"else " +
		// 如果等待队列中不存在元素，那就获取锁的过期时间        
		// 持有的线程是线程A,它的pexpire是09:30:20 ，那么线程B在09:30:10来加锁，09:30:20 - 09:30:10 = 10s
		"ttl = redis.call('pttl', KEYS[1]);" +
"end;" +
// 计算一个timeout = ttl + 300000ms + 当前时间
"local timeout = ttl + tonumber(ARGV[3]) + tonumber(ARGV[4]);" +
"if redis.call('zadd', KEYS[3], timeout, ARGV[2]) == 1 then " +
		"redis.call('rpush', KEYS[2], ARGV[2]);" +
"end;" +
"return ttl;",
```

`lindex redisson_lock_queue:{anyLock} 0`，从队列中获取第一个元素，此时队列是空的，所以什么都不会有。

因为我们是在10:00:10 分请求的，因为anyLock默认过期时间是30s，所以在thread02请求的时候ttl还剩下20s。

- ttl = pttl anyLock = 20000毫秒，获取anyLock剩余的生存时间，ttl假设这里就被设置为了20000毫秒
- timeout = ttl + 当前时间 + 5000毫秒 = 20000毫秒 + 10:00:00 + 5000毫秒 = 10:00:25

接着执行： `zadd redisson_lock_timeout:{anyLock} 10:00:25 UUID_02:threadId_02`

在set集合中插入一个元素，元素的值是UUID_02:threadId_02，他对应的分数是10:00:25（会用这个时间的long型的一个时间戳来表示这个时间，时间越靠后，时间戳就越大），sorted set，有序set集合，他会自动根据你插入的元素的分数从小到大来进行排序。

继续执行： `rpush redisson_lock_queue:{anyLock} UUID_02:theadId_02`

> 这个指令就是将`UUID_02:threadId_02`，插入到队列的头部去。

返回的是ttl，也就是anyLock剩余的生存时间，如果拿到的返回值是ttl是一个数字的话，那么此时客户端B而言就会进入一个while true的死循环，每隔一段时间都尝试去进行加锁，重新执行这段lua脚本。

**简单画图总结如下：**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/d3c623257c79cbc9ba58a6d909f9b8e5.png" alt="img" style="zoom:80%;" />

#### **客户端C thread03 加锁分析**

此时thread03 在10:00:15来加锁，分析一下执行原理：

跟 thread02 的区别是设置的超时时间不一样：

```lua
// 获取等待队列中最后一个元素
"local lastThreadId = redis.call('lindex', KEYS[2], -1);" +
"local ttl;" +
// 如果等待队列中存在元素，那就获取最后一个元素的超时时间
// 线程B在等待队列，超时时间是09:30:30 线程C在09:30:00来加锁，线程C的ttl是不是要等线程B释放，所以就是09:30:30 - 09:30:00 = 30s
"if lastThreadId ~= false and lastThreadId ~= ARGV[2] then " +
		"ttl = tonumber(redis.call('zscore', KEYS[3], lastThreadId)) - tonumber(ARGV[4]);" +
"else " +
		// 如果等待队列中不存在元素，那就获取锁的过期时间        
		// 持有的线程是线程A,它的pexpire是09:30:20 ，那么线程B在09:30:10来加锁，09:30:20 - 09:30:10 = 10s
		"ttl = redis.call('pttl', KEYS[1]);" +
"end;" +
// 计算一个timeout = ttl + 300000ms + 当前时间
"local timeout = ttl + tonumber(ARGV[3]) + tonumber(ARGV[4]);" +
"if redis.call('zadd', KEYS[3], timeout, ARGV[2]) == 1 then " +
		"redis.call('rpush', KEYS[2], ARGV[2]);" +
"end;" +
"return ttl;",
```

- firstThreadId 获取到的是队列中的第一个元素：`UUID_02:thread_02`
- ttl = 10:00:25 - 10:00:15 = 10000毫秒 
- timeout = 10000毫秒 + 10:00:15 + 5000毫秒 = 10:00:30

将客户端C放入到对列和有序集合中： `zadd redisson_lock_timeout:{anyLock} 10:00:30 UUID_03:threadId_03` 然后 `rpush redisson_lock_queue:{anyLock} UUID_03:theadId_03`

**最终执行完后 如下图：**

<img src="./redisson%E6%A1%86%E6%9E%B6.assets/d23f20c53c2e298401289fe8dc17716b.png" alt="img" style="zoom:80%;" />

上面已经知道了，多个线程加锁过程中实际会进行排队，根据加锁的时间来作为获取锁的优先级，如果此时客户端A释放了锁，来看下客户端B、C是如果获取锁的。

#### **客户端A 释放锁**

直接看核心逻辑：

```lua
	// check if the lock can be acquired now
  // 检查这把锁是否当前可以被获取到
  // 可以加锁的逻辑判断：当前不存在锁 && (当前不存在等待锁的线程 || 当前等待锁的第一个线程是当前线程)
  "if (redis.call('exists', KEYS[1]) == 0) " +
  		"and ((redis.call('exists', KEYS[2]) == 0) " +
  				//
  				"or (redis.call('lindex', KEYS[2], 0) == ARGV[2])) then " +
```

if中的判断： exists anyLock 是否不存在，此时客户端A已经释放锁，所以这个条件成立。

然后判断队列不存在，或者队列中第一个元素为空，此时条件不成立，但是后面是or关联的判断，接着判断队列中的第一个元素是否为当前请求的`UUID_02:threadId_02`， 如果判断成功则开始加锁。

> 因为客户端B 和 C 获取锁时返回的是ttl，也就是anyLock剩余的生存时间，如果拿到的返回值是ttl是一个数字的话，那么此时客户端B而言就会进入一个while true的死循环，每隔一段时间都尝试去进行加锁，重新执行这段lua脚本。

## RedLock 的实现

RedLock算法思想，意思是不能只在一个redis实例上创建锁，应该是在多个redis实例上创建锁，**n / 2 + 1**，必须在大多数redis节点上都成功创建锁，才能算这个整体的RedLock加锁成功，避免说仅仅在一个redis实例上加锁而带来的问题。

> Redisson中有一个`MultiLock`的概念，可以将多个锁合并为一个大锁，对一个大锁进行统一的申请加锁以及释放锁。
>
> 而Redisson中实现RedLock就是基于`MultiLock` 去做的，接下来就具体看看对应的实现吧。

### RedLock的使用

```java
RLock lock1 = redisson1.getLock("lock1");
RLock lock2 = redisson2.getLock("lock2");
RLock lock3 = redisson3.getLock("lock3");

RLock redLock = anyRedisson.getRedLock(lock1, lock2, lock3);

// traditional lock method
redLock.lock();

// or acquire lock and automatically unlock it after 10 seconds
redLock.lock(10, TimeUnit.SECONDS);

// or wait for lock aquisition up to 100 seconds 
// and automatically unlock it after 10 seconds
boolean res = redLock.tryLock(100, 10, TimeUnit.SECONDS);
if (res) {
   try {
     ...
   } finally {
       redLock.unlock();
   }
}
```

这里是分别对3个redis实例加锁，然后获取一个最后的加锁结果。

### 实现原理

上面示例中使用redLock.lock()或者tryLock()最终都是执行`RedissonRedLock`中方法。

`RedissonRedLock` 继承自`RedissonMultiLock`， 实现了其中的一些方法：

```java
public class RedissonRedLock extends RedissonMultiLock {
    public RedissonRedLock(RLock... locks) {
        super(locks);
    }

    /**
     * 锁可以失败的次数，锁的数量-锁成功客户端最小的数量
     */
    @Override
    protected int failedLocksLimit() {
        return locks.size() - minLocksAmount(locks);
    }
    
    /**
     * 锁的数量 / 2 + 1，例如有3个客户端加锁，那么最少需要2个客户端加锁成功
     */
    protected int minLocksAmount(final List<RLock> locks) {
        return locks.size()/2 + 1;
    }

    /** 
     * 计算多个客户端一起加锁的超时时间，每个客户端的等待时间
     * remainTime默认为4.5s
     */
    @Override
    protected long calcLockWaitTime(long remainTime) {
        return Math.max(remainTime / locks.size(), 1);
    }
    
    @Override
    public void unlock() {
        unlockInner(locks);
    }

}
```

看到`locks.size()/2 + 1` ，例如我们有3个客户端实例，那么最少2个实例加锁成功才算分布式锁加锁成功。

接着我们看下`lock()`的具体实现：

```java
```java
public class RedissonMultiLock implements Lock {

    final List<RLock> locks = new ArrayList<RLock>();

    public RedissonMultiLock(RLock... locks) {
        if (locks.length == 0) {
            throw new IllegalArgumentException("Lock objects are not defined");
        }
        this.locks.addAll(Arrays.asList(locks));
    }

    public boolean tryLock(long waitTime, long leaseTime, TimeUnit unit) throws InterruptedException {
        long newLeaseTime = -1;
        if (leaseTime != -1) {
            // 如果等待时间设置了，那么将等待时间 * 2
            newLeaseTime = unit.toMillis(waitTime)*2;
        }
        
        // time为当前时间戳
        long time = System.currentTimeMillis();
        long remainTime = -1;
        if (waitTime != -1) {
            remainTime = unit.toMillis(waitTime);
        }
        // 计算锁的等待时间，RedLock中：如果remainTime=-1，那么lockWaitTime为1
        long lockWaitTime = calcLockWaitTime(remainTime);
        
        // RedLock中failedLocksLimit即为n/2 + 1
        int failedLocksLimit = failedLocksLimit();
        List<RLock> acquiredLocks = new ArrayList<RLock>(locks.size());
        // 循环每个redis客户端，去获取锁
        for (ListIterator<RLock> iterator = locks.listIterator(); iterator.hasNext();) {
            RLock lock = iterator.next();
            boolean lockAcquired;
            try {
                // 调用tryLock方法去获取锁，如果获取锁成功，则lockAcquired=true
                if (waitTime == -1 && leaseTime == -1) {
                    lockAcquired = lock.tryLock();
                } else {
                    long awaitTime = Math.min(lockWaitTime, remainTime);
                    lockAcquired = lock.tryLock(awaitTime, newLeaseTime, TimeUnit.MILLISECONDS);
                }
            } catch (Exception e) {
                lockAcquired = false;
            }
            
            // 如果获取锁成功，将锁加入到list集合中
            if (lockAcquired) {
                acquiredLocks.add(lock);
            } else {
                // 如果获取锁失败，判断失败次数是否等于失败的限制次数
                // 比如，3个redis客户端，最多只能失败1次
                // 这里locks.size = 3, 3-x=1，说明只要成功了2次就可以直接break掉循环
                if (locks.size() - acquiredLocks.size() == failedLocksLimit()) {
                    break;
                }

                // 如果最大失败次数等于0
                if (failedLocksLimit == 0) {
                    // 释放所有的锁，RedLock加锁失败
                    unlockInner(acquiredLocks);
                    if (waitTime == -1 && leaseTime == -1) {
                        return false;
                    }
                    failedLocksLimit = failedLocksLimit();
                    acquiredLocks.clear();
                    // 重置迭代器 重试再次获取锁
                    while (iterator.hasPrevious()) {
                        iterator.previous();
                    }
                } else {
                    // 失败的限制次数减一
                    // 比如3个redis实例，最大的限制次数是1，如果遍历第一个redis实例，失败了，那么failedLocksLimit会减成0
                    // 如果failedLocksLimit就会走上面的if逻辑，释放所有的锁，然后返回false
                    failedLocksLimit--;
                }
            }
            
            if (remainTime != -1) {
                remainTime -= (System.currentTimeMillis() - time);
                time = System.currentTimeMillis();
                if (remainTime <= 0) {
                    unlockInner(acquiredLocks);
                    return false;
                }
            }
        }

        if (leaseTime != -1) {
            List<RFuture<Boolean>> futures = new ArrayList<RFuture<Boolean>>(acquiredLocks.size());
            for (RLock rLock : acquiredLocks) {
                RFuture<Boolean> future = rLock.expireAsync(unit.toMillis(leaseTime), TimeUnit.MILLISECONDS);
                futures.add(future);
            }
            
            for (RFuture<Boolean> rFuture : futures) {
                rFuture.syncUninterruptibly();
            }
        }
        
        return true;
    }
}
```

实现原理其实很简单，基于RedLock思想，遍历所有的Redis客户端，然后依次加锁，最后统计成功的次数来判断是否加锁成功。