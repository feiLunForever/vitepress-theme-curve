## AQS

### 设计思想

- AQS 的主要使用方式是 `继承`，子类通过继承同步器，并实现它的 `抽象方法` 来管理同步状态
- AQS 使用一个 `volatile`修饰的`int` 类型的成员变量 `state` 来**表示同步状态**：

    - 当 `state > 0` 时，表示已经获取了锁。
    - 当 `state = 0` 时，表示释放了锁。
- 资源共享方式

    - 独占 `Exclusive`（排它锁模式）
    - 共享 `Share`（共享锁模式）
- AQS 中的 `CLH `等待队列

    - 通过内部类 `Node` （线程封装体）构建 FIFO(先进先出)的 `双向链表`
    - 通过 Head、Tail 头尾两个节点来组成队列结构，通过 `volatile` 修饰保证可见性
    - `Head` 指向节点为已获得锁的节点，是一个 `虚拟节点`，节点本身不持有具体线程
    - 获取不到同步状态，会将节点进行 `自旋获取锁`，自旋一定次数失败后会将线程 `阻塞`，相对于 CLH 队列性能较好

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613234755042.png" alt="image-20250613234755042" style="zoom:60%;" />

- Condition 队列（可能存在多个）

    - 使用内部类 ConditionObject 用来构建等待队列
    - 当 Condition 调用 await()方法后加入的队列

![image-20250613234822749](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613234822749.png)

- waitStatus 节点状态

    - 默认为 0，表示初始状态。
    - `Node.CANCELLED(1)`：表示当前结点已取消调度。当 tmeout 或被中断（响应中断的情况下），会触发变更为此状态，进入该状态后的结点将不会再变化。
    - `Node.SIGNAL(-1)`：表示后继结点在等待当前结点唤醒。后继结点入队时，会将前继结点的状态更新为 SIGNAL。
    - `Node.CONDITION-2)`：表示结点等待在 Condition 上，当其他线程调用了 Condition 的 signal() 方法后，CONDITION 状态的结点将从等待队列转移到同步队列中，等待获取同步锁。
    - `Node.PROPAGATE(-3)`：共享模式下，前继结点不仅会唤醒其后继结点，同时也可能会唤醒后继的后继结点。

### AQS 结构

首先我们看下 AQS 的 **继承关系图**，如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613234838044.png" alt="image-20250613234838044" style="zoom:40%;" />

**AQS中相当重要的三个成员变量（头/尾节点+state）：**

```java
//头节点（独占锁模式下，持有资源的永远都是头节点！这个要知道哦）
private transient volatile Node head;
//尾节点
private transient volatile Node tail;
//锁资源（无锁状态是0，每次加锁成功后，通过cas进行+1，在重入场景下，重入几次就是几）
private volatile int state;
```

**AQS中的两个内部类：****`ConditionObject`****和****`Node`** **：**

```java
static final class Node {
    //当前节点处于共享模式的标记
    static final Node SHARED = new Node();

    //当前节点处于独占模式的标记
    static final Node EXCLUSIVE = null;

    //线程被取消
    static final int CANCELLED =  1;
    //head持有锁线程释放资源后需唤醒后继节点
    static final int SIGNAL    = -1;
    //等待condition唤醒
    static final int CONDITION = -2;
    //工作于共享锁状态，需要向后传播，
    static final int PROPAGATE = -3;

    //等待状态，有1,0,-1,-2,-3五个值。分别对应上面的值
    volatile int waitStatus;

    //前驱节点
    volatile Node prev;

    //后继节点
    volatile Node next;

    //等待锁的线程
    volatile Thread thread;

    //等待条件的下一个节点，ConditonObject中用到
    Node nextWaiter;
}
```

**AQS留给子类的钩子方法（由子类来定义锁的释放和获取逻辑）：**

```java
// 尝试获取排他锁
protected boolean tryAcquire(int arg) {
    throw new UnsupportedOperationException();
}
//尝试释放排他锁
protected boolean tryRelease(int arg) {
    throw new UnsupportedOperationException();
}
//尝试获取共享锁
protected int tryAcquireShared(int arg) {
    throw new UnsupportedOperationException();
}
//尝试释放共享锁
protected boolean tryReleaseShared(int arg) {
    throw new UnsupportedOperationException();
}
//判定当前线程获得的资源是否是排他资源
protected boolean isHeldExclusively() {
    throw new UnsupportedOperationException();
}
```

### 排他锁（**ReentrantLock**）

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantLock lock = new ReentrantLock(true); // 使用公平锁
    Runnable runnable = new Runnable() {
        @Override
        public void run() {
            lock.lock();
            log.info("我抢到锁了 哈哈我是 ：{}", Thread.currentThread().getName());
        }
    };
    Thread threadA = new Thread(runnable, "Thread A");
    Thread threadB = new Thread(runnable, "Thread B");

    threadA.start();
    Thread.sleep(5);
    threadB.start();
    log.info("线程A状态:{}", threadA.getState());
    log.info("线程B状态:{},线程A不释放 没办法 我只能死等了 ", threadB.getState());
}
```

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613234907554.png" alt="image-20250613234907554" style="zoom:80%;" />

#### 加排他锁（公平锁方式）

##### **ReentrantLock.lock()**

我们**使用ReentrantLock**的**lock方法** 进行`加锁`，其内部是这么调用的，先讲公平锁方式：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613234922320.png" alt="image-20250613234922320" style="zoom:40%;" />

而`sync.acquire(1);`的调用其实就是AQS的这个acquire方法

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613234944958.png" alt="image-20250613234944958" style="zoom:40%;" />

接下来我们就从 AQS的这个acquire方法 来分析加锁逻辑：

```java
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
        selfInterrupt();
}
```

1. **调用tryAcquire尝试获取锁state：** （实现在子类）来获取锁

    - 尝试获取资源 如果成功 直接返回

2. **调用addWaiter加入等待队列：** （这里指定Node为排他锁，因为acquire方法的模式就是排他）

    - 如果tail不是空则通过`CAS`添加当前node到队列尾部，如果是空则初始化等待队列,该方法返回当前Node(也即当前获取资源失败的Node对象)。

3. **调用acquireQueued：** (自旋阻塞等待获取资源，如果中断返回true)

    - for (;;) "死循环"，自旋，要么获取锁，要么中断
    - 找到当前节点的前驱节点，如果`是头节点`则**再次尝试**获取锁，成功的话将当前节点置为头节点并将老head节点置为null帮助GC回收
    - 如果前驱节点`不是头节点`，那就要通过 `shouldParkAfterFailedAcquire`来判断是否需要将当前节点对应的的线程 `park`（挂起） ，如需要挂起，则调用`LockSupport.park(this)`将当前线程挂起，并检测中断标志之后返回。

4. **调用selfInterrupt：** （中断）

    - 如果加锁失败且acquireQueued返回中断标识为true，则调用selfInterrupt进行真正的中断操作，至此加锁流程完毕。

*下边我们来一波源码，对上边几个方法进行详细分析*

**以下是：****`ReentrantLock -> FairSync -> tryAcquire(int acquires)`** **方法的实现逻辑**

##### **1. tryAcquire**

```java
protected final boolean tryAcquire(int acquires) {
    //获取当前的线程
    final Thread current = Thread.currentThread();
    //获取当前的加锁状态 在ReentrantLock中，state=0的时候是没有加锁，state=1的时候是加锁状态
    int c = getState();
    if (c == 0) {
        // 没有人占用锁的时候，因为是公平锁，所以优先判断队列中是否存在排队的
        // 如果没有排队的，直接使用CAS进行加锁，将0 替换为 1，
        if (!hasQueuedPredecessors() &&
            compareAndSetState(0, acquires)) {
            // 将当前线程设置到exclusiveOwnerThread变量，表示这个线程持有锁
            setExclusiveOwnerThread(current);
            //返回加锁成功
            return true;
        }
    }
    //我们在前面讲过，ReentrantLock是可重入锁，当前面逻辑加锁失败，则判断是不是当前线程持有的锁，如果是当前线程持有锁，则符合可重入规则
    else if (current == getExclusiveOwnerThread()) {
        //将state 累加  由 1  变成 2
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    //如果存在排队任务，或者CAS变换state的值失败，则证明当前不能加锁，直接返回false加锁失败
    return false;
}
```

- 首先进行加锁的时候，因为公平锁的原因，会先判断等待队列中是否存在任务。如果存在，就不能去加锁，需要去排队！如果没有排队的任务，那么就开始使用 CAS 进行加锁，此时可能会出现其他线程也在加锁，如果其他线程加锁成功，那么此时 CAS 就会返回 false。
- 假设上面的加锁条件全部满足，就能够加锁成功，它会将 state 变为 1，将当前线程设置到一个变量中去，并且为了保证重入锁的特性，将当前线程保存到变量中，表示这个线程持有这把锁。
- 如果上面的加锁条件不满足，不会第一时间就返回加锁失败，因为 ReentrantLock 是可重入锁，所以在加锁失败后，会判断当前持有锁的线程和所需要加锁的线程是不是一个，如果是一个就附和可重入锁的特性，那么就把加锁数量 +1，同时返回加锁成功。
- 如果全部都不满足，则直接返回 false，加锁失败。

我们使用一个图来理解这个流程：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235015347.png" alt="image-20250613235015347" style="zoom:70%;" />

可以看到，其实所谓的加锁其实就是操作 State 变量的值！

##### **2. addWaiter**

线程加锁失败后，会开始进行入队操作，也就是 **addWaiter** 方法。AQS 的队列与传统队列不同，AQS 的队列是一个双向链表，排队的线程都是用 next 指向下一个节点任务。

```java
private Node addWaiter(Node mode) {
    //创建一个node节点 排它锁的mode = null
    Node node = new Node(Thread.currentThread(), mode);
    // 获取当前的尾节点
    Node pred = tail;
    if (pred != null) {
        //将当前节点的上一个节点设置为尾节点
        node.prev = pred;
        // cas替换 将当前节点设置为tail节点
        if (compareAndSetTail(pred, node)) {
            //将当前的尾节点的下一节点设为当前追加的节点
            pred.next = node;
            return node;
        }
    }
    //针对第一个任务初始化head节点操作
    enq(node);
    return node;
}
```

上述代码的操作就是一个任务追加的全过程，当一个任务想要追加的时候，需要先获取当前队列中的 tail 节点，然后将当前需要追加的节点的上一节点指针设置为 tail 节点，将 tail 节点的下一节点指针设置为当前节点，然后将当前追加的节点设置为 tail 节点，至此完成双向链表的追加操作。

至于空 head 节点的初始化，这里需要介绍一下，不然后续实现中你不知道 head 哪里来的。我们需要关注 addWaiter 方法中的 `enq(node);`，因为第一次节点入队，因为 tail 为 null ，实际的入队操作是由 enq 方法来做的。

```java
  private Node enq(final Node node) {
      for (;;) {
          //获取尾节点
          Node t = tail;
          //当尾节点为空（第一次设置）
          //第一次的话，因为还没有追加过节点，所以tail肯定为空
          if (t == null) {
              //使用cas创建一个线程数据为空的node，放到head中
              if (compareAndSetHead(new Node()))
                  //因为此时只有一个节点，所以这个空节点即是头也是尾
                  tail = head;
          } else {
              //后续就和addWaiter方法一样了，主要是吧当前节点追加到这个空的head节点后面。
              node.prev = t;
              if (compareAndSetTail(t, node)) {
                  t.next = node;
                  return t;
              }
          }
      }
  }
```

当第一个等待线程进入到队列的时候，实际的入队操作是由 enq 方法来做的，enq 方法初始化了 head 节点 、tail 节点，并将当前节点追加到 tail 节点后面。

##### **3. acquireQueued**

当入队操作完成之后，我们就要将当前线程挂起了，具体就是在 **acquireQueued** 中来做的。

```java
  final boolean acquireQueued(final Node node, int arg) {
      boolean failed = true;
      try {
          boolean interrupted = false;
          for (;;) {
              // 获取当前节点的前置节点
              final Node p = node.predecessor();
              // 如果当前节点的前置节点是head节点的时候，当前节点就排在第一个，所以这里会去尝试获取一次锁，万一锁被释放了，
              // 这里直接就获取到了，不需要调用系统级的阻塞。
              if (p == head && tryAcquire(arg)) {
                  //如果获取到了锁，则将当前的节点设置为头节点
                  setHead(node);
                  //将原先的头节点的后置节点设置为null ，为了jvm gc考虑的，保证原先的头节点能够被及时回收
                  p.next = null;
                  failed = false;
                  return interrupted;
              }
              // 如果没有拿到锁，则开始检查并更新获取失败节点的状态。如果线程阻塞，返回true
              if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                  //检查是否被中断，如果被中断则返回true， 由selfInterrupt()方法进行当前线程的中断操作
                  interrupted = true;
          }
      } finally {
          if (failed)
              cancelAcquire(node);
      }
  }
```

它的功能很简单，主要就是如果自己排在 head 节点之后，就尝试获取下锁做一次二次检查，检查上一个节点是否已经释放了锁，万一不需要阻塞就可以直接获取到锁，就可以节省一部分性能。

我们需要再来分析一下 `shouldParkAfterFailedAcquire` 和 `parkAndCheckInterrupt`，这样整个加锁的动作就被我们分析完了。

###### **`shouldParkAfterFailedAcquire`** **方法**

```java
  private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
      //获取前置节点状态
      int ws = pred.waitStatus;
      //当前置节点状态为等待信号唤醒的时候
      if (ws == Node.SIGNAL)
          //直接放心大胆的阻塞，因为明显前置节点还在执行任务或者阻塞的状态
          return true;
      if (ws > 0) {
          do { 
              //开始遍历整条链路，将取消的任务全部剔除掉，保证队列的连续性
              node.prev = pred = pred.prev;
          } while (pred.waitStatus > 0);
          pred.next = node;
      } else {
          //初始化前面的节点为 Node.SIGNAL 等待唤醒的状态
          compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
      }
      return false;
  }
```

这里针对节点状态（waitStatus）做出一个说明。

> - 默认为 0，表示初始状态。
> - `Node.CANCELLED(1)`：表示当前结点已取消调度。当 tmeout 或被中断（响应中断的情况下），会触发变更为此状态，进入该状态后的结点将不会再变化。
> - `Node.SIGNAL(-1)`：表示后继结点在等待当前结点唤醒。后继结点入队时，会将前继结点的状态更新为 SIGNAL。
> - `Node.CONDITION-2)`：表示结点等待在 Condition 上，当其他线程调用了 Condition 的 signal() 方法后，CONDITION 状态的结点将从等待队列转移到同步队列中，等待获取同步锁。
> - `Node.PROPAGATE(-3)`：共享模式下，前继结点不仅会唤醒其后继结点，同时也可能会唤醒后继的后继结点。

了解了这些状态之后，**shouldParkAfterFailedAcquire** 方法总共做了三件事。

- 当发现前置节点是等待信号的状态的时候，证明前置节点还在执行任务或者阻塞的状态，此时可以放心返回，让程序阻塞，因为自己无论如何也执行不了。
- 当前置节点的状态大于 0 的时候，也就是 `Node.CANCELLED` 的时候，证明前置节点被取消等待锁了，此时开始遍历整条双向列表，重置链路状态，将已经取消的全部删除掉。
- 当前置节点状态为 0 的时候，初始化前置节点的状态为等待唤醒的状态（`Node.SIGNAL`）。

###### **`parkAndCheckInterrupt`** **方法**

当 **shouldParkAfterFailedAcquire** 方法返回 true 的时候，证明此时加锁条件不满足，可以阻塞了。于是，开始调用系统内核进行阻塞：

```java
  private final boolean parkAndCheckInterrupt() {
      LockSupport.park(this);
      return Thread.interrupted();
  }
```

逻辑十分简单，`LockSupport.park(this);` 的源码不做具体分析，已经涉及到了操作系统，该方法的具体作用如下：

- **阻塞当前线程：**  调用 `park` 方法将导致当前线程进入等待状态，暂停执行。线程会在这里等待，直到被显式地唤醒。
- **与对象关联：**  `park` 方法可以关联一个对象。在这里，`this` 参数表示将当前线程与当前对象关联起来。这意味着，如果其他线程调用 `LockSupport.unpark(this)` 方法并传入相同的对象，那么被关联的线程将被唤醒。
- **与 unpark 搭配使用：**  `LockSupport` 类还提供了 `unpark` 方法，可以用于显式地唤醒被 `park` 阻塞的线程。通过关联对象，可以选择性地唤醒具体的线程。

`LockSupport.park(this)` 是用于阻塞当前线程的方法，它通常与 `LockSupport.unpark` 配合使用，实现线程之间的协同操作。这种方式相比于传统的 `wait` 和 `notify` 机制更加灵活，因为`LockSupport`可以直接与线程关联，而不用处于同一个对象监视器（对象监视器类似 `synchronized(o)` 里面那个 o，就是对象监视器的对象）。

> 总的来说，**acquireQueued 主要任务就是将等待的队列调用系统阻塞方法进行阻塞，等待唤醒。**

此时阻塞之后，for 循环被阻塞，等待解锁成功后，循环继续，就会重新进入到判断前置节点是否是 head 节点，如果是就尝试获取锁的逻辑中。

##### 加锁全过程图解

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235047727.png" alt="image-20250613235047727" style="zoom:50%;" />

#### 解排他锁

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235114215.png" alt="image-20250613235114215" style="zoom:40%;" />

##### release()

```java
//AbstractQueuedSynchronizer # release方法
public final boolean release(int arg) {
    if (tryRelease(arg)) { // 尝试释放锁，当为可重入锁的时候，不将锁全部释放为0 会返回false
        Node h = head; // 释放锁成功后 获取头节点
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h); // 唤醒head节点后的节点
        return true; // 返回释放锁成功
    }
    return false;
}
```

可以看到逻辑很清晰，即：如果`tryRelease`（释放锁）成功，并且头节点的waitStatus!=0，那么将调用`unparkSuccessor(head)`方法唤醒`头节点之后那个节点`。**注意：**  排他模式下，`唤醒操作` 只且只能发生在`头节点`与`后继节点`之间（因为 **排他模式下持有锁的节点只能是头节点head！** ）。

接下来我们就看下tryRelease方法，注意这个和tryAcquire()方法一样，都是AQS类留给子类实现的钩子方法，所以我们需要去 `ReentrantLock`的内部类`Sync`的`tryRelease`方法中一寻究竟。源码如下：

###### `tryRelease()`

```java
// 方法作用：释放锁（通过对state -1）
@ReservedStackAccess
protected final boolean tryRelease(int releases) {
    //获取到AQS的资源变量 state 并减一（注意 加锁和减锁的方法入参  永远是 1 ）
    int c = getState() - releases;
    //如果当前线程不是持有锁的线程（直接抛异常，你都没锁 你释放个嘚儿啊 哈哈）
    if (Thread.currentThread() != getExclusiveOwnerThread())
        throw new IllegalMonitorStateException();
    boolean free = false;
    //如果state=0了 则说明锁已经真正的释放了，则释放标志位true并且将占有线程置位null
    if (c == 0) {
        free = true;
        setExclusiveOwnerThread(null);
    }
    //将释放锁之后的state（变量c）赋值给state
    setState(c);
    return free;
}
```

###### `unparkSuccessor()`

释放锁成功的话返回true且头节点不是空并且waitStatus!=0，则进入`unparkSuccessor`方法，开始唤醒`头节点的后继节点对应的线程`，看下源码：

```java
// 方法作用：唤醒头节点（head）的后继节点对应的线程
private void unparkSuccessor(Node node) {
    //获取当前线程的等待状态
    int ws = node.waitStatus;
    //如果node节点的等待状态是负数比如（SIGNAL状态），那尝试将waitStatus置为0
    if (ws < 0)
        node.compareAndSetWaitStatus(ws, 0);

    //获取当前节点的后继节点
    Node s = node.next;
    //如果当前节点的后继节点是null或者当前节点的后继节点是>0，(大于0只能是CANCELLED状态)，
    //那么将从尾节点tail开始，一直向前找距离当前节点最近的那个需要被唤醒的节点，并赋值给变量s
    if (s == null || s.waitStatus > 0) {
        s = null;
        for (Node p = tail; p != node && p != null; p = p.prev)
            if (p.waitStatus <= 0)
                s = p;
    }
    //如果找到了当前节点的第一个需要被唤醒的后继节点，则唤醒他！
    if (s != null)
        //唤醒操作，唤醒当前节点后继节点对应的线程。
        LockSupport.unpark(s.thread);
}
```

##### 如何串联到加锁的阻塞

整个release方法概括就是，释放锁（state-1）并且唤醒头节点之后 waitStatus不是CANCELLED的那个后继节点，但是唤醒后就没了？不是吧，唤醒后，他需要去竞争锁呀！这时候，我们前边分析的那个加锁时候acquireQueued方法的自旋逻辑 就派上用场了，我们简单回顾下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235149673.png" alt="image-20250613235149673" style="zoom:50%;" />

为了方便理解我们这里举个例子，假设在（独占锁且是公平锁模式下）

1. t1时刻，`线程a获取了锁资源`，线程b也尝试获取锁，但是被线程a占用，所以`线程b被搞到了等待队列`中（此时线程b的前驱节点就是头节点也即线程a），`线程b`会在acquireQueued的for(;;)中 **`不断自旋！`**
2. 如果t2时刻，线程a释放了锁资源，在unparkSuccessor逻辑中将线程a的后继节点也即线程b`唤醒`
3. 紧接着t3时刻，线程b在自旋到`if(p==head && tryAcquire(arg))`这个条件时，不出意外将会获取到锁 (因为线程b的前驱节点确实是线程a对应的head节点，且在公平模式下tryAcquire不出意外会获取到锁)，那么将线程b设置为head节点，此时线程b占有锁（至此完成了一次线程a释放，线程b上位的锁获取逻辑）。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235208179.png" alt="image-20250613235208179" style="zoom:60%;" />

#### 公平锁与非公平锁

公平锁与非公平锁的唯一区别，公平锁调用 `hasQueuedPredecessors()`，而非公平锁没有调用 `hasQueuedPredecessors` 是公平锁加锁时判断等待队列中是否存在有效节点的方法

**导致公平锁和非公平锁的差异如下：**

- **公平锁**：公平锁讲究先来先到，线程在获取锁时，如果这个锁的等待队列中已经有线程在等待，那么当前线程就会进入等待队列中;

- **非公平锁**：不管是否有等待队列，如果可以获取锁，则立刻占有锁对象。也就是说队列的第一个排队线程在 unpark()，之后还是需要竞争锁（存在线程竞争的情况下)

##### 非公平锁的加锁

非公平锁的加锁逻辑在`java.util.concurrent.locks.ReentrantLock.NonfairSync#lock`。

```java
final void lock() {、
    //尝试使用CAS修改state的值，修改成功后就加锁成功
    if (compareAndSetState(0, 1))
        setExclusiveOwnerThread(Thread.currentThread());
    else
        //开始加锁
        acquire(1);
}
```

非公平锁一进来就会直接尝试获取一次锁，不会进行太多的判断，这也符合非公平锁的定义，使用 CAS 修改如果成功了，就加锁成功，否则会执行 `acquire` 的加锁逻辑。

最后会走到 `nonfairTryAcquire` 的逻辑：

```java
final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        //直接尝试CAS加锁
        if (compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    //可重入锁
    else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0) // overflow
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    return false;
}
```

在这里可以看到，它的加锁逻辑与公平锁很相似，但是与公平锁不同的是：

- **公平锁当发现 state =**  **0 也就是没有任务占有锁的情况下，会判断队列中是存在等待任务，如果存在就会加锁失败，然后执行入队操作。**
- **而非公平锁发现 state =**  **0 也就是没有任务占有锁的情况下，会直接进行 CAS 加锁，只要 CAS 加锁成功了，就会直接返回加锁成功而不会进行入队操作。**

#### 整体流程

我们简单举个例子，在排他锁模式下流程如下：

1. **假设t1时刻，有线程a持有资源state（****`持有资源的线程一定是在head节点这个我们一定要清楚`** **）**
2. **t1时刻，线程b试图调用获取锁的方法来获取锁资源，发现获取锁失败，则将线程b的相关数据封装为Node并插入CLH队列的队尾。**
3. **挂起线程b，并告知线程a(通过将head节点的waitStatus设置为SIGNAL)，资源释放了记得通知我啊！**
4. **t2时刻，线程a释放资源（并将对应Node赋值为null，利于GC）state后通知线程b**
5. **t3时刻 线程b 尝试获取锁（此时如果是公平锁则大概率可以获取成功，如果是非公平，则不一定）**

### 共享锁（`Semaphore`）

下边我们就以`Semaphore`为例，来切入AQS`共享锁`的`加锁`和`解锁`逻辑！

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235241588.png" alt="image-20250613235241588" style="zoom:40%;" />

Semaphore说白了就是：**令牌机制**，比如说有3个令牌，在某一时刻。最多只允许3个线程去执行被令牌保护的逻辑(没拿到的线程就等待)，每次执行完逻辑后，把令牌归还，好让其他线程去获取并执行（有点一夫当关万夫莫开的意思哈哈！）。

> **共享模式下的state说明：**  有个点我们要很清楚，共享模式下的资源state是提前申请的，在获取共享锁后是对AQS的 state -1，而不是排他锁那样获取锁后state+1

###### 加共享锁

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235306596.png" alt="image-20250613235306596" style="zoom:50%;" />

继续跟进发现AQS中的代码长如下这样：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235306596.png" style="zoom:50%;" />

如果 tryAcquireShared 返回大于等于0，代表获取共享锁成功，但不用立即唤醒后继节点，小于 0 则表示获取失败，如果获取共享资源失败即tryAcquireShared<0成立，就要进入等待队列了（即`doAcquireSharedInterruptibly`内部的逻辑）。

```java
public class Semaphore implements java.io.Serializable {
...

    abstract static class Sync extends AbstractQueuedSynchronizer {
    ...

    static final class NonfairSync extends Sync {
        private static final long serialVersionUID = -2694183684443567898L;

        NonfairSync(int permits) {
            super(permits); // 有几个令牌，初始化的时候就设几个
        }

        protected int tryAcquireShared(int acquires) {
            return nonfairTryAcquireShared(acquires);
        }
    }

    //此处真正实现了AQS的tryAcquireShared钩子方法。
    final int nonfairTryAcquireShared(int acquires) {
        for (;;) {
            //获取到AQS的资源 state
            int available = getState();
            //获取锁时，将可用值state减一（注意这里可不是排他锁时候的+1）
            int remaining = available - acquires;
            //如果剩余可用资源<0说明已经没有资源可用，直接返回负数，如果cas成功则说明还有资源可用，返回剩余资源数量remaining
            if (remaining < 0 ||
                compareAndSetState(available, remaining))
                return remaining;
        }
    }
}
```

当`if (tryAcquireShared(arg) < 0)`成立时（**此时也代表没有资源可用了，也即获取锁失败**）则会进入等待队列，具体细节在`doAcquireSharedInterruptibly`()方法中，我们看下源码：

```java
private void doAcquireSharedInterruptibly(int arg)
    throws InterruptedException {
    //和排他锁加锁 acquire()方法的逻辑差不多
    final Node node = addWaiter(Node.SHARED);
    try {
        for (;;) {
            final Node p = node.predecessor();
            if (p == head) {
                int r = tryAcquireShared(arg);
                if (r >= 0) {
                    setHeadAndPropagate(node, r);
                    p.next = null; // help GC
                    return;
                }
            }
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                throw new InterruptedException();
        }
    } catch (Throwable t) {
        cancelAcquire(node);
        throw t;
    }
}
```

- 通过`addWaiter`方法（注意传入的锁模式是共享模式）添加当前线程对应`Node`（共享类型的Node）到等待队列,(addWaiter方法我们在排他锁说过了此处不过多啰嗦)
- 自旋，找当前节点的前驱节点，如果前驱是head则尝试再次获取共享锁，如果返回的值>0则说明获取锁成功（`有剩余可用资源`），调用`setHeadAndPropagate`方法，咦？这个方法好像第一次见，排他锁加锁没有见过，是啥玩意？一会说
- `shouldParkAfterFailedAcquire`这个方法是老朋友了，排他锁加锁分析中我们唠叨过，不再分析。

>  `doAcquireSharedInterruptibly()`方法实现上和排他锁的加锁方法`acquire()`方法差不多，就是多判断了是否还有剩余资源(`r其实就是state-1的值`)，通过`setHeadAndPropagate()`唤醒后继节点，为啥要唤醒后继节点？
>
> 排他锁模式下线程a抢锁成功后可没有唤醒后继节点的操作啊？那是因为：**既然一个线程刚获得了共享锁，那么很有可能还有剩余的共享锁，可供排队在后面的线程获得，所以需要唤醒后面的线程，让他们也来试试！**

![image-20250613235345776](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235345776.png)

###### 解共享锁

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235421398.png" alt="image-20250613235421398" style="zoom:40%;" />

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235446036.png" alt="image-20250613235446036" style="zoom:50%;" />

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235517723.png" alt="image-20250613235517723" style="zoom:50%;" />

`tryReleaseShared`源码如下（主要逻辑就是归还state，也即对state+1 并CAS赋值给AQS state）：

```java
protected final boolean tryReleaseShared(int releases) {
    for (;;) {
        int current = getState();
        int next = current + releases;
        if (next < current) // overflow
            throw new Error("Maximum permit count exceeded");
        if (compareAndSetState(current, next))
            return true;
    }
}
```

而对于`doReleaseShared`这个方法，我们上边再说共享锁加锁后，唤醒后继等待的那些共享节点时，已经分析过了，这里不在啰嗦重复。

可以看到最终解锁就是两个逻辑

1. `tryReleaseShared`：对state进行+1 ，即释放1个资源，让给其他等待的共享节点
2. `doReleaseShared`：唤醒当前节点的后继节点通过unpark操作

唤醒后的主动抢锁逻辑，就依靠共享锁加锁那里的自旋来实现了，即这个逻辑：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235547114.png" alt="image-20250613235547114" style="zoom:50%;" />

从而形成了一个 释放锁->唤醒后继节点->后继节点通过自旋抢锁的闭环操作（排他锁也是这个主逻辑，我们上边也说过）。

### ConditionObject的原理分析

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235611171.png" alt="image-20250613235611171" style="zoom:50%;" />

```
几个注意的点：
```

1. **在下文中：只要提到****`等待队列`** **，就是CLH队列，也就是存放 （****`获取锁失败后/或者被signal唤醒后从条件等待队列移到等待队列`** **）的node队列，而一提到****`条件等待队列`** **，就是在说（****`调用await后存放`** **）Node的队列！** ，这俩队列一定要搞清楚，否则就很迷了。
2. **条件等待队列可能存在多个**，而CLH等待队列只能是一个。这一点我们要清楚。多个条件等待队列也是ReentrantLock实现细粒度唤醒的一个基本原因。
3. **AQS中的await和signal 只能是排他锁使用**，共享锁绝对不会存在 等待/唤醒机制这么一说。
4. **条件等待队列** 中的线程，**想要获取锁**，**必然** 需要通过**signal方法**`移动到等待队列中去`，`才有机会`。
5. **条件等待队列** 和CLH一样也是FIFO，但是是单向链表结构这个要知道，另外signal唤醒的总是条件等待队列的头节点，**await后插入的Node总是从条件等待队列的尾部进行插入。**

由于jdk中基于ConditionObject实现的条件等待机制也就是ReentrantLock和读写锁，而ReentrantLock用的多一些。所以我们以ReentrantLock为例，做一个生产/消费的小案例，来切身体会一下也方便源码分析时的切入和debug。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235635481.png" alt="image-20250613235635481" style="zoom:40%;" />

**生产/消费 案例完整源码如下：**

```java
/**
 * @Auther: Huangzhuangzhuang
 * @Date: 2023/10/20 07:02
 * @Description:
 */
@Slf4j
public class AwaitSignalDemo {

   private static volatile int shoeCount = 0;
   private static ThreadPoolExecutor producerThread = new ThreadPoolExecutor(1, 1, 1000 * 60, TimeUnit.MILLISECONDS, SemaphoreTest.asyncSenderThreadPoolQueue = new LinkedBlockingQueue<Runnable>(500), new ThreadFactory() {
      private final AtomicInteger threadIndex = new AtomicInteger(0);
      @Override
      public Thread newThread(Runnable r) {
         return new Thread(r, "生产线程_" + this.threadIndex.incrementAndGet());
      }
   });
   private static ThreadPoolExecutor consumerThread = new ThreadPoolExecutor(1, 1, 1000 * 60, TimeUnit.MILLISECONDS, SemaphoreTest.asyncSenderThreadPoolQueue = new LinkedBlockingQueue<Runnable>(500), new ThreadFactory() {
      private final AtomicInteger threadIndex = new AtomicInteger(0);
      @Override
      public Thread newThread(Runnable r) {
         return new Thread(r, "消费线程_" + this.threadIndex.incrementAndGet());
      }
   });

   public static void main(String[] args) {
      Lock lock = new ReentrantLock();
      Condition producerCondition = lock.newCondition();
      Condition consumerCondition = lock.newCondition();
      //不停生产鞋，攒够5双了就唤醒消费线程
      producerThread.execute(() -> {
         while (true) {
            lock.lock(); // 获取锁资源
            try {
               if (shoeCount > 5) { //如果生产够5双， 则阻塞等待生产线程，待消费线程消费完后再生产
                  System.out.println(Thread.currentThread().getName() + "_生产鞋完成" + (shoeCount - 1) + "双");
                  consumerCondition.signal();//唤醒消费鞋子的线程
                  producerCondition.await();//挂起生产鞋的线程
               } else {
                  shoeCount++;//生产鞋子
               }
            } catch (Exception e) {
               e.printStackTrace();
            } finally {
               lock.unlock();//释放锁资源
            }
         }
      });
      //不停消费鞋，把鞋消费完了就唤醒生产线程然他继续造
      consumerThread.execute(() -> {
         while (true) {
            lock.lock();//获取锁资源
            try {
               if (shoeCount == 0) {//如果消费完了
                  System.out.println(Thread.currentThread().getName() + "_鞋子全部消费完了");
                  System.out.println();
                  producerCondition.signal(); //消费完鞋子之后，唤醒生产鞋子的线程
                  consumerCondition.await(); //挂起消费鞋子的线程，等待生产完后唤醒当前挂起线程
               } else {
                  shoeCount--;//消费鞋子
               }
            } catch (Exception e) {
               e.printStackTrace();
            } finally {
               lock.unlock();//释放锁资源
            }
         }
      });
   }
}
```

#### 等待(await)机制源码分析

ReentrantLock的等待机制最终是依赖AQS的ConditionObject类的await方法实现的，所以我们直接来到AQS#ConditionObject的await方法一探究竟，源码如下：

```java
public final void await() throws InterruptedException {
    if (Thread.interrupted())
        throw new InterruptedException();
    //将当前线程加入到 条件等待的链表最后，并返回该节点（内部会创建 Node.CONDITION=-2 类型的 Node）
    Node node = addConditionWaiter();
    //释放当前线程获取的锁（通过操作 state 的值,一直减到state==0）释放了锁就会被阻塞挂起,
    //fullyRelease内部就是调用的我们在AQS独占锁释放时候的tryRelease方法
    int savedState = fullyRelease(node);
    int interruptMode = 0;
    //判断 node节点是否在 AQS 等待队列中（注意该方法中如果node是head的话是返回false的，也就是会执行park逻辑）
    while (!isOnSyncQueue(node)) {
        //如果是head或者当前节点在队列则挂起当前线程
        LockSupport.park(this);
        //如果上边挂起线程后，紧接着又有其他线程中断/唤醒了当前线程（这种情况理论可能比较少但是并发情况下也不一定😄），那么则跳出循环，
        //下边（循环外的）acquireQueued将 node移至AQS等待队列，让其继续抢锁
        if ((interruptMode = checkInterruptWhileWaiting(node)) != 0)
            break;
    }
    //acquireQueued将 node移至AQS等待队列，让其再次抢锁
    //注意此处是 ： 采用排他模式的资源竞争方法 acquireQueued
    if (acquireQueued(node, savedState) && interruptMode != THROW_IE)
        interruptMode = REINTERRUPT;
    if (node.nextWaiter != null) // clean up if cancelled
        //清除取消的线程
        unlinkCancelledWaiters();
    if (interruptMode != 0)
        reportInterruptAfterWait(interruptMode);
}


//将当前线程包装成 CONDITION 节点，排入该 Condition 对象内的（条件等待队列）的队尾
private Node addConditionWaiter() {
    if (!isHeldExclusively())
        throw new IllegalMonitorStateException();
    Node t = lastWaiter;
    //遍历 Condition 队列，踢出 Cancelled 节点
    if (t != null && t.waitStatus != Node.CONDITION) {
        unlinkCancelledWaiters();
        t = lastWaiter;
    }
    //将当前线程包装成 CONDITION 节点，排入该 Condition 对象内的条件等待队列的队尾
    Node node = new Node(Node.CONDITION);
    if (t == null)
        firstWaiter = node;
    else
        t.nextWaiter = node;
    lastWaiter = node;
    return node;
}
//检测是否有中断
private int checkInterruptWhileWaiting(Node node) {
    return Thread.interrupted() ?
        (transferAfterCancelledWait(node) ? THROW_IE : REINTERRUPT) :
        0;
}

final boolean transferAfterCancelledWait(Node node) {
    //将node 状态由 CONDITION 设置为 0，如果设置成功，则说明当前线程抢占到了安排 node 进入 AQS 等待队列的权利，证明了 interrupt 操作先于 signal 操作
    if (node.compareAndSetWaitStatus(Node.CONDITION, 0)) {
        //加到等待队列
        enq(node);
        return true;
    }
    //如果 CAS 操作失败，说明其他线程调用 signal 先行处理了 node 节点。
    //当前线程没竞争到 node 节点的唤醒权，要在 node 节点进入 AQS 队列前一直自旋，同时要执行 yield 让出 CPU
    while (!isOnSyncQueue(node))
        Thread.yield();
    return false;
}
```

![image-20250613235712256](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235712256.png)

#### 唤醒(signal)机制源码分析与图解

```java
public final void signal() {
    //如果当前线程未持有资源state，则抛出异常
    if (!isHeldExclusively())
        throw new IllegalMonitorStateException();
    Node first = firstWaiter;
    if (first != null)
        doSignal(first);
}

//唤醒
private void doSignal(Node first) {
    do {
        if ( (firstWaiter = first.nextWaiter) == null)
            lastWaiter = null;
        first.nextWaiter = null;
    } while (!transferForSignal(first) &&
             (first = firstWaiter) != null);
}

//将node 节点从 条件等待队列转移到 等待队列中去
final boolean transferForSignal(Node node) {
    //尝试将节点状态由 CONDITION 改为 0
    if (!node.compareAndSetWaitStatus(Node.CONDITION, 0))
        return false;

    //end方法将 node 节点插入 AQS 等待队列 队尾，返回 node 节点的前驱节点
    Node p = enq(node);
    int ws = p.waitStatus;
    //如果当前node的前置节点状态为 CANCELLED（大于0只有取消一种），或者设置前置节点状态为 SIGNAL失败，则将 node 节点持有的线程唤醒
    if (ws > 0 || !p.compareAndSetWaitStatus(ws, Node.SIGNAL))
        LockSupport.unpark(node.thread);
    return true;
}
```

![image-20250613235807911](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235807911.png)

#### 总结

说完了 Condition 的使用和底层运行机制，我们再来总结下它跟普通 wait/notify 的比较，一般这也是问的比较多的，Condition 大概有以下两点优势：

- Condition 需要结合 Lock 进行控制，使用的时候要注意一定要对应的 unlock()，可以对多个不同条件进行控制，只要 new 多个 Condition 对象就可以为多个线程控制通信，wait/notify 只能和 synchronized 关键字一起使用，并且只能唤醒一个或者全部的等待队列；
- Condition 有类似于 await 的机制，因此不会产生加锁方式而产生的死锁出现，同时底层实现的是 park/unpark 的机制，因此也不会产生先唤醒再挂起的死锁，一句话就是不会产生死锁，但是 wait/notify 会产生先唤醒再挂起的死锁。

### ReentrantReadWriteLock

**ReentrantReadWriteLock 有五个内部类**，五个内部类之间也是相互关联的。内部类的关系如下图所示。

![image-20250613235831767](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235831767.png)

#### 内部类 - Sync类

```java
abstract static class Sync extends AbstractQueuedSynchronizer {
    // 版本序列号
    private static final long serialVersionUID = 6317671515068378041L;
    // 高16位为读锁，低16位为写锁
    static final int SHARED_SHIFT   = 16;
    // 读锁单位  2^16
    static final int SHARED_UNIT    = (1 << SHARED_SHIFT);
    // 读锁最大数量 2^16 - 1
    static final int MAX_COUNT      = (1 << SHARED_SHIFT) - 1;
    // 写锁最大数量 2^16 - 1
    static final int EXCLUSIVE_MASK = (1 << SHARED_SHIFT) - 1;
    // 本地线程计数器
    private transient ThreadLocalHoldCounter readHolds;
    // 缓存的计数器
    private transient HoldCounter cachedHoldCounter;
    // 第一个读线程
    private transient Thread firstReader = null;
    // 第一个读线程的计数
    private transient int firstReaderHoldCount;
}
```

#### Lock类

WriteLock和ReadLock两个静态内部类。

```java
public static class ReadLock implements Lock, java.io.Serializable {
    public void lock() {
        sync.acquireShared(1); //共享
    }

    public void unlock() {
        sync.releaseShared(1); //共享
    }
}

public static class WriteLock implements Lock, java.io.Serializable {
    public void lock() {
        sync.acquire(1); //独占
    }

    public void unlock() {
        sync.release(1); //独占
    }
}

abstract static class Sync extends AbstractQueuedSynchronizer {}
```

这里发现了ReentrantReadWriteLock和ReentrantLock的一个相同点和不同点：

- 相同的是使用了同一个关键实现AbstractQueuedSynchronizer
- 不同的是ReentrantReadWriteLock使用了两个锁分别实现了AQS，而且WriteLock和ReentrantLock一样，使用了独占锁。而ReadLock和Semaphore一样，使用了共享锁。

#### ReadLock和WriteLock共享变量

是怎么做到读写分离的呢？来看看下面这段代码：

```java
static final int SHARED_SHIFT   = 16; // 高16位为读锁，低16位为写锁
static final int SHARED_UNIT    = (1 << SHARED_SHIFT); // 读锁单位  2^16
static final int MAX_COUNT      = (1 << SHARED_SHIFT) - 1; // 读锁最大数量 2^16 - 1
static final int EXCLUSIVE_MASK = (1 << SHARED_SHIFT) - 1; // 写锁最大数量 2^16 - 1

/** 共享锁的数量  */
static int sharedCount(int c)    { return c >>> SHARED_SHIFT; }
/** 独占锁的数量  */
static int exclusiveCount(int c) { return c & EXCLUSIVE_MASK; }
```

这段代码在Sync静态内部类中，这里有两个关键方法`sharedCount`和`exclusiveCount`，通过名字可以看出`sharedCount`是共享锁的数量，`exclusiveCount`是独占锁的数量。

共享锁通过对 c >>> 16位获得，独占锁通过和16位的1与运算获得。

> 举个例子，当获取读锁的线程有3个，写锁的线程有1个（当然这是不可能同时有的），state就表示为0000 0000 0000 0011 0000 0000 0000 0001，高16位代表读锁，通过向右位移16位（c >>> SHARED_SHIFT）得倒10进制的3，通过和0000 0000 0000 0000 1111 1111 1111 1111与运算（c & EXCLUSIVE_MASK），获得10进制的1。

由于16位最大全1表示为65535，所以读锁和写锁最多可以获取65535个。

#### WriteLock和ReentrantLock获取锁的区别

WriteLock也是独占锁，那么他和ReentrantLock有什么区别呢？

最大的区别就在获取锁时WriteLock不仅需要考虑是否有其他写锁占用，同时还要考虑是否有其他读锁，而ReentrantLock只需要考虑自身是否被占用就行了。

```java
public void lock() {
    sync.acquire(1);
}

public final void acquire(int arg) {
    if (!tryAcquire(arg) && //尝试获取独占锁
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg)) //获取失败后排队
        selfInterrupt();
}

protected final boolean tryAcquire(int acquires) {

    Thread current = Thread.currentThread();
    int c = getState();  //获取共享变量state
    int w = exclusiveCount(c); //获取写锁数量
    if (c != 0) { //有读锁或者写锁
        // (Note: if c != 0 and w == 0 then shared count != 0)
        if (w == 0 || current != getExclusiveOwnerThread()) //写锁为0（证明有读锁），或者持有写锁的线程不为当前线程
            return false;
        if (w + exclusiveCount(acquires) > MAX_COUNT)
            throw new Error("Maximum lock count exceeded");
        // Reentrant acquire
        setState(c + acquires);  //当前线程持有写锁，为重入锁，+acquires即可
        return true;
    }
    if (writerShouldBlock() ||
        !compareAndSetState(c, c + acquires)) //CAS操作失败，多线程情况下被抢占，获取锁失败。CAS成功则获取锁成功
        return false;
    setExclusiveOwnerThread(current);
    return true;
}
```

这段代码是不是很熟悉？和ReentrantLock中获取锁的代码很相似，差别在于其中调用了`exclusiveCount`方法来获取是否存在写锁，然后通过`c != 0`和`w == 0`判断了是否存在读锁。

#### ReadLock和Semaphore获取锁的区别

```java
protected final int tryAcquireShared(int unused) {

    Thread current = Thread.currentThread();
    int c = getState();
    if (exclusiveCount(c) != 0 &&
       getExclusiveOwnerThread() != current) //写锁不等于0的情况下，验证是否是当前写锁尝试获取读锁
       return -1;
    int r = sharedCount(c);  //获取读锁数量
    if (!readerShouldBlock() && //读锁不需要阻塞
       r < MAX_COUNT &&  //读锁小于最大读锁数量
       compareAndSetState(c, c + SHARED_UNIT)) { //CAS操作尝试设置获取读锁 也就是高位加1
       if (r == 0) {  //当前线程第一个并且第一次获取读锁，
          firstReader = current;
          firstReaderHoldCount = 1;
       } else if (firstReader == current) { //当前线程是第一次获取读锁的线程
          firstReaderHoldCount++;
       } else { // 当前线程不是第一个获取读锁的线程，放入线程本地变量
          HoldCounter rh = cachedHoldCounter;
          if (rh == null || rh.tid != getThreadId(current))
             cachedHoldCounter = rh = readHolds.get();
          else if (rh.count == 0)
             readHolds.set(rh);
          rh.count++;
       }
       return 1;
    }
    return fullTryAcquireShared(current);
}
```

在上面的代码中尝试获取读锁的过程和获取写锁的过程也很相似，不同在于读锁`只要没有写锁`占用并且`不超过最大获取数量`都可以尝试获取读锁，而写锁不仅需要考虑读锁是否占用，也要考虑写锁是否占用。

上面的代码中firstReader，firstReaderHoldCount以及cachedHoldCounter都是为readHolds（ThreadLocalHoldCounter）服务的，用来记录每个读锁获取线程的获取次数，方便获取当前线程持有锁的次数信息。在ThreadLocal基础上添加了一个Int变量来统计次数。

#### 锁降级

锁降级指的是写锁降级成为读锁。如果当前线程拥有写锁，然后将其释放，最后再获取读锁，这种分段完成的过程不能称之为锁降级。

```
锁降级是指把持住(当前拥有的)写锁，再获取到读锁，随后释放(先前拥有的)写锁的过程。
// update变量使用volatile修饰
public void processData() {
    readLock.lock();
    if (!update) {
        // 必须先释放读锁
        readLock.unlock();
        // 锁降级从写锁获取到开始
        writeLock.lock();
        try {
            if (!update) {
                // 准备数据的流程(略)
                update = true;
            }
            readLock.lock();
        } finally {
            writeLock.unlock();
        }
        // 锁降级完成，写锁降级为读锁
    }
    try {
        // 使用数据的流程(略)
    } finally {
        readLock.unlock();
    }
}
```

上述示例中，当数据发生变更后，update变量(布尔类型且volatile修饰)被设置为false，此时所有访问 processData() 方法的线程都能够感知到变化，但只有一个线程能够获取到写锁，其他线程会被阻塞在读锁和写锁的lock()方法上。当前线程获取写锁完成数据准备之后，再获取读锁，随后释放写锁，完成锁降级。

锁降级中读锁的获取是否必要呢? 答案是必要的。主要是为了保证数据的可见性，如果当前线程不获取读锁而是直接释放写锁，假设此刻另一个线程(记作线程T)获取了写锁并修改了数据，那么当前线程无法感知线程T的数据更新。如果当前线程获取读锁，即遵循锁降级的步骤，则线程T将会被阻塞，直到当前线程使用数据并释放读锁之后，线程T才能获取写锁进行数据更新。

```
RentrantReadWriteLock不支持锁升级(把持读锁、获取写锁，最后释放读锁的过程)。目的也是保证数据可见性，如果读锁已被多个线程获取，其中任意线程成功获取了写锁并更新了数据，则其更新对其他获取到读锁的线程是不可见的。
```