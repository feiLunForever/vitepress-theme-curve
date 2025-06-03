

# 第七章 GO语言场景篇

## 设计一个协程池

我们使用 `channel` 仅仅几十行代码就可以实现类似的功能：

```go
package gopool

import (
	"fmt"
	"log"
	"runtime/debug"
	"sync/atomic"
	"time"
)

// 定义超时错误
var ErrScheduleTimeout = fmt.Errorf("schedule error: timed out")

// 定义协程池结构体
// 包含了两个channel：concurrency和work
// concurrency是用来控制并发度的， 在创建协程池时会传进来并发数，将这个并发数作为concurrency这个channel的容量，
// 在执行任务前向concurrency写入一个零尺寸的空结构体，待任务结束后读出这个空结构体释放channel的缓冲容量来达到控制并发度的功能

// work为需要执行的任务队列
type Pool struct {
	concurrency chan struct{}
	work        chan func()
	running     int32
}

// 根据给定的大小创建一个协程池，并立即启动给定数量的协程
func NewPool(concurrencyNum, queue, workers int) *Pool {
	if workers <= 0 && queue > 0 {
		panic("dead queue configuration detected")
	}
	if workers > concurrencyNum {
		panic("workers > concurrencyNum")
	}
	p := &Pool{
		concurrency: make(chan struct{}, concurrencyNum),
		work:        make(chan func(), queue),
	}
	for i := 0; i < workers; i++ {
		//若concurrency已满会阻塞
		p.concurrency <- struct{}{}
		go p.run(func() {})
	}

	return p
}

// 提交任务
func (p *Pool) Submit(task func()) {
	p.submit(task, nil)
}

// 提交任务，带超时时间
func (p *Pool) SubmitWithTimeout(timeout time.Duration, task func()) error {
	return p.submit(task, time.After(timeout))
}

// 当concurrency容量未满说明仍在并发度限制内，则直接启动任务，否则提交到任务队列
// 当达到指定的超时时间会返回超时错误
func (p *Pool) submit(task func(), timeout <-chan time.Time) error {
	select {
	case <-timeout:
		return ErrScheduleTimeout
	case p.work <- task:
		p.addRunning(1)
		return nil
	case p.concurrency <- struct{}{}:
		go p.run(task)
		return nil
	}
}

// 执行当前的任务和任务队列中的任务
func (p *Pool) run(task func()) {
	defer func() {
		p.addRunning(-1)
		if err := recover(); err != nil {
			//捕获异常，并打印错误堆栈
			log.Println("task panic", err, string(debug.Stack()))
		}
		<-p.concurrency
	}()

	task()

	for task := range p.work {
		task()
		p.addRunning(-1)
	}
}
func (p *Pool) addRunning(delta int) {
	atomic.AddInt32(&p.running, int32(delta))
}

func (p *Pool) Running() int {
	return int(atomic.LoadInt32(&p.running))
}
```

上面的代码中：

1. 我们使用了两个通道来控制协程的数量和任务的队列，避免了内存耗尽和调度开销过大的问题；
2. 提供了两种提交任务的方法，一种是普通的 `Submit`，一种是带超时时间的 `ScheduleWithTimeout`，增加了灵活性和可靠性；
3. 在 `worker` 函数中使用了 `defer` 和 `recover` 来捕获异常，并打印错误堆栈，增加了容错性和可调试性。

具体用法如下：

```go
package main

import (
	"ants-demo/gopool"
	"log"
	"sync/atomic"
	"time"
)

func main() {
	p := gopool.NewPool(5, 5, 1) // 限制同时启动5个协程
	// 定义一个计数器，用于统计处理的任务数
	var counter int64

	// 向gopool提交100个任务
	for i := 0; i < 100; i++ {
		x := i
		p.Submit(func() {
			// 模拟任务处理时间
			time.Sleep(time.Second)
			log.Println("执行任务", x)
			// 增加计数器的值
			atomic.AddInt64(&counter, 1)
			//panic(111)
		})

	}

	for p.Running() > 0 {
		time.Sleep(100 * time.Millisecond)
	}

	// 输出计数器的值
	log.Println("counter:", counter)
}
```

获取系统当前协程数量的方法是调用 `runtime` 包的 `NumGoroutine()` 方法，我们只需要启动一个定时器，将当前的携程数量打印出来或者上报到监控系统

比如上面示例中我们在 `init()` 函数中初始化了一个定时器，每两分钟打印一次 `goroutine` 的数量。

需要注意的是，打印出的 `goroutine` 数量是应用程序全部的 `goroutine` ，我们通过上面线程池启动的 `gorotine` 只是其中一部分，比如处理 `http` 请求，从 `kafka` 消费数据，数据库的增删改查等操作都是会占用 `goroutine` 数量的，需要根据业务特点来判断。

一般来说，最好将 `goroutine` 总数量控制在万级以内。

> 本节源码地址：https://gitee.com/phper95/go-interview/tree/master/demo/6-11/ants-demo
