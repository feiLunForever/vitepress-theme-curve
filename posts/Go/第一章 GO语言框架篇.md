

# 第一章 GO语言框架篇

## http server

### 启动 http server的执行过程

在 Golang 中我们可以很方便的启动一个 `http server`：

```go
package main

import (
	"fmt"
	"net/http"
)

func main() {
		mux := http.NewServeMux()
    mux.HandleFunc("/", func(resp http.ResponseWriter, request *http.Request) {
      fmt.Fprintf(resp, "root")
    })
    mux.HandleFunc("/test", func(resp http.ResponseWriter, request *http.Request) {
      fmt.Fprintf(resp, "test")
    })
    err := http.ListenAndServe(":8888", mux)
    if err != nil {
      fmt.Println(err)
    }
}
```

启动http server主要包括以下几个步骤：

1. 创建 http server 对象

在golang中，我们可以通过调用 `http.NewServeMux()` 函数创建一个http server对象。这个对象我们称为 `http` 请求的多路复用器，它用于注册路由和中间件。

2. 注册路由和中间件

注册路由和中间件是启动 http server 的关键步骤。我们可以通过调用 `http.HandleFunc()` 或 `http.Handle()` 函数来注册路由和中间件。

- `http.HandleFunc()`函数用于注册路由
- `http.Handle()`函数用于注册中间件

一旦 http server 启动成功，它就会开始监听来自客户端的HTTP请求。当客户端发送请求时，http server 会根据请求的 URL 路径和 HTTP 方法选择相应的路由或中间件来处理请求。路由或中间件可以执行一系列操作，比如处理请求参数、读取请求体、根据请求方法和参数执行相应的业务处理最终对客户端进行响应将处理结果返回给客户端。

3. 启动 http 服务器，传入监听地址和多路复用器

在完成路由和中间件的注册之后，我们需要调用 `http.ListenAndServe()` 函数来启动 http server。

> 该函数会监听指定的网络地址和端口，并在接收到请求时调用相应的路由或中间件。

- 这里 `ListenAndServe` 的第一个参数是监听的地址，当然这个地址是包含端口的。

  - 如果我们希望监听本地全部网卡的指定端口，我们可以直接省略前面的主机或者 ip，直接使用上面代码中的方式来指定端口即可。

  - 如果我们我们希望监听指定网卡的端口，则可以直接指定 ip 即可。
    - 比如我们如果只想监听本地回环地址，则我们这样指定：`http.ListenAndServe("127.0.0.1:8888", mux)`

- 第二个参数是一个 `Handler` 类型，`Handler` 是一个接口类型。

我们可以在源码中看到它的定义：

> 源码地址：$GOROOT/src/net/http/server.go

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

这个接口只有一个方法：ServeHTTP，这里我们传入的是一个 http 请求的多路复用器，它是 `*ServeMux` 类型，`ServeMux` 是一个接口体类型，我们可以看到它在源码中的定义：我们可以看到它在源码中的定义：

> 源码地址：$GOROOT/src/net/http/server.go

```go
type ServeMux struct {
	mu    sync.RWMutex
	m     map[string]muxEntry
	es    []muxEntry // slice of entries sorted from longest to shortest.
	hosts bool       // whether any patterns contain hostnames
}
```

而 `ServeMux` 是实现了 `ServeHTTP` 方法的：

> 源码地址：$GOROOT/src/net/http/server.go

```go
func (mux *ServeMux) ServeHTTP(w ResponseWriter, r *Request) {
	if r.RequestURI == "*" {
		if r.ProtoAtLeast(1, 1) {
			w.Header().Set("Connection", "close")
		}
		w.WriteHeader(StatusBadRequest)
		return
	}
	h, _ := mux.Handler(r)
	h.ServeHTTP(w, r)
}
```

所以整个过程就很容易理解了，我们先创建一个 http 请求的多路复用器，然后通过它指定路由或中间件，最终将其传入到 `ListenAndServe` 函数中即可启动一个 http server.

`ListenAndServe` 的底层实现其实是初始化了一个 `server` 对象，然后调用了 `net.Listen(“tcp”, addr)` ，也就是底层用 `TCP` 协议搭建了一个服务，然后监听我们传入的端口。

上面的 http server 对象我们也可以使用 http 包中内置的 `DefaultServeMux` ，则上面的代码可以进一步简化：

```go
package main

import (
	"fmt"
	"net/http"
)

func main() {
		http.HandleFunc("/", func(resp http.ResponseWriter, request *http.Request) {
		fmt.Fprintf(resp, "root")
	})

	http.HandleFunc("/test", func(resp http.ResponseWriter, request *http.Request) {
		fmt.Fprintf(resp, "test")
	})

	err := http.ListenAndServe(":8888", nil)
	if err != nil {
		fmt.Println(err)
	}
}
```

上面的代码中，我们直接使用了 `http.HandleFunc()` 来注册路由，并且在调用 `ListenAndServe` 时，我们传入的 `handler` 是nil。

其实如果我们看过源码就知道，直接使用 `http.HandleFunc()` 来注册路由时，其实在内部实现中 http 包内会使用一个默认的 http 请求的多路复用器`DefaultServeMux` ，这个多路复用器是作为 http 包中的全局变量提前定义好的，我们在调用 http 包中的 `HandleFunc` 函数时，实际上是使用`DefaultServeMux` 来调用 `HandleFunc` 方法的。

## cron 定时任务

### 注册定时任务

golang 第三方包中也提供了周期性任务的能力，比如 `github.com/robfig/cron` 来实现，有两种用法：

1. 可以使用 cron 库的 `AddFunc` 方法来创建一个定时任务。
   - 该方法接受两个参数：**时间表达式** 和 **任务函数**。时间表达式是一个字符串，用于表示定时任务的执行时间。任务函数是一个无参无返回值的函数，用于表示定时任务的具体操作；
2. 可以使用 cron 库的 `AddJob` 方法来创建一个定时任务。
   - 这个方法同样接收两个参数：**时间表达式** 和 一个 **Job的接口** 的实现，这个接口类型定义了一个 `Run` 方法。并且支持我们我们对当前任务做一些设置，比如异常后可以 `Recover` 或者设置使用的日志。当执行 `start` 后，到了执行时间便会执行我们定义的 `Run` 方法；
   - 需要注意的是，设置好时间表达式和任务后，我们需要调用 `Start()` 方法来启动任务。也可以在调度过程中使用 `Stop()` 方法停止或者 `Remove()` 方法来移除任务。

### 提前设置时区

> 在使用定时任务过程中需要注意：不要忽略对时区的设置。

设置时区的方式也有两种：

1. 通过调用 `time.LoadLocation` 加载环境变量或者操作操作系统 或者 go 内置的包或文件中加载指定时区;

```go
 loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		fmt.Println("load location error:", err)
		return
	}
```

2. 直接创建一个东八区的时间

```go
loc := time.FixedZone("CST", 8*3600)
```

在 `cron.New` 时通过 `cron.WithLocation` 传入我们设置好的时区即可。

```go
c := cron.New(cron.WithLocation(loc), cron.WithSeconds())
```

### 时间表达式

`cron` 表达式占位符可以有5个也可以有6个，取决于在 `cron.New` 时是否使用 `cron.WithSeconds()` 配置

1. 当使用 `cron.WithSeconds()` 配置时，`cron` 表达式占位符有5个， 从左到右依次表示分，时，日，月，周

2. 当不使用 `cron.WithSeconds()` 配置时，`cron` 表达式占位符有6个，从左到右依次表示秒，分，时，日，月，周

3. 当 `cron` 表达式占位符为`*`号则表示每隔这个时间就会执行一次

   比如：

- `* * * * *`：表示每分钟执行一次任务。
- `0 * * * *`：表示每小时执行一次任务。
- `0 0 * * *`：表示每天午夜执行一次任务。
- `0 0 * * 1`：表示每周一午夜执行一次任务。
- `0 0 1 * *`：表示每月第一天午夜执行一次任务

### 查看任务

要查看或删除已有的定时任务，可以使用 `cron` 对象的以下方法：

- `Entries` 方法，返回一个 `Entry` 数组，每个 `Entry` 代表一个定时任务，包含了任务的ID、下次执行时间、上次执行时间、执行周期和执行函数等信息 ；

```go
	// 查看所有的定时任务
	for _, e := range c.Entries() {
		fmt.Printf("ID: %d, Next: %v, Prev: %v, Schedule: %v\n", e.ID, e.Next, e.Prev, e.Schedule)
	}
```

- `Entry` 方法，接受一个 `EntryID` 参数，返回对应的 `Entry` 对象，如果不存在则返回 nil ;

```go
	e := c.Entry(id1)
	fmt.Printf("ID: %d, Next: %v, Prev: %v, Schedule: %v\n", e.ID, e.Next, e.Prev, e.Schedule)
```

- `Remove` 方法，接受一个 `EntryID` 参数，删除对应的定时任务，如果不存在则不做任何操作 。

```go
c.Remove(id3)
```

我们通过下面的实例来理解：

```go
package main

import (
	"fmt"
	"github.com/robfig/cron/v3"
	"log"
	"time"
)

func main() {

	//设置时区
	//通过加载环境变量或者操作操作系统或者go内置的包或文件中加载指定时区
	//loc, err := time.LoadLocation("Asia/Shanghai")
	//if err != nil {
	//	fmt.Println("load location error:", err)
	//	return
	//}

	// 创建东八区时区
	loc := time.FixedZone("CST", 8*3600)

	fmt.Println(time.Now().In(loc))
	fmt.Println(time.Now().In(time.UTC))

	// 创建一个cron对象，WithLocation设置时区，WithSeconds秒级别支持
	c := cron.New(cron.WithLocation(loc), cron.WithSeconds())

	//注意：cron表达式占位符可以有5个也可以有6个，取决于在cron.New时是否使用cron.WithSeconds()配置
	//当使用cron.WithSeconds()配置时，cron表达式占位符有5个，   从左到右依次表示分，时，日，月，周
	//当不使用cron.WithSeconds()配置时，cron表达式占位符有6个，从左到右依次表示秒，分，时，日，月，周

	//当cron表达式占位符为*号则表示每隔这个时间就会执行一次
	//比如：
	//	- * * * * *：每分钟执行一次任务。
	//	- 0 * * * *：每小时执行一次任务。
	//	- 0 0 * * *：每天午夜执行一次任务。
	//	- 0 0 * * 1：每周一午夜执行一次任务。
	//	- 0 0 1 * *：每月第一天午夜执行一次任务。

	// 添加一个每分钟执行一次的任务
	id1, err := c.AddFunc("* * * * *", func() {
		fmt.Println(time.Now().Format(time.DateTime), "id1 run every minutes")
	})
	if err != nil {
		log.Println("id1", err)
	}
	// 添加一个每秒钟执行一次的任务
	id2, err := c.AddFunc("* * * * * *", func() {
		fmt.Println(time.Now().Format(time.DateTime), "id2 run every seconds")
	})
	if err != nil {
		log.Println("id2", err)
	}

	job := myJob{}
	job.name = "id3"
	// 添加一个每小时执行一次的任务
	id3, err := c.AddJob("0 * * * *", cron.NewChain(cron.Recover(cron.DefaultLogger)).Then(job))
	if err != nil {
		log.Println("id3", err)
	}

	//这个规则看上去简单，在实际使用过程中却很容易踩坑
	//下面这个任务是每天凌晨2点执行吗？
	job.name = "id4"
	_, err = c.AddJob("* * 22 * * *", cron.NewChain(cron.Recover(cron.DefaultLogger)).Then(job))
	if err != nil {
		log.Println("id4", err)
	}
	//其实并不是，它表示从2点开始，每秒都执行，如果我们希望只在2点执行一次，则需要将秒和分钟设置成具体的时间
	job.name = "id5"
	_, err = c.AddJob("0 0 2 * * *", cron.NewChain(cron.Recover(cron.DefaultLogger)).Then(&myJob{}))
	if err != nil {
		log.Println("id5", err)
	}
	// 启动定时任务
	c.Start()

	// 查看所有的定时任务
	for _, e := range c.Entries() {
		fmt.Printf("ID: %d, Next: %v, Prev: %v, Schedule: %v\n", e.ID, e.Next, e.Prev, e.Schedule)
	}

	// 查看指定的定时任务
	e := c.Entry(id1)
	fmt.Printf("ID: %d, Next: %v, Prev: %v, Schedule: %v\n", e.ID, e.Next, e.Prev, e.Schedule)

	e = c.Entry(id2)
	fmt.Printf("ID: %d, Next: %v, Prev: %v, Schedule: %v\n", e.ID, e.Next, e.Prev, e.Schedule)

	// 删除指定的定时任务
	c.Remove(id3)

	// 停止定时任务
	defer c.Stop()

	// 主程序阻塞
	select {}
}

// 定义一个实现了Job接口的结构体
type myJob struct {
	name string
}

// 实现Job接口的Run方法
func (j myJob) Run() {
	fmt.Println(time.Now().Format(time.DateTime), j.name)
}
```

### ants（goroutine 管理框架）

> `ants` 是一个高性能的 `goroutine` 池，实现了对大规模 `goroutine` 的调度管理、`goroutine` 复用，在执行一些异步并发任务的时候，可以用来限制`goroutine` 数量，复用资源。

下面是一个简单的示例代码，演示如何使用 `Ants` 管理 `goroutine`：

```go
package main

import (
	"github.com/panjf2000/ants/v2"
	"log"
	"runtime"
	"sync/atomic"
	"time"
)

func init() {
	Ticker(func() {
		log.Print("current go routine num: ", runtime.NumGoroutine())
	}, 2*time.Minute)
}
func main() {
	// 创建一个Ants池，最多允许5个goroutine同时执行
	p, _ := ants.NewPool(5)
	defer p.Release()

	// 定义一个计数器，用于统计处理的任务数
	var counter int64

	// 向Ants池提交100个任务
	for i := 0; i < 100; i++ {
		x := i
		err := p.Submit(func() {
			// 模拟任务处理时间
			time.Sleep(time.Second)
			log.Println("执行任务", x)
			// 增加计数器的值
			atomic.AddInt64(&counter, 1)
		})
		if err != nil {
			log.Println("Submit error", err)
		}
	}

		log.Println("正在等待执行的任务数：", p.Waiting())
    
	// 输出计数器的值
	log.Println("counter:", counter)

	//当Running的任务数为0说明任务全部执行完
	for p.Running() > 0 {
		time.Sleep(100 * time.Millisecond)
	}

}

// 监控系统当前的协程数量：
// 启动一个定时器
func Ticker(f func(), d time.Duration) {
	ticker := time.NewTicker(d)
	for {
		select {
		case <-ticker.C:
			go f()
		}
	}
}
```

- 我们首先使用 `ants.NewPool` 函数创建一个Ants池，并设置可同时执行的最大 `goroutine` 数为5

- 接着，我们向 Ants池 提交100个任务，每个任务都会模拟一定的处理时间，并增加计数器的值。

  - > 需要注意的是，我们需要等待所有任务执行完成才能退出主协程，否则协程池中的任务会随着主协程退出

  - 我们可以轮询调用 `p.Running()` 方法判断当前线程池的数量是否为 `0` 来判断线程池中所有任务是否已经全部执行完成。

> Ants池还提供了一些其他的功能，比如设置goroutine的最大生存时间、设置任务队列的大小等。具体的使用方法可以参考Ants的官方文档：https://github.com/panjf2000/ants。

## 如何优雅的关闭服务

当我们重启或关闭服务时，一些正在执行的任务需要怎么处理呢？

比如正在处理的 http 请求，正在操作数据的缓存或数据库，或是正在消费数据的消息队列，亦或是正在等待执行的协程池任务等等。这些场景下优雅的关闭服务就显得非常重要了，它直接关系到服务是否会丢数据或者在关闭时会出现异常。

我们先来看看服务优雅关闭的实现原理：

> 优雅关闭服务的本质其实就是在服务关闭前监听操作系统给服务发的退出信号，从而暂时拦截退出操作，让服务先执行一些收尾工作。

我们可以通过下面这个例子来理解：

```go
package main

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func init() {
	//日志显示行号和文件名
	log.SetFlags(log.LstdFlags | log.Lshortfile)
}

func main() {
	router := gin.Default()
	listenAddr := fmt.Sprintf(":%d", 8888)
	server := &http.Server{
		Addr:           listenAddr,
		Handler:        router,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	go func() {
		err := server.ListenAndServe()
		if err != nil {
			log.Fatal("http server start error", err)
		}
	}()

	//优雅关闭，原生版
	signals := make(chan os.Signal, 0)
	//监听退出信号
	signal.Notify(signals, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	s := <-signals
	log.Println(" receive system signal:", s)
	//依次关闭应用中的所有服务，（注意：需要根据服务的依赖顺序关闭）
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	err := server.Shutdown(ctx)
	if err != nil {
		log.Println("http server error", err)
	}
}
```

上面的例子中我们启动了一个 `http sever`，然后监听操作系统的退出信号。一旦操作系统发出退出信号，`signal.Notify` 就会将退出信号发送到 `signals` 的 `channel` 中，这时就可以从 `signals` 中读取到退出信号了，否则就会一直阻塞在读取操作这一行。从 `signals` 中读取到退出信号之后我们就可以让`http sever` 退出，当我们执行 `server.Shutdown(ctx)` 方法时，就会通知 `http server` 服务关闭。

http server的关闭为：

- 首先关闭所有打开的监听器；
- 然后关闭所有空闲的连接；
- 最后等待连接返回空闲状态并关闭直到超时。

附信号常量及值所对应的动作及说明：

| 信号    | 值       | 动作 | 说明                                                         |
| :------ | :------- | :--- | :----------------------------------------------------------- |
| SIGHUP  | 1        | Term | 终端控制进程结束(终端连接断开)                               |
| SIGINT  | 2        | Term | 用户发送INTR字符(Ctrl+C)触发                                 |
| SIGQUIT | 3        | Core | 用户发送QUIT字符(Ctrl+/)触发                                 |
| SIGILL  | 4        | Core | 非法指令(程序错误、试图执行数据段、栈溢出等)                 |
| SIGABRT | 6        | Core | 调用abort函数触发                                            |
| SIGFPE  | 8        | Core | 算术运行错误(浮点运算错误、除数为零等)                       |
| SIGKILL | 9        | Term | 无条件结束程序(不能被捕获、阻塞或忽略)                       |
| SIGSEGV | 11       | Core | 无效内存引用(试图访问不属于自己的内存空间、对只读内存空间进行写操作) |
| SIGPIPE | 13       | Term | 消息管道损坏(FIFO/Socket通信时，管道未打开而进行写操作)      |
| SIGALRM | 14       | Term | 时钟定时信号                                                 |
| SIGTERM | 15       | Term | 结束程序(可以被捕获、阻塞或忽略)                             |
| SIGUSR1 | 30,10,16 | Term | 用户保留                                                     |
| SIGUSR2 | 31,12,17 | Term | 用户保留                                                     |
| SIGCHLD | 20,17,18 | Ign  | 子进程结束(由父进程接收)                                     |
| SIGCONT | 19,18,25 | Cont | 继续执行已经停止的进程(不能被阻塞)                           |
| SIGSTOP | 17,19,23 | Stop | 停止进程(不能被捕获、阻塞或忽略)                             |
| SIGTSTP | 18,20,24 | Stop | 停止进程(可以被捕获、阻塞或忽略)                             |
| SIGTTIN | 21,21,26 | Stop | 后台程序从终端中读取数据时触发                               |
| SIGTTOU | 22,22,27 | Stop | 后台程序向终端中写数据时触发                                 |

不论是我们的应用程序还是这些组件服务的关闭基本都会执行下面这些步骤：

- 捕获终止信号，如 Ctrl+C（SIGINT），kill命令（SIGTERM）等
- 停止接受新的请求或连接。比如使用 `http.Server` 的 `Shutdown` 方法，或者关闭 `net.Listener` 等
- 等待已有的请求或连接处理完毕，比如可以使用 `sync.WaitGroup` 或者 `context` 等实现；
- 释放所有占用的资源，如数据库连接，文件句柄等。比如调用 `io.Closer` 的 `Close` 方法，或者使用 `defer` 语句等；
- 退出程序。使用 `os.Exit()` 或者 `return` 等

在实际项目中我们除了启动 `http server` ，还有可能启动其他的服务，比如 mysql，kafka，redis 等组件，在关闭服务时我们也需要一起考虑，并考虑这些组件关闭的先后顺序：

```go
package main

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v7"
	"github.com/phper95/pkg/cache"
	"github.com/phper95/pkg/db"
	"github.com/phper95/pkg/es"
	"github.com/phper95/pkg/httpclient"
	"github.com/phper95/pkg/logger"
	"github.com/phper95/pkg/mq"
	"github.com/phper95/pkg/nosql"
	"github.com/phper95/pkg/prome"
	"github.com/phper95/pkg/shutdown"
	"github.com/phper95/pkg/trace"
	"log"
	"net/http"
	"safe-shutdown/metric"
	"time"
)

func init() {
	InitLog()
	initMysqlClient()
	initRedisClient()
	initMongoClient()
	initESClient()
	initProme()

	err := mq.InitSyncKafkaProducer(mq.DefaultKafkaSyncProducer,
		[]string{"127.0.0.1:9092"}, nil)
	if err != nil {
		log.Fatal("InitSyncKafkaProducer err", err, "client", mq.DefaultKafkaSyncProducer)
	}
}
func InitLog() {
	//日志显示行号和文件名
	log.SetFlags(log.LstdFlags | log.Lshortfile)
}
func initMysqlClient() {
	err := db.InitMysqlClient(db.DefaultClient, "user", "pwd", "127.0.0.1:3306", "test")
	if err != nil {
		log.Fatal("mysql init error", err)
	}
}
func initRedisClient() {
	opt := redis.Options{
		Addr:         "127.0.0.1:6379",
		DB:           0,
		MaxRetries:   3,
		PoolSize:     20,
		MinIdleConns: 100,
	}
	redisTrace := trace.Cache{
		Name:                  "redis",
		SlowLoggerMillisecond: 500,
		Logger:                logger.GetLogger(),
		AlwaysTrace:           true,
	}
	err := cache.InitRedis(cache.DefaultRedisClient, &opt, &redisTrace)
	if err != nil {
		log.Fatal("redis init error", err)
	}
}

func initESClient() {
	err := es.InitClientWithOptions(es.DefaultClient, []string{"127.0.0.1:9200"},
		"User",
		"Password",
		es.WithScheme("https"))
	if err != nil {
		log.Fatal("InitClientWithOptions error", err, es.DefaultClient)
	}
}

func initMongoClient() {
	err := nosql.InitMongoClient(nosql.DefaultMongoClient, "user",
		"pwd", []string{"[127.0.0.1:27017"}, 200)
	if err != nil {
		log.Fatal("InitMongoClient error", err, nosql.DefaultMongoClient)
	}

}

func initProme() {
	prome.InitPromethues("172.0.0.1:9091", time.Second*60, metric.AppName, httpclient.DefaultClient, metric.TestCostTime)
}
func main() {
	router := gin.Default()
	listenAddr := fmt.Sprintf(":%d", 8888)
	server := &http.Server{
		Addr:           listenAddr,
		Handler:        router,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	go func() {
		err := server.ListenAndServe()
		if err != nil {
			log.Fatal("http server start error", err)
		}
	}()

	//优雅关闭（封装版）
	shutdown.NewHook().Close(
		func() {
			ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
			defer cancel()
			if err := server.Shutdown(ctx); err != nil {
				log.Println("http server shutdown err", err)
			}
		},
		//关闭kafka producer
		func() {
			if err := mq.GetKafkaSyncProducer(mq.DefaultKafkaSyncProducer).Close(); err != nil {
				log.Println("kafka close error", err, "client", mq.DefaultKafkaSyncProducer)
			}
		},
		func() {
			es.CloseAll()
		},
		func() {
			//关闭mysql
			if err := db.CloseMysqlClient(db.DefaultClient); err != nil {
				log.Println("mysql shutdown err", err, db.DefaultClient)
			}
		},

		func() {
			err := cache.GetRedisClient(cache.DefaultRedisClient).Close()
			if err != nil {
				log.Println("redis close error", err, cache.DefaultRedisClient)
			}
		},
		func() {
			if nosql.GetMongoClient(nosql.DefaultMongoClient) != nil {
				nosql.GetMongoClient(nosql.DefaultMongoClient).Close()
			}
		},
	)
}
```

在这个例子中，我们初始化了一些常用组件，并在程序退出是关闭这些组件，其中我们将监听动作进行了封装，将退出操作以匿名函数的方式作为`shutdown.NewHook().Close()` 方法的参数传入，这个方法在监听到操作系统的退出操作时会回调这些匿名函数。

> 需要注意的是，在启动服务时我们需要注意服务间的依赖，在关闭服务时，我们也应该考虑这个问题。
>
> 比如我们的服务通过接收 `http` 请求将收到的数据发送到 `kafka`。这个过程中使用 `redis` 缓存。那么初始化服务的顺序应该是最后依赖的服务最先被初始化，而关闭流程则刚好相反。
>
> 这个例子中我们启动时应该先初始化 `kafka` 连接，然后是 `redis` ，最后是 `http sever` ，因为当 `kafka` 和 `redis` 没连接上就接收请求，则处理请求的时候就会出问题。而关闭时应该先让新的数据不要再进来，所以我们首先就应该关闭 `http server` ，再关闭 `redis` 和 `kafka` 。
>
> 如果我们的服务是通过消费 `kafka` 消息再写入到 `db` ，则我们应该先关闭 `kafka` 消费，再关闭 `db` 。

本节源码地址：https://gitee.com/phper95/go-interview/tree/master/demo/6-12/safe-shutdown

## ORM中如何进行事务操作

Go ORM来操作事务相对比较简单，我们通过下面的例子来看看具体的用法：

```go
package main

import (
	"errors"
	"github.com/phper95/pkg/db"
	"gorm.io/gorm"
	"log"
	"orm-demo/entity"
)

const DBName = "test"

func init() {
	//日志显示行号和文件名
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	initDB()
}

func initDB() {
	err := db.InitMysqlClient(db.DefaultClient, "root", "admin123", "localhost:3306", DBName)
	if err != nil {
		log.Fatal("InitMysqlClient client error" + db.DefaultClient)
	}
	log.Print("connect mysql success ", db.DefaultClient)
	err = db.InitMysqlClientWithOptions(db.TxClient, "root", "admin123", "localhost:3306", DBName, db.WithPrepareStmt(false))
	if err != nil {
		log.Print("InitMysqlClient client error" + db.TxClient)
		return
	}
}

func main() {
	//此实例不支持事务
	//ormDB := db.GetMysqlClient(db.DefaultClient).DB

	ormDBTx := db.GetMysqlClient(db.TxClient).DB

	//建表
	if err := ormDBTx.AutoMigrate(&entity.User{}); err != nil {
		log.Print("AutoMigrate user error", err)
	}

	//定义3行数据
	user1 := entity.User{
		Name:     "user1",
		Age:      0,
		Birthday: nil,
		Email:    "user1@qq.com",
	}

	user2 := entity.User{
		Name:     "user2",
		Age:      0,
		Birthday: nil,
		Email:    "user2@qq.com",
	}

	user3 := entity.User{
		Name:     "user3",
		Age:      0,
		Birthday: nil,
		Email:    "user3@qq.com",
	}
	//嵌套事务
	//通过Transaction方法传入一个回调函数，在回调函数中执行一系列数据库操作，如果回调函数返回错误，则回滚事务，否则提交事务
	err := ormDBTx.Transaction(func(tx *gorm.DB) error {
		//注意，内部需要使用tx，而不是ormDB
		tx.Create(&user1)

		err := tx.Transaction(func(tx2 *gorm.DB) error {
			tx2.Create(&user2)
			return errors.New("rollback user2") // 回滚 user2
		})
		if err != nil {
			log.Print("Create user2 error", err)
		}

		err = tx.Transaction(func(tx2 *gorm.DB) error {
			tx2.Create(&user3)
			return nil
		})
		if err != nil {
			log.Print("Create user3 error", err)
		}

		//返回值为nil时才会提交事务
		return nil
	})
	if err != nil {
		log.Print("Transaction error", err)
	}

	user4 := entity.User{
		Name:     "user4",
		Age:      0,
		Birthday: nil,
		Email:    "user4@qq.com",
	}

	user5 := entity.User{
		Name:     "user5",
		Age:      0,
		Birthday: nil,
		Email:    "user5@qq.com",
	}

	//通过Begin开启事务之后会返回一个事务操作对象*gdb.TX
	tx := ormDBTx.Begin()
	tx.Create(&user4)

	//保存点
	tx.SavePoint("step1")
	tx.Create(&user5)

	//回滚所有操作
	//tx.Rollback()
	//回滚到保存点
	tx.RollbackTo("step1") // 回滚 user2
	tx.Commit()            // 最终仅提交 user4

}
```

上面的例子中演示了两种事务操作方法：

1. 回调函数：通过 `Transaction` 方法传入一个回调函数，在回调函数中执行一系列数据库操作，如果回调函数返回错误，则回滚事务，否则提交事务。
   - 这种方式可以实现嵌套事务，在一个事务中再开启一个事务。
   - 需要注意的是，内层事务需要使用匿名函数中传入的 `*gorm.DB` 实例，上面的例子中我们在内层事务中使用的是 `tx2` 来操作数据，而不是外层的 `tx` 变量。
2. 常规操作：通过`Begin`开启事务之后会返回一个事务操作对象 `*gdb.TX` ，通过该对象调用 `Rollback()` 和 `Commit()` 方法来实现事务的回滚和提交。

上面两种方式都支持通过通过 `SavePoint` 和 `RollbackTo` 方法设置和回滚到保存点。

> 需要注意的是，如果需要执行事务操作必须关闭SQL的 **预编译**。
>
> 预编译的 SQL 语句会占用数据库资源，事务操作如果不关闭SQL的预编译，可能会导致资源泄漏或者错误。
>
> 在实际业务中我们可以初始化两个 `gorm` ，分别进行带事务和不带事务的的操作。在使用回调函数操作事务时，我们应该注意使用回调函数中参数传递的 `*gorm.DB` 实例，这个实例才是用来操作当前事务的。
