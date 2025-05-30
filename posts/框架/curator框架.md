---
title: Curator框架
tags:
  - 框架
categories:
  - 框架
date: '2025-04-07'
description: 欢迎使用 Curve 主题，这是你的第一篇文章
articleGPT: 这是一篇初始化文章，旨在告诉用户一些使用说明和须知。
#cover: "/images/logo/logo.webp"
---

# Curator框架

> Apache Curator是一个Zookeeper的开源客户端，它提供了Zookeeper各种应用场景（Recipe，如共享锁服务、master选举、分布式计数器等）的抽象封装，接下来将利用Curator提供的类来实现分布式锁。

## 可重入锁

### 加锁示例

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418155305185.png" alt="image-20250418155305185" style="zoom:80%;" />

#### 加锁前

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418155458130.png" alt="image-20250418155458130" style="zoom:80%;" />

在加锁之前，ZooKeeper 仅有一个节点 `/zookeeper`。

#### 加锁中

在 `/locks/lock_01` 路径上加锁。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418155543072.png" alt="image-20250418155543072" style="zoom:80%;" />

#### 加锁后

1. 创建了一个 `/locks/lock_01` 的持久节点，节点下有一个子节点 `_c_cc4fc045-5a1e-4378-b3c7-8a8d3fb9a37c-lock-0000000000`
2. 节点 `/locks/lock_01/_c_cc4fc045-5a1e-4378-b3c7-8a8d3fb9a37c-lock-0000000000` 是临时节点
3. 节点 `/locks/lock_01/_c_cc4fc045-5a1e-4378-b3c7-8a8d3fb9a37c-lock-0000000000` 的数据是机器 IP 地址

### 加锁源码

#### 入口

`InterProcessMutex#internalLock`

```java
private boolean internalLock(long time, TimeUnit unit) throws Exception {
  /*
  Note on concurrency: a given lockData instance
  can be only acted on by a single thread so locking isn't necessary
  */

  // 先换取当前加锁线程
  Thread currentThread = Thread.currentThread();

  // 从map里面根据线程获取加锁次数
  LockData lockData = threadData.get(currentThread);
  if (lockData != null) {
      // re-entering
      // 如果之前已经加锁，那么就对加锁次数++
      lockData.lockCount.incrementAndGet();
      return true;
  }

  // 加锁逻辑
  String lockPath = internals.attemptLock(time, unit, getLockNodeBytes());
  //加锁成功的一个zk路径
  if (lockPath != null) {
  		LockData newLockData = new LockData(currentThread, lockPath);
      threadData.put(currentThread, newLockData);
      return true;
  }

	return false;
}
```

开始先从 `threadData` 中获取当前线程，这里肯定是没有的，所以进入 `attemptLock` 方法。

#### 加锁

`LockInternals#attemptLock`

```java
String attemptLock(long time, TimeUnit unit, byte[] lockNodeBytes) throws Exception {
    // 获取当前时间
    final long startMillis = System.currentTimeMillis();
    // 判断time是不是为null。如果不为空，做一次毫秒的转换
    final Long millisToWait = (unit != null) ? unit.toMillis(time) : null;
    //null
    final byte[] localLockNodeBytes = (revocable.get() != null) ? new byte[0] : lockNodeBytes;
    // 重入次数，默认是0
    int retryCount = 0;

    // 就是创建锁节点成功后的节点全路径
    String ourPath = null;
    boolean hasTheLock = false;
    // 如果他是true，就跳出以下循环
    boolean isDone = false;
    while (!isDone) {
        //一进来，先设置为true
        isDone = true;

        try {
            // 创建锁
            ourPath = driver.createsTheLock(client, path, localLockNodeBytes);
            // 内部锁循环判断是否获取锁成功的一个逻辑
            hasTheLock = internalLockLoop(startMillis, millisToWait, ourPath);
        } catch (KeeperException.NoNodeException e) {
            // gets thrown by StandardLockInternalsDriver when it can't find the lock node
            // this can happen when the session expires, etc. So, if the retry allows, just try it all again
            if (client.getZookeeperClient()
                .getRetryPolicy()
                .allowRetry(
                    retryCount++,
                    System.currentTimeMillis() - startMillis,
                    RetryLoop.getDefaultRetrySleeper())) {
                isDone = false;
            } else {
                throw e;
            }
        }
    }

    if (hasTheLock) {
        // 如果加锁成功，返回加锁的节点路径
        return ourPath;
    }

    return null;
}
```

核心部分就是这两行：

1. `createsTheLock` 创建临时顺序节点
2. `internalLockLoop` 判断是否创建成功

##### 创建临时顺序节点

`StandardLockInternalsDriver#createsTheLock`

![image-20250418160259723](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418160259723.png)

可以看出节点的 mode 是 `CreateMode.EPHEMERAL_SEQUENTIAL`，表示这是一个**临时顺序节点**！

进入 `CreateBuilderImpl#forPath(java.lang.String, byte[])`

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418160333219.png" alt="image-20250418160333219" style="zoom:80%;" />

`client.getDefaultData()` 就是本机 IP 地址。

这个 `adjustPath` 方法看名字就是在调整路径之类的。会生成一个 UUID 拼接到 `/locks/lock_01` 中，变成 `/locks/lock_01/_c_UUID-lock-`。

因为创建的是临时顺序节点，所以会自动在后面添加顺序，最终变为 `/locks/lock_01/_c_UUID-lock-0000000000`。

具体创建节点是在 `CreateBuilderImpl#pathInForeground` 中。

![image-20250418160415129](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418160415129.png)

1. 创建临时节点，如果路径存在，会创建成功，如果路径不存在会创建失败；
2. 创建失败后，先创建路径，再创建节点。

这里判断 `/locks/lock_01` 路径已经存在，会直接创建新的临时顺序节点。

真正判断锁是否获取成功，其实是在 `LockInternals#attemptLock` 方法中的 `internalLockLoop` 方法中。

##### 内部锁循环判断是否获取锁成功

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418161959719.png" alt="image-20250418161959719" style="zoom:80%;" />

`LockInternals#internalLockLoop`

```java
private boolean internalLockLoop(long startMillis, Long millisToWait, String ourPath) throws Exception {
    // 是否持有锁，如果后面获取到锁，那么它就是true,如果获取不到锁，那么就一直是false
    boolean haveTheLock = false;
    try {
        if (revocable.get() != null) {
            client.getData().usingWatcher(revocableWatcher).forPath(ourPath);
        }
        // 判断当前客户端的一个状态是否STARTED，而且一直没有获取到锁
        while ((client.getState() == CuratorFrameworkState.STARTED) && !haveTheLock) {
            // 获取到basePath下所有子节点的一个顺序集合
            List<String> children = getSortedChildren();
            // 去掉basePath，留下的就是顺序节点的内容
            String sequenceNodeName = ourPath.substring(basePath.length() + 1); // +1 to include the slash

            // 拿到加锁的结果
            PredicateResults predicateResults = driver.getsTheLock(client, children, sequenceNodeName, maxLeases);
            if (predicateResults.getsTheLock()) {
                // 如果获取锁成功，就haveTheLock设置成true,这样就可以跳出加锁的循环
                haveTheLock = true;
            } else {
                //我 们需要去拼装全路径的待watch的节点
                String previousSequencePath = basePath + "/" + predicateResults.getPathToWatch();

                synchronized (this) {
                    try {
                        // use getData() instead of exists() to avoid leaving unneeded watchers which is a type of
                        // resource leak
                        // 去添加watch到这个节点
                        client.getData().usingWatcher(watcher).forPath(previousSequencePath);
                        if (millisToWait != null) {
                            // 如果millisToWait时间有设置
                            millisToWait -= (System.currentTimeMillis() - startMillis);
                            startMillis = System.currentTimeMillis();
                            if (millisToWait <= 0) {
                                break;
                            }

                            // 等待一定时间
                            wait(millisToWait);
                        } else {
                            // 如果没有设置，那么就一直等待。
                            wait();
                        }
                    } catch (KeeperException.NoNodeException e) {
                        // it has been deleted (i.e. lock released). Try to acquire again
                    }
                }
            }
        }
    } catch (Exception e) {
        ThreadUtils.checkInterrupted(e);
        // 删除当前客户端设置的一个节点。为什么要删除。
        // 因为我们创建的节点如果不删除，而且当前客户端没有挂掉，那么那个节点就一直存在。阻塞后续客户端的加锁
        deleteOurPathQuietly(ourPath, e);
        throw e;
    }
    if (!haveTheLock) {
        // 删除创建的节点
        deleteOurPath(ourPath);
    }
    // 返回是否加锁成功
    return haveTheLock;
}
```

`internalLockLoop` 方法的主要作用是判断加锁结果，以及获取锁失败时，对其他节点的监听。

1. 获取父节点 `/locks/lock_01` 下的所有子节点，按照从小到大排序，判断自己是不是获取到锁，没有获取到就监听自己前一个节点；
2. 支持设置超时时间，超时直接返回失败；
3. 不支持设置超时时间或者还没有超时，则直接 wait 等待。

是否获取锁的代码在 `StandardLockInternalsDriver#getsTheLock`

###### 是否获取锁

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418162122687.png" alt="image-20250418162122687" style="zoom:80%;" />

这块就是判断是否为最小节点，因为在 `getSortedChildren` 中已经对所有节点排序，所以方法中的 `List<String> children` 是有序的。

> `maxLeases` 是在 `InterProcessMutex` 初始化的时候，指定的值为 1。

最终这里的结果是，**判断自己是不是最小，不是最小，就将 pathToWatch 设置为前一个节点**。

> 只监听自己的前一个节点，可以避免**羊群效应**！

###### **为什么要进行等待呢？**

因为是为了防止无效自旋，因为这里有监听机制，会监听上一个节点是否释放。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418162324541.png" alt="image-20250418162324541" style="zoom:80%;" />

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418162340004.png" alt="image-20250418162340004" style="zoom:80%;" />

这块是 ZooKeeper 的 `Watcher` 监听机制，在节点释放的时候，会进行回调，然后使用 Java 的 notifyAll 方法通知所有的 wait 线程。然后这里的 `while true` 会继续执行，重新检查是否获得锁等。

###### 总结

1. 为了避免羊群效应，临时顺序节点，加锁失败后监听的是**前一个节点**；
2. 为了避免无效自旋，这里使用了 Java 的 `wait/notifyAll` 机制；
3. 可以看出，默认加锁就是**公平锁**。

#### 锁重入

加锁的过程看完后，再回头看 `internalLock` 这个方法。

![image-20250418161131831](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418161131831.png)

- 加锁成功之后，将当前线程放到 `threadData` 中，threadData 是 `ConcurrentMap<Thread, LockData>` 类型的，不用担心并发问题。
- 假如锁重入了，直接就会在上一部分 `lockData != null` 被拦下，然后执行 `lockData.lockCount.incrementAndGet();`。对 lockCount 自增，代表了锁重入。

这里发现了吧！**Curator 的锁重入是在 Java 代码中实现的**。

#### 总结

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418161549825.png" alt="image-20250418161549825" style="zoom:80%;" />

重点需要关注的是：

1. 基于 ZooKeeper 的分布式锁，是使用的临时顺序节点，父节点是持久节点；
2. 创建临时节点时，父节点不存在，会先创建父节点（路径）；
3. 锁的组成结构为：对 `/locks/lock_01` 加锁，实际锁住的是 `/locks/lock_01/_c_UUID-lock-序号`，举例为 `/locks/lock_01/_c_cc4fc045-5a1e-4378-b3c7-8a8d3fb9a37c-lock-0000000000`
   1. 为了避免羊群效应，临时顺序节点，加锁失败后监听的是**前一个节点**；
   2. 为了避免无效自旋，这里使用了 Java 的 `wait/notifyAll` 机制；
   3. 可以看出，默认加锁就是**公平锁**。

### 锁释放

当锁需要释放的时候，只需要调用 lock.release() 进行释放即可，具体是如何释放的呢？

```java
public void release() throws Exception {
    // 获取当前的线程
    Thread currentThread = Thread.currentThread();
    // 从threadData 获取重入次数
    LockData lockData = threadData.get(currentThread);
    if (lockData == null) {
        throw new IllegalMonitorStateException("You do not own the lock: " + basePath);
    }

    // 对可重入次数--
    int newLockCount = lockData.lockCount.decrementAndGet();
    if (newLockCount > 0) {
        return;
    }
    if (newLockCount < 0) {
        throw new IllegalMonitorStateException("Lock count has gone negative for lock: " + basePath);
    }
    try {
        internals.releaseLock(lockData.lockPath);
    } finally {
        // 把当前线程从可重入的map移除
        threadData.remove(currentThread);
    }
}
```

主要分为两部分：

1. 递减 `threadData` 中当前线程的加锁次数；
2. 加锁次数大于 0，说明还剩余重入次数，直接返回；
3. 加锁次数等于 0，则 `releaseLock` 释放锁，并删除 `threadData` 中当前线程 key。

`releaseLock` 方法中就没有多少复杂逻辑了，就是移除监听器，删除临时顺序节点。也就是 `/locks/lock_01/_c_e855d232-c636-4241-bf8e-f047939a5833-lock-0000000001`。

#### 总结

ZooKeeper 的 `InterProcessMutex` 锁是通过 Java 代码中维护了一个 `lockCount` 来判断是否重入的。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418161447408.png" alt="image-20250418161447408" style="zoom:80%;" />

## 分布式信号量和互斥锁

### 示例

```java
public class CuratorDemo {

    public static void main(String[] args) throws Exception {

        String connectString = "127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183";

        RetryPolicy retryPolicy = new ExponentialBackoffRetry(1000, 3);

        CuratorFramework client = CuratorFrameworkFactory
                .builder()
                .connectString(connectString)
                .retryPolicy(retryPolicy)
                .build();
        client.start();

        InterProcessSemaphoreV2 semaphore = new InterProcessSemaphoreV2(client, "/semaphores/semaphore_01", 3);

        for (int i = 0; i < 10; i++) {
            new Thread(() -> {
                try {
                    System.out.println(Thread.currentThread() + " 线程 start - " + LocalTime.now());
                    Lease lease = semaphore.acquire();
                    System.out.println(Thread.currentThread() + " 线程 execute - " + LocalTime.now());
                    Thread.sleep(3000);
                    System.out.println(Thread.currentThread() + " 线程 over -" + LocalTime.now());
                    semaphore.returnLease(lease);
                } catch (Exception e) {

                }

            }).start();
        }

        Thread.sleep(1000000);

    }
}
```

控制台输出数据如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418163243094.png" alt="image-20250418163243094" style="zoom:80%;" />

### 源码分析

#### 获取凭证

`InterProcessSemaphoreV2#internalAcquire1Lease`

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418163345829.png" alt="image-20250418163345829" style="zoom:80%;" />

lock 是 `InterProcessMutex`，`InterProcessSemaphoreV2` 信号量，也是借助于最基础的加锁。

![image-20250418163417079](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418163417079.png)

通过图也可以看出，使用 `InterProcessSemaphoreV2` 时，会先创建 `/semaphores/semaphore_01` 路径，并在路径下创建 `locks` 节点。也就是 `/semaphores/semaphore_01/locks` 路径下，有 10 个临时顺序节点。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418170350516.png" alt="image-20250418170350516" style="zoom:80%;" />

紧接着会在 `/semaphores/semaphore_01` 路径下创建 `leases` 节点，所以创建锁的临时顺序节点之后，会紧接着在 `/semaphores/semaphore_01/leases` 下创建临时顺序节点。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418170431075.png" alt="image-20250418170431075" style="zoom:80%;" />

对 `/semaphores/semaphore_01/leases` 节点进行监听，同时获取 `/semaphores/semaphore_01/leases` 下面的子节点数量。

1. 如果子节点数量小于等于信号量计数，则直接结束循环；
2. 如果大于，则会进入 wait 等待唤醒。

这里比较有意思，为什么要先`lock.acquire();`尝试去获取一把锁，获取锁成功，就可以向下执行，否则阻塞到这里;然后又获取子节点数量，进行**节点数量检查**呢？

这其实是**锁（lock）和子节点数量检查是互为补充的两种控制机制**。

##### **双重控制机制的作用**

- `lock.acquire()`: 获取分布式锁（互斥锁），确保同一时刻只有一个客户端能操作资源分配。
- **子节点数量检查**：控制信号量资源池的实际容量（maxLeases=2表示最多允许2个客户端同时获取资源）。

假设没有锁的情况下：

1. **客户端A/B/C同时检测到当前子节点数量为 0**
2. **三者同时创建临时顺序节点**（假设分别创建了`lease_0001`、`lease_0002`、`lease_0003`）
3. **各自再执行`getChildren()`检查子节点数量**，此时发现子节点数量为3 > 2
4. **所有客户端均认为需要等待**，但此时已经超量创建了3个节点，导致资源池容量被突破

这种现象被称为**"瞬时超量"**，本质是因为**创建节点和检查数量的操作不具备原子性**，多个客户端可能在检查数量前同时创建了多个节点。

##### **锁的核心作用：原子性保障**

通过引入锁（如`InterProcessMutex`）可以解决该问题：

1. **锁保证同一时刻只有一个客户端能进入临界区**（创建节点+检查数量的代码段）
2. **客户端A先获取锁**，创建 `lease_0001`后检查数量为1 ≤ 2，成功获得信号量
3. **客户端B获取锁**，创建 `lease_0002`后检查数量为2 ≤ 2，成功获得信号量
4. **客户端C获取锁**，创建 `lease_0003`后检查数量为3 > 2，进入等待队列

#### 释放凭证

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418170510166.png" alt="image-20250418170510166" style="zoom:80%;" />

释放凭证就是调用 Lease 的 close 方法，删除节点，这样 `/semaphores/semaphore_01/leases` 上的监听器就会触发，然后其他线程获取凭证。

### 互斥锁

互斥锁 `InterProcessSemaphoreMutex`，不支持重入，其他的和可重入锁并没有什么区别。就是基于 `InterProcessSemaphoreV2` 实现的。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418170651967.png" alt="image-20250418170651967" style="zoom:80%;" />

就是把计数的值 `maxLeases` 设置为了 1。

### 总结

- 信号量 `InterProcessSemaphoreV2` 其实是通过判断节点下的子节点数量来实现控制信号量，同时内部加锁是基于可重入锁 `InterProcessMutex` 实现的。
- 互斥锁 `InterProcessSemaphoreMutex` 则是将信号量的技术设置为 1 来实现互斥功能。

## 分布式读写锁和联锁

### 示例

Curator 同样支持分布式`读写锁` 和`联锁`，只需要使用 `InterProcessReadWriteLock` 即可，来一起看看它的源码以及实现方式。

```java
public class CuratorDemo {

    public static void main(String[] args) throws Exception {

        String connectString = "127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183";

        RetryPolicy retryPolicy = new ExponentialBackoffRetry(1000, 3);

        CuratorFramework client = CuratorFrameworkFactory
                .builder()
                .connectString(connectString)
                .retryPolicy(retryPolicy)
                .build();
        client.start();

        InterProcessReadWriteLock lock = new InterProcessReadWriteLock(client, "/locks/lock_01");
        lock.readLock().acquire();
        lock.readLock().release();
        lock.writeLock().acquire();
        lock.writeLock().release();

    }
}
```

### 源码

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418171004738.png" alt="image-20250418171004738" style="zoom:80%;" />

读锁写锁都是基于 `InterProcessMutex` 实现的，所以基本都和 `InterProcessMutex` 没有区别。不过这里生成的锁名字不再是 `-lock-` 而是换成了 `__WRIT__` 和 `__READ__`。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418171040238.png" alt="image-20250418171040238" style="zoom:80%;" />

- 读锁加锁节点名为 `/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__READ__0000000000`，写锁解锁节点名为 `_c_2e5dde98-c548-4f8b-a798-821ee8330eb6-__WRIT__0000000001`。
- 其中创建节点时和可重入锁 `InterProcessMutex` 没有区别，唯一的区别就是在 `internalLockLoop` 方法中，判断锁获取结果时有区别。
- 当可重入锁时是在 `StandardLockInternalsDriver#getsTheLock` 判断当前节点是否为最小节点。
- 而读写锁是在 `InterProcessReadWriteLock#InterProcessReadWriteLock` 中重写了 `getsTheLock` 方法。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418171139742.png" alt="image-20250418171139742" style="zoom:80%;" />

#### 读锁加锁

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418171206563.png" alt="image-20250418171206563" style="zoom:80%;" />

```java
public static class ReadLock extends InternalInterProcessMutex {
    public ReadLock(CuratorFramework client, String basePath, byte[] lockData, WriteLock writeLock) {
        super(client, basePath, READ_LOCK_NAME, lockData, Integer.MAX_VALUE, new SortingLockInternalsDriver() {
            @Override
            protected String getSortingSequence() {
                String writePath = writeLock.getLockPath();
                //如果writePath不为空，也就是说当前线程已经持有一把写锁
                if (writePath != null) {
                    //拿到顺序节点的编号
                    return fixForSorting(writePath, WRITE_LOCK_NAME);
                }
                return null;
            }

            @Override
            public PredicateResults getsTheLock(
                CuratorFramework client, List<String> children, String sequenceNodeName, int maxLeases)
            throws Exception {
                //首先当前线程持有写锁，那么就直接加读锁成功
                if (writeLock.isOwnedByCurrentThread()) {
                    return new PredicateResults(null, true);
                }

                //
                int index = 0;
                //记录第一个写锁的位置
                int firstWriteIndex = Integer.MAX_VALUE;
                //记录当前客户端创建读锁的index
                int ourIndex = -1;
                for (String node : children) {
                    if (node.contains(WRITE_LOCK_NAME)) {
                        //记录第一个写锁的位置
                        firstWriteIndex = Math.min(index, firstWriteIndex);
                    } else if (node.startsWith(sequenceNodeName)) {
                        //记录当前客户端的位置
                        ourIndex = index;
                        break;
                    }

                    ++index;
                }

                validateOurIndex(sequenceNodeName, ourIndex);

                //判断读锁的位置是否<第一个写锁的位置，如果小于就加锁成功
                //比如当前客户端B来加写锁， 客户端A加读锁。然后客户端C也来加读锁。
                boolean getsTheLock = (ourIndex < firstWriteIndex);
                //而是第一个写锁节点。
                String pathToWatch = getsTheLock ? null : children.get(firstWriteIndex);
                return new PredicateResults(pathToWatch, getsTheLock);

                //第一客户端A来加读锁，客户端B来加读锁。读读不互斥
                //客户A来加读锁，客户端B加写锁。读写互斥
                //客户端A来加读锁，客户端A再来加写锁。同一线程读写是互斥
                //客户端A来加写锁，客户端A再来加读锁。同一线程写读不互斥。
                //客户端A来加写锁，客户端A再来加写锁，重入同一线程写写不互斥。
            }
        });
    }

    @Override
    public String getLockPath() {
        return super.getLockPath();
    }
}
```

- 读锁加锁，当前线程直接返回成功，也就是说**当前线程读写不互斥的**。
- 如果是其他线程，则遍历所有子节点。
  - 子节点包含写锁，当前节点在子节点有序集合的索引小于写锁的索引则直接获得锁，否则获取失败；
  - 子节点不包含写锁，则当前节点在子节点的有序集合的 index < Integer.MAX_VALUE (2147483647) 即可。

> 就是说读锁最多支持 2147483647 个。

#### 写锁加锁

写锁加锁直接复用的可重入锁 `InterProcessMutex` 的逻辑，所以这里写锁和写锁，以及读锁和写锁都是互斥的。

#### 联锁

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418171330216.png" alt="image-20250418171330216" style="zoom:80%;" />

联锁的使用，就是将 `InterProcessLock` 放到集合中，然后进行统一加锁。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250418171356153.png" alt="image-20250418171356153" style="zoom:80%;" />

加锁就遍历集合，依次进行加锁。

### 总结

- 客户端A来加读锁，客户端B来加读锁。读读不互斥
  - zk节点变化：`/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__READ__0000000000`
  - `/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__READ__0000000001`
- 客户A来加读锁，客户端B加写锁。读写互斥
  - zk节点变化：`/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__READ__0000000000`
  - 此时获取写锁时，发现存在读锁A（序号更小），因此监听A的节点，等待其释放后才能获取锁 `/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__WRITE__0000000001`
- 客户端A来加读锁，客户端A再来加写锁。同一线程读写是互斥
  - 同上
  - 同一线程在已持有读锁时，若未释放直接申请写锁，需检查是否存在前置读锁（即使属于自己）。此时写锁需等待读锁释放，形成互斥
- 客户端A来加写锁，客户端A再来加读锁。同一线程写读不互斥
  - zk节点变化：`/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__WRITE__0000000000`
  - `/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__READ__0000000001`
  - 同一线程持有写锁时，申请读锁会直接通过（`writeLock.isOwnedByCurrentThread()`返回`true`），无需检查写锁前置节点
- 客户端A来加写锁，客户端A再来加写锁，重入同一线程写写不互斥
  - zk节点变化：`/locks/lock_01/_c_44a8eaf8-f177-403a-92bf-9119591b54d5-__WRITE__0000000000`
  - 相当于可重入，也就是计数器+1
