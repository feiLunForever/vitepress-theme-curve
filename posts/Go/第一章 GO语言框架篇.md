---

title: 第一章 GO语言框架篇
tags:
  - Go
categories:
  - Go
date: '2025-05-04'
description: 欢迎使用 Curve 主题，这是你的第一篇文章
articleGPT: 这是一篇初始化文章，旨在告诉用户一些使用说明和须知。
#cover: "/images/logo/logo.webp"

---

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


代码块1234567891011
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

其实如果我们看过源码就知道，直接使用 `http.HandleFunc()` 来注册路由时，其实在内部实现中 http 包内会使用一个默认的 http 请求的多路复用器`DefaultServeMux` ，这个多路复用器是作为 http 包中的全局变量提前定义好的，我们在调用 http 包中的 `HandleFunc` 函数时，实际上是使用`DefaultServeMux` 来调用 `HandleFunc` 方法的：

> 源码地址：$GOROOT/src/net/http/server.go

```go
func HandleFunc(pattern string, handler func(ResponseWriter, *Request)) {
	DefaultServeMux.HandleFunc(pattern, handler)
}
```

而在调用 `ListenAndServ` 方法时，如果第二个参数传的是 nil，也会默认使用 `DefaultServeMux`：

> 源码地址：$GOROOT/src/net/http/server.go

```go
func (sh serverHandler) ServeHTTP(rw ResponseWriter, req *Request) {
	handler := sh.srv.Handler
	if handler == nil {
		handler = DefaultServeMux
	}
	if !sh.srv.DisableGeneralOptionsHandler && req.RequestURI == "*" && req.Method == "OPTIONS" {
		handler = globalOptionsHandler{}
	}

	if req.URL != nil && strings.Contains(req.URL.RawQuery, ";") {
		var allowQuerySemicolonsInUse atomic.Bool
		req = req.WithContext(context.WithValue(req.Context(), silenceSemWarnContextKey, func() {
			allowQuerySemicolonsInUse.Store(true)
		}))
		defer func() {
			if !allowQuerySemicolonsInUse.Load() {
				sh.srv.logf("http: URL query contains semicolon, which is no longer a supported separator; parts of the query may be stripped when parsed; see golang.org/issue/25192")
			}
		}()
	}

	handler.ServeHTTP(rw, req)
}
```

