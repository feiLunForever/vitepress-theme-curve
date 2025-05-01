# 基础篇

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

- 占位符 表示在程序中输出一行字符串时候，或者格式化输出字符串的时候使用。
- go内置包 `fmt` 中 `Printf` 方法可以在控制台格式化打印出用户输入的内容。`fmt.Printf("%T",x)`

| 占位符 | 说明           | 举例                           | 输出         |
| ------ | -------------- | ------------------------------ | ------------ |
| %d     | 十进制的数字   | fmt.Printf("%d",10)            | 10           |
| %T     | 取类型         | b :=true fmt.Printf("%T",b)    | bool         |
| %s     | 取字符串       | s :="123" fmt.Printf("%s",s)   | 123          |
| %t     | 取bool类型的值 | b:=true fmt.Printf("%t",b)     | true         |
| %p     | 取内存地址     | p :="123" fmt.Printf("%p", &p) | 0xc0000461f0 |

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

>  - `switch`语句默认在每个`case`之后包含`break`，无需显式添加
>
>  - 如果在`switch`语句中不希望执行`break`，反而需要使用特定结构如`for through`来实现。

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

- `make()`是Go语言中的内置函数，主要用于创建并初始化`slice`切片类型，或者`map`字典类型，或者`channel`通道类型数据。
- 他与`new`方法的区别是：
  - `new`用于各种数据类型的内存分配，在Go语言中认为他返回的是一个指针。指向的是一个某种类型的零值。
  - `make` 返回的是一个有着初始值的非零值。

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

接下来，在main()函数伊始添加两行神奇的代码：

```go
func main() {
   defer fmt.Print("素数")
   defer fmt.Print("查找")
   var resultSlice []int
   findPrimeNumber(&resultSlice, 10)
   fmt.Println(resultSlice)
}
```

很明显，main()函数开头的两行代码和普通的代码不同，前面有个“defer”。**“defer”的作用是让整句代码延迟执行，且多个defer存在时，它们的顺序是反向的。**

根据这一规律，我们便可推测上述代码运行的结果将是：

>[2 3 5 7]   
>查找素数

> defer的典型应用场景是执行一些**收尾工作**，通常是在常规逻辑执行结束后释放系统资源。如文件读写、网络IO等等。也用于程序在**发生宕机时的恢复**。

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

### 结构体的嵌套

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
}
```

很明显地，Bird结构体中包含了一个名为CommonAnimal的Animal类型成员，而Animal类型就是我们刚刚定义好的结构体。

如此，便完成了结构体的嵌套，即把Animal嵌入Bird中。从此，Bird也具有了Animal中的Name、Age和Gender属性了。

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
