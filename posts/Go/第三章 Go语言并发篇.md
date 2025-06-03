

# 第三章 Go语言并发篇

##  协程与线程

在 Java 中，若要创建一个线程需要斟酌再三。这是因为**线程是操作系统的资源，它的创建、切换、停止等等都属于操作系统操作，比较“重”** 。

协程看上去和线程类似，但**协程是在用户层面的，它的创建、切换、停止等等由用户操作，更“轻”** 。

线程能充分发挥多核 CPU 的优势，可以做到并行执行多任务。协程则不然，协程是为并发而生的，一个线程上可以跑多个协程。

**Go 语言中的并发是靠协程来实现的。在后端服务器软件开发中，有大量的 IO 密集操作，这正是协程最适合的场景。这也正是 Go 语言更适合高并发场景的原因。**

> 💡 提示： Go 语言的任务调度模型被称为 GPM，我将在下一讲详述GPM模型架构及原理。

## 并发任务的启动

在 Go 语言中启动并发任务非常简单，只需要在相应的语句前面加上 go 即可。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509153339747.png" alt="image-20250509153339747" style="zoom:35%;" />

来看下面这段代码：

```go
func main() {
   // 并发调用testFunc()
   go testFunc()
   time.Sleep(time.Second * 5)
   fmt.Println("程序运行结束")
}
// 并发测试函数
func testFunc() {
   for i := 1; i <= 3; i++ {
      fmt.Printf("第%d次运行\n", i)
      time.Sleep(time.Second)
   }
}
```

程序运行结果为：

> 第 1 次运行
>
> 第 2 次运行
>
> 第 3 次运行
>
> 程序运行结束

为什么 main() 函数中要等待 5 秒呢？

这是因为 testFunc() 函数需要至少 3 秒才能完成，由于 testFunc() 在另一个协程中，并不会影响 main() 函数体中后续代码的执行。因此main() 函数将迅速完成，整个程序便宣告终止了。

**一旦程序终止，所有在 main() 函数中启动的 Goroutine 也会随之终止**，我们便看不到其它协程中的输出了。所以要给 testFunc() 预留足够多的时长，等待它完成执行。这是使用并发时特别需要注意的一点。

### sync 同步包

然而，在实际开发中，我们通常无法确切地得知一个协程的准确执行时长。况且像上述代码中，过长的等待时间将会导致程序运行效率的降低。

Go 语言提供了一种特别方便的方式确保执行协程任务的完整性，它来自 sync 包。

下面的代码演示了它的使用方法：

```go
var goRoutineWait sync.WaitGroup
func main() {
   goRoutineWait.Add(1) // 表示即将开启 1 个 Goroutine
   // 并发调用testFunc()
   go testFunc()
   goRoutineWait.Wait() // 该方法将告知程序在此处等待协程任务的完成
   fmt.Println("程序运行结束")
}
// 并发测试函数
func testFunc() {
   defer goRoutineWait.Done() // 表示协程任务执行完成
   for i := 1; i <= 3; i++ {
      fmt.Printf("第%d次运行\n", i)
      time.Sleep(time.Second)
   }
}
```

运行这段代码，控制台将得到同样的输出，但不会傻傻地等待 5 秒了。

> 💡 提示：
>
> - 从源码中，有一个 `Goroutine` 计数器。
>   - 每次调用 `goRoutineWait.Add()` 方法时，传入的参数便作为累加值使用；
>
> - 调用 `goRoutineWait.Done()` 方法时相当于让计数器自减 1。
>   - 当计数器归 0 时，`goRoutineWait.Wait()` 方法才会结束。

接下来上升一点难度，如果要连续并发两次 testFunc() 任务，该如何修改上述代码呢？

答案是：

```go
var goRoutineWait sync.WaitGroup
func main() {
   // Goroutine计数器增2
   goRoutineWait.Add(2)
   // 第一次并发调用testFunc()
   go testFunc()
   // 第二次并发调用testFunc()
   go testFunc()
   goRoutineWait.Wait()
   fmt.Println("程序运行结束")
}
// 并发测试函数
func testFunc() {
   defer goRoutineWait.Done()
   for i := 1; i <= 3; i++ {
      fmt.Printf("第%d次运行\n", i)
      time.Sleep(time.Second)
   }
}
```

由于并发两次，所以要向 goRoutineWait.Add() 方法传入 2。程序运行结果为：

> 第 1 次运行
>
> 第 1 次运行
>
> 第 2 次运行
>
> 第 2 次运行
>
> 第 3 次运行
>
> 第 3 次运行
>
> 程序运行结束

在 Go 语言中开启 Goroutine，还可以**通过匿名函数的方式，当代码中只发生一次调用时特别方便**。比如：

```go
func main() {
   goRoutineWait.Add(1)
   go func() {
      defer goRoutineWait.Done()
      for i := 1; i <= 3; i++ {
         fmt.Printf("第%d次运行\n", i)
         time.Sleep(time.Second)
      }
   }()
   goRoutineWait.Wait()
   fmt.Println("程序运行结束")
}
```

这段代码依然会输出：

> 第 1 次运行
>
> 第 2 次运行
>
> 第 3 次运行
>
> 程序运行结束

细心的朋友会发现，在 testFunc() 函数体中，**使用 defer 执行 goRoutineWait.Done()。如此是为了保证即使在执行函数体时发生错误，goRoutineWait.Done() 方法也依然会被调用，从而保证main() 函数的正常运行。** 

> Go 中的 `defer` 语句与 Java 中的 `finally` 块在功能上是相似的。它们都用于确保在函数返回之前执行某些清理代码，无论函数是正常结束还是由于发生错误而提前结束。

## Go 并发原理

### 任务调度进化史

#### 串行工作机制

1. **单核心处理器时代**：早期的CPU都是单核心，操作系统按顺序执行单个程序，导致CPU资源利用率低。
2. **性能浪费**：单进程执行时，若进程阻塞，CPU将处于闲置状态，造成资源浪费。
3. **易用性问题**：串行执行方式在现代多任务环境中显得效率低下，无法同时进行多项操作。

#### 多进程并发模式

1. **并发概念**：通过时间片切换实现单个CPU核心上的多任务执行。
2. **操作系统调度**：并发机制由操作系统负责进程的创建、切换和销毁。
3. **资源消耗**：频繁的进程切换会导致资源消耗，虽然CPU占用率高，但实际利用率并不理想。

#### 多线程并行模式

1. **超线程技术**：奔腾4处理器引入超线程技术，使得不同线程可以运行在不同CPU核心上，实现真正意义上的并行。
2. **线程分类**：线程分为内核态线程和用户态线程（协程）。内核态线程由CPU调度，协程由协程调度器调度。
3. **调度结构**：内核空间由内核态线程组成，协程在用户空间中，切换更快、更轻量。

下面这张图展示了上述调度结构：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509154035583.png" alt="image-20250509154035583" style="zoom:40%;" />

> 图中的橙色线条表示绑定关系，其中隐含了协程调度器和协程队列处理器。

然而，单纯的并行模式也并非万金油。如果一个线程承载了全部协程任务，则仍然无法从分利用多核 CPU。在极端情形下，协程任务的阻塞还会引发整个线程的阻塞，后续的任务得不到执行，整个系统便会卡住。另外，当一个线程中只存在一个协程任务时，也并不会带来性能的提升。

看到这，一种更优的解决方案便浮现了出来，这种方案也是 Go 语言能实现高并发的原理。即**将多个协程绑定在多个线程中，同时将多个线程分配给不同的 CPU 核心运行。如此将并发与并行模式相结合，便打造出了较为理想的任务调度机制。**

### GPM 任务调度模型

Go 语言中的 GPM 任务调度模型充分利用了多核 CPU 的资源。需要时，将创建与之匹配的线程，并将用户态的协程任务“智能”地分配给多个线程执行。整体上运用的是并行+并发的模式，具体如下图所示：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509154104820.png" alt="image-20250509154104820" style="zoom:65%;" />

从图中可以看到，整个 GPM 结构分为上下两大部分，我们一起从下往上看，正好对应的是内核空间和用户空间。

首先来看内核空间，这是一颗 4 核心的 CPU（暂时不考虑超线程的情况）。由并行的概念不难得出，4 核心的 CPU 可以由操作系统调度，执行 4 个线程。

**在 Go 程序启动时，会自动根据 CPU 的核心数设置线程的最大数量**。当然，我们也可以通过编码手动设置，稍后会讲到。当一个线程发生阻塞时，新的线程便会创建。图中黄色的线程是一个空闲的线程，它没有绑定任何协程。

再来看用户空间，最上方的全局队列存放所有等待运行的协程任务（即 Goroutine）。下方若干个协程队列，**当发起一个协程任务时，该任务会首先尝试加入到协程队列中。每个协程队列的最大任务数被限制在256个以内**。

当协程队列满了之后，协程调度器会将一半数量的任务移动至全局队列中。至于一共能有多少个协程队列，在 Go 1.5 版本之后**队列数默认为CPU核心数量，也可以通过编码来指定**。

从另一个角度讲，设置了队列数就意味着设置了程序能同时跑多少个 Goroutine 的数量。一般地，在该参数确定后，所有的队列便会一口气创建完成。

在 Go 程序运行时，一个内核空间的线程若想获取某个协程任务来执行，就需要通过协程队列处理来获取特定的协程任务。当队列为空时，全局队列中的若干协程任务，或其它队列中的一半任务会被放到空队列中。如此循环往复，周而复始。

另一方面，**协程队列处理器的数量和线程在数量上并没有绝对关系**。如果一个线程发生阻塞，协程队列处理器便会创建或切换至其它线程。因此，即使只有一个协程队列，也有可能会有多个线程。

### 动态调整系统资源

在 Go 程序运行时，可以根据需要设置程序要使用的 CPU 资源，也可以动态调整协程任务的执行方式，实现更灵活地运行。这些操作都是通过 runtime 包来实现的。

#### 获取和设置 CPU 核心数量

在 Go 语言中，可以随时获取操作系统类型、CPU 架构类型和 CPU 核心数量，下面的示例代码输出了它们：

```go
// 获取运行当前程序的操作系统
fmt.Println(runtime.GOOS)
// 获取运行当前程序的CPU架构
fmt.Println(runtime.GOARCH)
// 获取运行当前程序的CPU核心数量
fmt.Println(runtime.NumCPU())
```

> 在 macOS 中，操作系统名称为darwin；在Windows中，操作系统名称即windows；在Linux中，操作系统名称为linux。

**对于 32 位的 CPU，运行结果为 386；对于 64 位的 CPU，运行结果为 amd64；对于 arm 架构 32 位的 CPU，运行结果为 arm；对于 arm 架构 64 位的 CPU，运行结果为 arm64。**

> 💡 提示：若要获取Go语言支持的所有操作系统和CPU架构，可执行命令行：go tool dist list。

若要设置可用的 CPU 核心数，可以通过 runtime.GOMAXPROCS() 函数实现。需要注意的是：该函数将返回设置之前的核心数。

比如，对于一颗多核心的 CPU，若设置程序只能使用一半数量的核心，代码为：

```go
if runtime.NumCPU() > 2 {
   runtime.GOMAXPROCS(runtime.NumCPU() / 2)
}
// 获取当前程序可用的CPU核心数
fmt.Println(runtime.GOMAXPROCS(0))
```

请留意代码最后，当向 runtime.GOMAXPROCS() 函数传入 0 时，即可实现获取可用核心数。

#### 给其它任务“让行”

在程序运行中，某些特定的情况下需要暂停当前协程，让其它协程任务先执行。首先来看下面这段代码：

```go
func main() {
    go fmt.Println("Hello World")
    fmt.Println("程序运行结束")
}
```

显然，由于输出文本被放在了另一个协程中执行。程序将很快结束，甚至在大多数情况下都不会看到 “Hello World” 输出。

若要想正常看到控制台的输出，一种方法便是使用 sync.Wait() 方法，这一招在上一讲中已经介绍过了。另一种方法还可以使主线程中的任务让出资源，优先执行输出文本。方法如下：

```go
func main() {
   go fmt.Println("Hello World")
   runtime.Gosched()
   fmt.Println("程序运行结束")
}
```

如此，便会看到控制台输出：

> Hello World
>
> 程序运行结束

#### 终止自身协程

在某些条件下，我们还希望立即停止协程任务的执行。方法便是使用调用 `runtime.Goexit()` 函数。下面这段示例代码演示了在满足特定条件时终止协程的方法：

```go
func main() {
    syncWait.Add(1)
    go testFunc()
    syncWait.Wait()
    fmt.Println("程序运行结束")
}
func testFunc() {
    defer syncWait.Done()
    for i := 1; i < 100; i++ {
        fmt.Println(i)
        if i >= 5 {
            runtime.Goexit()
        }
    }
}
```

## 并发中的Channel

在前面的示例中，对待协程任务的态度是“放任自流”的。也就是说，一个协程被开启后，我们便不再管它，让它自生自灭，最多是为其它任务让行或终止运行。但在实际开发中，协程任务之间常常会发生通信。

举例来说，现有协程 A 和协程 B，二者都处于运行状态。协程 B 中的某些逻辑需要协程 A 的执行结果作为输入条件，此时就急需将这些结果数据从协程 A 传递给协程 B 了。

由此便引出一个问题：如何在并发任务之间进行**数据共享**。

### CSP并发模型

纵观编程领域，在多任务之间共享数据的方式主要分为两种。

一种是**多线程任务之间的内存共享**，这种方式的代表是 Java、C++、Python 等语言中的多线程开发，这种方式普遍要通过“锁”来确保数据安全。

另一种便是 Go 语言提倡的 **CSP 模型**方式，这种方式的核心思想在于**以通信的方式共享内存数据**。

这两种数据共享的区别主要在于前者是共享内存实现通信，后者是通过通信共享内存。在 Effective Go 中，谈及并发时有这样一句原文：

> Do not communicate by sharing memory; instead, share memory by communicating.

说的就是这个意思。

> 💡 提示：Go语言并非只允许CSP方式并发，它同样支持传统的多线程任务调度方式。

随着对 Go 并发领会的逐渐深入，使用得越来越频繁，便会遇到使用 Goroutine 的三个“陷阱”：

1. **Goroutine Leaks（协程任务泄露）**
2. **Data Race（数据竞争）**
3. **Incomplete Work（未完成的任务）**

针对上述 1 和 3，规避的方式就是**确保每一个协程任务可以正常结束**。如果一个协程运行失控，便会长期驻留在内存中，导致系统资源的浪费，出现陷阱 1。或者该执行的任务没有完全完成，导致陷阱 3。

> 💡 提示：想想如何终止协程任务，想想协程中的 defer 的使用。

针对上述 2，规避的方式便是**通过传递数据的方式共享数据，而非直接操作某个公共变量**，从而规避数据竞争。

协程任务之间传递数据需要借助通道（Channel）来完成。

### 通道（Channel）类型

从本质上说，**Go 语言中的通道（`Channel`）也是一种类型**，只不过在使用时有些特殊，稍后会详述。

从分类上看，可将其分为两种。**一种是同步通道，另一种是缓冲通道**。

- 同步通道：发送操作和接收操作必须 **同时就绪** 才能完成数据传递。发送方会阻塞直到接收方准备好接收，反之亦然。
  - 有点类似于送外卖的过程。若外卖小哥和点餐顾客分别为 协程 A 和 协程 B，只有当协程 A 把数据（即外卖）送给协程 B（即顾客），协程 B 才能开始执行后续的操作（即吃外卖）。否则，协程 B 只能一直等待数据（即外卖）的到来。

- 缓冲通道则有点类似于送快递的过程。
  - 若快递员和收件人分别为协程 A 和协程 B，协程 A 可以把数据（即快递）放到缓冲区（即菜鸟驿站）。当协程 B 需要时，只要去缓冲区（即菜鸟驿站）中取数据（即快递）即可。
  - 缓冲区和菜鸟驿站真的很像，它们都有最大容量限制。一旦协程 A 发现缓冲区（即菜鸟驿站）满了，就不得不等待数据（即快递）被取走，才能将数据（即快递）放到空余的位置中。

#### 同步通道

**1. 阻塞行为**：

- 发送：若没有接收方，发送操作永久阻塞。
- 接收：若没有发送方，接收操作永久阻塞。

**2. 应用场景**：

- 严格同步协程的执行顺序（如信号通知）。
- 确保数据实时处理，避免数据积压。

> **创建方式**：使用 `make(chan T)` 创建，不指定缓冲区容量。

```go
ch := make(chan int) // 同步通道
```



<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509154624579.png" alt="image-20250509154624579" style="zoom:35%;" />

典型示例如下：

```go
func main() {
    ch := make(chan struct{}) // 同步通道
    go func() {
        fmt.Println("子协程执行完成")
        ch <- struct{}{} // 发送完成信号
    }()
    <-ch // 主协程阻塞等待
    fmt.Println("主协程继续执行")
}
```

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509154645849.png" alt="image-20250509154645849" style="zoom:35%;" />

输出如下：

> 子协程执行完成
>
> 主协程继续执行

#### 缓冲通道

> 缓冲通道：允许在 **缓冲区未满时发送** 和 **缓冲区非空时接收**，解耦发送和接收的时序。

和同步通道不同，带缓冲的通道有点类似于快递员（协程 A）和收件人（协程 B）的关系，在他们之间存在一个快递驿站（缓冲区）。寄送快递时，快递员会默认将快递放到驿站中，收件人可以找个合适的时间去驿站中取快递。当驿站放满快递时，新的快递便无法存入其中，必须等待旧的快递被取走。这个过程描述的便是带缓冲的通道的工作流程。

**1. 阻塞行为**：

- 发送：缓冲区满时阻塞，否则立即完成。
- 接收：缓冲区空时阻塞，否则立即完成。

**2. 应用场景**：

- 平衡生产者和消费者的速度差异（如生产者-消费者模式）。
- 异步处理任务队列，提高吞吐量。

使用 `make(chan T, capacity)` 创建，指定缓冲区容量。

```go
ch := make(chan int, 3) // 缓冲通道，容量为3
```

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509154709565.png" alt="image-20250509154709565" style="zoom:35%;" />

1. 带缓冲区的 `channel`，定义了缓冲区大小，可以存储多个数据;
2. 不带缓冲区的 `channel`，只能存一个数据，并且只有当该数据被取出才能存下一个数据.

典型示例如下：

```go
func main() {
    ch := make(chan int, 2) // 缓冲通道，容量2
    ch <- 1                 // 非阻塞
    ch <- 2                 // 非阻塞
    fmt.Println(<-ch)       // 输出1（非阻塞）
    fmt.Println(<-ch)       // 输出2（非阻塞）
}
```

### 构建安全的通道

在接下来的内容中，我将为大家介绍两个重要的有助于增强通道健壮性的方法，即 通道的关闭 和 单向通道的构建 。

#### 通道的关闭

> **单一职责原则**：由发送方关闭通道，或在多发送者场景下通过协调协程（如 `sync.WaitGroup`）确保所有发送完成后再关闭。

- **关闭信号传递**：关闭通道（`close(ch)`）是通知接收方数据流结束的官方机制，接收方通过 `v, ok := <-ch` 中的 `ok` 值判断通道状态。
- **避免资源泄漏**：未关闭的通道可能导致 `goroutine` 永久阻塞（如 `for range` 循环），及时关闭可释放资源并终止协程。
- **防止数据竞争**：通过协调关闭时机，避免向已关闭通道发送数据引发的 `panic`。

> ❗️ ❗️ ❗️ 注意：通道关闭后，无法再通过它发送数据，但不会影响数据的接收。

#### 单向通道的使用

- **权限分离**：通过声明 `chan<- T`（只写）或 `<-chan T`（只读），明确通道的读写方向，防止误操作。
- **编译期检查**：单向通道在编译时限制非法操作（如向只读通道发送数据），提前暴露逻辑错误。
- **代码可读性**：明确函数参数中通道的用途（如数据源只读、结果通道只写），提升代码可维护性。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250509154737000.png" alt="image-20250509154737000" style="zoom:40%;" />

```go
func ProcessData(in <-chan int, out chan<- int) {
    for v := range in { out <- v * 2 } // in 只读，out 只写
}
```

### channel 特性

- 未初始化的 `channel` 是 nil，但是关闭后的 `channel` 不是 nil
- 直接向一个 nil 的 `channel` 发送或者接收数据都会发生阻塞而导致死锁
- 向一个 nil 的 `channel` 关闭数据会导致 `panic` 
- 向一个已经关闭的 `channel` 中发送数据时，会导致 `panic`，但是从一个已经关闭的 `channel` 中读取数据是允许的，会读取到这个 `channel` 中数据类型的默认值
- 当我们使用 `range` 语句遍历一个 `channel` 时，当 `channel` 关闭时，`range` 语句才会结束执行
- `channel` 中传输数据的大小是有限制的，默认64KB

### Select 结构

> Go语言中的 `select` 是一种用于处理并发通道（Channel）操作的控制结构，其核心功能是监听多个通道的读写事件，并根据就绪状态选择执行对应的逻辑。

`select` 的语法类似于 `switch`，但每个 `case` 必须关联一个通道操作（发送或接收），结构如下：

```go
select {
  case data := <-ch1: // 接收操作
      // 处理从 ch1 收到的数据
  case ch2 <- value:   // 发送操作
      // 向 ch2 发送数据
  default:             
      // 当所有通道未就绪时执行
}
```

- **通道操作**：每个 `case` 对应一个通道的读写，`select` 会阻塞等待直到至少一个 `case` 就绪
- **随机选择**：若多个 `case` 同时就绪，`select` 会随机执行其中一个，确保公平性
- **非阻塞模式**：通过 `default` 分支可实现非阻塞操作，避免程序因无就绪通道而卡死

#### 使用场景

##### 1. **多通道监听（多路复用）**

`select` 最常见的用途是同时监听多个通道，实现并发任务的协调。例如：

```go
ch1 := make(chan string)
ch2 := make(chan string)

select {
  case msg := <-ch1:
      fmt.Println("来自 ch1:", msg)
  case msg := <-ch2:
      fmt.Println("来自 ch2:", msg)
}
```

> **适用场景**：需要同时处理多个数据源（如多个网络请求或协程的结果）时，`select` 能高效选择最先响应的通道

##### 2. **非阻塞通信**

通过 `default` 分支，可以避免通道未就绪时的阻塞：

```go
select {
  case data := <-ch:
      fmt.Println("收到数据:", data)
  default:
      fmt.Println("无数据可用")
}
```

> **作用**：适用于轮询检查通道状态或快速失败逻辑

##### 3. **超时控制**

结合 `time.After` 实现超时机制，防止无限等待：

```go
select {
  case data := <-ch:
      fmt.Println("收到数据:", data)
  case <-time.After(3 * time.Second):
      fmt.Println("超时")
}
```

> **意义**：在需要限制等待时间的场景（如API调用、资源获取）中非常实用

##### 4. **任务取消与优雅退出**

通过监听取消通道（如 `context.Done()`），实现协程的主动终止：

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

select {
  case <-ctx.Done():
      fmt.Println("任务取消")
  case result := <-resultChan:
      fmt.Println("结果:", result)
}
```

> **应用**：用于实现超时自动取消或用户手动中断任务

## context

> `context` 顾名思义，就是上下文，这里特指协程的上下文。

它是 Go 语言在 1.7 版本中引入标准库的接口，用于在 `goroutine` 之间传递上下文信息和控制信号，包括跟踪、取消信号和超时等信息。这些信息可以被多个 `Goroutine` 共享和使用，从而实现协作式的并发处理。

### context 结构

```go
type Context interface {
	// 当 context 被取消或者到了 deadline，返回一个被关闭的 channel
  //它是一个只读的Channel，也就是说在整个生命周期都不会有写入操作，只有当这个channel被关闭时，才会读取到这个channel对应类型的零值，否则是无法读取到任何值的。正式因为这个机制，当子协程从这个channel中读取到零值后可以做一些收尾工作，让子协程尽快退出。
	Done() <-chan struct{}
    
	// 在 channel Done 关闭后，返回 context 取消原因，这里只有两种原因，取消或者超时。
	Err() error
    
	// 返回 context 是否会被取消以及自动取消时间（即 deadline）
  //通过这个时间我们可以判断是否有必要进行接下来的操作，如果剩余时间太短则可以选择不继续执行一些任务，可以节省系统资源。
	Deadline() (deadline time.Time, ok bool)

	// 获取 key 对应的 value
	Value(key interface{}) interface{}
}
```

### context 使用场景

在实际开发中，我们经常会遇到需要在多个 `Goroutine` 之间传递请求作用域的上下文的情况，主要包含下面这3种情况：

- 信息传递

跨越多个 `Goroutine` 处理一个请求时，需要将请求上下文传递到每个 `Goroutine` 中，比如我们可以将请求的 ID ，用户身份等信息传递给处理这个请求的多个 `Goroutine` 中。

- 取消任务

当某个 `Goroutine` 需要取消请求时，需要通知其他 `Goroutine` 停止处理。比如当上层任务取消或超时时，可以通知下层任务及时退出，避免资源浪费或泄露。

- 超时控制

当某个 `Goroutine` 超时时，需要通知其他 `Goroutine` 停止处理。比如可以为每个任务设定一个截止时间，一旦达到截止时间之后，任务会被自动取消。

### context 用法

下面是一个是同 `context` 传递 `request_id` 并进行超时控制的示例：

```go
package main

import (
	"context"
	"fmt"
	"time"
)

// 模拟耗时操作，支持request_id传递和超时控制
func slowOperation(ctx context.Context) (string, error) {
	// 获取request_id
	fmt.Println("get request_id from ctx", ctx.Value("request_id"))

	// 使用一个 select 语句来监听 context 的状态变化
	select {
	case <-time.After(3 * time.Second): // 模拟操作需要 3 秒钟才能完成
		return "Done", nil
	case <-ctx.Done(): // 如果 context 被取消或者超时，返回相应的错误信息
		return "", ctx.Err()
	}
}

func main() {
	requestID := uuid.New().String()
	ctr := context.Background()
	//传递request_id
	ctr = context.WithValue(r.Context(), "request_id", requestID)

	// 从请求中获取 context，并设置一个 1 秒钟的超时时间
	ctx, cancel := context.WithTimeout(ctr, 1*time.Second)
	defer cancel() // 在函数返回时调用取消函数
  
  // 调用耗时的操作，并传递 context
	result, err := slowOperation(ctx)
  
  // 等待查看结果（实际项目不需要这个sleep）
	time.Sleep(4 * time.Second)
}
```

### 关于 context 使用建议

- 在函数签名中传递 `context` 参数，而不是作为结构体字段或者全局变量。

```go
type MyStruct struct {
    // 不要在这里存储context
}

func (m *MyStruct) myMethod(ctx context.Context, arg1 string, arg2 int) error {
    // 使用ctx传递请求上下文
}
```

- 将 `context` 作为第一个参数传递

将 `context` 作为第一个参数传递可以让代码更加清晰和易于理解，同时也可以避免误用 `context`。

- 不要在内层函数创建 `context`

不要在被调用的函数内部创建 `context`，因为这样会导致 `context` 的使用范围不明确，容易导致 `context` 的误用和泄漏。应该在函数调用的上层函数中创建 `context`。

>  比如存在以下调用关系:
>
> `f1()` 调用了 `f2()` ，`f2()` 调用了 `f3()`
>
> `f1()` -> `f2()` -> `f3()`
>
> 我们应该在 `f1()` 中创建 `context`，让整个调用链都传递 `context`。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/context1.png" alt="context1" style="zoom:65%;" />

- 及时取消 `context`

在不需要继续处理请求时，应该及时取消 `context`。这样可以避免资源的浪费，同时也可以避免因为无法及时释放资源而导致的内存泄漏。

```go
package main

import (
	"context"
	"time"
)

func main() {
	parentCtx := context.Background()
	ctx, cancel := context.WithTimeout(parentCtx, time.Second*5)
	defer cancel()
	// 在函数中检查ctx.Done()来判断是否需要取消
	if err := longRunningFunction(ctx, "param1", 123); err != nil {
		// 如果发生错误，调用cancel()来取消请求
		cancel()
	}
}

func longRunningFunction(ctx context.Context, arg1 string, arg2 int) error {
	select {
	case <-time.After(time.Second * 5):
		// 执行操作
	case <-ctx.Done():
		// 返回错误,取消请求
		return ctx.Err()
	}
	return nil
}
```

- 不要在 `context` 中存储大量数据

`context` 主要用于传递请求范围内的数据，但不应该用于存储大量的数据。`context` 应该只存储必要的数据，比如请求 ID、用户 ID 或者其他必要的元数据。

此外，`context` 中存储的数据可能会被传递到其他地方，或者直接作为日志输出，因此不建议在 `context` 中存储敏感数据，例如密码、密钥等。

- 不要滥用 `context`

`context` 应该只在当前请求范围内使用，不应该在全局范围内使用。如果你需要在多个请求之间共享数据，应该考虑使用其他机制，例如全局变量或者数据库。

## 定时器

Go 语言中的定时器分为两种，一个是用于延迟执行的 Timer，另一个是周期性反复执行的 Ticker。它们都已经内置在 Go SDK 中的 time 包，我们先从 Timer 开始。

### Timer

若要使用 Timer，实现预约任务，要借助 time 包中的 Timer 类型，该类型的变量通过 time.NewTimer() 函数返回。

从 Go 源码角度看，Timer 是一个结构体类型，其定义如下：

```go
type Timer struct {
    C <-chan Time
    r runtimeTimer
}
```

注意那个名为 C 的单向通道，它是一个只能读取的单向通道，通道内传送的数据类型是Time类型。

在实际使用时，先调用 time.NewTimer() 函数给定预约时间长度，然后从 C 中接收数据。接收数据消耗的时长就是之前给定的时长。下面我们来看一个示例：

> 现有一款网络下载软件，假定现在要实现一个预约下载功能，要求使用 time 包，该怎样逐步完成呢？

首先需要调用 time.NewTimer() 函数，并将其返回值赋给某个变量，代码如下：

```go
downloadTimer := time.NewTimer(time.Second * 2)
```

该延迟将执行下载任务，因此将变量命名为 downloadTimer。为了节省测试时间，暂且将延迟时间设为 2 秒。

然后，从 downloadTimer 中接收值。一旦接收值的操作开始，计时也会随之开始。代码如下：

```go
<-downloadTimer.C
```

这里将接收到 Time 类型的值，单纯的延迟执行无需关注该值，只要能成功接收到，便表示时间到了。

再然后便是要执行的具体任务了，此处输出一些文字，表示调度下载任务开始。

最后，即使在任务执行期间发生宕机，也要确保预约定时器能够顺利退出，我们使用断言（defer）停止定时器。

上述步骤完整代码如下：

```go
func main() {
   downloadTimer := time.NewTimer(time.Second * 2)
   defer downloadTimer.Stop()
   <-downloadTimer.C
   fmt.Println("开始下载")
}
```

运行这段代码，控制台一上来不会有任何输出。稍候 2 秒，可以看到“开始下载”字样。

> ```
> ❗️ 注意：预约定时器是一次性的。示例中只能从 downloadTimer 通道接收一次值，若多次接收则会引发宕机。若要重复使用 downloadTimer，可调用 downloadTimer.Reset() 函数，并传入时长。
> ```

### Ticker

Ticker是 Go 封装的另一种类型的定时器，就像 Mac 中的系统监视器或 Windows 中的任务管理器中的 CPU 使用率，默认会每隔几秒钟刷新一次。Ticker 在应对这样的需求非常好用且易于实现。

在 Go 语言中使用 Ticker 与使用 Timer 非常相似，区别在于 Timer 是一次性的，Ticker 是可以反复接收值的。请大家结合下面的代码理解：

```go
func main() {
   cpuUsageTicker := time.NewTicker(time.Second * 1)
   defer cpuUsageTicker.Stop()
   for {
      <-cpuUsageTicker.C
      fmt.Println("获取实时CPU使用率")
   }
}
```

这段代码模拟了获取 CPU 使用量的需求，运行这段代码后，控制台将每隔 1 秒钟输出一次“获取实时CPU使用率”。当然，最后不要忘了使用断言确保定时器的正常关闭。

> 💡 提示：无论 Timer 还是 Ticker，调用 stop() 方法会立即停止数据的发送，但很可能都不会立即关闭通道。这是为了保证正常接收而设计的，不过别担心，Go 程序会在合适的时机自动关闭通道。

## 锁

我们不妨看看下面这段代码：

```go
var testInt = 0
var syncWait sync.WaitGroup
func main() {
   syncWait.Add(2)
   go testFunc()
   go testFunc()
   syncWait.Wait()
   fmt.Println(testInt)
}
func testFunc() {
   defer syncWait.Done()
   for i := 0; i < 1000; i++ {
      testInt += 1
   }
}
```

这段代码理解起来并不难。main() 函数中开启了两个相同的协程任务，具体内容是对公共变量 testInt 进行自增 1 操作。每个协程任务都会自增 1000 次，两个任务并发，理应自增 2000 次，最终输出 testInt 的值应该是 2000。

不信你试试看，反复运行程序，果不其然还真有不是 2000 的时候。最为奇怪的是，计算结果居然还会有变化！这是为何呢？

其实，这就是并发“不安全”的体现了。由于 testInt 是公共变量，两个任务同时对其操作，导致**数据竞争**，计算出错误的结果。

### 互斥锁

互斥锁是 Go 语言中最为简单粗暴的锁，所以我们先从它学起。

从前文中的示例可以看出，发生不安全并发的根源在于公共变量 testInt，所以我们只需恰当地将其保护起来就行了。之所以说互斥锁简单粗暴，就是因为被它加锁的代码一旦运行，就必须等待其结束后才能再次运行。

它的使用方法也很简单粗暴，我们对上述示例代码稍加修改即可实现互斥锁保护了：

```go
var testInt = 0
var syncWait sync.WaitGroup
var locker sync.Mutex
func main() {
   syncWait.Add(2)
   go testFunc()
   go testFunc()
   syncWait.Wait()
   fmt.Println(testInt)
}
func testFunc() {
    defer syncWait.Done()
    defer locker.Unlock()
    locker.Lock()
    for i := 0; i < 1000; i++ {
       testInt += 1
    }
}
```

大家可以看到，locker 是一开头就声明了的 sync.Mutex 类型变量，locker.Lock() 是加锁，locker.Unlock() 是解锁。在 testFunc() 函数中，一上来便执行了加锁操作，互斥锁“锁住”的代码是自增 1000 的逻辑。最后，为了确保后续代码顺利执行，使用断言执行解锁操作。

如此修改后，反复运行这段代码，控制台将始终输出 2000。

到此，计算结果总算是正确了。但大家想一想，如此加锁后，并发和串行执行似乎没什么区别。因为虽然并发了任务，但任务中的下次计算必须等上次计算完成后才能开始，这和串行执行任务并没有本质不同。有没有什么办法既能发挥并发优势，又能确保数据安全呢？当然有，那就是使用读写互斥锁。

### 读写互斥锁

想象一下，假如有一段庆祝生日的视频，大概 5GB 左右，现在要把它上传到百度网盘和阿里云盘中。假如同时开始上传任务，会有一方处于等待状态吗？显然，这通常是不会的。受整体带宽限制，虽然每个网盘上传的速度都变慢了，但上传还是会同时进行的。

再想象一下，当我们用网页和手机同时登录网银，同时查询账户余额时。作为服务器端，无需关心它们的顺序，只要将正确的返回值给到网页和手机客户端就行了。因为查询操作并不会改变金额，账户始终是安全的。

从上面两个例子中可以初步归纳出一个结论：**只要共享的数据不发生改变，几乎不会用到锁。反之，如果强行对“读操作”加锁，反而会影响性能**。

据此规律，我们可以用 **“读写互斥锁”充分发挥并发优势，只在写操作上串行，保证数据安全**。

具体说来，读写互斥锁的运行机制是这样的：

- 当协程任务获得读操作锁后，读操作并发运行，写操作等待；
- 当协程任务获得写操作锁后，考虑到数据可能发生变化，所以无论是读还是写操作都要等待。

使用读写互斥锁和使用简单的互斥锁很类似，不同的是**需要声明 sync.Mutex 类型变量。写操作的方法依然 locker.Lock() 是加锁，locker.Unlock() 是解锁。读操作的方法则是 locker.RLock() 和 locker.RUnlock()。**

下面用实际的代码示例来演示上述运行逻辑，以下代码模拟了读写文件的过程：

```go
var syncWait sync.WaitGroup
var locker sync.RWMutex
func main() {
   syncWait.Add(3)
   go read5Sec()
   time.Sleep(time.Millisecond * 500)
   go read3Sec()
   go read1Sec()
   syncWait.Wait()
   fmt.Println("程序运行结束", time.Now().Format("15:04:05"))
}
func read5Sec() {
   defer syncWait.Done()
   defer locker.RUnlock()
   locker.RLock()
   fmt.Println("读文件耗时5秒 开始", time.Now().Format("15:04:05"))
   time.Sleep(time.Second * 5)
   fmt.Println("读文件耗时5秒 结束", time.Now().Format("15:04:05"))
}
func read3Sec() {
   defer syncWait.Done()
   defer locker.RUnlock()
   locker.RLock()
   fmt.Println("读文件耗时3秒 开始", time.Now().Format("15:04:05"))
   time.Sleep(time.Second * 3)
   fmt.Println("读文件耗时3秒 结束", time.Now().Format("15:04:05"))
}
func read1Sec() {
   defer syncWait.Done()
   defer locker.RUnlock()
   locker.RLock()
   fmt.Println("读文件耗时1秒 开始", time.Now().Format("15:04:05"))
   time.Sleep(time.Second * 1)
   fmt.Println("读文件耗时1秒 结束", time.Now().Format("15:04:05"))
}
```

可以看到，read1Sec()、read3Sec() 和 read5Sec() 函数分别模拟了读文件的操作，所需时长分别是 1、3、5 秒。这 3 个函数中，都使用了读写互斥锁对等待时间进行了读操作的加锁和解锁。在 main() 函数中通过协程的方式首先启动了耗时 5 秒的任务，在 0.5 秒后，同时启动了剩余的 2 个任务。

程序运行后，可在控制台看到如下输出：

> 读文件耗时5秒 开始 10:42:25
>
> 读文件耗时1秒 开始 10:42:26
>
> 读文件耗时3秒 开始 10:42:26
>
> 读文件耗时1秒 结束 10:42:27
>
> 读文件耗时3秒 结束 10:42:29
>
> 读文件耗时5秒 结束 10:42:30
>
> 程序运行结束 10:42:30

显然，3个读操作的协程任务同时运行，实现了真正的并发。

> 💡 提示：上述代码中的 “15:04:05” 是为了格式化时间用的。Go  语言语法要求必须传入 2006 年1 月 2 日 15 时 04 分 05 秒 -0700 时区这个时间点（Go 语言的诞生时间）才能正常被格式化，并不是大多数编程语言中的 YMD HMS 格式。

接下来添加写操作协程，并修改 main() 函数，具体如下：

```go
func main() {
    syncWait.Add(6)
    go write1Sec()
    time.Sleep(time.Second * 1)
    go read5Sec()
    time.Sleep(time.Second * 2)
    go read3Sec()
    time.Sleep(time.Millisecond * 500)
    go write3Sec()
    time.Sleep(time.Millisecond * 500)
    go read1Sec()
    go write5Sec()
    syncWait.Wait()
    fmt.Println("程序运行结束", time.Now().Format("15:04:05"))
}
func write5Sec() {
   defer syncWait.Done()
   defer locker.Unlock()
   locker.Lock()
   fmt.Println("写文件耗时5秒 开始", time.Now().Format("15:04:05"))
   time.Sleep(time.Second * 5)
   fmt.Println("写文件耗时5秒 结束", time.Now().Format("15:04:05"))
}
func write3Sec() {
   defer syncWait.Done()
   defer locker.Unlock()
   locker.Lock()
   fmt.Println("写文件耗时3秒 开始", time.Now().Format("15:04:05"))
   time.Sleep(time.Second * 3)
   fmt.Println("写文件耗时3秒 结束", time.Now().Format("15:04:05"))
}
func write1Sec() {
   defer syncWait.Done()
   defer locker.Unlock()
   locker.Lock()
   fmt.Println("写文件耗时1秒 开始", time.Now().Format("15:04:05"))
   time.Sleep(time.Second * 1)
   fmt.Println("写文件耗时1秒 结束", time.Now().Format("15:04:05"))
}
```

上述代码包含 3 个模拟写文件任务的函数，分别耗时 1、3、5 秒完成。此外，还包含了对 main() 函数的修改。

我们重点关注 main() 函数。程序启动后，首先开启了耗时 1 秒（10:51:35）的写文件任务。根据读写互斥锁的运行规律，**当协程任务获得写操作锁后，考虑到数据可能发生变化，无论是读还是写操作都要等待**。

所以即使在 0.5 秒时启动了读文件的任务，也会等待到写文件完成才能干活。1 秒后（10:51:36），写文件任务完成，读文件操作开始并发执行。在这些操作开始后的 2.5 秒（大约10:51:40）时，写文件任务加入。

此时，**由于协程任务获得读操作锁，读操作可以并发运行，写操作必须等待。** 所以此时的写文件任务还要再等待 2.5 秒才能得到执行。2.5 秒后（10:51:41）读文件任务完成，写文件任务开始执行。

照此规律，此后 0.5 秒（大约10:51:42）时，又加入了读文件任务。这次的读文件需要等待写文件任务完成（10:51:44）后才能执行。随着此次读文件任务的开启，写文件任务也会同时开启。但由于读写之间互斥，只能等待其中一方运行结束后才能开始另一方的执行。

程序运行后，控制台将输出：

> 写文件耗时1秒 开始 10:51:35
>
> 写文件耗时1秒 结束 10:51:36
>
> 读文件耗时5秒 开始 10:51:36
>
> 读文件耗时3秒 开始 10:51:37
>
> 读文件耗时3秒 结束 10:51:40
>
> 读文件耗时5秒 结束 10:51:41
>
> 写文件耗时3秒 开始 10:51:41
>
> 写文件耗时3秒 结束 10:51:44
>
> 读文件耗时1秒 开始 10:51:44
>
> 读文件耗时1秒 结束 10:51:45
>
> 写文件耗时5秒 开始 10:51:45
>
> 写文件耗时5秒 结束 10:51:50
>
> 程序运行结束 10:51:50

简单对比，使用读写互斥锁运行上述任务，总耗时 15 秒。但如果使用简单的互斥锁，所有任务都会串行工作，没有任何并发优势（尽管使用了并发），耗时将长达 18 秒。

>❗️ 注意：在使用锁或读写互斥锁时，一定要注意避免出现 A 等 B ，B 等 C，C 等 A 的情况。如此无限循环也会导致程序进入无限的循环等待中。

## 原子操作

**所谓“原子操作”，简单理解就是指那些进行过程中不能被打断的操作**。比如本讲一上来的示例中，对 testInt 的并发 2 次循环累加就可以使用原子操作来避免结果不准的问题。当然，原子操作也会使 2 次任务串行化，无法发挥并发的优势。但原子操作是无锁的，往往直接通过 CPU 指令直接实现，某些同步技术的实现恰恰基于原子操作。

Go 语言中的原子操作通过 sync/atomic 包实现，具体特性如下：

- 原子操作**都是非入侵式**的；
- 原子操作共有五种：**增减、比较并交换、载入、存储、交换**；
- 原子操作支持的类型类型包括 **int32、int64、uint32、uint64、uintptr、unsafe.Pointer**（在本讲末尾会有详细的附录列举）。

原子操作使用起来并不难，我们直接上代码。

下面的代码演示了使用原子操作实现对 testInt 的 2 次累加：

```go
var testInt int32 = 0
var syncWait sync.WaitGroup
func main() {
   syncWait.Add(2)
   go testFunc()
   go testFunc()
   syncWait.Wait()
   fmt.Println(testInt)
}
func testFunc() {
   defer syncWait.Done()
   for i := 0; i < 1000; i++ {
      atomic.AddInt32(&testInt, 1)
   }
}
```

控制台会输出 2000。

实际上，原子操作不仅实现起来更方便，**性能也比锁更快**。感兴趣的朋友可以适当做压力测试，对比加锁和原子操作针对相同任务的耗时时长。
