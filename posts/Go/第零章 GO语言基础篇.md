---

title: 第零章 GO语言基础篇
tags:
  - Go
categories:
  - Go
date: '2025-01-03'
description: 欢迎使用 Curve 主题，这是你的第一篇文章
articleGPT: 这是一篇初始化文章，旨在告诉用户一些使用说明和须知。
#cover: "/images/logo/logo.webp"

---

# 第零章 GO语言基础篇

## 环境搭建

> https://golang.google.cn/dl/ 中文镜像

### 第一个Go程序

使用 vi 或启动任何一个纯文本编辑器，输入如下内容：

```go
package main
import "fmt"
func main(){
    fmt.Println("Hello World!")
}
```

将其保存为 hello.go。 接下来，启动终端，导航至 hello.go 所在目录，然后执行以下命令，编译 hello.go 程序：

```bash
go build hello.go
```

稍等片刻，程序编译完成。编译完成后将生成名为 hello 的可执行文件。在终端执行这个文件，可以看到 “Hello World!” 字样的文本输出，如下图所示：

```shell
(base) jiangbolun@jiangbolundeMacBook-Pro-2 main % ./hello 
Hello Word!% 
```

> 注意：
> Go 语言要求包含 `main` 函数的文件必须声明为 `package main`。这是生成可执行文件的关键。

### GOPATH 环境变量

1. `GOPATH`环境变量，是Go语言用来查找项目和第三方库的路径。
2. 刚安装完Go后，`GOPATH`环境变量默认未设置，需手动配置；如果不设置，Go默认在本地的特定目录下查找，如Unix/Linux下的用户主目录下的`go`，Windows下的`documents and settings`下的用户名下的`go`。
3. 建议即便在默认路径下工作，也应设置`GOPATH`环境变量，以便更好地管理项目和第三方库。
4. `GOPATH`目录下可以存放个人的多个项目和所有拉取的第三方库，尽管也可以为每个项目设置不同的`GOPATH`。
5. `GOPATH`作为一个环境变量，可以指示多个路径，Go在编译时会遍历这些路径来查找所需的依赖包。

### debug

goland debug 时会失效：

> undefined behavior - version of Delve is too old for Go version 1.23.5 (maximum supported version 1.20) 15

因依赖问题要求GO版本需要从1.18.x版本升级到1.23.x，升级后，Test 启动 debug时，发现打断点的红点一闪而过，出现一个失效的标志（一个灰色圆圈+斜杠），在经过百度大法后，原来高版本（1.20及以上版本）会出现debug断点无效的现象。

经过资料查阅，发现是因为go高版本问题，导致dlv插件失效，[github](https://so.csdn.net/so/search?q=github&spm=1001.2101.3001.7020)上提供了源代码，可以clone下来打包，并把dlv文件放到指定的目录。

1. Git clone

   ```shell
   git clone https://github.com/go-delve/delve.git
   ```

2. #### 编译并打包成dlv可执行文件

   ```
   cd cmd/dlv
   
   go build
   ```

   执行完毕后，当前目录下多出一个dlv可执行文件 

3. #### 复制dlv文件到goland插件目录

   - goland 新版本（大于等于23年版本）

     ```
     cp dlv /Applications/GoLand.app/Contents/plugins/go-plugin/lib/dlv/mac
     ```

     

   - goland老版本（小于23年版本）

     ```
     cp dlv /Applications/GoLand.app/Contents/plugins/go/lib/dlv/mac
     ```

## Go SDK 命令行工具

### go build

> go build 命令的作用是编译 Go 源码，并生成可执行的文件。

从原理上说，Go SDK 自 1.9 版本开始就支持并发编译了，能尽可能地发挥电脑的最大性能完成编译，所以 Go 源码的编译速度是非常快的。在编译过程中，除了我们自己写的代码外，如果使用了第三方的包，这些包会被一同编译。当我们执行 go build 命令后，会搜索当前目录下的 go 源码并完成编译。

go build 命令还允许附加参数，方便开发者对编译参数进行配置，具体如下表所示：

| 参数名 | 作用                                                         |
| ------ | ------------------------------------------------------------ |
| -v     | 编译时显示包名                                               |
| -p x   | 指定编译时并发的数量（使用x表示），该值默认为CPU的逻辑核心数 |
| -a     | 强制进行重新构建                                             |
| -n     | 仅输出编译时执行的所有命令                                   |
| -x     | 执行编译并输出编译时执行的所有命令                           |
| -race  | 开启竞态检测                                                 |

此外，如果我们希望只编译某个 go 源码文件或包，可在 go build 命令后添加文件或包名。例如，现有 file1.go、file2.go 和file3.go，我们只希望编译 file1.go，便可如下执行：

```bash
go build file1.go
```

### go clean

go clean 命令可以清理当前目录内的所有编译生成的文件，具体包括：

-   当前目录下生成的与包名或者 Go 源码文件同名的可执行文件，以及当前目录中 _obj 和 _test 目录中名为 _testmain.go、test.out、build.out、a.out 以及后缀为 .5、.6、.8、.a、.o和 .so 的文件，这些文件通常是执行go build命令后生成的；
-   当前目录下生成的包名加 “.test” 后缀为名的文件，这些文件通常是执行 go test 命令后生成的；
-   工作区中 pkg 和 bin 目录的相应归档文件和可执行文件，这些文件通常是执行 go install 命令后生成的。

go clean 命令还允许附加参数，具体参数和作用如下表所示：

| 参数名     | 作用                                                         |
| ---------- | ------------------------------------------------------------ |
| -i         | 清除关联的安装的包和可运行文件，这些文件通常是执行go install命令后生成的 |
| -n         | 仅输出清理时执行的所有命令                                   |
| -r         | 递归清除在 import 中引入的包                                 |
| -x         | 执行清理并输出清理时执行的所有命令                           |
| -cache     | 清理缓存，这些缓存文件通常是执行go build命令后生成的         |
| -testcache | 清理测试结果                                                 |

在团队式开发中，通常在每次提交代码前执行 go clean 命令，防止提交编译时生成的文件。

### go run

go run 命令的作用是直接运行 go 源码，不在当前目录下生成任何可执行的文件。

从原理上讲，go run 只是将编译后生成的可执行文件放到临时目录中执行，工作目录仍然为当前目录。同时，go run 命令允许添加参数，这些参数将作为 go 程序的可接受参数使用。

由此可见，go run 命令同样会执行编译操作。但要注意的是，go run 不适用于包的执行。

### gofmt

gofmt 命令的作用是将代码按照Go语言官方提供的代码风格进行格式化操作。

请大家注意，**gofmt和go fmt是两个不同的命令**。go fmt 命令是 gofmt 的封装，go fmt 支持两个参数：-n 和 -x，分别表示仅输出格式化时执行的命令，以及执行格式化并输出格式化时执行的命令。

执行 gofmt 命令时，可指定文件或目录，也可不指定。当不指定时，gofmt 命令会搜索当前目录中的 go 源码文件，并执行相应的格式化操作。

gofmt 命令还允许附加参数，具体参数和作用如下表所示：

| 参数名               | 作用                                                         |
| -------------------- | ------------------------------------------------------------ |
| -l                   | 仅输出需要进行代码格式化的源码文件的绝对路径                 |
| -w                   | 进行代码格式化，并用改写后的源码覆盖原有源码                 |
| -r rule              | 添加自定义的代码格式化规则（使用rule表示），格式为：pattern -> replacement |
| -s                   | 开启源码简化                                                 |
| -d                   | 对比输出代码格式化前后的不同，依赖diff命令                   |
| -e                   | 输出所有的语法错误，默认只会打印每行第1个错误，且最多打印10个错误 |
| -comments            | 是否保留代码注释，默认值为true                               |
| -tabwidth x          | 用于指定代码缩进的空格数量（使用x表示），默认值为8，该参数仅在-tabs参数为false时生效 |
| -tabs                | 用于指定代码缩进是否使用tab（“\t”），默认值为true            |
| -cpuprofile filename | 是否开启CPU用量分析，需要给定记录文件（使用filename表示），分析结果将保存在这个文件中 |

`💡 提示：使用-s参数进行源码简化的规则请参考：https://pkg.go.dev/cmd/gofmt#hdr-The_simplify_command`

### go install

go install 命令的作用和 go build 类似，都是将源码编译为可执行的文件，附加参数也基本通用，这里就不再赘述了。区别在于：

-   go install 命令在编译源码后，会将可执行文件或库文件安装到约定的目录下；
-   go install 命令生成的可执行文件使用包名来命名；
-   默认情况下，go install 命令会将可执行文件安装到 GOPATH\bin 目录下，依赖的三方包会被安装到 GOPATH\bin 目录下。

### go get

go get 命令的作用是获取源码包，这一操作包含两个步骤，分别是下载源码和执行 go install 命令进行安装。使用时，仅需将源码仓库地址追加到 go get 后即可（访问<https://pkg.go.dev/>，搜索包名，在包详情页可以找到仓库地址），例如：

```bash
go get github.com/ethereum/go-ethereum
```



go get 命令还允许附加参数，具体参数和作用如下表所示：

| 参数名    | 作用                                             |
| --------- | ------------------------------------------------ |
| -d        | 仅下载源码包，不安装                             |
| -f        | 在执行-u参数操作时，不验证导入的每个包的获取状态 |
| -fix      | 在下载源码包后先执行fix操作                      |
| -t        | 获取运行测试所需要的包                           |
| -u        | 更新源码包到最新版本                             |
| -u=patch  | 只小版本地更新源码包，如从1.1.0到1.1.16          |
| -v        | 执行获取并显示实时日志                           |
| -insecure | 允许通过未加密的HTTP方式获取                     |

若要指定所获取源码包的版本，可以通过添加 “@版本号” 的方式执行。如：

```bash
go get github.com/ethereum/go-ethereum@v1.10.1
```

在使用 Go SDK 1.17 版本时，有一点需要额外注意：执行 go get 命令可能会收到警告，大意是 go get 命令是不建议使用的。此时，使用go install替换 go get 即可，原因是在未来的 Go SDK 版本中 go get 的作用等同于 go get -d。

如果你对 “go get” 命令感兴趣，可以阅读官方对它的说明，写的非常详细：<https://docs.studygolang.com/doc/go-get-install-deprecation>

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

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250428163217788.png" alt="image-20250428163217788" style="zoom:25%;" />

在Hello World的源码中，第一行的内容是：

```go
package main
```

这句话就表示这个源码属于main包。Go语言有一个强制性要求，就是**源码文件的第一行有效代码必须声明自己所在的包**。

> 需要特别指出的是：**main包是一个比较特殊的包。一个Go程序必须有main包，且只能有一个main包**。

### 包的使用

使用`import` 导入包。go自己会默认从GO的安装目录和`GOPATH`环境变量中的目录，检索`src`下的目录进行检索包是否存在。所以导入包的时候路径要从`src`目录下开始写。`GOPATH` 就是我们自己定义的包的目录。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250428163257209.png" alt="image-20250428163257209" style="zoom:25%;" />

我们导入包目的是要使用写在其他包内的函数，或者包里面的结构体方法等等，如果在同一个包下的内容不需要导包，可以直接使用。也可以给包起别名，如果包原有名称太长不方便使用，则可以在导入包之前加上别名。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250428163413839.png" alt="image-20250428163413839" style="zoom:25%;" />

### 包管理方案

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250428163722716.png" alt="image-20250428163722716" style="zoom:25%;" />

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

## 基础语法

### 命名规范

> 对于变量，除了首个单词外，每个单词的首字母用大写表示
>
> - 这种命名法通常被称为小驼峰式命名法；
> - 若所有单词的首字母均大写，则成为大驼峰式命名法（又被称为帕斯卡命名法）。

- 对于对外可见的变量，使用大驼峰法；
- 对于对外不可见的变量，使用小驼峰法。
- 特别地，若变量/常量是布尔类型，最好以is、allow、has、can之类来开头；
- 对于常量，单词均用大写字母来表示，每个字母之间使用下划线来分割。

```go
// 变量声明
var exampleNumberA int = 10
var isDarkMode bool = false
// 常量声明
const WIDTH_OF_RECT int = 12
const ALLOW_DOWNLOAD_WHEN_WIFI bool = true
```

### 声明与赋值

**在Go语言中，变量或常量的数据类型必须先声明，才能使用**，且无法将不相关的数据赋值给它们。

#### 变量的声明与赋值

在Go语言中，声明变量的一般格式为：

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430171127725.png" alt="image-20250430171127725" style="zoom:20%;" />

```Go
var name type
```

- 其中，var是声明变量的关键字，固定不变，表明意图——要声明一个变量
- type表示该变量所属的数据类型。

```Go
// 声明一个名为number的变量，类型为int（整数类型）
var number int
// 为number赋值
number = 100

// 变量声明
var number int = 100
```

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430171500066.png" alt="image-20250430171500066" style="zoom:20%;" />

##### 匿名变量

- 匿名变量也就是没有名字的变量, 开发过程中可能会遇到有些变量不是必须的。
- 匿名变量使用下划线" \_ " 表示。 
- "\_" 也称为空白标识符，任何类型都可以使用它进行赋值，而且任何类型赋值后都将直接被抛弃，所以在使用匿名变量时，表示后续代码不需要再用此变量。

```go
package main

import (
    "fmt"
)

func main() {
    a, _ := 100, 200
    //这里第二个值200赋给了匿名变量_ 也就忽略了不需要再次打印出来
    fmt.Println(a)
}
```

##### 变量的作用域

- 如果一个变量声明在函数体的外部，这样的变量被认为是**全局变量**
  - 全局变量在整个包内，也就是当前的`package`内都可以被调用得到。
- 如果变量定义在函数体内部，则被称之为**局部变量**。

例如下面代码:

```go
package main

import (
    "fmt"
    "os"
)

//全局变量
var name = "zhangsan"

//主函数 程序的入口
func main() {
    fmt.Println(name) //可以访问到全局变量name

    myfunc()
}

//自定义函数 
func myfunc() {
    fmt.Println(name) //这里也可以访问到全局变量name

    age := 30
    fmt.Println(age) //age为myfunc的局部变量 只能够在函数内部使用

    if t, err := os.Open("file.txt"); err != nil {
        fmt.Print(t) //t作为局部变量 只能在if内部使用
    }
    fmt.Println(t) //在if外部使用变量则会报错 undefined: t  未声明的变量t
}
```

#### 常量的声明与赋值

常量声明和赋值的一般格式为：

```Go
const name type = value
```

- `const`是声明常量的关键字，固定不变，表明意图，要声明一个常量；
- `name` 和 `type` 的意义与声明变量时一样；
- `value` 是常量的值。

如：

```Go
// 声明一个名为PI的常量，类型为float64（浮点数类型）
const PI float64 = 3.14
```

> ❗️ 注意： 声明常量时，必须为其赋值，且后续无法修改。

#### Go语言的类型推断

使用Go语言可简化代码，类型推断体现了这一点。当声明与赋值一并进行时，如果数据为Go内置的基础类型，则可无需指定类型。如：

```Go
// 变量声明
var number = 100
// 常量声明
const PI = 3.14
```

无需担心，由于number的值为100，Go语言会推断出它的类型为整数型。同理，PI也会被推断为浮点数型。

对于变量，还有一种超级精简的声明和赋值方式，示例如下：

```Go
//变量声明
number := 100
```

> ❗️ 注意： 冒号等于号 “:=” 的作用是声明和赋值，若number是已经声明过的变量，则无法使用 := 的方式赋值。

#### 批量声明/赋值

为了方便多个 变量/常量 的声明和赋值，我们还可以批量处理它们。

示例如下：

```Go
// 变量
var a1,a2,a3 int = 10,20,30
// 也可以省略类型 根据数据进行类型推导
var a1,a2,a3 = 10,20,"ago"
var (
        // 声明 + 赋值
        number int = 100
        // 声明 + 赋值（类型推断）
        text = "Hello"
        // 只声明
        name string
)
// 常量
const (
        // PI 声明 + 赋值
        PI float64 = 3.14
        // WIDTH 声明 + 赋值（类型推断）
        WIDTH  = 5
        // HEIGHT 声明 + 赋值（类型推断）
        HEIGHT = 10
)
```

### 占位符类型

> fmt标准库的中文文档：https://studygolang.com/pkgdoc

- 占位符 表示在程序中输出一行字符串时候，或者格式化输出字符串的时候使用。
- go内置包 `fmt` 中 `Printf` 方法可以在控制台格式化打印出用户输入的内容。`fmt.Printf("%T",x)`

| 占位符 | 说明           | 举例                           | 输出         |
| ------ | -------------- | ------------------------------ | ------------ |
| %d     | 十进制的数字   | fmt.Printf("%d",10)            | 10           |
| %T     | 取类型         | b :=true fmt.Printf("%T",b)    | bool         |
| %s     | 取字符串       | s :="123" fmt.Printf("%s",s)   | 123          |
| %t     | 取bool类型的值 | b:=true fmt.Printf("%t",b)     | true         |
| %p     | 取内存地址     | p :="123" fmt.Printf("%p", &p) | 0xc0000461f0 |

#### 布尔类型

| 格式 | 描述                      |
| :--- | :------------------------ |
| %t   | 布尔类型（true 或 false） |

```go
//布尔类型
//ok := true
//fmt.Printf("%s,%t \n", ok, ok)
```

#### 整数类型

| 格式 | 描述                                                         |
| :--- | :----------------------------------------------------------- |
| %b   | 二进制                                                       |
| %c   | 将数字按照ASCII码转换为对应的字符，比如65会转成字符A         |
| %d   | 十进制                                                       |
| %5d  | 表示该整型长度是 5，不足 5 则在数值前补空格；如果超出 5，则以实际为准 |
| %05d | 表示该整型长度是 5，不足 5 则在数值前补 0；如果超出 5，则以实际为准 |
| %o   | 八进制（Octal）                                              |
| %q   | 该值对应的单引号括起来的Go语言语法字符字面值，必要时会采用安全的转义表示 |
| %x   | 十六进制（a~f）                                              |
| %X   | 十六进制（A~F）                                              |
| %U   | unicode 格式                                                 |

```go
package main
import "fmt"
func main() {
 	var r rune = 65
	//整数类型
	fmt.Printf("%T, %d \n", 123456789, 123456789)   //int, 123456789
	fmt.Printf("%T, %5d \n", 123456789, 123456789)  //int, 123456789
	fmt.Printf("%T, %5d \n", 12, 12)                //int,    12
	fmt.Printf("%T, %05d \n", 123456789, 123456789) //int, 123456789
	fmt.Printf("%T, %05d \n", 12, 12)               //int, 00012
	fmt.Printf("%T, %b \n", 123456789, 123456789)   //int, 111010110111100110100010101
	fmt.Printf("%T, %o \n", 123456789, 123456789)   //int, 726746425
	fmt.Printf("%T, %c \n", 66, 66)                 //int, B
	fmt.Printf("%T, %q \n", 66, 66)                 //int, 'B'
	fmt.Printf("%T, %x \n", 123456789, 123456789)   //int, 75bcd15
	fmt.Printf("%T, %X \n", 123456789, 123456789)   //int, 75BCD15
	fmt.Printf("%T, %U \n", '中', '中')               //int32, U+4E2D //字符的字面量是rune类型
	fmt.Printf("%T, %v ,%s \n", r, r, string(r))    //int32, 65 ,A
	fmt.Printf("%T, %c \n", r, r)                   //int32 ,A

	var s = "AB"
	fmt.Println(s[0])
	for i, item := range s {
		//0 : A
		//1 : B
		fmt.Println(i, ":", string(item))
	}
}
```

#### 浮点类型

| 格式 | 描述                                                         |
| :--- | :----------------------------------------------------------- |
| %b   | 用科学计数法表示的指数为2的浮点数（无小数部分），如 -123p-32 |
| %e   | 以科学记数法e表示的浮点数或者复数值                          |
| %.5e | 有5位小数部分的科学计数法，如 1.00012e+03                    |
| %E   | 以科学记数法E表示的浮点数或者复数值                          |
| %5E  | 保留5位小数                                                  |
| %f   | 10进制浮点数，默认6位小数                                    |
| %.5f | 保留5位小数                                                  |
| %F   | 与%f等价                                                     |
| %g   | 根据实际情况采用 %e 或 %f 格式（获得更简洁、准确的输出）     |
| %G   | 根据实际情况采用 %E 或 %F 格式（获得更简洁、准确的输出）     |

```go
	//浮点型
	fmt.Printf("%b \n", 1000.123456789)   //8797178959608267p-43
	fmt.Printf("%f \n", 1000.123456789)   //1000.123457
	fmt.Printf("%f\n", 1000.0)            //1000.000000
	fmt.Printf("%.2f \n", 1000.123456789) //1000.12
	fmt.Printf("%.2f \n", 1000.125)       //1000.12
	fmt.Printf("%.2f \n", 1000.126)       //1000.13
	fmt.Printf("%e\n", 1000.1234567898)   //1.000123e+03
	fmt.Printf("%.5e\n", 1000.1234567898) //1.00012e+03
	fmt.Printf("%E\n", 1000.1234567898)   //1E+03
	fmt.Printf("%.5E\n", 1000.1234567898) //1.00012E+03
	fmt.Printf("%F \n", 1000.123456789)   //1000.123457
	fmt.Printf("%g \n", 1000.123456789)   //1000.123456789
	fmt.Printf("%G \n", 1000.123456789)   //1000.123456789

```

#### 字符串

| 格式 | 描述                                                         |
| :--- | :----------------------------------------------------------- |
| %s   | 直接输出字符串或者字节数组                                   |
| %q   | 该值对应的双引号括起来的Go语法字符串字面值，必要时会采用安全的转义表示 |
| %x   | 每个字节用两字符十六进制数表示，使用 a~f                     |
| %X   | 每个字节用两字符十六进制数表示，使用 A~F                     |

```go
	arr := []byte{'g', 'o', 'l', 'a', 'n', 'g'}
	arr1 := []byte{103, 111, 108, 97, 110, 103}
	arr2 := []uint8{103, 111, 108, 97, 110, 103}
	arr3 := []byte{'g', 'o', 'l', 'a', 'n', 'g'}
	fmt.Printf("%s \n", "go面试专题")       //go面试专题
	fmt.Printf("%q \n", "go面试专题")       //"go面试专题"
	fmt.Printf("%x \n", "go面试专题")       //676fe99da2e8af95e4b893e9a298
	fmt.Printf("%X \n", "go面试专题")       //676FE99DA2E8AF95E4B893E9A298
	fmt.Printf("%T, %s \n", arr, arr)   //[]uint8, golang
	fmt.Printf("%T, %q \n", arr, arr)   //[]uint8, "golang"
	fmt.Printf("%T, %x \n", arr, arr)   //[]uint8, 676f6c616e67
	fmt.Printf("%T, %X \n", arr, arr)   //[]uint8, 676F6C616E67
	fmt.Printf("%T, %s \n", arr1, arr1) //[]uint8, golang
	fmt.Printf("%T, %s \n", arr2, arr2) //[]uint8, golang
	fmt.Printf("%T, %s \n", arr3, arr3) //[]uint8, golang
```

#### 指针

| 格式 | 描述                                                         |
| :--- | :----------------------------------------------------------- |
| %p   | 以十六进制(基数为16)表示的一个值的地址，前缀为0x,字母使用小写的a-f表示 |

```go
	// 指针
	var name *string
	tmp := "go面试"
	name = &tmp
	fmt.Printf("%p \n", name) //0xc00009e220
```

#### fmt的几个print函数的区别

| 函数        | 是否支持格式化 | 是否添加换行符 |
| :---------- | :------------- | :------------- |
| fmt.Print   | 否             | 否             |
| fmt.Printf  | 是             | 否             |
| fmt.Println | 否             | 是             |

> 注意：
>
> 1. `fmt.Println` 会在相邻两个参数之间输出空格，而 `fmt.Print` 仅在相邻两个参数都不是字符串类型的时候才会在参数之间输出空格；
> 2. `fmt.Println` 函数会在结尾追加换行符。

##### %v %+v %#v的区别

我们通过下面的实例来说明：

```go
package main

import (
	"fmt"
)

type S struct {
	Name *string
	Id   int
}

func (s *S) String() string {
	return fmt.Sprintf("${Id:%v,Name:%v}", s.Id, *s.Name)
}

type M map[string]*S

func main() {
	name1 := "name1"
	name2 := "name2"
	s1 := S{
		Name: &name1,
		Id:   1,
	}

	s2 := &S{
		Name: &name2,
		Id:   2,
	}
	m := make(map[string]*S)
	m["m1"] = &s1
	m["m2"] = s2

	//S2声明的时候使用了地址，所以会调用String方法
	fmt.Printf("s1 : %v ; s2 : %v ; m: %v \n", s1, s2, m)
	fmt.Printf("s1 : %+v ;s2 : %+v ; m: %+v \n", s1, s2, m)
	fmt.Printf("s1 : %#v ;s2 : %#v ; m: %#v \n", s1, s2, m)

}
```

上面我们定义了一个结构体，结构体中的 `Name` 字段是指针类型

还定义了一个 `map`，`map` 的值为上面定义的结构体。

上面的代码执行结果为：

```shell
s1 : {0xc00009e020 1} ; s2 : ${Id:2,Name:name2} ; m: map[m1:${Id:1,Name:name1} m2:${Id:2,Name:name2}] 

s1 : {Name:0xc00009e020 Id:1} ;s2 : ${Id:2,Name:name2} ; m: map[m1:${Id:1,Name:name1} m2:${Id:2,Name:name2}] 

s1 : main.S{Name:(*string)(0xc00009e020), Id:1} ;s2 : ${Id:2,Name:name2} ; m: map[string]*main.S{"m1":(*main.S)(0xc00009e040), "m2":(*main.S)(0xc00009e050)} 
```

对 s1的打印我们分别了`%v`，`%+v` 和 `%#v` ,我们可以发现:

1. `%v` 只输出结构体的所有的值，不会输出结构体的字段名;
2. `%+v` 不仅会输出结构体的值，还会输出结构体的字段名;
3. `%#v` 在输出结构体的值和字段名的基础上，还会输出结构体的名字以及字段中指针类型的名称.

### 指针类型

> 我们不妨先了解一下Go语言中的指针，它主要由两大核心概念构成：**类型指针**和**切片指针**。
>

- ### **类型指针：高效传递数据与安全控制**

  - **避免副本**：传递大型结构体时直接使用指针，避免内存复制。

  - **禁止偏移运算**：确保指针只能操作目标数据，防止非法修改其他内存区域。
  - **垃圾回收友好**：指针明确指向目标内存，便于 GC 快速识别和回收。


```go
// 修改用户状态的函数（传递指针）
func activateUser(u *User) {
    u.IsActive = true // 直接修改原始数据
}
```

- ### **切片指针：动态管理与越界恢复**

  - **本质**：指向切片结构体的指针，切片本身是包含三个字段的复合类型（底层数组指针、长度、容量）。
  - **核心特性**：
    - 支持动态扩容和收缩（如通过 `append` 修改容量）；
    - 通过共享底层数组实现高效数据共享；
    - 越界访问会触发 `panic`，但可通过 `recover` 恢复程序

> 在Go语言中，“`&`” 运算符的作用是获取变量的内存地址，而“`*`” 运算符的作用是获取某个地址对应的值。

具体请看下面的示例：

```Go
// exampleNumberA变量（整数型变量）声明和赋值
var exampleNumberA int = 10
// 获取exampleNumberA的地址，并赋值给exampleNumberAPtr变量（exampleNumberAPtr的类型是指针类型）
exampleNumberAPtr := &exampleNumberA
//输 出exampleNumberAPtr变量的值（将输出内存地址）
fmt.Println(exampleNumberAPtr)
// 获取exampleNumberAPtr（指针变量）表示的实际数据值，并赋值给exampleNumberAPtrValue变量（整数型变量）
exampleNumberAPtrValue := *exampleNumberAPtr
// 输出exampleNumberAPtrValue变量（整数型变量）的值
fmt.Println(exampleNumberAPtrValue)
```

运行后，控制台输出：

> 0xc00001a088 
> 10

另外，我们还可以使用`new()`函数直接创建指针变量，相当于在内存中创建了**没有变量名**的**某种类型**的**变量**。

这样做无需产生新的数据“代号”，取值和赋值转而通过指针变量完成。常用在无需变量名或必须要传递指针变量值的场景中。

`new()`函数的使用格式如下：

```Go
new(type)
```

其中，`type`是所在地址存放的数据类型。一旦完成创建，便会在内存中“安家”，完成内存分配，即使没有赋值。

具体代码示例如下：

```Go
// 使用new()函数创建名为exampleNumberAPtr指针类型变量，表示int64型值
exampleNumberAPtr := new(int64)
// 修改exampleNumberAPtr表示的实际数据值
*exampleNumberAPtr = 100
// 获取exampleNumberAPtr表示的实际数据值
fmt.Println(*exampleNumberAPtr)
```

程序运行后，控制台将输出：

> 100

## 流程控制

### if 语句

条件语句的格式如下：

```go
if condition {
    
}
```

> 另外：if 语句后面可以跟多个语句条件，允许先赋值再判断，其作用域仅限于当前F语句块内，一旦离开该块，所定义的变量将不再有效。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430180859402.png" alt="image-20250430180859402" style="zoom:20%;" />

```go
if contents, err := ioutil.ReadFile(`test.txt`); err == nil {
		fmt.Println(string(contents))
} else {
    fmt.Println("cannot print file contents:", err)
}
```

### switch 语句

>  - `switch` 语句中的 `case` 表达式可以是任意类型
>
>  - `switch` 语句中的 `case` 表达式可以是多个值
>
>  - `switch` 语句除了可以是常量变量外，还可以是表达式或函数调用
>
>  - `switch` 语句默认在每个 `case` 之后包含`break`，无需显式添加
>
>  - 如果在 `switch ` 语句中不希望执行 `break`，反而需要使用特定结构如 `fallthrough` 来实现

```go
// switch语法一
switch 变量名 {
    case 数值1: 分支1
    case 数值2: 分支2
    case 数值3: 分支3
    ...
    default:
        最后一个分支
}


// 语法二 省略变量 相当于作用在了bool 类型上
func grade(score int) string {
    switch {
      case score < 60:
         return "F"
      case score < 80:
         return "C"
      case score < 90:
         return "B"
      default:
         return "A"
    }
}

// 语法三 case 后可以跟随多个数值， 满足其中一个就执行
switch num  {
    case 1,2,3:
        fmt.Println("num符合其中某一个 执行代码")
    case 4,5,6:
        fmt.Println("执行此代码")
}

// 语法四 可以添加初始化变量 作用于switch内部
switch name:="huangrong"; name{
    case "guojing":
        fmt.Println("shideguojing")
    case "huangrong":
        fmt.Println("shidehuangrong")
} 

// 语法五 switch 语句除了可以是常量变量外，还可以是表达式或函数调用
switch x + y {
    case 1:
        fmt.Println("x + y = 1")
    case 2:
        fmt.Println("x + y = 2")
    default:
        fmt.Println("default")
}

switch time.Now().Weekday() {
    case time.Saturday, time.Sunday:
        fmt.Println("weekend")
    default:
        fmt.Println("weekday")
}
```

### for 循环语句

循环结构的格式如下：

```go
for init; condition; post {
    //循环体代码块
}
```

```go
sum := 0
for i:= 1; i <= 100; i++ {
  sum += i
}
```

>  注意：go 语言没有`while`关键字，其功能被 `for` 循环所涵盖，因此去掉了`while`。

```go
for {
   fmt.Println("abc")
}
```

#### 多层嵌套中的break和continue

默认都只结束当前一层循环，如果想要结束到指定循环，需要给循环体前贴上标签。

```go
flag:
    for i := 1; i < 10; i++ {
        for j := 1; j < i; j++ {
            fmt.Println(i, j)
            if j == 5 {
                break flag
            }
        }
        fmt.Println(i)
    }
```

#### goto语句

可以跳转到程序中指定的行和嵌套循环里的`break`标签是一样的，不管后面还有多少代码都不再执行。

```go
//语法
lable:func1
    ...
goto label
```

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430181247832.png" alt="image-20250430181247832" style="zoom:30%;" />

```go
TestLabel: //标签
    for a := 20; a < 35; a++ {
       if a == 25 {
          a += 1
          goto TestLabel
       }
       fmt.Println(a)
       a++
    }
}
```

## 数组、切片和集合

### 数组

#### 声明

Go语言中声明数组的一般格式为：

```go
var array_name [quantity]Type
```

例如：

```go
var resultArray [4]int
```

声明后即可为单个元素赋值了。和其它的编程语言类似。

例如：

```go
resultArray[2] = 5
```

* 数组有长度限制，访问和复制不能超过数组定义的长度，否则就会下标越界。
* 数组的长度，用内置函数 `len()`来获取。
* 数组的容量，用内置函数 `cap()`来获取。

```go
fmt.Println("数组的长度为：",len(arr))//  数组中实际存储的数据量
fmt.Println("数组的容量为：",cap(arr))//容器中能够存储的最大数据量  因为数组是定长的 所以长度和容量是相同的
```

#### 创建

```go
//  默认情况下 数组中每个元素初始化时候 根据元素的类型 对应该数据类型的零值，
arr1 := [3]int{1,2}
fmt.Println(arr1[2])// 下标为2的元素没有默认取int类型的零值

// 数组创建方式1 创建时 直接将值赋到数组里
arr2 := [5]int{1,2,3,4}    // 值可以少 默认是0  但是不能超过定长

// 在指定位置上存储值
arr3 := [5]int{1:2,3:5}// 在下标为1的位置存储2，在下标为3的位置存储5
```

在创建数组时候长度可以省略，用 ... 代替，表示数组的长度可以由初始化时候数组中的元素的个数来决定。

```go
// 长度可以用...代替  根据数值长度程序自动填充数值的大小
arr4 :=  [...]int{1,2,3,4}

// 简短声明方式
arr5 := [...]int{2:3,6:3}//在固定位置存储固定的值
```

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430181620045.png" alt="image-20250430181620045" style="zoom:25%;" />

#### 遍历

使用`for range` 进行循环数组中的元素，依次打印数组中的元素。

1. `range` 不需要操作下标，每次循环自动获取元素中的下标和对应的值。如果到达数组的末尾，自动结束循环。

```go
arr := [5]int{1,2,3,4,5}
// range方式循环数组
for index,value:=range arr {
    fmt.Println(index,value)
}
```

2. 可以通过 for循环 配合下标来访问数组中的元素。

```go
arr := [5]int{1,2,3,4,5}
// for循环
for i:=0; i<len(arr);i++ {
    fmt.Println(arr[i])
}
```

### 切片

使用数组来存放一些结果，很容易引发下标越界错误。和数组相对，Go语言还提供了一种专门存放**不定元素个数**的数据结构——切片。

#### 声明

在Go语言中，切片的声明一般格式为：

```go
var slice_name []Type
```

> 💡 提示： 注意到了吗？声明切片和数组的区别仅仅是去掉了中括号中的元素个数！

例如：

```go
var resultSlice []int
```

> ❗️ 注意： 和数组类似，切片中的元素也不限制值的类型，但要求所有元素均为相同的类型。

通常情况下，使用`make`函数来创建一个切片，切片有长度和容量，默认情况下它的容量与长度相等。所以可以不用指定容量。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430181831702.png" alt="image-20250430181831702" style="zoom: 25%;" />

```go
// 使用make函数来创建切片
slice :=make([]int,3,5)// 长度为3 容量为5  容量如果省略 则默认与长度相等也为3
fmt.Println(slice)// [0,0,0] 
fmt.Println(len(slice),cap(slice))// 长度3,容量5
```

#### 切片追加元素append()

完成切片的声明后，就来到赋值环节。

与数组不同，为切片赋值可以理解为“**扩充**”。

在一开始，切片里面的元素个数为0。“扩充”一个值，就相当于为切片中的第一个元素赋值。赋值后，切片的元素个数就变成了1。若再次“扩充”，则相当于为切片中的第二个元素赋值。赋值后，切片的元素个数就变成了2，以此类推……

> 在Go语言中，为切片“扩充”需要使用`append()`函数，使用格式如下：

```go
slice_name = append(slice_name, value...)
```

例如：

```go
// 使用append() 给切片末尾追加元素
var slice []int
slice = append(slice, 1, 2, 3)
fmt.Println(slice) // [1, 2, 3]

// 使用make函数创建切片
s1:=make([]int,0,5)
fmt.Println(s1)// [] 打印空的切片
s1=append(s1,1,2)
fmt.Println(s1)// [1,2]
// 因为切片可以扩容  所以定义容量为5 但是可以加无数个数值
s1=append(s1,3,4,5,6,7)
fmt.Println(s1)// [1,2,3,4,5,6,7] 

// 添加一组切片到另一切片中
s2:=make([]int,0,3)
s2=append(s2,s1...) //...表示将另一个切片数组完整加入到当前切片中
```

#### make()与new() 的区别

- `make()`是Go语言中的内置函数，不仅会分配内存，还会初始化。`new()`只会分配零值填充的值。
- `make()`，只适用 `slice`，`map`，`channel`的数据，`new()`没有限制。
- `make()`返回原始类型（`T`）, `new()` 返回类型的指针（`*T`）

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430182157366.png" alt="image-20250430182157366" style="zoom:25%;" />

```go
// 测试使用new方法新建切片
slice1 := new([]int)
fmt.Println(slice1) // 输出的是一个地址  &[]

// 使用make创建切片
slice2 := make([]int, 5)
fmt.Println(slice2)// 输出初始值都为0的数组， [0 0 0 0 0]

fmt.Println(slice1[0])// 结果出错 slice1是一个空指针 invalid operation: slice1[0] (type *[]int does not support indexing)
fmt.Println(slice2[0])// 结果为 0 因为已经初始化了
```

#### 切片是如何扩容的

```go
package main

import (
    "fmt"
)

func main() {
    s1 := make([]int, 0, 3)
    fmt.Printf("地址%p,长度%d,容量%d", s1, len(s1), cap(s1))
    s1 = append(s1, 1, 2)
    fmt.Printf("地址%p,长度%d,容量%d", s1, len(s1), cap(s1))
    s1 = append(s1, 3, 4, 5)
    fmt.Printf("地址%p,长度%d,容量%d", s1, len(s1), cap(s1))
}
```

```shel
//地址0xc000010540,长度0,容量3
//地址0xc000010540,长度2,容量3
//地址0xc00000e4b0,长度5,容量6
```

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430182312640.png" alt="image-20250430182312640" style="zoom:30%;" />

容量成倍数扩充 3--->6--->12--->24......

> - 如果添加的数据容量够用, 地址则不变。
> - 如果实现了扩容， 地址就会发生改变成新的地址，旧的则自动销毁。

### 数组和切片对比

#### 相同点

- 数组和切片都要求全部元素的类型都必须相同；
- 数组和切片的所有元素都是紧挨着存放在一块 **连续** 的内存中。

#### 不同点

- 数组的零值是每个元素类型的零值，切片的零值是`nil`

- 数组和切片的值存储形式不同
  - 数组的存储形式直接存储元素，而指针的存储结构相对复杂，可以看成包含长度、容量和指针值的结构体。
  
  - <img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250504102827988.png" alt="image-20250504102827988" style="zoom:45%;" />
  
  - 对切片进行赋值时，实际上是将切片的结构体基本信息进行拷贝，复制给另一个变量，而非直接复制数组内容。
  
  - ```go
    	//数组和切片的传值方式不同
    	slice1 := []int{1, 2, 3, 4}
    	slice2 := slice1
    	//slice1和slice2指向了相同的地址
    	fmt.Printf("slice1 ptr:%p;slice2 ptr:%p\n", slice1, slice2
    	
    	array1 := [4]int{1, 2, 3, 4}
    	array2 := array1
    	//array1和array2指向了不同的地址
    	fmt.Printf("array1 ptr:%p;array2 ptr:%p\n", &array1, &array2)
    ```
  
  - <img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250504102915265.png" alt="image-20250504102915265" style="zoom:45%;" />

### Map

#### 声明

Go语言中声明集合的一般格式为：

```go
var map_name = make(map[key_type]value_type)
```

例如：

```go
//  1, 声明map 默认值是nil
var m1 map[key_data_type]value_data_type
//  2，使用make声明
m2:=make(map[key_data_type]value_data_type)
// 3,直接声明并初始化赋值map方法
m3:=map[string]int{"语文":89,"数学":23,"英语":90}
```

#### 使用

- `map` 是引用类型的，如果声明没有初始化值，默认是nil。
- 空的切片是可以直接使用的，因为他有对应的底层数组，空的`map`不能直接使用。需要先`make`之后才能使用。

```go
var m1 map[int]string         //  只是声明 nil
var m2 = make(map[int]string) // 创建
m3 := map[string]int{"语文": 89, "数学": 23, "英语": 90}

fmt.Println(m1 == nil) //true
fmt.Println(m2 == nil) //false
fmt.Println(m3 == nil) //false

// map 为nil的时候不能使用 所以使用之前先判断是否为nil
if m1 == nil {
    m1 = make(map[int]string)
}

// 1存储键值对到map中  语法:map[key]=value
m1[1]="小猪"
m1[2]="小猫"

//2获取map中的键值对  语法:map[key]
val := m1[2]
fmt.Println(val)

//  3判断key是否存在   语法：value,ok:=map[key]
val, ok := m1[1]
fmt.Println(val, ok) // 结果返回两个值，一个是当前获取的key对应的val值。二是当前值否存在，会返回一个true或false。

//4修改map  如果不存在则添加， 如果存在直接修改原有数据。
m1[1] = "小狗"

// 5删除map中key对应的键值对数据 语法: delete(map, key)
delete(m1, 1)

// 6 获取map中的总长度 len(map)
fmt.Println(len(m1))
```

### 循环遍历

除了for循环外，Go语言还提供了`range`关键字。与`for`结合，也可以实现循环遍历，其使用格式如下：

```go
for index, value := range variable {
    // 循环体
}
```

- `index`表示索引或键的值；
- `value`表示元素的值；
- `variable`表示数组、切片或集合变量

> for 循环对比 for-range：

- 使用`for`循环：

```
slice := []int{1, 2, 3, 4, 5}
for i := 0; i < len(slice); i++ {
    fmt.Println(slice[i])
}
```

- 使用`range`：

```
slice := []int{1, 2, 3, 4, 5}
for i, v := range slice {
    fmt.Println(i, v)
}
```

`range`自动处理了索引`i`和值`v`的赋值，并且代码更加简洁。

这种for与range结合实现循环遍历的结构，也被称为**for-range结构**。这种结构同样适用于数组和切片。

### 值传递与引用传递

数据如果按照数据类型划分

* 基本类型: `int、float、string、bool`
* 复合类型: `array、slice、map、struct、pointer、function、chan`

按照数据特点划分分为

* 值类型：`int、float、string、bool、array、struct` 值传递是传递的数值本身，不是内存地址，将数据备份一份传给其他地址，本身不影响，如果修改不会影响原有数据。
* 引用类型: `slice、pointer、map、chan` 等都是引用类型。 引用传递因为存储的是内存地址，所以传递的时候则传递是内存地址，所以会出现多个变量引用同一个内存。

```go
// 数组为值传递类型
// 定义一个数组 arr1
arr1 := [4]int{1, 2, 3, 4}
arr2 := arr1            // 将arr1的值赋给arr2
fmt.Println(arr1, arr2) // [1 2 3 4] [1 2 3 4]  输出结果 arr1与arr2相同，
arr1[2] = 200           // 修改arr1中下标为2的值
fmt.Println(arr1, arr2) // [1 2 200 4] [1 2 3 4] 结果arr1中结果改变,arr2中不影响
// 说明只是将arr1中的值给了arr2 修改arr1中的值后并不影响arr2的值

// 切片是引用类型
// 定义一个切片 slice1
slice1 := []int{1, 2, 3, 4}
slice2 := slice1            // 将slice1的地址引用到slice2
fmt.Println(slice2, slice2) // [1 2 3 4] [1 2 3 4]   slice1输出结果 slice2输出指向slice1的结果，
slice1[2] = 200             // 修改slice1中下标为2的值
fmt.Println(slice1, slice2) // [1 2 200 4] [1 2 200 4] 结果slice1中结果改变,因为修改的是同一份数据
// 说明只是将slice1中的值给了slice2 修改slice1中的值后引用地址用的是同一份 slice1 和slice2 同时修改

fmt.Printf("%p,%p", slice1, slice2)// 0xc000012520,0xc000012520
// 切片引用的底层数组是同一个 所以值为一个地址 是引用的底层数组的地址
fmt.Printf("%p,%p", &slice1, &slice2)// 0xc0000044a0,0xc0000044c0
// 切片本身的地址
```

## 函数

### 普通函数的定义和调用

在Go语言中，定义一个普通函数的格式如下：

```go
func function_name([params_list])([return_values_list]){
    // 函数体
}
```

- `func`关键字表示定义一个函数；
- `function_name`是函数名；
- `params_list`表示参数列表；
- `return_values_list`表示函数的返回值列表；

> 参数列表和返回值列表是可选的。有些函数无需参数，有些参数运行后并不会有任何返回值，有些函数则无需参数也无需返回值。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430214245142.png" alt="image-20250430214245142" style="zoom:25%;" />

### 函数的可见性

- 函数的首字母区分大小写，如果是大写的表示公共的函数，其他包内可以调用到
  - 相当于其他语言中的 `public` 
  - 前提是在别的包中引入了当前包。
- 如果是小写的，表示私有的函数，仅能够在本包中调用
  - 相当于其他语言中的 `private`。

### **值传递**和**引用传递**

> 在 Go 语言中，**所有函数参数都是值传递**，但引用类型（如切片、map、指针等）的“值”包含指向数据的地址。

在Go语言中，**函数的参数传递只有值传递**，而且传递的实参都是原始数据的一份拷贝。如果拷贝的内容是值类型的，那么在函数中无法修改原始数据，如果拷贝的内容是指针(或者可以理解为引用类型)，那么可以在函数中修改原始数据。

#### 值传递的陷阱

```go
func main() {
    s := []int{1, 2}
    modify(s)
    fmt.Println(s) // 输出 [1, 2]，未改变！
}

func modify(s []int) {
    s = append(s, 3) // 扩容导致底层数组重新分配，s指向新地址
}
```

- 虽然切片是引用类型，但传递的是切片的**副本**（包含原指针、长度、容量）。
- `append` 可能触发底层数组扩容，此时函数内的 `s` 指向新地址，但外部的切片仍指向旧地址。

#### 如何正确修改外部数据

传递**指针**（即引用传递）：

```go
func main() {
    s := []int{1, 2}
    modify(&s)
    fmt.Println(s) // 输出 [1, 2, 3]
}

func modify(s *[]int) {
    *s = append(*s, 3) // 直接修改原切片的指针
}
```

- 传递切片的地址，函数内操作指针指向的真实数据。
- 即使扩容导致底层数组变化，原指针也会被更新。

### 函数的延迟调用（defer）

> `defer` 是 go 语言中的一个关键字，同时它也是go语言的重要特性，类似 Java中的 `finally` 可以用来指定在函数返回前执行的代码。
>
> 使用 `defer` 关键字的代码段可以延迟到函数执行完毕后，在函数返回前执行，且多个 `defer` 存在时，它们的顺序是反向的。
>
> 它主要用于资源的释放和异常的捕获。比如打开文件或发起请求后关闭资源，加锁后在函数返回前的解锁操作，关闭数据库链接，捕获异常等。

我们可以通过下面的例子来说明：

```go
package main

import "fmt"

func main() {
	defer fmt.Println(1)
	defer fmt.Println(2)
	defer fmt.Println(3)
}
```

输出结果为：

```shell
3 
2 
1
```

#### defer的底层原理

##### 底层数据结构

源码位置: $GOPATH/src/runtime/runtime2.go

```go
type _defer struct {
   // 参数和返回值的内存大小
   siz     int32   
    
   // 表示该_defer语句是否已经开始执行
   started bool 
   
	// 表示该_defer语句的优先级
	// 当一个_defer语句被执行时，它会被添加到_defer链表中，而heap字段则用于将_defer语句添加到一个优先队	列中，以便在函数返回时按照一定的顺序执行_defer语句。在_defer链表中，后添加的_defer语句会先被执行，而在优先队列中，heap值较小的_defer语句会先被执行。这个字段的值是在_defer语句被添加到_defer链表时根据一定规则计算出来的，通常是根据_defer语句的执行顺序和作用域等因素计算而得。在函数返回时，Go语言会按照heap值的大小顺序执行_defer语句。如果多个_defer语句的heap值相同，则它们会按照它们在_defer链表中的顺序依次执行。这个机制可以确保_defer语句按照一定的顺序执行，从而避免了一些潜在的问题。
    heap    bool       
  
    // 表示该_defer用于具有开放式编码_defer的帧。开放式编码_defer是指在编译时已经确定_defer语句的数量和位置，而不是在运行时动态添加_defer语句。在一个帧中，可能会有多个_defer语句，但只会有一个_defer结构体记录了所有_defer语句的信息，而openDefer就是用来标识该_defer结构体是否是针对开放式编码_defer的
   openDefer bool
    
   // _defer语句所在栈帧的栈指针（stack pointer）
   // 在函数调用时，每个函数都会创建一个新的栈帧，用于保存函数的局部变量、参数和返回值等信息。而_defer语句也被保存在这个栈帧中，因此需要记录栈指针以便在函数返回时找到_defer语句。当一个_defer语句被执行时，它会被添加到_defer链表中，并记录当前栈帧的栈指针。在函数返回时，Go语言会遍历_defer链表，并执行其中的_defer语句。而在执行_defer语句时，需要使用保存在_defer结构体中的栈指针来访问_defer语句所在栈帧中的局部变量和参数等信息。需要注意的是，由于_defer语句是在函数返回之前执行的，因此在执行_defer语句时，函数的栈帧可能已经被销毁了。因此，_sp字段的值不能直接使用，需要通过一些额外的处理来确保_defer语句能够正确地访问栈帧中的信息。
   sp        uintptr 
    
   // _defer语句的程序计数器（program counter）
   // 程序计数器是一个指针，指向正在执行的函数中的下一条指令。在_defer语句被执行时，它会被添加到_defer链表中，并记录当前函数的程序计数器。当函数返回时，Go语言会遍历_defer链表，并执行其中的_defer语句。而在执行_defer语句时，需要让程序计数器指向_defer语句中的函数调用，以便正确地执行_defer语句中的代码。这就是为什么_defer语句需要记录程序计数器的原因。需要注意的是，由于_defer语句是在函数返回之前执行的，因此在执行_defer语句时，程序计数器可能已经指向了其它的函数或代码块。因此，在执行_defer语句时，需要使用保存在_defer结构体中的程序计数器来确保_defer语句中的代码能够正确地执行。
   pc        uintptr  // pc 计数器值，程序计数器
    
   // defer 传入的函数地址，也就是延后执行的函数
   fn        *funcval 
    
    //efer 的 panic 结构体
   _panic    *_panic  
    
    // 用于将多个defer链接起来，形成一个defer栈
    // 当程序执行到一个 defer 语句时，会将该 defer 语句封装成一个 _defer 结构体，并将其插入到 defer 栈的顶部。当函数返回时，程序会从 defer 栈的顶部开始依次执行每个 defer 语句，直到 defer 栈为空为止。每个 _defer 结构体中的 link 字段指向下一个 _defer 结构体，从而将多个 _defer 结构体链接在一起。当程序执行完一个 defer 语句后，会将该 defer 从 defer 栈中弹出，并将其 link 字段指向的下一个 _defer 结构体设置为当前的 defer 栈顶。这样，当函数返回时，程序会依次执行每个 defer 语句，从而实现 defer 语句的反转执行顺序的效果。需要注意的是，由于 _defer 结构体是在运行时动态创建的，因此 defer 栈的大小是不固定的。在编写程序时，应该避免在单个函数中使用大量的 defer 语句，以免导致 defer 栈溢出。
   link      *_defer 
}
```

`defer` 本质上是一个用链表实现的栈的结构，我们可以看到，在 `defer` 的底层结构中有一个 `link` 的指针，这个指针会指向链表的头部，也就是我们每次声明 `defer` 的时候，就会将这个 `defer` 的数据插入到链表的头部的位置。在获取 `defer` 执行的时候是从链表的头部开始获取 `defer` 的，所以这就是为什么最后声明的 `defer` 最先执行的原因。

在 Golang 的源码中，`defer` 语句的实现主要涉及到以下几个部分：

1. `runtime.deferproc` 函数：该函数用于将一个函数和其参数封装成一个 `_defer` 结构体，并将其插入到当前协程的 `defer` 栈中。
2. `runtime.deferreturn` 函数：该函数用于在函数返回时执行 `defer` 栈中的 `_defer` 结构体。
3. `runtime.deferredFunc` 函数：该函数用于执行一个 `_defer` 结构体中封装的函数，并在执行过程中捕获 `panic`。

下面是 `runtime.deferproc` 的核心源码：

源码位置：src/runtime/panic.go

```go
func deferproc(siz int32, fn *funcval) { // arguments of fn follow fn
	gp := getg() //获取goroutine结构
	if gp.m.curg != gp {
		// go code on the system stack can't defer
		throw("defer on system stack")
	}
	...
	d := newdefer(siz) //新建一个defer结构
	if d._panic != nil {
		throw("deferproc: d.panic != nil after newdefer")
	}
	d.link = gp._defer // 新建defer的link指针指向g的defer
	gp._defer = d      // 新建defer放到g的defer位置，完成插入链表表头操作
	d.fn = fn
	d.pc = callerpc
	d.sp = sp
	...
}
```

##### 总结

Golang 的 `defer` 语句底层实现是通过一个栈来实现的。每个函数都有一个 `defer` 栈，当遇到 `defer` 语句时，会将要执行的语句压入该栈中。当函数返回时，会从 `defer` 栈中依次取出语句执行，直到栈为空为止。因为 `defer` 栈是与函数绑定的，所以不同的函数之间的 `defer` 栈是独立的，互不干扰。

在 Golang 中，`defer` 语句的实现是通过两个函数来完成的：`runtime.deferproc` 和 `runtime.deferreturn`。当遇到 `defer` 语句时，会调用 `runtime.deferproc` 函数将要执行的语句压入 `defer` 栈中。当函数返回时，会调用 `runtime.deferreturn` 函数从 `defer` 栈中取出语句执行。这两个函数都是 Golang 运行时库中的函数，不能直接调用。

#### defer 典型使用场景

##### 关闭文件

```go
func readFile(filename string) (string, error) {
    f, err := os.Open(filename)
    if err != nil {
        return "", err
    }
    defer f.Close() // 使用 defer 语句关闭文件
    content, err := ioutil.ReadAll(f)
    if err != nil {
        return "", err
    }
    return string(content), nil
}
```

##### 关闭 http 响应

```go
package main

import (
    "log"
    "net/http"
)

func main() {
    url := "http://www.baidu.com"

    resp, err := http.Get(url)
    if err != nil {
        log.Fatal(err)
    }

    defer resp.Body.Close() // 关闭响应体

    // 处理响应数据
}
```

##### 关闭数据库链接

```go
func queryDatabase() error {
    db, err := sql.Open("mysql", "user:password@tcp(localhost:3306)/database")
    if err != nil {
        return err
    }
    defer db.Close() // 在函数返回前关闭数据库连接
    // 查询数据库
    return nil
}
```

##### 释放锁

```go
var mu sync.Mutex
var balance int

func lockRelease(amount int) {
    mu.Lock()
    defer mu.Unlock() // 在函数返回前解锁
    balance += amount
}
```

##### 捕获异常

```go
func f() {
	defer func() {
		if err := recover(); err != nil {
			fmt.Println(string(debug.Stack()))
		}
	}()
	panic("unknown")
}
```

##### 取消任务

```go
func runTask() error {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel() // 在函数返回前取消任务
    go doTask(ctx)
    // 等待任务完成
    return nil
}
```

##### 记录程序耗时

```go
func trackTime() {
    start := time.Now()
    defer func() {
        log.Printf("Time took: %v", time.Since(start).Milliseconds())
    }()

    // 执行一些操作
    time.Sleep(time.Second * 3)
}
```

#### 打开10万个文件，如何使用 defer 关闭资源

一般来说文件操作都是比较耗时的操作，而操作系统对同时打开的 `文件句柄` 数量是有限制的，在大多数linux操作系统上为1024，我们可以通过 `ulimit -n` 指令查看，所以在操作大量文件时，我们需要考虑文件句柄的消耗。

我们下看下面的写法：

```go
func processFiles() error {
    for i := 0; i < 100000; i++ {
        file, err := os.Open("file" + strconv.Itoa(i) + ".txt")
        if err != nil {
            return err
        }
        defer file.Close()

        // 处理文件内容
        // ...
    }
    return nil
}
```

在上述代码中，打开文件的操作在 `for` 循环中进行。每次循环都会打开一个文件，并使用 `defer` 语句将其关闭。

看上去似乎没什么问题，但我们知道，`defer` 是在函数返回前执行的，也就是说上面的代码会先打开10万个文件再依次关闭文件句柄，这样在打开大量文件的场景下依然会导致系统资源被耗尽。

这种情况下我们应该怎么处理呢？

我们可以将文件的处理封装到一个函数中，每个文件处理完后就关闭资源：

```go
func processFiles1() error {
	for i := 0; i < 100000; i++ {
		processFile("file" + strconv.Itoa(i) + ".txt")
	}
	return nil
}

func processFile(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// 处理文件内容
	// ...
	return nil
}
```

为了加快文件的读取速度，我们通常异步并发处理文件

我们可以进一步优化代码如下：

```go
func processFiles2() error {
	var wg sync.WaitGroup
	for i := 0; i < 100000; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			processFile("file" + strconv.Itoa(i) + ".txt")
		}(i)
	}
	wg.Wait()
	return nil
}
```

上述代码中，使用了`sync.WaitGroup` 来等待所有协程处理完文件后再返回。每个协程都会打开一个文件并处理其内容，处理完后使用 `defer` 语句关闭文件资源。

> 但上面的程序并不是完全安全的，如果文件处理速度很慢，会存在协程堆积的情况，这样不仅会消耗大量的资源句柄，大量的文件同时载入内存，也可能导致系统内存占用过高，同样存在风险。

### panic 和 recover函数

#### panic

> `panic` 指的是 Go 程序在运行时出现的一个异常（`Exception`）情况。
>
> 如果这个异常没有被捕获并恢复，Go 程序的执行就会被终止，即便出现异常的位置不在主 `Goroutine`（也就是 `main` 函数） 中也会终止。

在 Go语言中，`panic` 主要有两类来源，一类是来自 Go 运行时（比如发生空指针异常，数组越界等），另一类则是调用 `panic` 函数主动触发的。

##### panicking 执行过程

> 无论是哪种 `panic`，一旦 `panic` 被触发，后续 Go 程序的执行过程都是一样的，这个过程被 Go 语言称为 `panicking`。

1. 当函数 `f` 调用 `panic` 函数时，函数 `f` 的执行将停止。但是，函数 `f` 中已进行求值的 `deferred` 函数都会得到正常执行，执行完这些 `deferred` 函数后，函数f才会把控制权返还给其调用者。
2. 对于函数f的调用者而言，函数 `f` 之后的行为就如同调用者调用的函数是 `panic` 一样，该 `panicking` 过程将继续在栈上进行下去，直到当前 `Goroutine` 中的所有函数都返回为止，然后 Go 程序将崩溃退出。

```go
func main() {
	println("call main")
	fn()
	println("exit main")
}

func fn() {
	println("call fn")
	fn1()
	println("exit fn")
}
func fn1() {
	println("call fn1")
	defer func() {
		fmt.Println("defer before panic in fn1")
	}()
	panic("panic in fn1")
    defer func() {
		fmt.Println("defer after panic in fn1")
	}()
	fn2()
	println("exit fn1")
}
func fn2() {
	println("call fn2")
	println("exit fn2")
}
```

上面这个例子中，从 Go 应用入口开始，函数的调用次序依次为 `main` -> `fn` -> `fn1`-> `fn2`。在 fn1 函数中，我们调用 `panic` 函数手动触发了 `panic`。
我们执行这个程序的输出结果如下：

```shell
call main 
call fn 
call fn1
defer before panic in fn1
panic: panic in fn1

goroutine 1 [running]:
main.fn1()
...
...
```

我们再根据前面对 `panicking` 过程的诠释，理解一下这个例子。

这里，程序从入口函数 `main` 开始依次调用了 fn、fn1 函数，在 fn1 函数中，代码在调用 fn2 函数之前调用了 `panic` 函数触发了异常。那示例的 `panicking `过程就从这里开始了。

fn1函数调用 `panic` 函数之后，它自身的执行就此停止了，所以我们也没有看到代码继续进入 fn2 函数执行，并且 `panic` 之后的 `defer` 函数也没有机会执行。由于 fn1 函数没有捕捉这个 `panic`，所以 `panic` 就会沿着函数调用栈向上传递，来到了 fn1 函数的调用者 fn 函数中。

从 fn 函数的视角来看，这就好比将它对 fn1 函数的调用，换成了对 `panic` 函数的调用一样。这样一来，fn 函数的执行也被停止了。由于 fn 函数也没有捕捉 `panic` ，于是 `panic` 继续沿着函数调用栈向上传递，来到了 fn 函数的调用者 `main` 函数中。

同理，从 `main` 函数的视角来看，这就好比将它对 fn 函数的调用，换成了对 `panic` 函数的调用一样。结果就是，`main` 函数的执行也被终止了，于是整个程序异常退出，日志 "exit main"也没有得到输出的机会。

#### recover

Go 语言也提供了捕捉 `panic` 并恢复程序正常执行的方式，我们可以通过 `recover`来实现：

```go
func main() {
	defer func() {
		if err := recover(); err != nil {
			fmt.Println("捕获了一个panic：", err)
			fmt.Println("防止了程序崩溃")
		}
	}()

	println("call main")
	fn()
	println("exit main")
}
```

在 `main` 函数中，我们在一个 `defer` 匿名函数中调用 `recover` 函数对 `panic` 进行了捕捉。

> `recover` 是 Go 内置的专门用于恢复 `panic` 的函数，它必须被放在一个 `defer` 函数中才能生效。
>
> - 如果 `recover` 捕捉到 `panic` ，它就会返回以 `panic` 的具体内容为错误上下文信息的错误值。
>
> - 如果没有 `panic` 发生，那么 `recover` 将返回 nil。而且，如果 `panic` 被 `recover` 捕捉到，`panic` 引发的 `panicking` 过程就会停止。

当然，我们将 `recover` 放在函数 fn1 中也是可以的，这取决于我们是不是希望捕获整个调用链的异常。通常如果我们希望程序在遇到异常不会退出，一般会将`recover` 放在最外层的函数中。

上面的程序会得到如下结果：

```shell
call main 
call fn 
call fn1
捕获了一个panic： panic in fn1
防止了程序崩溃
```

#### panic 和 recover 细节

我们需要注意下面几点：

1. `reocver` 必须在 `defer` 申明的匿名函数中执行才能捕获到异常，如果不使用 `defer`，`recover` 函数是在` panic` 调用之前就已经执行，等程序运行到`panic` 时是无法捕获到异常的；

2. 当 `recover` 与函数调用方不在同一个协程时，也是无法捕获到异常的，比如下面的代码：

   ```go
   func f() {
   	go func() {
   		defer func() {
   			if err := recover(); err != nil {
   				fmt.Println("recover", err)
   			}
   		}()
   	}()
   	panic("未知错误") // 演示目的产生的一个panic
   
   }
   ```

   由于上面的 `recover` 在一个新开的 `协程` 中，与函数 f() 已经不在同一个协程了，所以上面的 `panic` 是无法捕获到的。

3. 当前 `gorutine` 中的 `panic` 如果被一个 `defer` 中的 `panic` 覆盖，则在当前 `gorutine` 中只能捕获到最后一个 `panic`

   ```go
   func paincInCovered() {
   	defer func() {
   		if err := recover(); err != nil {
   			// main panic is override by defer2 panic
   			fmt.Println(err)
   		} else {
   			fmt.Println("defer1 recover nil")
   		}
   	}()
   
   	defer func() {
   		panic("defer2 panic")
   	}()
   
   	panic("main panic")
   }
   ```

   上面程序中 `panic(“main panic”)` 比 `panic(“defer2 panic”)` 先执行，但最终捕获到的是后执行的 `panic(“defer2 panic”)`

4. 注意多个 `defer` 语句中 `panic` 的执行顺序.

   当前协程中有多个 `defer` 语句中出现 `panic` 时，会先执行 `defer` 语句中 `panic` 之前的代码，再依次执行 `panic`

   ```go
   func panicInDefer() {
   
   	defer func() {
   		fmt.Println("defer1")
   		panic("defer1 panic")
   	}()
   
   	defer func() {
   		fmt.Println("defer2")
   		panic("defer2 panic")
   	}()
   
   	panic("main panic")
   
   }
   ```

   上面代码的输出结果为：

   ```shell
   defer2 
   defer1 
   panic: main panic
   panic: defer2 panic
   panic: defer1 panic
   
   goroutine 1 [running]:
   main.panicInDefer.func1()
   ...
   ...
   ```

5. 多个调用链中捕获 `panic` 时，会优先被当前协程中的 `recover` 所捕获

   ```go
   func CoveredByCurrentGorutine() {
   	defer func() {
   		if err := recover(); err != nil {
   			// main panic is override by defer2 panic
   			fmt.Println(err)
   		}
   	}()
   	f()
   }
   func f() {
   	go func() {
   		defer func() {
   			if err := recover(); err != nil {
   				fmt.Println("recover", err)
   			}
   		}()
   	}()
   	panic("未知错误") // 演示目的产生的一个panic
   
   }
   ```
   
   调用函数 `CoveredByCurrentGorutine()` 时，函数 f() 产生的 `panic` 会优先被函数 f() 中的 `recover` 所捕获。

#### 如何正确使用 panic&recover

在实际工作中是不是在所有 Go 函数或方法中，我们都要用 `recover` 来恢复 `panic` 呢？

其实是需要根据具体情况而定的。这里有几个经验可供参考：

1. 是否应该使用 `recover` 来避免 `panic` 主要取决于程序对 `panic` 的忍受度.
   - 不同应用对异常引起的程序崩溃退出的忍受度是不一样的。比如，一个单次运行于控制台窗口中的命令行交互类程序（CLI），和一个常驻内存的后端 HTTP 服务器程序，对异常崩溃的忍受度就是不同的。
   - 前者即便因异常崩溃，对用户来说也仅仅是再重新运行一次而已。但后者一旦崩溃，就很可能导致整个网站停止服务。
   - 所以，针对各种应用对 `panic` 忍受度的差异，我们采取的应对 `panic` 的策略也应该有不同。像后端 HTTP 服务器程序这样的关键任务系统，我们就需要在特定位置捕捉并恢复 `panic`，以保证服务器整体的健壮度。在这方面，Go 标准库中的 http server 就是一个典型的代表。
2. 此外，在程序启动时可能会初始化一些组件，比如数据库，缓存，消息队列等，如果发现这些系统依赖的核心组件连接不上，我们也应该及时 `panic`，让程序提前退出及时发现问题。使用 `panic` 来提示潜在 bug。

#### panic / recover机制的妙用

`panic` / `recover` 机制不仅限于防止程序出现异常的时候使用，我们还可以使用 `panic` / `recover` 机制来减少错误判断，简化代码。

比如下面代码中我们需要在一个函数中执行多个步骤，每一步都需要判断是否发生异常，如果有一步发生异常就需要停止执行并返回错误，一般我们可以这样实现：

```go
func doSomething() (err error) {
	isContinue, err := doStep1()
	if !isContinue {
		return err
	}
	isContinue, err = doStep2()
	if !isContinue {
		return err
	}
	isContinue, err = doStep3()
	if !isContinue {
		return err
	}
	return
}

func doStep1() (isContinue bool, err error) {
	// do something for doStep1
	return
}

func doStep2() (isContinue bool, err error) {
	// do something for doStep2
	return
}

func doStep3() (isContinue bool, err error) {
	// do something for doStep3
	return
}
```

上面的代码中错误判断太多，我们可以使用 `panic` / `recover` 机制来简化：

```go
package main

func main() {
	doSomething1()
}

func doSomething1() (err error) {

	defer func() {
		err, _ = recover().(error)
	}()
	doStep_1()
	doStep_2()
	doStep_3()
	return
}

func doStep_1() {
	var err error
	var done bool
	// do something for doStep1
	if err != nil {
		panic(err)
	}
	if done {
		panic(nil)
	}
}

func doStep_2() {
	var err error
	var done bool
	// do something for doStep2
	if err != nil {
		panic(err)
	}
	if done {
		panic(nil)
	}
}

func doStep_3() {
	var err error
	var done bool
	// do something for doStep3
	if err != nil {
		panic(err)
	}
	if done {
		panic(nil)
	}
}
```

上面的代码中，我们在在各个 `step` 中通过 `panic` 传递 `err` 和 nil 来通知调用函数是出现异常还是已完成任务需要继续执行，如果 `step` 函数中 `panic` 传递的为 nil，则说明任务需要继续执行。

### 匿名函数的定义和调用

> 回调保证了程序运行的正确性和及时性。**匿名函数则是实现回调的核心技能**。

在Go语言中，匿名函数的定义格式如下：

```go
func ([params_list])([return_values_list]){
    // 函数体
}
```

> ❗️ 注意： 请大家注意普通函数与匿名函数在定义时的区别，普通函数在定义时仅比匿名函数多了函数名。

定义了函数后，接下来便是如何调用它。

根据使用时机的不同，Go语言提供了两种调用匿名函数的方式：一是在定义时调用；二是将匿名函数赋值给变量，通过变量调用。

举例来说，下面的代码定义了一个匿名函数，实际作用便是在控制台输出传入的参数，类型是string：

```go
func main() {
   // 定义匿名函数
   func(text string) {
      fmt.Println(text)
   }
}
```

> 💡 提示：注意到了吗？和普通函数不同，匿名函数可以在某个普通函数内定义和使用。

如果要在该函数定义时便调用它，只需在大括号结束后，使用 **小括号将要传入的参数值包裹起来** 即可，比如：

```go
func main() {
   // 定义匿名函数
   func(text string) {
      fmt.Println(text)
   }("定义时就调用")
}
```

这段代码中，“定义时就调用”便是要传入的参数了。运行这段代码，控制台将输出这些文字。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430230743516.png" alt="image-20250430230743516" style="zoom:30%;" />

另一种调用匿名函数的方法是将匿名函数赋值给某个变量，然后通过变量调用。这听起来很神奇，写起来其实非常简单：

```go
func main() {
   // 定义匿名函数
   exampleVal := func(text string) {
      fmt.Println(text)
   }
   exampleVal("通过变量调用匿名函数")
}
```

如上代码所示，声明了变量exampleVal，并将匿名函数赋值给了它。在后续的代码中，即可随时使用exampleVal变量调用匿名函数了。

* 匿名函数可以作为另一个函数的参数
* 匿名函数可以作为另一个函数的返回值

下面讲解一下匿名函数实现回调的例子（很像java中的函数式编程）

```go
package main
import (
    "fmt"
)
func main() {
    res2 := oper(20, 12, add)
    fmt.Println(res2)
    
    // 匿名函数作为回调函数直接写入参数中
    res3 := oper(2, 4, func(a, b int) int {
        return a + b
    })
    fmt.Println(res3) 
}
func add(a, b int) int {
    return a + b
}
func reduce(a, b int) int {
    return a - b
}
// oper就叫做高阶函数
// fun 函数作为参数传递则fun在这里叫做回调函数
func oper(a, b int, fun func(int, int) int) int {
    fmt.Println(a, b, fun) // 20 12 0x49a810A   第三个打印的是传入的函数体内存地址
    res := fun(a, b)// fun 在这里作为回调函数 程序执行到此之后才完成调用
    return res
}
```

是不是很像 java中的function函数？

### 闭包

一个外层函数当中有内层函数，这个内层函数会操作外层函数的局部变量。并且，外层函数把内层函数作为返回值，则这里内层函数和外层函数的局部变量，统称为 **闭包结构** 。

这个外层函数的局部变量的生命周期会随着发生改变，原本当一个函数执行结束后，函数内部的局部变量也会随之销毁。但是闭包结构内的局部变量不会随着外层函数的结束而销毁。

闭包其实可以通俗理解为一个“随身携带的小背包”，里面装着外层函数的变量，让内部函数即使离开外层环境也能使用这些变量。

```go
package main

import "fmt"

func main() {
    fmt.Println("--------")
    res := closure()
    fmt.Println(res) // 0xf8375c0  返回内层函数函数体地址
    r1 := res()      // 执行closure函数返回的匿名函数
    fmt.Println(r1)  // 1
    r2 := res()
    fmt.Println(r2) // 2
    // 普通的函数应该返回1，而这里存在闭包结构所以返回2 。
    // 一个外层函数当中有内层函数，这个内层函数会操作外层函数的局部变量,并且外层函数把内层函数作为返回值,则这里内层函数和外层函数的局部变量,统称为闭包结构。这个外层函数的局部变量的生命周期会发生改变，不会随着外层函数的结束而销毁。
    // 所以上面打印的r2 是累计到2 。
    fmt.Println("--------")
    res2 := closure() // 再次调用则产生新的闭包结构 局部变量则新定义的
    fmt.Println(res2) // 0xf8375c0
    r3 := res2()
    fmt.Println(r3) // 1
}

// 定义一个闭包结构的函数 返回一个匿名函数
func closure() func() int { // 外层函数
    // 定义局部变量a
    a := 0 // 外层函数的局部变量
    // 定义内层匿名函数 并直接返回
    return func() int { //内层函数
       a++ // 在匿名函数中将变量自增。内层函数用到了外层函数的局部变量，此变量不会随着外层函数的结束销毁
       return a
    }
}
```

简化来说就是：

```go
res := closure()  // 创建一个存钱罐（a=0）和存钱函数
r1 := res()       // 存一次钱 → a=1
r2 := res()       // 再存一次 → a=2（因为存钱罐还在）
```

而当你再调用 `res2 := closure()` 时，相当于**新买了一个存钱罐**（新的a=0），之前的存钱罐和新的互不影响。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430231455022.png" alt="image-20250430231455022" style="zoom:50%;" />

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250430231502512.png" alt="image-20250430231502512" style="zoom:50%;" />

🛠 **技术原理：**

当Go发现 **内部函数** 引用了 **外层变量** 时，会把这些变量分配到 `堆内存（而非栈）`，这样它们的生命周期就不再受外层函数控制，而是跟随闭包本身存在。这就像给你的“小背包”单独找了个保险箱存放。

## 指针

Go语言中通过`&`获取变量的地址。通过`*`获取指针所对应的变量存储的数值。

- 一个指针变量本身存储的只是一个内存地址
- 一个内存地址在 32 位操作系统上占 4 个字节，在 64 位操作系统上占 8 个字节
- 内存地址一般是用整数的 16 进制来表示，比如：0xc000012450

> 当一个变量被声明的时候，Go运行时，将此变量开辟一段内存，此内存的起始地址即为此变量的地址

### 指针的作用

> 高效传递数据与安全控制

- **避免副本**：传递大型结构体时直接使用指针，避免内存复制。

- **禁止偏移运算**：确保指针只能操作目标数据，防止非法修改其他内存区域。
- **垃圾回收友好**：指针明确指向目标内存，便于 GC 快速识别和回收。

```go
package main

import (
    "fmt"
)

func main() {

    //定义一个变量
    a := 2
    fmt.Printf("变量A的地址为%p", &a) //通过%p占位符, &符号获取变量的内存地址。
    //变量A的地址为0xc000072090
    

    //创建一个指针
    // 指针的声明 通过 *T 表示T类型的指针
    var i *int     //int类型的指针
    var f *float64 //float64类型的指针
    fmt.Println(i) // < nil >空指针
    fmt.Println(f)

    //因为指针存储的变量的地址 所以指针存储值
    i = &a
    fmt.Println(i)  //i存储a的内存地址0xc000072090
    fmt.Println(*i) //i存储这个指针存储的变量的数值2
    *i = 100
    fmt.Println(*i) //100
    fmt.Println(a)  //100通过指针操作 直接操作的是指针所对应的数值

}
```

指针的指针，也就是存储的不是具体的数值了，而是另一个指针的地址。

```go
func main(){
    a := 2
		var i *int         //声明一个int类型的指针
		fmt.Println(&a)	   //0xc00000c1c8
		i = &a             //将a的地址取出来放到i里面
		fmt.Println(&i)    //0xc000006028
		var a2 **int       //声明一个指针类型的指针
		a2 = &i            //再把i的地址放进a2里面
		fmt.Println(a2)    //获取的是a2所对应的数值0xc000006028也就是i的地址
}
```

### Go 指针的限制

- Go 指针不支持直接进行算术运算
- 一个指针类型的值不能被随意转换为另一个指针类型
- 一个指针值是不能随意跟其他的指针类型进行比较
- 一个指针的值是不能随意被赋值给其他任意类型的指针的值

### 数组指针

意思为，数组的指针。 首先是他是一个指针， 指向一个数组，存储数组的地址。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501061222851.png" alt="image-20250501061222851" style="zoom:20%;" />

```go
package main

import (
    "fmt"
)

func main() {
    //创建一个普通的数组
    arr := [3]int{1, 2, 3}
    fmt.Println(arr)

    //创建一个指针 用来存储数组的地址 即：数组指针
    var p *[3]int
    p = &arr        //将数组arr的地址，存储到数组指针p上。
    fmt.Println(p)  //数组的指针 &[1 2 3] 后面跟数组的内容 
    
    
    //获取数组指针中的具体数据 和数组指针自己的地址    
    fmt.Println(*p) //指针所对应的数组的值
    fmt.Println(&p) //该指针自己的地址0xc000006030


    //修改数组指针中的数据
    (*p)[0] = 200
    fmt.Println(arr) //修改数组中下标为0的值为200   结果为：[200 2 3]
    
    //简化写法
    p[1] = 210       //意义同上修改下标为1的数据
    fmt.Println(arr) //结果： [200 210 3]  
}
```

### 指针数组

其实就是一个普通数组，只是存储数据类型是指针。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501062906188.png" alt="image-20250501062906188" style="zoom:25%;" />

```go
package main

import (
    "fmt"
)

func main() {
    //定义四个变量
    a, b, c, d := 1, 2, 3, 4
    
    arr1 := [4]int{a, b, c, d}
    arr2 := [4]*int{&a, &b, &c, &d} //将所有变量的指针，放进arr2里面

    fmt.Println(arr1)   //结果为：[1 2 3 4]
    fmt.Println(arr2)   //结果为：[0xc00000c1c8 0xc00000c1e0 0xc00000c1e8 0xc00000c1f0]

    arr1[0] = 100  //修改arr1中的值
    fmt.Println("arr1的值：", arr1)  //修改后的结果为：[100 2 3 4]
    
    fmt.Println("a=", a) //变量a的值还是1，相当于值传递，只修改了数值的副本。

    //修改指针数组
    *arr2[0] = 200 //修改指针的值
    fmt.Println(arr2)
    fmt.Println("a=", a) //200  引用传递 修改的是内存地址所对应的值 所以a也修改了
    
    //循环数组，用*取数组中的所有值。 
    for i := 0; i < len(arr2); i++ {
        fmt.Println(*arr2[i])
    }
}
```

### 指针函数

如果一个函数返回结果是一个指针，那么这个函数就是一个指针函数。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501063707547.png" alt="image-20250501063707547" style="zoom:30%;" />

```go
package main

import (
    "fmt"
)

func main() {
    //函数默认为指针 只是不需要用 *
    a := fun1
    fmt.Println(a) //0x49c670 函数默认为指针类型
    a1 := fun1()
    fmt.Printf("a1的类型：%T,a1的地址是%p 数值为%v ", a1, &a1, a1) // []int,a1的地址是0xc0000044c0 数值为[1 2 3]

    a2 := fun2()
    fmt.Printf("a2的类型：%T,a2的地址是%p 数值为%v ", a2, &a2, a2) // *[]int,a1的地址是0xc000006030 数值为&[1 2 3 4]
    fmt.Printf("a2的值为：%p", a2)  // 0xc000004520 指针函数返回的就是指针
}

//一般函数
func fun1() []int {
    c := []int{1, 2, 3}
    return c
}

//指针函数 返回指针
func fun2() *[]int {
    c := []int{1, 2, 3, 4}
    fmt.Printf("c的地址为%p：", &c) // 0xc000004520
    return &c
}
```

### 指针参数

指针属于引用类型的数据， 所以在传递过程中是将参数的地址传给函数。

将指针作为参数传递时，只有值类型的数据，需要传递指针，而引用类型的数据本身就是传递的地址，所以数组传递可以使用指针，切片是引用类型数据，则不需要传递指针传递。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501064500868.png" alt="image-20250501064500868" style="zoom:30%;" />

```go
package main

import (
    "fmt"
)

func main() {
    s := 10
    fmt.Println(s) //调用函数之前数值是10
    fun1(&s)
    fmt.Println(s) //调用函数之后再访问则被修改成2
}

// 接收一个int类型的指针作为参数
func fun1(a *int) {
    *a = 2
}
```

```go
func f2(x *int) {
	//实参x的副本跟c指向同一个地址，所以修改副本指向的值也会影响到函数外c的值
	*x = 10
	//这里直接修改了实参x的副本地址，相当于让实参x指向了一个新的地址，所以这里改变x的地址并不会影响函数外c的值
	x = nil
```

## 结构体

### 定义

在Go语言中，定义结构体的标准格式为：

```go
type StructName struct {
   // 属性字段
}
```

- 开头的`type`表示要定义自定义的类型；
- `StructName`代表结构体的名称；
- `struct`表示结构体类型；

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501064948392.png" alt="image-20250501064948392" style="zoom:30%;" />

### 使用

#### 声明与初始化

```go
package main

import (
    "fmt"
)

//定义结构体
type Person struct {
    name    string
    age     int
    sex     string
    address string
}

func main() {
    // 实例化后并使用结构体
    p := Person{} // 使用简短声明方式，后面加上{}代表这是结构体
    
    p.age = 2     // 给结构体内成员变量赋值
    p.address = "陕西"
    p.name = "好家伙"
    p.sex = "女"
    
    fmt.Println(p.age, p.address, p.name, p.sex) // 使用点.来访问结构体内成员的变量的值。

}
```

> 不论地址还是结构体本身，一律使用 `. ` 来访问成员

还可以在结构体后面大括号内，直接给结构体成员变量赋值。

```go
 // 直接给成员变量赋值
 p2 := Person{age: 2, address: "陕西", name: "老李头", sex: "女"}
 fmt.Println(p2.age, p2.address, p2.name, p2.sex)
```

在Go语言中有一个关键字`new`可以用来实例化结构体。

本质上是分配了一个某种类型的内存空间，所以使用`new`关键字默认就会返回一个指针。

使用`new`创建结构体，默认就是一个指针类型的结构体。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501065107952.png" alt="image-20250501065107952" style="zoom:30%;" />

```go
// 使用new 创建结构体指针
p := new(Person)
p.name = "好家伙"
fmt.Println(p.name)
```

> 在Go语言中，使用`&`符号取地址时候，默认就对该类型进行了一次 **实例化** 操作。

在开发过程中经常会以下面这种使用函数封装写法，来实例化一个结构体。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501065210009.png" alt="image-20250501065210009" style="zoom:40%;" />

```go
package main

import (
    "fmt"
)

//定义结构体
type Person struct {
    name string
    age  int
    sex  string
}

func main() {
    p := newPerson("好家伙", 18, "男")
    fmt.Println(p.name, p.age, p.sex)
}

//使用函数来实例化结构体 
func newPerson(name string, age int, sex string) *Person {
    return &Person{
       name: name,
       age:  age,
       sex:  sex,
    }
}
```

### 匿名结构体

在实际开发中，还有一类情况，就是某个结构体的作用域很小，甚至只存在于某个函数内部，或是无需创建太多的该结构体变量等等。对于上述情况，Go语言允许我们使用匿名结构体简化编码，即使用匿名结构体。

匿名结构体就是没有类型名称，也不需要type关键字可以直接使用。

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501065317799.png" alt="image-20250501065317799" style="zoom:40%;" />

### 构造函数

其实就是用工厂函数新建结构体

```go
type treeNode struct {
	value       int
	left, right *treeNode
}

func createTreeNode(value int) *treeNode {
	return &treeNode{value: value} // 返回的是局部变量的地址，但跟C不一样，不会导致程序崩溃
}

func main() {
  root1 := treeNode{value: 3}

	root2 := createTreeNode(4)
}
```

> 1. 在工厂函数中，我们通常返回一个结构的地址，无需特别考虑其在何处分配，只需返回局部变量的地址即可。
> 2. 局部变量的存储位置（栈或堆）由编译器和运行环境决定，这在Go语言中尤其如此，因为Go具有自动垃圾回收机制。
> 3. 如果局部变量被取地址并返回，编译器会认为它需要在堆上分配，以便外部使用，从而参与垃圾回收过程。
> 4. 这种机制简化了程序设计，开发者无需关心对象的具体分配位置，只要确保不再使用时，指针会被正确处理，对象将被自动回收。
> 5. 与C++等需要手动管理内存的语言不同，Go语言的这一特性使得返回局部变量的地址成为可能，同时也简化了内存管理的复杂性。

### 为对象定义方法

在Go语言中，方法和函数的定义格式非常像，大家可不要搞混了。由于方法和对象存在紧密的关系，因此在定义的格式上需要**接收器**，具体格式如下：

```go
func (接收器变量 接收器类型) 方法名(参数列表) (返回参数) {
    函数体
}
```

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250501082915246.png" alt="image-20250501082915246" style="zoom:35%;" />

- **接收器变量和接收器类型共同构成了接收器**；
- 参数列表是可选的；
- 返回参数也是可选的；

```go
type treeNode struct {
    value       int
    left, right *treeNode
}

func (node treeNode) print() {
    fmt.Println(node)
}

func main() {

    root2 := createTreeNode(4)

    root2.print() // root2 对象 就可以 直接使用了
}
```

其实跟正常函数一样：

```go
type treeNode struct {
    value       int
    left, right *treeNode
}

func (node treeNode) print() {
    fmt.Println(node)
}

func print(node treeNode) {
    fmt.Println(node)
}
```

#### 对象定义方法是否使用指针

为对象定义方法时，需要注意接收器的类型。使用指针与否，将决定了是否对原始变量产生影响。

本例使用了\*Dog，即指针类型，在方法中对该类型变量（d变量）的任何影响都将影响原始变量（fatShibaInu）；反之，若使用Dog类型，则不会影响。

> 其原因是当不使用指针类型变量时，方法中的接收器变量实际上是对原始数据的“拷贝”，所做出的改变也仅仅会作用于这份“拷贝”的数据上，并不会影响到原始数据。

对比来说，我们分别定义两个不同的方法——GrowUp()和GrowUp2()，前者使用指针类型接收器，后者不使用。方法体均是对相应变量中的年龄属性自增1，然后在控制台输出运行结果。测试代码关键部分如下：

```go
func (d *Dog) GrowUp() {
   d.Age++
}

func (d Dog) GrowUp2() {
   d.Age++
}

func main() {
   fatShibaInu := NewDog("Shiba Inu", 2, 12.0, "公")

   fatShibaInu.GrowUp()
   fmt.Println(fatShibaInu)

   fatShibaInu.GrowUp2()
   fmt.Println(fatShibaInu)
}
```

运行结果为：

> Shiba Inu 3 12 0
>
> Shiba Inu 3 12 0

显然，虽然GrowUp2()方法也对d变量中的Age属性做了自增1计算，但并未影响原始数据。

### 结构体的嵌套（extends）

> 在Go语言中，没有直接等同于Java中`extends`的关键字，因为Go不支持传统的类继承。Go使用组合（composition）来复用代码，而不是继承。

我们先来实现作为父结构体的动物（Animal），这个结构体具有名字（Name）、年龄（Age）和性别（Gender）属性。

示例代码如下：

```go
type Animal struct {
   Name   int
   Age    int
   Gender string
}
```

接下来，以子结构体鸟（Bird）为例，它还具有翅膀颜色的属性。因此，Bird的结构体定义示例如下：

```go
type Bird struct {
   WingColor    string
   CommonAnimal Animal
   // CommonAnimal *CommonAnimal 
}
```

很明显地，`Bird` 结构体中包含了一个名为 `CommonAnimal` 的 `Animal` 类型成员，而 `Animal` 类型就是我们刚刚定义好的结构体。

如此，便完成了结构体的嵌套，即把 `Animal` 嵌入 `Bird` 中。从此，`Bird` 也具有了 `Animal` 中的 Name、Age 和 Gender属性了。

> 需要注意的是：上面的内嵌结构体 `Animal` 也是可以传入指针类型的，如果传的是字面量，则实际是 `Animal` 结构体的副本，对内存消耗更大。

```go
func NewBird(name string, age int, gender string, wingColor string) *Bird {
   return &Bird{
      WingColor: wingColor,
      CommonAnimal: Animal{
         Name:   name,
         Age:    age,
         Gender: gender,
      },
   }
}
```

接着，鸟还有“飞行”的动作。使用上一讲中“方法”的知识，创建Bird类型的“飞行”方法：

```go
func (b *Bird) Fly() {
   fmt.Println("我起飞啦！")
}
```

关于“鸟”的结构体定义、构造函数和方法的实现到此先告一段落。我们回到main()函数中使用它们。

在main()函数中，首先声明一个变量，名为bird，使用NewBird()构造函数为其赋值，然后再调用Fly()方法，让小鸟执行飞行动作。完整的代码如下：

```go
type Animal struct {
   Name   string
   Age    int
   Gender string
}

type Bird struct {
   WingColor    string
   CommonAnimal Animal
}

func NewBird(name string, age int, gender string, wingColor string) *Bird {
   return &Bird{
      WingColor: wingColor,
      CommonAnimal: Animal{
         Name:   name,
         Age:    age,
         Gender: gender,
      },
   }
}

func (b *Bird) Fly() {
   fmt.Println("我起飞啦！")
}

func main() {
   bird := *NewBird("小鸟", 1, "公", "绿色")
   fmt.Println(bird)
   bird.Fly()
}
```

从输出的格式上，我们也可看出，Animal类型确实被Bird类型嵌入其中。那么，问题也随之而来：若想访问Bird中的Animal中的Name属性值，该怎么做呢？

思路其实非常简单，也是层层嵌套地访问就可以了。就拿本例来说，bird.CommonAnimal访问到的是CommonAnimal属性，它是Animal类型；bird.CommonAnimal.Name，访问到的就是CommonAnimal中的Name属性了。

类似地，我们继续定义子结构体狗（Dog），它拥有毛色（Color）属性。还有犬吠（Bark）动作。请读者参考上面小鸟（Bird）部分的代码，独立完成狗（Dog）部分的代码，要求依然使用构造函数（NewDog()）和方法（Bark()）。

完整的代码如下：

```go
type Animal struct {
   Name   string
   Age    int
   Gender string
}

type Dog struct {
   Color        string
   CommonAnimal Animal
}

func NewDog(name string, age int, gender string, color string) *Dog {
   return &Dog{
      Color: color,
      CommonAnimal: Animal{
         Name:   name,
         Age:    age,
         Gender: gender,
      },
   }
}

func (d *Dog) Bark() {
   fmt.Println("汪汪汪！")
}

func main() {
   dog := *NewDog("小狗", 2, "公", "黄色")
   fmt.Println(dog)
   dog.Bark()
}
```

### 匿名结构体嵌套

Go语言语法还允许开发者以一种更为简单的方式嵌套结构体使用，这种更简单的方式便是嵌套匿名结构体。在后期使用时，也会被简化。以Bird类型结构体为例，下面的写法是完全合法的：

```go
type Animal struct {
   Name   string
   Age    int
   Gender string
}

func (a *Animal) Eat() {
   fmt.Println(a.Name, "我要吃到饱！")
}

type Bird struct {
   string
   Animal
}

func NewBird(name string, age int, gender string, wingColor string) *Bird {
   return &Bird{
      wingColor,
      Animal{
         name,
         age,
         gender,
      },
   }
}

func (b *Bird) Fly() {
   fmt.Println("我起飞啦！")
}

func main() {
   bird := *NewBird("小鸟", 1, "公", "绿色")
   //访问string类型成员
   fmt.Println(bird.string)
   //访问Name成员
   fmt.Println(bird.Name)
   bird.Eat()
```

上述代码运行后，控制台将输出：

> 绿色
>
> 小鸟             
>
> 小鸟 我要吃到饱！

请大家将这种简化写法与普通的写法对比，重点关注Bird结构体的定义方式、NewBird()构造函数的实现方式以及main()函数中，bird变量的字段取值和方法调用方式。

### 多态

多态性可以提高程序的扩展性，使得代码更加灵活，易于扩展和维护。

在Go语言中，多态可以通过接口实现。接口定义了一组方法的签名，任何实现了这个接口的类型都可以被认为是这个接口类型。这就使得我们可以使用接口类型来实现多态。

```go
package main

import "fmt"

type Duck interface {
	Quack()
}

type YellowDuck struct{}

func (yd YellowDuck) Quack() {
	fmt.Println("YellowDuck嘎嘎叫")
}

type NormalDuck struct{}

func (nd NormalDuck) Quack() {
	fmt.Println("NormalDuck嘎嘎叫")
}

func Quack(d Duck) {
	d.Quack()
}
func main() {
	yd := YellowDuck{}
	nd := NormalDuck{}
	Quack(yd)
	Quack(nd)

}
```

> YellowDuck嘎嘎叫 
> NormalDuck嘎嘎叫

在这个示例中，我们定义了 `Duck` 接口和两个实现了这个接口的结构体 `YellowDuck` 和 `NormalDuck` 。然后我们创建了一个包含了两个不同类型的 `Duck` 对象的切片，使用 `for` 循环遍历这个切片，并调用它们的 `Quack()` 方法，这样就实现了多态。

## 接口

### 定义

在Go语言中，定义接口的格式如下：

```go
type interface_name interface {
    function_name( [params] ) [return_values]
    ...
}
```

- `type`关键字表示要自定义类型；
- `interface_name` 是自定义的接口名；
- `interface` 表示接口类型；
- `function_name` 是方法名；
- `params` 是方法所需的参数；
- `return_values` 是方法的返回值。
  - `params` 和 `return_values` 可以省略，也可以存在一个或多个。

对于本例而言，接口的目的在于规范图片加载的流程。为了讲解方便，我在此将图片加载的过程简化为查找并下载图片一个步骤。

具体代码如下：

```go
// ImageDownloader 图片加载接口
type ImageDownloader interface {
    // FetchImage 获取图片，需要传入图片地址，方法返回图片数据
    FetchImage(url string) string
}
```

如此，接口的定义便完成了。

> `💡 提示： 注意到接口的命名（imageLoader）特点了吗？在为接口命名时，一般会在单词后面加上er后缀。接口中的方法名（FetchImage()）首字母大小写决定了该方法的可访问范围。`

### 接口的实现

在Go语言中，实现接口的格式如下：

```go
func (struct_variable struct_name) function_name([params]) [return_values] {
   // 方法实现 
}
```

- `struct_name_variable` 和 `struct_name` 一起，表示作用的对象。
  - 对于本例而言，则是 `*fileCache` 类型的变量。
- `function_name` 是方法名
- `params` 指的是方法所需的参数
- `return_values` 指的是方法的返回值。
  - `params` 和 `return_values` 是可选的，也允许有多个值。

代码如下：

```go
// 定义从网络下载图片的结构体
type netFetch struct {
}
// FetchImage接口实现
func (n *netFetch) FetchImage(url string) string {
	return "从网络下载图片：" + url
}
```

对比FetchImage()方法的接口声明：

```go
// FetchImage 获取图片，需要传入图片地址，方法返回图片数据
FetchImage(url string) string
```

发现了吗？在实现方法时，需要满足两个条件：

- 第一是**接口中定义的的方法与实现接口的类型方法格式一致**。这要求不仅方法名称相同，参数和返回值也要相同；

- 第二就是**接口中定义的所有方法全部都要实现**。

### 接口的特性

- Go语言是不支持重载的，Go语言的一个核心设计原则是**让Go保持足够的简单**，特别是在面向对象的支持上，阉割了很多面向对象中的一些语法，使得go的面向对象的实现更加轻量级。
- Go语言支持重写。

```go
package main

import "fmt"

type Animal struct {
}

func (a *Animal) eat() {
	fmt.Println("Animal is eating")
}

// Cat继承Animal
type Cat struct {
	Animal
}

// Cat子类也可以有eat方法，且实现可以跟父类Animal不同
func (c *Cat) eat() {
	fmt.Println("Cat is eating fish")
}

func main() {
	a := &Animal{}
	c := &Cat{}
	a.eat()
	c.eat()
}
```

### 空接口与泛型

什么时候该使用泛型呢？

举个例子，如果我们想要封装一个函数，该函数的作用便是实现传入参数数据的原样输出，该如何做呢？

利用我们已经掌握的知识，写出的代码可能会是这样：

```go
func main() {
   dataOutput("Hello")
}

func dataOutput(data string) {
   fmt.Println(data)
}
```

直接运行这段程序，控制台会输出：

> Hello

看似没有问题，但如果传入的参数不是string类型，而是数字型、布尔型呢？显然，程序是无法编译通过的，因为类型不匹配。

当然，我们也可以编写多个函数，来匹配不同的参数类型，比如：

```go
func main() {
   stringDataOutput("Hello")
   intDataOutput(123)
}

func stringDataOutput(data string) {
   fmt.Println(data)
}

func intDataOutput(data int) {
   fmt.Println(data)
}
```

如此确实可以实现，但代码整体不够优雅。况且这还只是两种类型，要是更多，日后的代码维护成本就会直线飙升了。

细心的朋友会发现，尽管类型不同，但函数体内实际执行的逻辑都是相通的。那么，有没有一种办法使函数的参数不再受限呢？

当然有，那就是使用泛型。

**泛型是类型中的“万能牌”**，使用泛型作为函数参数，实际上就相当于告诉调用者：“我能兼容任何类型的参数，尽管将数据传给我就是了。”泛型以超级宽广的胸怀接纳所有类型的数据。

> **在Go语言中的泛型，则使用空接口来实现。** 

而所谓的“空接口”，使用代码表示非常简单，就是：

```go
interface{}
```

和普通接口的定义格式不同，空接口内部无需填写任何方法。

**空接口能接纳所有类型的数据，因此可以将任何类型的数据赋值给它的变量**，请大家阅读下面这段代码：

```go
var anyTypeValue interface{}

func main() {
   anyTypeValue = 123
   anyTypeValue = true
   anyTypeValue = "Hello"
}
```

这段代码完全合法，可以编译、运行。

另一方面，**在函数参数中使用空接口，可以使其能接受所有类型的数据传入。** 以本讲一开始的示例举例，若要编写一个函数，实现传入参数数据的原样输出，只需按如下编写代码即可：

```go
func main() {
   dataOutput("Hello")
   dataOutput(123)
   dataOutput(true)
}

func dataOutput(data interface{}) {
   fmt.Println(data)
}
```

程序运行结果为：

> Hello
>
> 123
>
> true

如此编码，是不是比写一堆类似的函数要方便、简洁很多呢？还能节省开发和维护的时间。

### 灵活运用接口

#### 接口的嵌套组合

我们都知道，结构体是允许嵌套使用的。实际上，接口也可以。

> 举例来说，我们使用浏览器进行下载文件的时候，通常会在保存、另存为和取消之间做出选择。抛开取消不谈，选择保存时，浏览器会自动执行下载和保存两个步骤；选择另存为时，浏览器会先询问文件保存的路径，再开始下载和保存。

如果我们把选择路径、下载、保存看作是待下载文件的3个接口，并用代码来表示，它很可能会是这样的：

```go
// ChooseDest 选择保存路径
type ChooseDest interface {
    chooseDest(localFile string)
}

// Download 执行下载
type Download interface {
    download()
}

// Save 保存文件
type Save interface {
    save()
}
```

细心的朋友会发现，无论何种方式下载文件，其中的下载和保存都是必需且顺序不变的。所以，我们不妨再创建一个接口，使其包含下载和保存两个接口，代码如下：

```go
// DownloadAndSave 下载和保存
type DownloadAndSave interface {
   Download
   Save
}
```

在使用时，我们便可直接声明DownloadAndSave类型的变量去执行下载和保存了，示例代码如下：

```go
func main() {
   // 声明一个file类型的变量，命名为downloadFileExample
   downloadFileExample := new(file)
   // 使用ChooseDest接口
   var chooseDest ChooseDest
   chooseDest = downloadFileExample
   chooseDest.chooseDest("")
   // 使用DownloadAndSave接口
   var downloadAndSave DownloadAndSave
   downloadAndSave = downloadFileExample
   downloadAndSave.download()
   downloadAndSave.save()
}
```

如上代码所示，无需单独声明Download和Save接口变量，仅使用DownloadAndSave接口变量便可调用download()和save()两个方法。

#### 从空接口取值

在上一讲中，曾经使用过类似下面这样的案例：

```go
func main() {
   dataOutput("Hello")
}

func dataOutput(data interface{}) {
   fmt.Println(data)
}
```

为了实现“将传入的参数按原样输出”的需求，我们编写了dataOutput()函数。该函数所需的参数是空接口，能接纳所有类型的数据，然后通过调用fmt.Println()将数据输出，满足了需求。

现在，如果想从data中获取数据，并赋值给某个变量，该如何做呢？显然，可以如下实现：

```go
func dataOutput(data interface{}) {
   fmt.Println(data)
   var stringValue string = data
   fmt.Println(stringValue)
}
```

暂且将上述方法当作方法A。

再看如下实现：

```go
func dataOutput(data interface{}) {
   fmt.Println(data)
   stringValue := data.(string)
   fmt.Println(stringValue)
}
```

暂且将该方法当作方法B。

猜一猜，哪种方法可以呢？

答案是：**方法B**。

是不是很奇怪，为什么方法A不行呢？实际上，当我们按照方法A去写时，GoLand会自动识别出问题，提示：`Cannot use 'data' (type interface{}) as the type string`，意思是无法将类型为`interface{}`的data变量作为string类型使用。

这是因为在进行`类型断言`前，谁也不知道data里放的是何类型。举个形象一点的例子，虽然箱子里装了某样货物，但箱子依然还是箱子，是不能将箱子当货使用的。

所以，在从空接口中取值时，切记要使用`类型断言`。

#### 空接口的值比较

撸起袖子，我们一起来挑战几道题。

不要用电脑编译和运行下面的代码，先猜猜它们的运行结果。

```go
func main() {
   var a interface{} = 10
   var b interface{} = "10"
   fmt.Println(a == b)
}
```

相信各位都能回答正确，上面这段代码运行结果为：

> false

挑战继续，再来试试这个：

```go
func main() {
   var a interface{} = []int{1, 2, 3, 4, 5}
   var b interface{} = []int{1, 2, 3, 4, 5}
   fmt.Println(a == b)
}
```

上面这段代码运行后，程序会发生宕机。报错信息如下：

> panic: runtime error: comparing uncomparable type []int

从字面上看，错误原因是程序比较了不可比较的类型——[]int。

> 在Go语言中，**有两种数据是无法比较的，它们是：`Map` 和 `Slice`**，强行比较会引发如上宕机错误。

数组是可以比较的，而且会比较数组中每个元素的值。因此，只需将上述代码改为：

```go
func main() {
   var a interface{} = [5]int{1, 2, 3, 4, 5}
   var b interface{} = [5]int{1, 2, 3, 4, 5}
   fmt.Println(a == b)
}
```

程序便会正常运行，输出结果：

> true

#### 接口与nil

在Go语言中，nil是一个特殊的值，它只能赋值给指针类型和接口类型。

让我们来挑战下面这段代码，还是不要用电脑编译运行，猜一猜它的输出结果：

```go
func main() {
   var a interface{} = nil
   fmt.Println(a == nil)
}
```

这段代码运行后，控制台将输出：

> true

应该没什么疑问吧？继续看下面的代码：

```go
type Person struct {
   name   string
   age    int
   gender int
}

type SayHello interface {
   sayHello()
}

func (p *Person) sayHello() {
   fmt.Println("Hello!")
}

func getSayHello() SayHello {
   var p *Person = nil
   return p
}

func main() {
   var person = new(Person)
   person.name = "David"
   person.age = 18
   person.gender = 0
   var sayHello SayHello
   sayHello = person
   fmt.Println(reflect.TypeOf(sayHello))
   fmt.Println(sayHello == nil)
   fmt.Println(getSayHello())
   fmt.Println(getSayHello() == nil)
}
```

猜一猜最终控制台将输出什么呢？

答案是：

> *main.Person
>
> false
> nil
>
> false

是不是也很奇怪？

输出第一个false无可厚非，可输出的第二个false就很耐人寻味了。第二个false来自于main()函数中调用的getSayHello()函数，该函数返回SayHello类型的接口，函数体内返回了nil值的*Person。直接输出getSayHello()函数的结果，是nil，但与nil比较时却不是true。

这是因为：**将一个带有类型的nil赋值给接口时，只有值为nil，而类型不为nil。此时，接口与nil判断将不相等。**

那么，为了规避这类问题，我们不妨在getSayHello()函数值做些特殊处理。当函数体中的p变量为nil时，直接返回nil即可。发生修改部分的代码如下：

```go
func getSayHello() SayHello {
   var p *Person = nil
   if p == nil {
      return nil
   } else {
      return p
   }
}
```

再次运行程序，控制台输出如下：

> *main.Person
>
> false
> nil
>
> true

## Go程序启动流程

### init() 函数

- 作用：程序执行前包的初始化，比如初始化包里的变量等
- 执行顺序：
  - 在同一个Go文件中的多个`init`方法，按照代码顺序依次执行
  - 同一个 `package` 中，不同文件中的 `init` 方法的执行，按照文件名先后执行各个文件中的 `init` 方法
  - 在不同的`package`中，且不相互依赖，按照 `main` 包中 `import` 的顺序调用各自包中的 `init()` 函数
  - 在不同的`package`中，且相互依赖，最后被依赖的最先执行
    - 例如：导入顺序 main –> A –> B –> C，则初始化顺序为 C –> B –> A –> main

### main() 函数

```go
func main(){
    fmt.Println("Hello World!")
}
```

在Go语言中，**main()函数是程序的入口函数，它位于main包中。如果想要编译生成可执行文件，main()函数则是必须的**。

如果将示例代码中的 `main()` 函数去掉直接编译，可以看到控制台会输出如下错误：

> runtime.main_main·f: function main is undeclared in the main package

大意就是说 `main()` 函数没有在 `main` 包中声明。

我们还可以看到在 `main()` 函数中可以调用 `fmt` 包中的函数，这正是由于我们导入了 `fmt` 包才能做到的。

### Go源码的启动流程

下图较为清晰地描述了Go源码的启动过程：

<img src="./%E7%AC%AC%E9%9B%B6%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80%E5%9F%BA%E7%A1%80%E7%AF%87.assets/image-20250503163951742.png" alt="image-20250503163951742" style="zoom:50%;" />

我们从左上角的开始处分析这张图，可以发现Go源码的启动流程是这样的：

1. 程序开始运行后，首先来到 `main` 包，检索所有导入的包。发现代码中导入了A包，于是来到A包；
2. 发现A包代码中导入了B包，于是又来到B包；
3. B包代码没有导入任何其它的包，于是开始 `声明` B包内的`常量`和`变量`，并执行B包中的 `init()` 函数；
4. 回到A包，进行A包内的 `常量` 和 `变量` 的 `声明` ，并执行A包中的 `init()` 函数；
5. 回到 `main` 包，执行 `main` 包内的 `常量` 和 `变量` 的`声明`，并执行`main`包中的 `init()` 函数；
6. 执行 `main` 包中的 `main()` 函数。

> 💡 注意
>
> 1. 一个包被引用多次，如 A import B，C import B，A import C，B 被引用多次，但 B 包只会初始化一次；
> 2. 所有 init 函数都在同⼀个 goroutine 内执⾏
> 3. 引入包，不可出现死循坏。即A import B，B import A，这种情况编译失败；

