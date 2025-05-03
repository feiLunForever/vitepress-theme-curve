---
title: 第一章 GO语言进阶之包
tags:
  - Go
categories:
  - Go
date: '2025-01-03'
description: 欢迎使用 Curve 主题，这是你的第一篇文章
articleGPT: 这是一篇初始化文章，旨在告诉用户一些使用说明和须知。
#cover: "/images/logo/logo.webp"

---

# 第一章 GO语言进阶之包

## 包

在一开始配置好开发环境后，我们一起编写了一个能输出“Hello World”的程序：

```go
package main
import "fmt"
func main(){
    fmt.Println("Hello World!")
}
```

尽管那个程序非常简单，只有5行，但有些细节还是值得深入挖掘的。比如，第一行的package时什么意思，第二行的import到底做了什么……

这些问题看似互相独立，但都和一个话题有关，它就是——**Go程序源码的组织结构**。本讲就来带大家彻底搞清楚一个Go程序的源码是如何组织起来的。

### 包的声明

在Go源码中，**package的意思就是包，后面跟着的就是包名。Go语言通过包来组织源码，拥有相同包名的Go源码属于同一个包。每一个包就相当于一个目录。**

“封装”和“复用”等就可以用包来实现。

<img src="./%E7%AC%AC%E4%B8%80%E7%AB%A0%20Go%E8%AF%AD%E8%A8%80%E8%BF%9B%E9%98%B6%E4%B9%8B%E5%8C%85.assets/image-20250428163217788.png" alt="image-20250428163217788" style="zoom:25%;" />



在Hello World的源码中，第一行的内容是：

```go
package main
```

这句话就表示这个源码属于main包。Go语言有一个强制性要求，就是**源码文件的第一行有效代码必须声明自己所在的包**。

> 需要特别指出的是：**main包是一个比较特殊的包。一个Go程序必须有main包，且只能有一个main包**。

### 包的使用

使用`import` 导入包。go自己会默认从GO的安装目录和`GOPATH`环境变量中的目录，检索`src`下的目录进行检索包是否存在。所以导入包的时候路径要从`src`目录下开始写。`GOPATH` 就是我们自己定义的包的目录。

<img src="./%E7%AC%AC%E4%B8%80%E7%AB%A0%20Go%E8%AF%AD%E8%A8%80%E8%BF%9B%E9%98%B6%E4%B9%8B%E5%8C%85.assets/image-20250428163257209.png" alt="image-20250428163257209" style="zoom:25%;" />

我们导入包目的是要使用写在其他包内的函数，或者包里面的结构体方法等等，如果在同一个包下的内容不需要导包，可以直接使用。也可以给包起别名，如果包原有名称太长不方便使用，则可以在导入包之前加上别名。

<img src="./%E7%AC%AC%E4%B8%80%E7%AB%A0%20Go%E8%AF%AD%E8%A8%80%E8%BF%9B%E9%98%B6%E4%B9%8B%E5%8C%85.assets/image-20250428163413839.png" alt="image-20250428163413839" style="zoom:25%;" />

### 包管理方案

<img src="./%E7%AC%AC%E4%B8%80%E7%AB%A0%20Go%E8%AF%AD%E8%A8%80%E8%BF%9B%E9%98%B6%E4%B9%8B%E5%8C%85.assets/image-20250428163722716.png" alt="image-20250428163722716" style="zoom:25%;" />

#### GOPATH 模式

1. `GOPATH` 是Go语言最早的依赖包管理方式，自2009年11月10日Go开源版本发布时即存在。
2. 实质上，`GOPATH` 不完全算作包管理工具，它主要提供了一个用于存放包的路径环境变量。
3. 使用的是 `go get`，执行命令后会拉取代码放入 `GOPATH/src` 下面。
4. 但是它是作为 `GOPATH` 下全局的依赖，并且 `go get` 还不能进行版本控制，以及隔离项目的包依赖，因为相同包的导入路径一致，无法区分不同版本。

#####  `GOPATH` 与 `GOROOT`

- `GOPATH` 模式与`GOPATH` 路径的区别
  - `GOPATH` 模式指通过`GOPATH` 管理包的方式；`GOPATH` 路径指的是`GOPATH` 这个环境变量的路径
- `GOROOT` 和 `GOPATH` 路径的区别
  - `GOROOT` 是 Golang 的按照目录，包含内置开发包与工具，类似Java的JDK
  - `GOPATH` 则由开发者指定，用于存放Go工程代码及第三方依赖包
  - 二者不能是同一个路径，因为可能会导致第三方依赖包和内置包重名
- `GOPATH` 目录结构
  - `src` 存放源代码文件
  - `pkg` 存放编译后的文件
  - `bin` 存放编译后的可执行文件

##### `GOPATH` 模式方案

> 开启`GOPATH`模式后，工程代码需放置在`GOPATH`下的`src`目录内，以确保正确识别和运行。
>
> 当用到第三方依赖包时，需通过`go get`方式拉取。

###### go get 命令

- 先将远程代码克隆到`$GOPATH/src`目录下
- 执行 `go install`
  - 如果指定的包可生成二进制文件，该文件会被保存到``GOPATH`的`bin`目录下。
- 可以指定 `-d`参数，仅下载不安装

###### go install 命令

- 可生成可执行的二进制文件，则存储在`$GOPATH/bin`目录下
- 普通包，则会将编译生成的`.a`结尾的文件，放到`$GOPATH/pkg`目录下
  - 相当于编译缓存，提升后续的编译速度

> **那如何判断一个包是否能生成可执行的文件呢？**

在 GO 语言中，只有`main`包中存在`main`函数的情况下，才能生成可执行的二进制文件。

> 注意

- `go install` 是建立在`GOPATH`上的，无法在单独的目录中使用该命令
- `go install` 生成的可执行文件的名称与包名一致
- `go install` 输出的目录是不支持通过命令指定的

> 既然`go get`包含了`go install `的操作，那为什么还需要`go install`?

- 我们知道`go get`的第一步是下载远程的依赖包，如果你想使用本地的版本，就不需要下载了。那这个时候我们就可以直接使用`go install`。
- 需要注意的是在 go 的 1.15版本以后，如果没有本地包，`go install`也会从远程下载依赖包。

###### go build 命令

- `go build` 执行后，它默认会在 **当前目录** 下编译生成可执行文件。我们也可以通过参数去指定路径。
- 跟`go install`不同的是，`go build` 不会将任何可执行文件复制到`$GOPATH/bin`目录下

###### go run 命令

- 编译并运行 go 文件
- `go run` 不依赖 `GOPATH`
- 只能编译可执行的 go 文件
  - 即文件中包含`main`包和`main`方法

#### Govendor 模式

1. 所谓 `vendor` 机制，就是每个项目的根目录下可以有一个 `vendor` 目录，里面存放了该项目的依赖的 `package`。
   - 通过 `vendor/vendor.json` 记录依赖版本，并将依赖包存储在 `vendor` 目录。
2. `go build` 的时候会先从`vender`目录中搜索依赖包，`vender`目录中找不到，再到 `GOPATH` 中查找，最后才是在 `GOROOT` 中去查找。
3. `vendor` 将原来放在 `$GOPATH/src` 的第三方包放到当前工程的 `vendor` 目录中进行管理。
   - 它为工程独立的管理自己所依赖第三方包提供了保证，多个工程独立地管理自己的第三方依赖包，它们之间不会相互影响。 这种隔离和解耦的设计思路是一大进步。
4. `Govendor`将第三方依赖包，完全整合到工程里面，加快了项目构建速度。 
5. 但 `vendor` 也有缺点，那就是对外部依赖的第三方包的版本管理。
   - 我们通常使用 `go get -u` 更新第三方包。默认的是将工程的默认分支的最新版本拉取到本地，但并不能指定第三方包的版本。
   - 而在实际包升级过程中，如果发现新版本有问题，则不能很快回退。
   - 而且依赖不能重用，使得包的冗余度提升，依赖冲突不好解决

#### 第三方管理工具

- 在 Go 1.11 之前，很多优秀的第三方包管理工具起到了举足轻重的作用，弥补了 Go 在依赖管理方面的不足，比如 [godep](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Ftools%2Fgodep&objectId=2020911&objectType=1&isNewArticle=undefined)、[govendor](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fkardianos%2Fgovendor&objectId=2020911&objectType=1&isNewArticle=undefined)、[glide](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2FMasterminds%2Fglide&objectId=2020911&objectType=1&isNewArticle=undefined)、[dep](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fdep&objectId=2020911&objectType=1&isNewArticle=undefined) 等。其中 dep 拥趸众多，而且也得到了 Go 官方的支持，项目也放在 Golang 组织之下 [golang/dep](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fdep&objectId=2020911&objectType=1&isNewArticle=undefined)。
- 但是蜜月期没有多久，2018 年 Russ Cox 经过深思熟虑以及一些早期的试验，决定 Go 库版本的方式需要从头再来，深度集成 Go 的各种工具（go get、go list等)，实现精巧的最小化版本选择算法，解决 broken API 共存等问题，所以 dep 就被废弃了，这件事还导致 dep 的作者相当的失望和数次争辩。
- 随着历史车轮的滚滚向前，这些工具均淹没在历史长河之终，完成了它们的使命后，光荣地退出历史舞台。

#### Go Modules 模式

- `Golang 1.11`版本新引入的官方包管理工具用于解决之前没有地方记录依赖包具体版本的问题，方便依赖包的管理。
- 使用`go mod` 管理项目，不需要非得把项目放到 `GOPATH` 指定目录下，可以在电脑上任何位置新建一个项目。
- 其思想类似 `maven`：摒弃`vendor`和`GOPATH`，拥抱本地库。

##### mod 初始化

使用mod需要注意的是：

* 如果Go的版本太低不能使用，建议将Go的版本升级到最新。
* 环境变量中可以增加`GOPROXY=https://goproxy.io` 这样没有梯子的情况下可以正确的加载相应的包文件。
* 在项目的根目录下使用命令`go mod init projectName`。

##### go mod 常用命令

- go mod init 
  - 初始化一个新的 `Go modules`工程，并创建 `go.mod` 文件。
- go mod tidy
  - 用来解决工程中包的依赖关系
  - 对于缺少的包，该指令会进行下载，并将依赖包信息维护到`go.mod` 中。
  - 同时，如果项目中未使用的依赖包，这些包的信息将会从 `go.mod` 和 `go.sum` 文件中移除。
- Go mod download
  - 用于将依赖包下载到本地缓存。
  - 如果 `go.mod` 和 `go.sum`文件中已经包含了新的依赖包信息，而这些依赖包尚未下载到本地，执行该指令可实现依赖包的下载。
- go mod vendor
  - 为了兼容 `govendor`模式，将依赖包复制到项目中的 `vendor` 中

##### go.mod 文件

go.mod 提供了`module`, `require`、`replace`和`exclude` 四个命令

- `module` 语句指定包的名字（路径）
- `require` 语句指定的依赖项模块
- `replace` 语句可以替换依赖项模块
- `exclude` 语句可以忽略依赖项模块

```go
module github.com/panicthis/modfile/v2
go 1.20
require (
	github.com/cenk/backoff v2.2.1+incompatible
	github.com/coreos/bbolt v1.3.3
	github.com/edwingeng/doublejump v0.0.0-20200330080233-e4ea8bd1cbed
	github.com/stretchr/objx v0.3.0 // indirect
	github.com/stretchr/testify v1.7.0
	go.etcd.io/bbolt v1.3.6 // indirect
	go.etcd.io/etcd/client/v2 v2.305.0-rc.1
	go.etcd.io/etcd/client/v3 v3.5.0-rc.1
	golang.org/x/net v0.0.0-20210610132358-84b48f89b13b // indirect
	golang.org/x/sys v0.0.0-20210611083646-a4fc73990273 // indirect
)
exclude (
	go.etcd.io/etcd/client/v2 v2.305.0-rc.0
	go.etcd.io/etcd/client/v3 v3.5.0-rc.0
)
retract (
    v1.0.0 // 废弃的版本，请使用v1.1.0
)
```

###### module path

`go.mod` 的第一行是`module path`, 一般采用`仓库+module name`的方式定义。

这样我们获取一个`module`的时候，就可以到它的仓库中去查询，或者让`go proxy`到仓库中去查询。

```go
module github.com/panicthis/modfile/v2
```

这是一个很奇怪的约定，带来的好处是你一个项目中可以使用依赖库的不同的 `major` 版本，它们可以共存。

###### go directive

第二行是 `go directive`。格式是 `go 1.xx`,它并不是指你当前使用的Go版本，而是指名你的代码所需要的Go的最低版本。

```go
go 1.20
```

这一行不是必须的，你可以不写。

###### require

`require` 段中列出了项目所需要的各个依赖库以及它们的版本。

除了正规的`v1.3.0`这样的版本外，还有一些奇奇怪怪的版本和注释，那么它们又是什么意思呢？

正式的版本号我们就不需要介绍了，大家都懂:

```go
github.com/coreos/bbolt v1.3.3
```

`伪版本号`

```go
github.com/edwingeng/doublejump v0.0.0-20200330080233-e4ea8bd1cbed
```

上面这个库中的版本号就是一个伪版本号`v0.0.0-20200330080233-e4ea8bd1cbed`，这是`go module`为它生成的一个类似符合语义化版本2.0.0版本，实际这个库并没有发布这个版本。

正式因为这个依赖库没有发布版本，而`go module`需要指定这个库的一个确定的版本，所以才创建的这样一个伪版本号。

`go module`的目的就是在`go.mod`中标记出这个项目所有的依赖以及它们确定的某个版本。

这里的`20200330080233`是这次提交的时间，格式是`yyyyMMddhhmmss`，而`e4ea8bd1cbed`就是这个版本的commit id，通过这个字段，就可以确定这个库的特定的版本。

###### indirect注释

有些库后面加了`indirect`后缀，这又是什么意思的。

```go
   go.etcd.io/bbolt v1.3.6 // indirect
golang.org/x/net v0.0.0-20210610132358-84b48f89b13b // indirect
golang.org/x/sys v0.0.0-20210611083646-a4fc73990273 // indirect
```

如果用一句话总结，间接的使用了这个库，但是又没有被列到某个`go.mod`中，当然这句话也不算太准确，更精确的说法是下面的情况之一就会对这个库加indirect后缀：

- 当前项目依赖A，但是A的`go.mod`遗漏了B，那么就会在当前项目的`go.mod`中补充B， 加`indirect`注释。
- 当前项目依赖A，但是A没有`go.mod`，同样就会在当前项目的`go.mod`中补充B，加`indirect`注释
- 当前项目依赖A，A又依赖B，当对A降级的时候，降级的A不再依赖B，这个时候B就标记`indirect`注释

###### incompatible

有些库后面加了incompatible后缀，但是你如果看这些项目，它们只是发布了v2.2.1的tag,并没有`+incompatible`后缀。

```go
github.com/cenk/backoff v2.2.1+incompatible
```

这些库采用了`go.mod`的管理，但是不幸的是，虽然这些库的版major版本已经大于等于2了，但是他们的`module path`中依然没有添加v2、v3这样的后缀。

所以`go module`把它们标记为`incompatible`的，虽然可以引用，但是实际它们是不符合规范的。

###### exclude

如果你想在你的项目中跳过某个依赖库的某个版本，你就可以使用这个段。

```go
exclude (
	go.etcd.io/etcd/client/v2 v2.305.0-rc.0
	go.etcd.io/etcd/client/v3 v3.5.0-rc.0
)
```

这样，Go在版本选择的时候，就会主动跳过这些版本，比如你使用`go get -u ......`或者`go get github.com/xxx/xxx@latest`等命令时，会执行 `version query` 的动作，这些版本不在考虑的范围之内。

###### replace

replace也是常用的一个手段，用来解决一些错误的依赖库的引用或者调试依赖库。

```go
replace github.com/coreos/bbolt => go.etcd.io/bbolt v1.3.3
replace github.com/panicthis/A v1.1.0 => github.com/panicthis/R v1.8.0
replace github.com/coreos/bbolt => ../R
```

比如etcd v3.3.x的版本中错误的使用了`github.com/coreos/bbolt`作为bbolt的`module path`，其实这个库在它自己的`go.mod`中声明的`module path`是`go.etcd.io/bbolt`，又比如etcd使用的grpc版本有问题，你也可以通过`replace`替换成所需的grpc版本。

甚至你觉得某个依赖库有问题，自己`fork`到本地做修改，想调试一下，你也可以替换成本地的文件夹。

`replace`可以替换某个库的所有版本到另一个库的特定版本，也可以替换某个库的特定版本到另一个库的特定版本。

###### retract

`retract`是go 1.16中新增加的内容，借用学术界期刊撤稿的术语，宣布撤回库的某个版本。

如果你误发布了某个版本，或者事后发现某个版本不成熟，那么你可以推一个新的版本，在新的版本中，声明前面的某个版本被撤回，提示大家都不要用了。

撤回的版本tag依然还存在，`go proxy`也存在这个版本，所以你如果强制使用，还是可以使用的，否则这些版本就会被跳过。

和`exclude`的区别是`retract`是这个库的owner定义的， 而`exclude`是库的使用者在自己的`go.mod`中定义的。

##### go.sum 文件

 `go.sum` 则是记录了所有依赖的 `module` 的校验信息，以防下载的依赖被恶意篡改，主要用于安全校验。

每行的格式如下：

```go
<module> <version> <hash>
<module> <version>/go.mod <hash>
```

比如：

```go
github.com/spf13/cast v1.4.1 h1:s0hze+J0196ZfEMTs80N7UlFt0BDuQ7Q+JDnHiMWKdA=
github.com/spf13/cast v1.4.1/go.mod h1:Qx5cxh0v+4UWYiBimWS+eyWzqEqokIECu5etghLkUJE=
```

其中 `module` 是依赖的路径，`version` 是依赖的版本号。

如果 version 后面跟`/go.mod`表示对哈希值是 module 的 `go.mod` 文件；否则，哈希值是 module 的`.zip`文件。

###### go.sum 是如何做包校验的

- 若本地缓存有依赖包，计算包的`hash`并于`go.sum`记录对比
- 依赖包版本中任何一个文件（包括`go.mod`）都会改变`hash`
  - 不用下载整个依赖树，直接根据`hash`计算
- `hash`是由算法 **SHA-256** 计算出来的
- **校验目的** 是保证项目中所依赖的那些模块 **版本** 不会被篡改
- 公网可下载的包会去 GO 校验数据库获取模块的校验和（sum.golang.org/sum.golang.google.cn）

###### 不会对依赖包做 hash 校验

- `GOPRIVATE`匹配的包
  - 主要是用来设置内部包，不走`GOPROXY`代理（不上传git）
- 打包到 `vendor`目录中的包
- `GOSUMDB`设置为 off

###### 为什么 go.sum 中版本数量会比 go.mod多呢

- `go.mod`只在依赖包不含`go.mod`文件时，才会记录间接依赖包版本
- `go.sum`则是要记录构建用到的所有依赖包版本

### 构建Go项目时的原则和建议

- 一个目录名下只能有一个 `package`
- 一个 `package`名的内容放在一个目录下面
- 目录名和`package`名相同

### 如何使用内部包

#### internal 文件夹内的包

> - `internal`  目录是 `Go Modules` 的一部分，用于存放私有的包。
> - `internal`  目录下的包通常用于模块内部的逻辑，不打算暴露给外部使用。
> - `internal` 文件夹内的包只能被其父目录下的包或子包导入。
>   - 例如，路径为`/a/b/c/internal/d`的包，只能被`/a/b/c`目录及其子目录（如`/a/b/c/e`）中的代码访问，而`/a/b/g`目录的代码无法导入该包。

##### 项目结构示例

```go
project/
├── go.mod
├── main.go
├── internal/
│   └── auth/          // 仅允许project内部访问
│       ├── jwt.go     // 实现JWT验证逻辑
│       └── oauth.go
└── pkg/
    └── api/           // 对外暴露的API接口
        └── handler.go
```

##### 代码引用关系

- ✅ **允许**：`pkg/api/handler.go`可导入`internal/auth/jwt.go`中的函数。
- ❌ **禁止**：外部项目`github.com/other/project`导入`github.com/your/project/internal/auth`会触发编译错误。

开源库可通过 `internal` 目录隐藏实现细节，仅暴露设计好的公共接口。

例如标准库`internal/auth`存放 JWT验证处理细节，外部开发者只能使用`handler.go`等封装好的方法。

#### 内部开发的包

> 在实际工作中更多的是将我们开发的包上传到企业内部的git平台上，以供其他的业务组使用。

我们应该怎么从内部的git平台上使用这些包呢？

第一种方式我们可以通过本地包的方式导入，这就需要用到go module的另一个语法replace。

- 通过本地包的方式导入
- 通过私有仓库的方式导入

##### 本地包方式导入（replace机制）

通过 `replace` 指令将远程包路径映射到本地开发目录，适用于临时调试或本地开发场景。
​**​实现步骤​**​：

1. **初始化模块**

   - 在本地包项目中执行`go mod init code.example.com/team/pkg`，生成 `go.mod` 文件

2. **修改主项目 go.mod**

   - 在主项目中通过`replace`替换远程路径为本地路径：

   ```go
   module main_project
   go 1.21
   
   require code.example.com/team/pkg v1.0.0 // 声明依赖版本
   replace code.example.com/team/pkg v1.0.0 => ../pkg_local // 本地绝对或相对路径[6,8](@ref)
   ```

3. **同步依赖**

   - 执行 `go mod tidy` 或 `go build` ，Go工具链将使用本地目录代码替代远程依赖。

**优点**：快速调试无需推送代码到远程仓库。
​**​限制​**​：仅适用于本地开发环境，团队协作时需同步路径配置。

##### 私有仓库方式导入（直接引用）

通过配置Go环境直接访问私有Git仓库，适合生产环境和团队协作。

**实现步骤​**​：

1. **配置私有仓库白名单**
   - 设置环境变量允许访问私有域名：

```shell
go env -w GOPRIVATE="code.example.com"  # 声明私有仓库域名[9,11](@ref)
```

2. **配置Git认证**

3. **声明依赖并拉取**
   - 在主项目`go.mod`中直接引用私有仓库路径和版本：

```go
require code.example.com/team/pkg v1.2.3  // 需确保仓库已打tag
```

执行`go mod tidy`自动下载依赖。

4. **版本管理规范**

   - 私有仓库需遵循语义化版本规范，例如：

     ```she
     git tag v1.2.3 && git push origin v1.2.3  # 发布新版本
     ```

   **优点**：符合生产环境协作规范，支持版本控制和自动更新。

### **workspace 模式**

Go 的 **workspace 模式（工作区模式）** 是 Go 1.18 引入的重要特性，旨在简化多模块（module）的本地协同开发流程，尤其适用于需要同时修改多个相互依赖的模块的场景。

#### **核心文件：`go.work`**

1. **作用**：声明本地工作区包含的模块路径和依赖覆盖规则，优先级高于模块自身的 `go.mod` 文件。

```go
go 1.21            // 声明 Go 版本
use (              // 指定本地模块路径
    ./moduleA
    ../moduleB
)
replace (          // 覆盖依赖版本（可选）
    example.com/old v1.0.0 => ./new-local-path
)
```

每个 `use` 指令指向包含 `go.mod` 的本地目录。

#### **核心命令**

- `go work init`：初始化工作区，生成 `go.work` 文件。
- `go work use <dir>`：将指定目录的模块加入工作区。
- `go work sync`：同步工作区依赖到各模块的 `go.mod` 文件（需 Go 1.18+）。

#### 工作区的核心机制

- 工作区内的模块会覆盖远程仓库中的同名模块。
  - 例如，若工作区包含 `example.com/util`，则本地修改会直接生效，无需提交到远程或修改 `go.mod`。
- `replace` 指令在 `go.work` 中全局生效，无需在每个模块的 `go.mod` 中重复声明。
- 若当前目录或父目录存在 `go.work`，或通过 `GOWORK` 环境变量指定路径，Go 命令自动进入工作区模式。

#### 使用步骤与示例

##### **创建工作区**

```bash
mkdir workspace && cd workspace
go work init        # 生成空的 go.work
```

##### **添加本地模块**

```bash
# 假设 moduleA 和 moduleB 是本地开发的相互依赖模块
go work use ./moduleA ./moduleB
```

此时 `go.work` 内容更新为：

```go
go 1.21
use (
    ./moduleA
    ./moduleB
)
```

##### **开发与测试**

- 在 `moduleA` 中修改代码后，`moduleB` 可直接引用最新版本，无需手动 `go get` 或修改 `go.mod`。
- 运行命令时，Go 自动识别工作区内的模块依赖：

```bash
go run ./moduleB/main.go   # 使用本地 moduleA 的代码
```

##### **提交代码**

- **不提交 `go.work`**：该文件仅用于本地开发，避免污染远程仓库。
- **发布模块**：完成开发后，将各模块独立提交并打版本标签，其他开发者通过常规 `go get` 获取。
