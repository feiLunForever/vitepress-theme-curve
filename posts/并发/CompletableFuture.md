## FutureTask

FutureTask 为 Future 提供了基础实现，如获取任务执行结果(get)和取消任务(cancel)等。如果任务尚未完成，获取任务执行结果时将会阻塞。一旦执行结束，任务就不能被重启或取消(除非使用runAndReset执行计算)。

FutureTask 常用来封装 Callable 和 Runnable，也可以作为一个任务提交到线程池中执行。除了作为一个独立的类之外，此类也提供了一些功能性函数供我们创建自定义 task 类使用。

FutureTask 的线程安全由CAS来保证。

![image-20250613235927944](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235927944.png)

### 源码解析

#### Callable接口

对比Runnable接口，Runnable不会返回数据也不能抛出异常。

```java
public interface Callable<V> {
    /**
     * Computes a result, or throws an exception if unable to do so.
     *
     * @return computed result
     * @throws Exception if unable to compute a result
     */
    V call() throws Exception;
}
```

#### Future接口

Future接口代表异步计算的结果，通过Future接口提供的方法可以查看异步计算是否执行完成，或者等待执行结果并获取执行结果，同时还可以取消执行。

```java
public interface Future<V> {
    boolean cancel(boolean mayInterruptIfRunning);
    boolean isCancelled();
    boolean isDone();
    V get() throws InterruptedException, ExecutionException;
    V get(long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
}
```

#### 核心属性

```java
// 内部持有的callable任务，运行完毕后置空
private Callable<V> callable;

// 从get()中返回的结果或抛出的异常
private Object outcome; // non-volatile, protected by state reads/writes

// 运行 callable 的线程
private volatile Thread runner;

// 使用Treiber栈保存等待线程
private volatile WaitNode waiters;

//任务状态
private volatile int state;
private static final int NEW          = 0; // 表示是个新的任务或者还没被执行完的任务。这是初始状态。
private static final int COMPLETING   = 1; // 任务已经执行完成或者执行任务的时候发生异常
private static final int NORMAL       = 2; // 任务已经执行完成并且任务执行结果已经保存到outcome字段
private static final int EXCEPTIONAL  = 3; // 任务执行发生异常并且异常原因已经保存到outcome字段中后
private static final int CANCELLED    = 4; // 任务还没开始执行或者已经开始执行但是还没有执行完成时候
private static final int INTERRUPTING = 5; // 任务还没开始执行或者已经执行但是还没有执行完成的时候
private static final int INTERRUPTED  = 6; // 调用interrupt()中断任务执行线程之后
```

**其中需要注意的是state是volatile类型的，也就是说只要有任何一个线程修改了这个变量，那么其他所有的线程都会知道最新的值**。

各个状态之间的可能转换关系如下图所示:

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613235943024.png" alt="image-20250613235943024" style="zoom:80%;" />

#### 构造函数

```java
public FutureTask(Callable<V> callable) {
    if (callable == null)
        throw new NullPointerException();
    this.callable = callable;
    this.state = NEW;       // ensure visibility of callable
}

public FutureTask(Runnable runnable, V result) {
    this.callable = Executors.callable(runnable, result);
    this.state = NEW;       // ensure visibility of callable
}
```

#### 核心方法 - run()

```java
public void run() {
    //新建任务，CAS替换runner为当前线程
    if (state != NEW ||
        !UNSAFE.compareAndSwapObject(this, runnerOffset,
                                     null, Thread.currentThread()))
        return;
    try {
        Callable<V> c = callable;
        if (c != null && state == NEW) {
            V result;
            boolean ran;
            try {
                result = c.call();
                ran = true;
            } catch (Throwable ex) {
                result = null;
                ran = false;
                setException(ex);
            }
            if (ran)
                set(result);//设置执行结果
        }
    } finally {
        // runner must be non-null until state is settled to
        // prevent concurrent calls to run()
        runner = null;
        // state must be re-read after nulling runner to prevent
        // leaked interrupts
        int s = state;
        if (s >= INTERRUPTING)
            handlePossibleCancellationInterrupt(s);//处理中断逻辑
    }
}
```

- 运行任务，如果任务状态为NEW状态，则利用CAS修改为当前线程。**执行完毕调用set(result)方法设置执行结果**。

    - set(result)源码如下：

```java
protected void set(V v) {
    if (UNSAFE.compareAndSwapInt(this, stateOffset, NEW, COMPLETING)) {
        outcome = v;
        UNSAFE.putOrderedInt(this, stateOffset, NORMAL); // final state
        finishCompletion();//执行完毕，唤醒等待线程
    }
}
```

首先利用cas修改state状态为 COMPLETING，设置返回结果，然后使用 **lazySet(UNSAFE.putOrderedInt) 的方式** 设置state状态为NORMAL。结果设置完毕后，调用`finishCompletion()`方法唤醒等待线程

```java
private void finishCompletion() {
    // assert state > COMPLETING;
    for (WaitNode q; (q = waiters) != null;) {
        if (UNSAFE.compareAndSwapObject(this, waitersOffset, q, null)) {//移除等待线程
            for (;;) {//自旋遍历等待线程
                Thread t = q.thread;
                if (t != null) {
                    q.thread = null;
                    LockSupport.unpark(t);//唤醒等待线程
                }
                WaitNode next = q.next;
                if (next == null)
                    break;
                q.next = null; // unlink to help gc
                q = next;
            }
            break;
        }
    }
    // 任务完成后调用函数，自定义扩展
    done();
    callable = null;        // to reduce footprint
}
```

- 回到run方法，如果在 run 期间被中断，此时需要调用 `handlePossibleCancellationInterrupt` 方法来处理中断逻辑，确保任何中断(例如cancel(true)) 只停留在当前run或 runAndReset 的任务中

```java
private void handlePossibleCancellationInterrupt(int s) {
    //在中断者中断线程之前可能会延迟，所以我们只需要让出CPU时间片自旋等待
    if (s == INTERRUPTING)
        while (state == INTERRUPTING)
            Thread.yield(); // wait out pending interrupt
}
```

#### 核心方法 - get()

```java
//获取执行结果
public V get() throws InterruptedException, ExecutionException {
    int s = state;
    if (s <= COMPLETING)
        s = awaitDone(false, 0L);
    return report(s);
}
```

FutureTask 通过 get() 方法获取任务执行结果。如果任务处于未完成的状态(`state <= COMPLETING`)，就调用 awaitDone方法等待任务完成。**任务完成后，通过report方法获取执行结果或抛出执行期间的异常**。

report源码如下：

```java
//返回执行结果或抛出异常
private V report(int s) throws ExecutionException {
    Object x = outcome;
    if (s == NORMAL)
        return (V)x;
    if (s >= CANCELLED)
        throw new CancellationException();
    throw new ExecutionException((Throwable)x);
}
```

- 如果状态是`NORMAL`，正常结束的话，则把`outcome`变量返回；
- 如果是取消或者中断状态的，则抛出取消异常；
- 如果是`EXCEPTION`，则把`outcome`当作异常抛出（之前`setException()`保存的类型就是`Throwable`）。从而整个`get()`会有一个异常抛出。

#### 核心方法 - awaitDone(boolean timed, long nanos)

```java
private int awaitDone (boolean timed, long nanos) throws InterruptedException {
    final long deadline = timed ? System.nanoTime() + nanos : 0L;
    WaitNode q = null;
    boolean queued = false;
    for (;;) {//自旋
        if (Thread.interrupted()) {//获取并清除中断状态
            removeWaiter(q);//移除等待WaitNode
            throw new InterruptedException();
        }

        int s = state;
        if (s > COMPLETING) {
            if (q != null)
                q.thread = null;//置空等待节点的线程
            return s;
        }
        else if (s == COMPLETING) // cannot time out yet
            Thread.yield();
        else if (q == null)
            q = new WaitNode();
        else if (!queued)
            // CAS修改waiter
            queued = UNSAFE.compareAndSwapObject(this, waitersOffset,
                                                 q.next = waiters, q);
        else if (timed) {
            nanos = deadline - System.nanoTime();
            if (nanos <= 0L) {
                removeWaiter(q);//超时，移除等待节点
                return state;
            }
            LockSupport.parkNanos(this, nanos);//阻塞当前线程
        }
        else
            LockSupport.park(this);//阻塞当前线程
    }
}
```

**awaitDone用于等待任务完成，或任务因为中断或超时而终止**。返回任务的完成状态。

在自旋的for()循环中，

- 先判断是否线程被中断，中断的话抛异常退出。
- 然后开始判断运行的`state`值，如果`state`大于`COMPLETING`，证明计算已经是终态了，此时返回终态变量。
- 若`state`等于`COMPLETING`，证明已经开始计算，并且还在计算中。此时为了避免过多的CPU时间放在这个for循环的自旋上，程序执行`Thread.yield()`，把线程从运行态降为就绪态，让出CPU时间。
- 若以上状态都不是，则证明`state`为`NEW`，还没开始执行。那么程序在当前循环现在会新增一个`WaitNode`，在下一个循环里面调用`LockSupport.park()`把当前线程阻塞。当`run()`方法结束的时候，会再次唤醒此线程，避免自旋消耗CPU时间。
- 如果选用了超时功能，在阻塞和自旋过程中超时了，则会返回当前超时的状态。

#### 核心方法 - cancel(boolean mayInterruptIfRunning)

```java
public boolean cancel(boolean mayInterruptIfRunning) {
    //如果当前Future状态为NEW，根据参数修改 Future状态为 INTERRUPTING 或 CANCELLED
    if (!(state == NEW &&
          UNSAFE.compareAndSwapInt(this, stateOffset, NEW,
              mayInterruptIfRunning ? INTERRUPTING : CANCELLED)))
        return false;
    try {    // in case call to interrupt throws exception
        if (mayInterruptIfRunning) {//可以在运行时中断
            try {
                Thread t = runner;
                if (t != null)
                    t.interrupt();
            } finally { // final state
                UNSAFE.putOrderedInt(this, stateOffset, INTERRUPTED);
            }
        }
    } finally {
        finishCompletion();//移除并唤醒所有等待线程
    }
    return true;
}
```

尝试取消任务。如果任务已经完成或已经被取消，此操作会失败。

- 如果当前Future状态为NEW，根据参数修改Future状态为 INTERRUPTING 或 CANCELLED。
- 如果当前状态不为NEW，则根据参数 mayInterruptIfRunning 决定是否在任务运行中也可以中断。中断操作完成后，调用finishCompletion 移除并唤醒所有等待线程。

### 总结

- `Executor.sumbit()`方法异步执行一个任务，并且返回一个Future结果。
- `submit()`的原理是利用`Callable`创建一个`FutureTask`对象，然后执行对象的`run()`方法，把结果保存在`outcome`中。
- 调用`get()`获取`outcome`时，如果任务未完成，会阻塞线程，等待执行完毕。
- 异常和正常结果都放在`outcome`中，调用`get()`获取结果或抛出异常。

## CompletableFuture

### 背景

```java
public class CompletableFuture<T> implements Future<T>, CompletionStage<T> {}
```

我们可以看到 `CompletableFuture` 实现了 `Future` 和 `CompletionStage` 接口，使用 `Future` 获得异步执行结果时，要么调用阻塞方法 `get()`，要么轮询看 `isDone()` 是否为 true，这两种方法都不是很好，因为主线程也会被迫等待。

从 Java 8 开始引入了 `CompletableFuture`，它针对 `Future` 做了改进，可以传入回调对象，当异步任务完成或者发生异常时，自动调用回调对象的回调方法。当任务执行完之后，会通知调用线程来执行回调方法。而在调用回调方法之前，调用线程可以执行其他任务，是非阻塞的。

> `CompletableFuture` 是 JDK 1.8 里面引入的一个基于事件驱动的一个异步回调类，简单来说就是说当前使用异步线程去执行一个任务的时候，我们希望在这个任务结束以后触发一个后续的动作，而 `CompletableFuture` 就可以实现这样一个功能。
>
> `CompletableFuture` 对 `Future`进行了扩展，可以通过设置回调的方式处理计算结果，同时也支持组合操作，支持进一步的编排，同时一定程度解决了回调地狱的问题。
>
> 提供了五种不同的方式
>
> - thenCombine 把两个任务组合在一起，当两个任务都执行结束以后，触发某个事件的回调
> - thenCompose 第一个任务执行结束以后自动去触发执行第二个任务
> - thenAccept 它是第一个任务执行结束以后触发第二个任务，并且第一个任务的执行结果作为第二个任务的一个参数，无返回值
> - thenApply 同thenAccept，有返回值的一个方法
> - thenRun 任务执行完成以后，触发执行一个实现了 Runnable 接口的一个任务

```java
public static void main(String[] args) throws InterruptedException {
    CompletableFuture
    //委托师傅做蛋糕
    .supplyAsync(()-> {
        try {
            System.out.println("师傅准备做蛋糕");
            TimeUnit.SECONDS.sleep(1);
            System.out.println("师傅做蛋糕做好了");
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return "cake";
    })
    //做好了告诉我一声
    .thenAccept(cake->{
        System.out.println("我吃蛋糕:" + cake);
    });
    System.out.println("我先去喝杯牛奶");
    Thread.currentThread().join();
}
```

### CompletableFuture解决的问题

CompletableFuture 是由Java 8引入的，在Java8之前我们一般通过Future实现异步。

- Future用于表示异步计算的结果，只能通过阻塞或者轮询的方式获取结果，而且不支持设置回调方法，Java 8之前若要设置回调一般会使用guava的 ListenableFuture，回调的引入又会导致臭名昭著的回调地狱（下面的例子会通过ListenableFuture 的使用来具体进行展示）。
- **CompletableFuture 对 Future进行了扩展，可以通过设置回调的方式处理计算结果，同时也支持组合操作，支持进一步的编排，同时一定程度解决了回调地狱的问题**。

举例来说明，我们通过 ListenableFuture、CompletableFuture 来实现异步的差异。假设有三个操作step1、step2、step3存在依赖关系，其中step3的执行依赖step1和step2的结果。

**Future(ListenableFuture)的实现（回调地狱）如下：**

```java
ExecutorService executor = Executors.newFixedThreadPool(5);
ListeningExecutorService guavaExecutor = MoreExecutors.listeningDecorator(executor);
ListenableFuture<String> future1 = guavaExecutor.submit(() -> {
    //step 1
    System.out.println("执行step 1");
    return "step1 result";
});
ListenableFuture<String> future2 = guavaExecutor.submit(() -> {
    //step 2
    System.out.println("执行step 2");
    return "step2 result";
});
ListenableFuture<List<String>> future1And2 = Futures.allAsList(future1, future2);
Futures.addCallback(future1And2, new FutureCallback<List<String>>() {
    @Override
    public void onSuccess(List<String> result) {
        System.out.println(result);
        ListenableFuture<String> future3 = guavaExecutor.submit(() -> {
            System.out.println("执行step 3");
            return "step3 result";
        });
        Futures.addCallback(future3, new FutureCallback<String>() {
            @Override
            public void onSuccess(String result) {
                System.out.println(result);
            }  
            @Override
            public void onFailure(Throwable t) {
            }
        }, guavaExecutor);
    }

    @Override
    public void onFailure(Throwable t) {
    }}, guavaExecutor);
```

**CompletableFuture 的实现如下：**

```java
ExecutorService executor = Executors.newFixedThreadPool(5);
// supplyAsync 表示执行一个异步方法
CompletableFuture<String> cf1 = CompletableFuture.supplyAsync(() -> {
    System.out.println("执行step 1");
    return "step1 result";
}, executor);

CompletableFuture<String> cf2 = CompletableFuture.supplyAsync(() -> {
    System.out.println("执行step 2");
    return "step2 result";
});
cf1.thenCombine(cf2, (result1, result2) -> {
    System.out.println(result1 + " , " + result2);
    System.out.println("执行step 3");
    return "step3 result";
// thenAccept 表示执行成功后再串联另外一个异步方法
}).thenAccept(result3 -> System.out.println(result3));
```

显然，CompletableFuture 的实现更为简洁，可读性更好。

### `CompletableStage接口`

常用的几个方法：

- thenApply 将上一个 stage 的结果转化成新的类型或值
- thenAccept 将上一个 stage 的结果进行消耗，无返回值
- thenRun 在上一个 stage 有结果后，执行一段新的操作
- thenCombine 结合两个 CompletableStage 的结果，转化成新的类型或值
- thenCompose 返回一个新的 CompletableStage，并将上一个 stage 的结果作为新的 stage 的 supplier
- exceptionally 当运算过程中遇到异常时的一个补偿处理
- handle 统一了对正常结果和异常结果的处理

### 关键组件

#### 操作的分类

`CompletableFuture` 可以对执行链上的各个操作进行组合编排，其实在 `CompletableFuture` 内部实现中所有操作都只分为了以下两大类

> - 依赖操作：  
    >   单依赖操作只依赖一个前置操作，只要前置操作完成了就可以执行
> - 双依赖操作  
    >   与单依赖操作的定义类似，双依赖操作依赖的前置操作为两个，双依赖操作的执行需要根据其两个前置操作的执行情况来确定

![image-20250614000031321](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000031321.png)

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000041448.png" alt="image-20250614000041448" style="zoom:50%;" />

### 核心源码解读

#### 成员

```java
public class CompletableFuture<T> implements Future<T>, CompletionStage<T> {

    volatile Object result;       // Either the result or boxed AltResult
    volatile Completion stack;    // TopS of Treiber stack of dependent actions
}
```

- `result` 代表着 `CompletableFuture` 对象的执行结果。
- `Completion` 类型的 `stack` 字段代表着需要回调的后续任务栈。

    - 这是一个 CAS 实现的无锁并发栈，每个链式调用的任务会被压入这个栈。
    - `Completion` 对象内部维护着一个 `next` 指针，可以指向下一个需要被回调的对象，所有需要被回调的对象组成了一个单向链表。
    - `Completion`对象是用来驱动某一个`CompletableFuture`对象，所谓的驱动，就是使得这个`CompletableFuture`对象的`result`成员变为非null。

##### Completion内部类

```java
abstract static class Completion extends ForkJoinTask<Void>
    implements Runnable, AsynchronousCompletionTask {
    volatile Completion next;      // 无锁并发栈

    /**
     * 钩子方法，有三种模式，postComplete()方法里面使用的是NESTED模式，
     * 避免过深的递归调用 SYNC, ASYNC, or NESTED
     */
    abstract CompletableFuture<?> tryFire(int mode); // run()和exec()都调用了这个钩子方法

    /** Returns true if possibly still triggerable. Used by cleanStack. */
    abstract boolean isLive(); // cleanStack()方法里有用到

    public final void run()                { tryFire(ASYNC); }
    public final boolean exec()            { tryFire(ASYNC); return true; }
    public final Void getRawResult()       { return null; }
    public final void setRawResult(Void v) {}
}
```

`Completion` 中的 `next` 保存了栈中下一个元素的引用，而 `CompletableFuture` 中的 `stack` 永远指向栈顶。

多个线程对同一个 `CompletableFuture` 对象 `complete` 时，只有一个会成功，所以 `CompletableFuture` 是线程安全且高效的。

##### Signaller内部类

```JAVA
static final class Signaller extends Completion implements ForkJoinPool.ManagedBlocker {
    long nanos;                    // wait time if timed
    final long deadline;           // non-zero if timed
    volatile int interruptControl; // > 0: 可中断的, < 0: 已经被中断了
    volatile Thread thread;

    Signaller(boolean interruptible, long nanos, long deadline) {
        this.thread = Thread.currentThread();
        this.interruptControl = interruptible ? 1 : 0;  // 0代表不支持中断
        this.nanos = nanos;
        this.deadline = deadline;
    }
    final CompletableFuture<?> tryFire(int ignore) {
        Thread w; // no need to atomically claim
        if ((w = thread) != null) {
            thread = null;
            LockSupport.unpark(w); // tryFire唤醒即可
        }
        return null;
    }
    // 返回true代表当前线程不需要阻塞了
    public boolean isReleasable() {
        if (thread == null)
            return true;
        if (Thread.interrupted()) {
            int i = interruptControl;
            interruptControl = -1; // 只要被中断，不管之前的值是什么，都置为-1
            if (i > 0) // 如果支持中断，既然支持中断，那么不需要阻塞了
                return true;
        }
        // 虽然发现中断，但此对象不支持中断，那么也需要阻塞。这意味着会一直等到依赖stage执行完成

        if (deadline != 0L &&
            (nanos <= 0L || (nanos = deadline - System.nanoTime()) <= 0L)) {
            thread = null;
            //如果已经超时
            return true;
        }
        // 如果还没有超时，则需要阻塞

        return false;
    }
    public boolean block() {
        if (isReleasable()) // 如果发现不需要阻塞了，那么直接返回
            return true;
        else if (deadline == 0L) // 如果不是超时版本，那么无限阻塞
            LockSupport.park(this);
        else if (nanos > 0L) // 如果是超时版本，那么限时阻塞
            LockSupport.parkNanos(this, nanos);
        // 唤醒后判断是否需要阻塞
        return isReleasable();
    }
    final boolean isLive() { return thread != null; }
}
```

配合`get`或者`join`使用的，实现对 想获取执行结果的线程 的 **阻塞** 和 **唤醒** 的功能。

#### `supplyAsync` 创建异步任务

以 `supplyAsync` 为例来说明 `CompletableFuture` 如何创建一个异步任务并运行；

```java
public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier) {
    // asyncPool, ForkJoinPool.commonPool()或者ThreadPerTaskExecutor(实现了Executor接口，里面的内容是{new Thread(r).start();})
    return asyncSupplyStage(asyncPool, supplier);
}

public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier, Executor executor) {
    return asyncSupplyStage(screenExecutor(executor), supplier);
}
```

##### `asyncSupplyStage`

`asyncSupplyStage` 提交任务的过程可以分为三步：

1. 首先，创建了一个代表当前任务执行阶段的 `CompletableFuture` 对象并最终返回；
2. 其次，将代表当前阶段的 `CompletableFuture` 对象与 `Supplier` 接口封装到 `AsyncSupply`；
3. 最终，将 `AsyncSupply` 对象提交到线程池中执行

```java
static <U> CompletableFuture<U> asyncSupplyStage(Executor e,Supplier<U> f) {
    if (f == null) throw new NullPointerException();
    // 构建一个新的CompletableFuture, 以此构建AsyncSupply作为Executor的执行参数
    CompletableFuture<U> d = new CompletableFuture<U>(); 
    // AsyncSupply继承了ForkJoinTask, 实现了Runnable
    e.execute(new AsyncSupply<U>(d, f)); // 封装Supplier接口并提交到线程池中
    return d;
}
```

##### `AsyncSupply`

```java
// CompletableFuture的静态内部类，作为一个ForkJoinTask
static final class AsyncSupply<T> extends ForkJoinTask<Void> implements Runnable, AsynchronousCompletionTask {
    CompletableFuture<T> dep; // AsyncSupply作为一个依赖Task，dep作为这个Task的Future
    Supplier<T> fn; // fn作为这个Task的具体执行逻辑，函数式编程

    AsyncSupply(CompletableFuture<T> dep, Supplier<T> fn) {
        this.dep = dep;
        this.fn = fn;
    }

    public final Void getRawResult() {
        return null;
    }

    public final void setRawResult(Void v) {
    }

    public final boolean exec() {
        run();
        return true;
    }

    public void run() {
        CompletableFuture<T> d;
        Supplier<T> f;
        if ((d = dep) != null && (f = fn) != null) { // 非空判断
          // 为了防止内存泄漏，方便GC.同时dep为null也是一种代表当前Completion对象的关联stage已完成的标志
            dep = null;
            fn = null;
            if (d.result == null) { // 查看任务是否结束，如果已经结束(result != null)，直接调用postComplete()方法
                try {
                    d.completeValue(f.get()); // 等待任务结束，并设置结果
                } catch (Throwable ex) {
                    d.completeThrowable(ex); // 异常
                }
            }
            d.postComplete(); // 任务结束后，会执行所有依赖此任务的其他任务，这些任务以一个无锁并发栈的形式存在
        }
    }
}
postComplete()
final void postComplete() {
    CompletableFuture<?> f = this; // 当前CompletableFuture
    Completion h; // 无锁并发栈，(Completion next), 保存的是依靠当前的CompletableFuture一串任务，完成即触发（回调）
    while ((h = f.stack) != null || (f != this && (h = (f = this).stack) != null)) { // 当f的stack为空时，使f重新指向当前的CompletableFuture，继续后面的结点
        CompletableFuture<?> d;
        Completion t;
        if (f.casStack(h, t = h.next)) { // 从头遍历stack，并更新头元素
            if (t != null) {
                if (f != this) { // 如果f不是当前CompletableFuture，则将它的头结点压入到当前CompletableFuture的stack中，使树形结构变成链表结构，避免递归层次过深
                    pushStack(h);
                    continue; // 继续下一个结点，批量压入到当前栈中
                }
                h.next = null; // 如果是当前CompletableFuture, 解除头节点与栈的联系
            }
            f = (d = h.tryFire(NESTED)) == null ? this : d; // 调用头节点的tryFire()方法，该方法可看作Completion的钩子方法，执行完逻辑后，会向后传播的
        }
    }
}
```

以上就是一个 `CompletableFuture` 异步任务的创建与执行过程。那么，如果需要在当前的异步任务完成时执行其他逻辑，`CompletableFuture` 时如何实现的呢？

#### `thenApply`创建回调任务

```java
public <U> CompletableFuture<U> thenApply(Function<? super T, ? extends U> fn) {
    return uniApplyStage(null, fn);
}

public <U> CompletableFuture<U> thenApplyAsync(Function<? super T, ? extends U> fn) {
    return uniApplyStage(asyncPool, fn);
}
```

##### `uniApplyStage`

```java
private <V> CompletableFuture<V> uniApplyStage(
    Executor e, Function<? super T,? extends V> f) {
    if (f == null) throw new NullPointerException();
    CompletableFuture<V> d =  new CompletableFuture<V>();
    // 如果e不为null，说明当前stage是无论如何都需要被异步执行的。所以短路后面的d.uniApply。
    // 如果e为null，说明当前stage是可以允许被同步执行的。所以需要尝试一下d.uniApply。
    // d.uniApply 可以理解为依赖的前任任务是否已经执行完成
    if (e != null || !d.uniApply(this, f, null)) {  // 判断线程池是否为空，为空则直接尝试执行
        // 进入此分支有两种情况：
        // 1. 要么e不为null，前一个stage不一定执行完毕。就算前一个stage已经执行完毕，还可以用e来执行当前stage
        // 2. 要么e为null，但前一个stage还没执行完毕。所以只能入栈等待
        UniApply<T,V> c = new UniApply<T,V>(e, d, this, f);// 新建对象，封装代表执行逻辑的函数式接口对象f,代表当前阶段的CP对象d，还有前置任务this，以及线程池e；
        push(c); // UniApply继承UniCompletion继承Completion，c其实就是Completion对象，被push到栈中
        //（考虑e为null）入栈后需要避免，入栈后刚好前一个stage已经执行完毕的情况。这种特殊情况，如果不执行c.tryFire(SYNC)，当前stage永远不会完成。
        //（考虑e不为null）入栈后需要避免，入栈前 前一个stage已经执行完毕的情况。
       c.tryFire(SYNC); // 防止push过程中前置任务变更完成状态，漏掉当前阶段的任务。尝试执行一次。
    }
    return d;
}
```

##### **tryFire**

`tryFire` 方法的作用就是尝试执行 `stack` 中的任务。此处的 `tryFire` 方法，通过刚刚创建的 `UniApply` 对象调用，并执行封装在其中的任务逻辑。

此处调用是为了避免任务完成入栈后，前置 `CompletableFuture` 已经执行完成，从而错过了回调的时机，导致当前的任务无法被触发的情况。

```java
final CompletableFuture<V> tryFire(int mode) {
    CompletableFuture<V> d; CompletableFuture<T> a;
    // 1. 如果dep为null，说明当前stage已经被执行过了
    // 2. 如果uniApply返回false，说明当前线程无法执行当前stage。返回false有可能是因为
    //     2.1 前一个stage没执行完呢
    //     2.2 前一个stage执行完了，但当前stage已经被别的线程执行了。如果提供了线程池，那么肯定属于被别的线程执行了。   
    // 如果uniApply执行成功，则会进到下面的postFire调用，否则return null，也就是tryFire失败了，就要等待以后的主动complete来再次触发
    if ((d = dep) == null ||
        !d.uniApply(a = src, fn, mode > 0 ? null : this))//执行任务逻辑
        return null;
    dep = null; src = null; fn = null; // tryFire成功后，会把以下几个属性设为null，代表此Completion已经完成任务，变成dead状态
    return d.postFire(a, mode);
}
```

通过源码也可以再次确认，`tyrFire` 方法其中的主要逻辑之一就是尝试执行封装的任务逻辑。

##### **postFire**

`postFire` 主要用来处理任务执行完成的后续工作。如清理 `stack` 中的无效节点，嵌套调用时返回当前 `CompletableFuture` 对象或在非嵌套调用时执行 `postComplete` 方法，用来激发后续任务。

```java
final CompletableFuture<T> postFire(CompletableFuture<?> a, int mode) {
    if (a != null && a.stack != null) { // 前一个stage的后续任务还没做完
       // 1. mode为NESTED。说明就是postComplete调用过来的，那么只清理一下栈中无效节点即可。
        // 2. mode为SYNC或ASYNC，但前一个stage还没执行完。不知道何时发生，因为调用postFire的前提就是前一个stage已经执行完
        if (mode < 0 || a.result == null)
            a.cleanStack(); // 清理stack中的无效节点
        else
            a.postComplete(); // 使用当前线程帮助前置任务执行stack
    }
    if (result != null && stack != null) { // 当前stage的后续任务还没做完
        if (mode < 0)
            return this; // 嵌套调用，stack不为空，返回当前阶段。
        else
            postComplete(); // 非嵌套调用，stack不为空，处理当前阶段的stack
    }
    return null;
}
```

##### **UniApply**

`UniApply` 的作用就是判断任务是否满足执行条件，然后执行封装的函数式接口。这个过程大概可以分为四个部分：

1. 判断前置任务是否完成；
2. 判断前置任务是否有异常；
3. 判断当前任务是否已经被其他线程声明了执行权限；
4. 调用函数式接口中的方法，执行任务逻辑，并封装结果。

```java
final <S> boolean uniApply(CompletableFuture<S> a,
                           Function<? super S,? extends T> f,
                           UniApply<S,T> c) { // a前置CP,f当前阶段函数，c封装当前阶段逻辑的Completion对象
    Object r; Throwable x;
    // 前后两个条件只是优雅的避免空指针异常，实际不可能发生。
    // 如果 前一个stage的result为null，说明前一个stage还没执行完毕
    if (a == null || (r = a.result) == null || f == null)
        return false; // 前置任务未完成或其他异常情况
    // 执行到这里，说明前一个stage执行完毕
    // 如果this即当前stage的result为null，说当前stage还没执行。
    tryComplete: if (result == null) { // 当前CP的结果为空，一定程度防止了竞争
        if (r instanceof AltResult) { // 如果前一个stage的执行结果为null或者抛出异常
            if ((x = ((AltResult)r).ex) != null) {
             // 如果前一个stage抛出异常，那么直接让当前stage的执行结果也为这个异常，都不用执行Function了
                completeThrowable(x, r);
                break tryComplete;
            }
          // 如果前一个stage的执行结果为null
            r = null; // 那么让r变成null
        }
        try {
          // 1. c为null，这说明c还没有入栈，没有线程竞争。直接执行当前stage即f.apply(s)
            // 2. c不为null，这说明c已经入栈了，有线程竞争执行当前stage。
            if (c != null && !c.claim()) // claim判断任务是否被执行过；
                return false;
            @SuppressWarnings("unchecked") S s = (S) r; // 转换前置任务的结果类型
            completeValue(f.apply(s)); // 调用function函数的apply方法，并将结果封装到CompletableFuture对象中。
        } catch (Throwable ex) {
            completeThrowable(ex);
        }
    }
    // 如果this即当前stage的result不为null，说当前stage已经执行完毕，那么直接返回true
    return true;
}
```

##### 汇总

所以，被封装了回调任务的 `CompletableFuture` 对象应该长这个样子。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000121904.png" alt="image-20250614000121904" style="zoom:50%;" />

`Completion` 对象里面封装的是需要被回调的任务逻辑。但是代表当前阶段的任务又在哪里？

其实，`CompletableFuture` 并不知道当前阶段的任务在哪里，而是返过来通过任务指向代表当前阶段的对象。

`Completion` 对象通过 `dep` 字段，持有代表当前任务阶段的 `CompletableFuture对象`。

所以，完成的调用链可能长这个样子：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000140649.png" alt="image-20250614000140649" style="zoom:50%;" />

#### 如何触发回调任务

前面说过，`Completion` 对象通过 `dep` 指向代表当前阶段的 `CompletableFuture` 对象。但是没有说的是，这个 `CompletableFuture` 对象也可能会有自己的回调链（`stack` 指向的单项链表）。因此，完整的回调结构可能长这个样子的。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000201974.png" alt="image-20250614000201974" style="zoom:50%;" />

我们来看回调是如何被触发的。

`supplyAsync` 的源码中，执行了这样一个方法 `d.postComplete();`，该方法就是触发后续任务的关键。

##### postComplete

```java
final void postComplete() {
    /*
     * f-->当前CP对象，h-->CP对象的stack，t-->stack的next节点
     */
    CompletableFuture<?> f = this; Completion h;
    // 1. 如果当前f的stack不为null，那么短路后面
    // 2. 如果当前f的stack为null，且f是this（f != this不成立），说明整个树形结构已经被遍历完毕，退出循环
    // 3. 如果当前f的stack为null，且f不是this，那么让f恢复为this，再查看this的stack是否为null
    while ((h = f.stack) != null ||
           (f != this && (h = (f = this).stack) != null)) {
        CompletableFuture<?> d; Completion t;
        if (f.casStack(h, t = h.next)) { // 保证postComplete被并发调用时，同一个任务只能被一个线程拿到
            if (t != null) {
                if (f != this) { // 下一阶段CP对象的stack不为空，将stack压入当前CP对象的stack中。防止递归调用过深。
                    pushStack(h);
                    continue;
                }
                h.next = null; // 如果h是有后继的，需要断开h的next指针
            }
          // d-->tryFire的返回值；d不为空时，f被指向d。即h任务所在阶段的CompletableFuture对象
            f = (d = h.tryFire(NESTED)) == null ? this : d;
        }
    }
}
```

触发的过程可以分为一下几部

1. **取下 stack 中的首节点**：首先从当前 `CompletableFuture` 对象(this)中，获取到回调链 `stack`。如果 `stack` 不为空，先获取首节点的引用，然后将 `stack` 通过 CAS 指向 `next`。如果 CAS 更新成功，获取了头结点的执行权限，可以进行下一步。否则重复上述过程，直到成功取下一个节点或没有任务需要执行。
2. **执行节点的任务逻辑**：第一次取得头结点后 `if (f != this)` 显然是不成立的，先不考虑里面包含的逻辑。关注这行代码 ` h.tryFire(NESTED)`。tryFire 方法与前面说的一致，就是执行 Completion 中封装的任务逻辑。如果一切顺利，那么第一个需要被回调的任务就开始执行了。
3. **重新赋值 f**:tryFire 在嵌套调用时，如果 Completion 指向的 CompletableFuture 对象也有需要被回调的任务，那么 tryFire 方法会返回该 CompletableFuture 对象，否则返回 null。因此，`f = (d = h.tryFire(NESTED)) == null ? this : d;` 这句话的作用就是:如果有后续任务，依赖于当前执行的阶段，那么返回代表这个阶段的 CompletableFuture 对象，赋值给 f。否则，f 仍然指向 this。
4. **将递归调用转为循环调用**：当 f 指向了下一阶段的 CompletableFuture 对象后，`if (f != this)` 条件成立，执行 pushStack 方法。该方法把上一步 tryFire 返回的 CompletableFuture 对象的回调任务压入到了自己的 stack 栈中。通过 while 循环，直到所有的任务都被压入后，`f.stack` 的值变为 null。此时，f 被重新指向 this 继续回调后续的任务，直到所有的任务都被触发。这样做是为了将递归调用改为循环调用，防止递归过深。

举个例子：base 的 stack（对象 2、1、0）和它下面那些 dep 中的 stack 执行上顺序正好是相反的，暂且称 base 的 stack 为主 stack 吧，我们来画一张更通用的关系来重点看下 stack：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000224305.png" alt="image-20250614000224305" style="zoom:50%;" />

先执行 base 的栈顶 Completion 2，成功后出栈。然后会检查 Completion 2 中 dep 的 stack，只要没到栈底，则会取出栈顶压入 base 的 stack 中，该图则把 Completion 8、7 分别压到 base 的 stack 中，然后执行栈底的 Completion 6

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000241587.png" alt="image-20250614000241587" style="zoom:50%;" />

重复这个过程，执行 base 的栈顶 Completion 7，由于 Completion 7 的 dep 的 stack 为空，则直接出栈即可。接着 Completion 8 会被执行。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000300041.png" alt="image-20250614000300041" style="zoom:50%;" />

接下来处理 Completion 1 的过程和之前类似。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000318026.png" alt="image-20250614000318026" style="zoom:50%;" />

#### get相关方法

##### get()

对于任何`CompletableFuture`对象，我们都可以调用`get`函数来阻塞获得它的输出。

```java
public T get() throws InterruptedException, ExecutionException {
    Object r;
    // 如果this对象已经执行完成，直接reportGet
    return reportGet((r = result) == null ? waitingGet(true) : r);
}
```

如果`this对象`还没执行完成，则调用`waitingGet`，先自旋，再阻塞。当依赖的stage完成时，再将当前线程唤醒。

###### `waitingGet`

```java
private Object waitingGet(boolean interruptible) {
    Signaller q = null;
    boolean queued = false;
    int spins = -1;
    Object r;
    while ((r = result) == null) {
        if (spins < 0) // 开始自旋
            spins = (Runtime.getRuntime().availableProcessors() > 1) ?
            1 << 8 : 0; // Use brief spin-wait on multiprocessors
        else if (spins > 0) {  // 每次自旋
            if (ThreadLocalRandom.nextSecondarySeed() >= 0)    // 不一定每次自旋都会
                --spins;
        }
        // 如果自旋次数为0
        else if (q == null) // 但还没有生成Signaller
            q = new Signaller(interruptible, 0L, 0L);
        else if (!queued) // 生成了但还没入栈
            queued = tryPushStack(q);
            // 已经入栈了
        else if (interruptible && q.interruptControl < 0) { // 如果支持中断，且当前线程已经被中断
            q.thread = null; // 那么不能再等了，直接返回null
            cleanStack(); // 帮忙依赖的stage，清理stack
            return null;
        }
        else if (q.thread != null && result == null) {
            try {
                ForkJoinPool.managedBlock(q); // 进行阻塞，这里面是也是循环阻塞的过程
            } catch (InterruptedException ie) {
                q.interruptControl = -1;
            }
        }
    }
    // 执行到这里，说明阻塞已唤醒。可能是正常等到了依赖stage执行完，也可能是被中断了
    if (q != null) {
        q.thread = null;
        if (q.interruptControl < 0) { // 被中断了
            if (interruptible) // 如果本次调用支持被中断，那么返回null
                r = null; // report interruption
            else // 如果本次调用不支持被中断，那么只是自我中断一下
                Thread.currentThread().interrupt();
        }
    }
    postComplete(); // 帮忙处理后续任务
    return r;
}
```

###### `managedBlock`

主要通过`ForkJoinPool.managedBlock(q)`进行的阻塞等待。

```java
public static void managedBlock(ManagedBlocker blocker) throws InterruptedException {
    ForkJoinPool p;
    ForkJoinWorkerThread wt;
    Thread t = Thread.currentThread();
    if ((t instanceof ForkJoinWorkerThread) &&
        (p = (wt = (ForkJoinWorkerThread)t).pool) != null) {
        ...
    }
    else { // 只会执行到这里
        do {} while (!blocker.isReleasable() && // 其实block也是在调用 isReleasable
                     !blocker.block());
    }
}
```

可以看到整个执行过程是`while (!blocker.isReleasable() && !blocker.block())`。

```java
static final class Signaller extends Completion implements ForkJoinPool.ManagedBlocker {
    long nanos;                    // wait time if timed
    final long deadline;           // non-zero if timed
    volatile int interruptControl; // > 0: 可中断的, < 0: 已经被中断了
    volatile Thread thread;

    Signaller(boolean interruptible, long nanos, long deadline) {
        this.thread = Thread.currentThread();
        this.interruptControl = interruptible ? 1 : 0;  // 0代表不支持中断
        this.nanos = nanos;
        this.deadline = deadline;
    }
    final CompletableFuture<?> tryFire(int ignore) {
        Thread w; // no need to atomically claim
        if ((w = thread) != null) {
            thread = null;
            LockSupport.unpark(w); // tryFire唤醒即可
        }
        return null;
    }
    // 返回true代表当前线程不需要阻塞了
    public boolean isReleasable() {
        if (thread == null)
            return true;
        if (Thread.interrupted()) {
            int i = interruptControl;
            interruptControl = -1; // 只要被中断，不管之前的值是什么，都置为-1
            if (i > 0) // 如果支持中断，既然支持中断，那么不需要阻塞了
                return true;
        }
        // 虽然发现中断，但此对象不支持中断，那么也需要阻塞。这意味着会一直等到依赖stage执行完成

        if (deadline != 0L &&
            (nanos <= 0L || (nanos = deadline - System.nanoTime()) <= 0L)) {
            thread = null;
            //如果已经超时
            return true;
        }
        // 如果还没有超时，则需要阻塞

        return false;
    }
    public boolean block() {
        if (isReleasable()) // 如果发现不需要阻塞了，那么直接返回
            return true;
        else if (deadline == 0L) // 如果不是超时版本，那么无限阻塞
            LockSupport.park(this);
        else if (nanos > 0L) // 如果是超时版本，那么限时阻塞
            LockSupport.parkNanos(this, nanos);
        // 唤醒后判断是否需要阻塞
        return isReleasable();
    }
    final boolean isLive() { return thread != null; }
}
```

那什么时候唤醒这个线程呢？

完成任务的时候，会走到 `postComplete` 方法：

![image-20250614000353903](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000353903.png)

![image-20250614000405277](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000405277.png)

![image-20250614000417534](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000417534.png)

###### 汇总

- `waitingGet`函数的参数`interruptible`代表获得执行结果的当前线程，可以因为中断而终止阻塞。
- `get`函数返回null有两种情况：

    - 依赖的stage正常执行完，且执行结果为null。
    - 依赖的stage还没执行完，但当前线程被中断了。

##### join()

```java
public T get() throws InterruptedException, ExecutionException {
    Object r;
    return reportGet((r = result) == null ? waitingGet(true) : r);
}
```

`join`方法与get的唯一区别是，`join`不支持中断，所以当前线程唤醒的唯一希望就是依赖的stage执行完毕。

##### 超时get

```java
public T get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
    Object r;
    long nanos = unit.toNanos(timeout);
    return reportGet((r = result) == null ? timedGet(nanos) : r);
}
```

调用的是`timedGet`，整个过程类似。我们只需要知道，超时版本是自带支持中断的功能。

```java
private Object timedGet(long nanos) throws TimeoutException {
    if (Thread.interrupted()) // 超时版本自带被中断的功能
        return null;
    if (nanos <= 0L)  // 不能给无意义的超时时间
        throw new TimeoutException();
    long d = System.nanoTime() + nanos;
    Signaller q = new Signaller(true, nanos, d == 0L ? 1L : d); // 注意第一个参数为true，因为超时版本必定可以中断
    boolean queued = false;
    Object r;
    // 这里没有像waitingGet一样进行自旋，因为限时中断就相当于自旋了
    while ((r = result) == null) {
        if (!queued)
            queued = tryPushStack(q);
            // 1. q已经被中断了 
            // 2. q已经超时了
        else if (q.interruptControl < 0 || q.nanos <= 0L) {
            q.thread = null;
            cleanStack();
            if (q.interruptControl < 0) // 被中断
                return null;
            throw new TimeoutException(); // 已经超时
        }
        else if (q.thread != null && result == null) {
            try {
                ForkJoinPool.managedBlock(q);
            } catch (InterruptedException ie) {
                q.interruptControl = -1;
            }
        }
    }
    if (q.interruptControl < 0) // 被中断了，就返回null
        r = null;
    q.thread = null;
    postComplete();
    return r;
}
```

### 调用与内部执行步骤拆解

常见的链式调用对象关系如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000435696.png" alt="image-20250614000435696" style="zoom:50%;" />

其实每次调用都会 `new` 一个 `Completion` 对象，并压入上一个 `CompletableFuture` 的 `stack` 中。所以，通常的 `base.thenApply(..).thenApply(..)`，每次调用产生的 `Completion` 并不在同一个 `stack` 中哦。

来个复杂一些的：

```java
CompletableFuture<String> base = new CompletableFuture<>();
CompletableFuture<String> future =
    base.thenApply(
        s -> {
            log.info("2");
            return s + " 2";
        });
base.thenAccept(s -> log.info(s+"a")).thenAccept(aVoid -> log.info("b"));
base.thenAccept(s -> log.info(s+"c")).thenAccept(aVoid -> log.info("d"));
base.complete("1");
log.info("base result: {}", base.get());
log.info("future result: {}", future.get());
```

执行到第 7 行后，对象关系如下图：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000454253.png" alt="image-20250614000454253" style="zoom:50%;" />

第 8 行后：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000511038.png" alt="image-20250614000511038" style="zoom:50%;" />

第 9 行后：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250614000528232.png" alt="image-20250614000528232" style="zoom:50%;" />

至此，整个对象关系如同一个执行计划，等待着 base 的 complete 那一刻。

我们再来分解下第 10 行的执行步骤：

1. base.complete("1")后 base 里的 result 属性会变成 1
2. 取 base 中 stack（对象 1）执行，出栈
3. 取对象 1 中 dep 属性的 stack（对象 2）执行，出栈
4. 取 base 中 stack（对象 3）执行，出栈
5. 取对象 3 中 dep 属性的 stack（对象 4）执行，出栈
6. 取 base 中 stack（对象 5）执行，出栈

### 实践总结

#### 线程阻塞问题

代码执行在哪个线程上？

CompletableFuture实现了CompletionStage接口，通过丰富的回调方法，支持各种组合操作，每种组合场景都有同步和异步两种方法。

- 同步方法（即不带Async后缀的方法）有两种情况。

    - 如果注册时被依赖的操作已经执行完成，则直接由当前线程执行。
    - 如果注册时被依赖的操作还未执行完，则由回调线程执行。

- 异步方法（即带Async后缀的方法）

    - 可以选择是否传递线程池参数Executor运行在指定线程池中；
    - 当不传递Executor时，会使用ForkJoinPool中的共用线程池CommonPool（CommonPool的大小是CPU核数-1，如果是IO密集的应用，线程数可能成为瓶颈）。

```java
ExecutorService threadPool1 = new ThreadPoolExecutor(10, 10, 0L, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(100));
CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> {
    System.out.println("supplyAsync 执行线程：" + Thread.currentThread().getName());
    //业务操作
    return "";
}, threadPool1);
//此时，如果future1中的业务操作已经执行完毕并返回，则该thenApply直接由当前main线程执行；否则，将会由执行以上业务操作的threadPool1中的线程执行。
future1.thenApply(value -> {
    System.out.println("thenApply 执行线程：" + Thread.currentThread().getName());
    return value + "1";
});
//使用ForkJoinPool中的共用线程池CommonPool
future1.thenApplyAsync(value -> {
//do something
  return value + "1";
});
//使用指定线程池
future1.thenApplyAsync(value -> {
//do something
  return value + "1";
}, threadPool1);
```

#### 线程池须知

##### 异步回调要传线程池

前面提到，异步回调方法可以选择是否传递线程池参数Executor，这里我们建议**强制传线程池，且根据实际情况做线程池隔离**。

当不传递线程池时，会使用ForkJoinPool中的公共线程池CommonPool，这里所有调用将共用该线程池，核心线程数=处理器数量-1（单核核心线程数为1），所有异步回调都会共用该CommonPool，核心与非核心业务都竞争同一个池中的线程，很容易成为系统瓶颈。手动传递线程池参数可以更方便的调节参数，并且可以给不同的业务分配不同的线程池，以求资源隔离，减少不同业务之间的相互干扰。

##### 线程池循环引用会导致死锁

```java
public Object doGet() {
  ExecutorService threadPool1 = new ThreadPoolExecutor(10, 10, 0L, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(100));
  CompletableFuture cf1 = CompletableFuture.supplyAsync(() -> {
  //do sth
    return CompletableFuture.supplyAsync(() -> {
        System.out.println("child");
        return "child";
      }, threadPool1).join();//子任务
    }, threadPool1);
  return cf1.join();
}
```

如上代码块所示，doGet方法第三行通过supplyAsync向threadPool1请求线程，并且内部子任务又向threadPool1请求线程。threadPool1大小为10，当同一时刻有10个请求到达，则threadPool1被打满，子任务请求线程时进入阻塞队列排队，但是父任务的完成又依赖于子任务，这时由于子任务得不到线程，父任务无法完成。主线程执行cf1.join()进入阻塞状态，并且永远无法恢复。

> 为了修复该问题，需要将父任务与子任务做线程池隔离，两个任务请求不同的线程池，避免循环依赖导致的阻塞。

##### 异步RPC调用注意不要阻塞IO线程池

服务异步化后很多步骤都会依赖于异步RPC调用的结果，这时需要特别注意一点，如果是使用基于NIO（比如Netty）的异步RPC，则返回结果是由IO线程负责设置的，即回调方法由IO线程触发，CompletableFuture同步回调（如thenApply、thenAccept等无Async后缀的方法）如果依赖的异步RPC调用的返回结果，那么这些同步回调将运行在IO线程上，而整个服务只有一个IO线程池，这时需要保证同步回调中不能有阻塞等耗时过长的逻辑，否则在这些逻辑执行完成前，IO线程将一直被占用，影响整个服务的响应。