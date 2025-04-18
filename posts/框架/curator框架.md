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

## 可重入锁

### 加锁示例

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418155305185.png" alt="image-20250418155305185" style="zoom:80%;" />

#### 加锁前

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418155458130.png" alt="image-20250418155458130" style="zoom:80%;" />

在加锁之前，ZooKeeper 仅有一个节点 `/zookeeper`。

#### 加锁中

在 `/locks/lock_01` 路径上加锁。

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418155543072.png" alt="image-20250418155543072" style="zoom:80%;" />

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
    //获取当前时间
    final long startMillis = System.currentTimeMillis();
    //判断time是不是为null。如果不为空，做一次毫秒的转换
    final Long millisToWait = (unit != null) ? unit.toMillis(time) : null;
    //null
    final byte[] localLockNodeBytes = (revocable.get() != null) ? new byte[0] : lockNodeBytes;
    //重入次数，默认是0
    int retryCount = 0;

    //就是创建锁节点成功后的节点全路径
    String ourPath = null;
    boolean hasTheLock = false;
    //如果他是true，就跳出以下循环
    boolean isDone = false;
    while (!isDone) {
        //一进来，先设置为true
        isDone = true;

        try {
            //创建锁
            ourPath = driver.createsTheLock(client, path, localLockNodeBytes);
            //内部锁循环判断是否获取锁成功的一个逻辑
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
        //如果加锁成功，返回加锁的节点路径
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

![image-20250418160259723](./curator%E6%A1%86%E6%9E%B6.assets/image-20250418160259723.png)

可以看出节点的 mode 是 `CreateMode.EPHEMERAL_SEQUENTIAL`，表示这是一个**临时顺序节点**！

进入 `CreateBuilderImpl#forPath(java.lang.String, byte[])`

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418160333219.png" alt="image-20250418160333219" style="zoom:80%;" />

`client.getDefaultData()` 就是本机 IP 地址。

这个 `adjustPath` 方法看名字就是在调整路径之类的。会生成一个 UUID 拼接到 `/locks/lock_01` 中，变成 `/locks/lock_01/_c_UUID-lock-`。

因为创建的是临时顺序节点，所以会自动在后面添加顺序，最终变为 `/locks/lock_01/_c_UUID-lock-0000000000`。

具体创建节点是在 `CreateBuilderImpl#pathInForeground` 中。

![image-20250418160415129](./curator%E6%A1%86%E6%9E%B6.assets/image-20250418160415129.png)

1. 创建临时节点，如果路径存在，会创建成功，如果路径不存在会创建失败；
2. 创建失败后，先创建路径，再创建节点。

这里判断 `/locks/lock_01` 路径已经存在，会直接创建新的临时顺序节点。

真正判断锁是否获取成功，其实是在 `LockInternals#attemptLock` 方法中的 `internalLockLoop` 方法中。

##### 内部锁循环判断是否获取锁成功

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418161959719.png" alt="image-20250418161959719" style="zoom:80%;" />

`LockInternals#internalLockLoop`

```java
private boolean internalLockLoop(long startMillis, Long millisToWait, String ourPath) throws Exception {
    //是否持有锁，如果后面获取到锁，那么它就是true,如果获取不到锁，那么就一直是false
    boolean haveTheLock = false;
    try {
        if (revocable.get() != null) {
            client.getData().usingWatcher(revocableWatcher).forPath(ourPath);
        }
        //判断当前客户端的一个状态是否STARTED，而且一直没有获取到锁
        while ((client.getState() == CuratorFrameworkState.STARTED) && !haveTheLock) {
            //获取到basePath下所有子节点的一个顺序集合
            List<String> children = getSortedChildren();
            //去掉basePath，留下的就是顺序节点的内容
            String sequenceNodeName = ourPath.substring(basePath.length() + 1); // +1 to include the slash

            //拿到加锁的结果
            PredicateResults predicateResults = driver.getsTheLock(client, children, sequenceNodeName, maxLeases);
            if (predicateResults.getsTheLock()) {
                //如果获取锁成功，就haveTheLock设置成true,这样就可以跳出加锁的循环
                haveTheLock = true;
            } else {
                //我们需要去拼装全路径的待watch的节点
                String previousSequencePath = basePath + "/" + predicateResults.getPathToWatch();

                synchronized (this) {
                    try {
                        // use getData() instead of exists() to avoid leaving unneeded watchers which is a type of
                        // resource leak
                        //去添加watch到这个节点
                        client.getData().usingWatcher(watcher).forPath(previousSequencePath);
                        if (millisToWait != null) {
                            //如果millisToWait时间有设置
                            millisToWait -= (System.currentTimeMillis() - startMillis);
                            startMillis = System.currentTimeMillis();
                            if (millisToWait <= 0) {
                                break;
                            }

                            //等待一定时间
                            wait(millisToWait);
                        } else {
                            //如果没有设置，那么就一直等待。
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
        //删除当前客户端设置的一个节点。为什么要删除。
        //因为我们创建的节点如果不删除，而且当前客户端没有挂掉，那么那个节点就一直存在。阻塞后续客户端的加锁
        deleteOurPathQuietly(ourPath, e);
        throw e;
    }
    if (!haveTheLock) {
        //删除创建的节点
        deleteOurPath(ourPath);
    }
    //返回是否加锁成功
    return haveTheLock;
}
```

`internalLockLoop` 方法的主要作用是判断加锁结果，以及获取锁失败时，对其他节点的监听。

1. 获取父节点 `/locks/lock_01` 下的所有子节点，按照从小到大排序，判断自己是不是获取到锁，没有获取到就监听自己前一个节点；
2. 支持设置超时时间，超时直接返回失败；
3. 不支持设置超时时间或者还没有超时，则直接 wait 等待。

是否获取锁的代码在 `StandardLockInternalsDriver#getsTheLock`

###### 是否获取锁

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418162122687.png" alt="image-20250418162122687" style="zoom:80%;" />

这块就是判断是否为最小节点，因为在 `getSortedChildren` 中已经对所有节点排序，所以方法中的 `List<String> children` 是有序的。

> `maxLeases` 是在 `InterProcessMutex` 初始化的时候，指定的值为 1。

最终这里的结果是，**判断自己是不是最小，不是最小，就将 pathToWatch 设置为前一个节点**。

> 只监听自己的前一个节点，可以避免**羊群效应**！

###### **为什么要进行等待呢？**

因为是为了防止无效自旋，因为这里有监听机制，会监听上一个节点是否释放。

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418162324541.png" alt="image-20250418162324541" style="zoom:80%;" />

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418162340004.png" alt="image-20250418162340004" style="zoom:80%;" />

这块是 ZooKeeper 的 `Watcher` 监听机制，在节点释放的时候，会进行回调，然后使用 Java 的 notifyAll 方法通知所有的 wait 线程。然后这里的 `while true` 会继续执行，重新检查是否获得锁等。

###### 总结

1. 为了避免羊群效应，临时顺序节点，加锁失败后监听的是**前一个节点**；
2. 为了避免无效自旋，这里使用了 Java 的 `wait/notifyAll` 机制；
3. 可以看出，默认加锁就是**公平锁**。

#### 锁重入

加锁的过程看完后，再回头看 `internalLock` 这个方法。

![image-20250418161131831](./curator%E6%A1%86%E6%9E%B6.assets/image-20250418161131831.png)

- 加锁成功之后，将当前线程放到 `threadData` 中，threadData 是 `ConcurrentMap<Thread, LockData>` 类型的，不用担心并发问题。
- 假如锁重入了，直接就会在上一部分 `lockData != null` 被拦下，然后执行 `lockData.lockCount.incrementAndGet();`。对 lockCount 自增，代表了锁重入。

这里发现了吧！**Curator 的锁重入是在 Java 代码中实现的**。

#### 总结

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418161549825.png" alt="image-20250418161549825" style="zoom:80%;" />

重点需要关注的是：

1. 基于 ZooKeeper 的分布式锁，是使用的临时顺序节点，父节点是持久节点；
2. 创建临时节点时，父节点不存在，会先创建父节点（路径）；
3. 锁的组成结构为：对 `/locks/lock_01` 加锁，实际锁住的是 `/locks/lock_01/_c_UUID-lock-序号`，举例为 `/locks/lock_01/_c_cc4fc045-5a1e-4378-b3c7-8a8d3fb9a37c-lock-0000000000`

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

<img src="./curator%E6%A1%86%E6%9E%B6.assets/image-20250418161447408.png" alt="image-20250418161447408" style="zoom:80%;" />

