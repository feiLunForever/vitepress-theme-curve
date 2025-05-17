---

title: 第二章 GO语言runtime篇
tags:
  - Go
categories:
  - Go
date: '2025-01-03'
description: 欢迎使用 Curve 主题，这是你的第一篇文章
articleGPT: 这是一篇初始化文章，旨在告诉用户一些使用说明和须知。
#cover: "/images/logo/logo.webp"

---

# 第二章 GO语言runtime篇

> `golang runtime` 是 golang 语言的核心特性之一，也是 golang 的优势之一.理解了 golang 的 `runtime` 可以更好地理解 golang 的内部工作原理和机制。

`golang runtime` 是golang语言的运行时系统，它提供了一些与语言相关的功能，如 协程调度、内存管理、垃圾回收、反射、panic/recover等，以及一些与操作系统交互的功能，如信号处理、系统调用、环境变量、命令行参数等。

主要包含下面这几部分：

- golang runtime 支持协程（`goroutine`），一种用户态轻量级线程，可以实现高效的并发编程，以及简单的通信机制（`channel`）。
- golang runtime 提供了垃圾回收（`GC`），一种自动管理内存的机制，可以减少内存泄漏和手动释放内存的错误，以及提高内存利用率和性能。
- golang runtime 提供了反射（`reflection`），一种在运行时检查和修改变量类型和值的能力，可以实现一些动态的功能，如编解码、测试、依赖注入等。
- golang runtime 提供了调度器（`scheduler`），一种在逻辑处理器（P）和操作系统线程（M）之间分配协程（G）的机制，可以实现高效的负载均衡和抢占式调度。
- golang runtime 提供了一些与操作系统交互的功能，如信号处理、系统调用、环境变量、命令行参数等，以及一些与语言相关的功能，如 `panic` / `recover` 、`defer` 、`init` 等。

## golang 编译和启动过程

### Go编译过程

#### 脚本语言 VS 编译语言

我们知道，go语言是需要经过编译才能执行的，而有些语言，比如php,python,javascript等，是不需要经过编译就可以执行的。我们将这种不需要编译，而是通过解释器来执行源码的语言称为脚本语言。

脚本语言的优势在于开发效率高，很容易对代码进行调试，跨平台能力强。

但缺点也比较明显，与编译语言相比，脚本语言执行效率低，对硬件的控制能力弱，而且一些致命异常会在代码运行时才会被发现。

而编译语言则刚好相反，编译语言需要经过预先编译才能执行。它的执行效率高，对硬件资源的控制能力强，除了代码逻辑上的错误，基本都能在编译阶段就能发现错误，对程序的健壮性也更有保障。而编译语言的缺点是每次修改完代码之后都需要重新编译，调试效率较低，而且可能存在平台兼容性的问题。

Go语言是一门编译语言，它并不能直接运行。我们需要通过go build指令将每行Go代码必须转化为一系列的低级机器语言指令，然后将这些指令打包到一起并以二进制文件的形式存储起来（也就是可执行的二进制文件）才能够执行。

当我们执行go build之后，我们的源码经历了哪些操作最终生成了可执行文件呢？本节我们就来重点讨论这个问题。

#### Go 编译过程

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/go%E8%AF%AD%E8%A8%80%E7%BC%96%E8%AF%91%E8%BF%87%E7%A8%8B.jpg" alt="go语言编译过程" style="zoom:80%;" />

上图展示了编译过程的几个重要步骤：

- go 源码的文本文件先经过编译器编译对源码文件进行 `词法分析`、`语法分析`、`语义分析`、`优化`，最后生成 `.s 的汇编程序`，这时仍然是文本形式。

- 然后经过汇编器 将 汇编代码 转变成 机器可以执行的指令，这个过程中每条汇编指令与机器指令几乎是一一对应的，这个过程会生成`.o的二进制可重定位目标程序`。
- 再通过 `链接器`链接依赖，链接器可以将多个.o文件合成一个可执行文件，最终生成可执行的目标程序。

而完成上面各个阶段的就是 Go 编译系统，类似 `GCC`（GNU Compile Collection），也就是我们熟知的 `GNU` 编译器套装，它的主要作用是就是将各种编程语言的程序在不同的机器上生成对应的机器码。

Go语言的编译系统并没有直接使用 `GCC` ，而是自己开发了一套效率更高的编译器。Go编译器和链接器都是使用go语言本身编写的。其中Go 源码里的编译器源码位于 `src/cmd/compile` 路径下，链接器源码位于 `src/cmd/link` 路径下。

编译器本质上就是将高级语言（我们编写的源代码）翻译成机器语言的工具，Go语言编译过程如果细化来看可以分为下面几步：`词法分析` -> `语法分析` –> `类型检查` –> `中间代码生成` -> `代码优化` -> `SSA生成` -> `机器码生成` 这些步骤，这是根据编译器源码的角度整理出的一些步骤。

其实高级语言经历的编译过程很多是通用的，其中词法分析，语法分析，类型检查这几步为编译前端的步骤，而中间代码生成直到最后生成机器码都是编译后端的步骤。编译前端部分负责对源代码进行分析和检查，确保源码没有语法错误，同时也把源代码转换成抽象语法树供后面的步骤使用。 编译后端部分负责将中间代码转换成机器语言，并生成可执行文件。 生成的可执行文件可以在特定的计算机硬件上直接运行。

##### 词法分析

> 词法分析阶段，由词法分析器(`lexer`)将源代码文件转换成 `Token` 序列，每个 `Token` 表示一个词法单元，比如关键字、标识符、字面量等。词法分析器也叫扫描器，本质上是以函数的形式存在，供语法分析器调用。

所有的 token 主要被分为四类：**特殊类型**、**基础类型**、**运算符**和**关键字**

> 源码位置：`$GOROOT/src/cmd/compile/internal/syntax/scanner.go`

这里我们需要理解的是为什么需要词法分析？

我们使用 go 语言编写的代码在机器看来不过是一堆二进制位，而这种高级语言编写的代码我们能读懂是因为这些代码是按照 ASCII 码的 UTF8 格式将这些二进制进行了编码。

我们可以通过 vim 编辑器查看这些代码文本的存储。

我们通过 vim 打开我们的代码：

```go
vim main.go
```

代码内容如下：

```go
package main

import "fmt"

func main() {
	fmt.Println("hello world")
}
```

按下 `esc` 进入 vim的命令模式，输入`:%!xxd`并回车，就可以看到代码十六进制形式的文本；

也可以使用 `xxd` 指令进行转换：

```shell
xxd main.go > main.txt
cat main.txt
```

最终可以看到如下形式的文本：

```shell
00000000: 7061 636b 6167 6520 6d61 696e 0a0a 696d  package main..im
00000010: 706f 7274 2022 666d 7422 0a0a 6675 6e63  port "fmt"..func
00000020: 206d 6169 6e28 2920 7b0a 0966 6d74 2e50   main() {..fmt.P
00000030: 7269 6e74 6c6e 2822 6865 6c6c 6f20 776f  rintln("hello wo
00000040: 726c 6422 290a 7d0a 
```

其中最左边的一列代表地址值，中间一列代表文本对应的 ASCII 字符，最右边的列就是我们的代码。

我们可以通过 ASCII 字符表查到每个 ASCII码 值对应的字符：

直接在终端执行 `man ascii` 即可获取到 ASCII 码字符表：

```shell
	   Oct   Dec   Hex   Char                        Oct   Dec   Hex   Char
────────────────────────────────────────────────────────────────────────
       000   0     00    NUL '\0'                    100   64    40    @
       001   1     01    SOH (start of heading)      101   65    41    A
       002   2     02    STX (start of text)         102   66    42    B
       003   3     03    ETX (end of text)           103   67    43    C
       004   4     04    EOT (end of transmission)   104   68    44    D
       005   5     05    ENQ (enquiry)               105   69    45    E
       006   6     06    ACK (acknowledge)           106   70    46    F
       007   7     07    BEL '\a' (bell)             107   71    47    G
       010   8     08    BS  '\b' (backspace)        110   72    48    H
       011   9     09    HT  '\t' (horizontal tab)   111   73    49    I
       012   10    0A    LF  '\n' (new line)         112   74    4A    J
       013   11    0B    VT  '\v' (vertical tab)     113   75    4B    K
       014   12    0C    FF  '\f' (form feed)        114   76    4C    L
       015   13    0D    CR  '\r' (carriage ret)     115   77    4D    M
       016   14    0E    SO  (shift out)             116   78    4E    N
       017   15    0F    SI  (shift in)              117   79    4F    O
       020   16    10    DLE (data link escape)      120   80    50    P
       021   17    11    DC1 (device control 1)      121   81    51    Q
       022   18    12    DC2 (device control 2)      122   82    52    R
       023   19    13    DC3 (device control 3)      123   83    53    S
       024   20    14    DC4 (device control 4)      124   84    54    T
       025   21    15    NAK (negative ack.)         125   85    55    U
       026   22    16    SYN (synchronous idle)      126   86    56    V
       027   23    17    ETB (end of trans. blk)     127   87    57    W
       030   24    18    CAN (cancel)                130   88    58    X
       031   25    19    EM  (end of medium)         131   89    59    Y
       032   26    1A    SUB (substitute)            132   90    5A    Z
       033   27    1B    ESC (escape)                133   91    5B    [
       034   28    1C    FS  (file separator)        134   92    5C    \  '\\'
       035   29    1D    GS  (group separator)       135   93    5D    ]
       036   30    1E    RS  (record separator)      136   94    5E    ^
       037   31    1F    US  (unit separator)        137   95    5F    _
       040   32    20    SPACE                       140   96    60    `
       041   33    21    !                           141   97    61    a
       042   34    22    "                           142   98    62    b
       043   35    23    #                           143   99    63    c
       044   36    24    $                           144   100   64    d
       045   37    25    %                           145   101   65    e
       046   38    26    &                           146   102   66    f
       047   39    27    ´                           147   103   67    g
       050   40    28    (                           150   104   68    h
       051   41    29    )                           151   105   69    i
       052   42    2A    *                           152   106   6A    j
       053   43    2B    +                           153   107   6B    k
       054   44    2C    ,                           154   108   6C    l
       055   45    2D    -                           155   109   6D    m
       056   46    2E    .                           156   110   6E    n

       057   47    2F    /                           157   111   6F    o
       060   48    30    0                           160   112   70    p
       061   49    31    1                           161   113   71    q
       062   50    32    2                           162   114   72    r
       063   51    33    3                           163   115   73    s
       064   52    34    4                           164   116   74    t
       065   53    35    5                           165   117   75    u
       066   54    36    6                           166   118   76    v
       067   55    37    7                           167   119   77    w
       070   56    38    8                           170   120   78    x
       071   57    39    9                           171   121   79    y
       072   58    3A    :                           172   122   7A    z
       073   59    3B    ;                           173   123   7B    {
       074   60    3C    <                           174   124   7C    |
       075   61    3D    =                           175   125   7D    }
       076   62    3E    >                           176   126   7E    ~
       077   63    3F    ?                           177   127   7F    DEL
```

> 注意，上面命令需要安装 `man-pages` ( centoos 操作系统上执行 `yum install -y man-pages`)

上面源代码十六进制形式的文本第一行 `7061 636b` 我们可以通过上面的 ASCII 码字符表找到对应的字符，其中 `70` 对应的字符为 `p` ，`61` 对应的字符为`a`，`63` 对应的字符为 `c`，`6b` 对应的字符为 `k` ，以此类推，刚好跟我们的代码是对应的。

而词法分析就是根据 Go 代中的特定字符将代码进行分词，这些特定字符的定义在源码中的位置为：`$GOROOT/src/cmd/compile/internal/syntax/tokens.go`

核心代码如下：

```go
const (
	_    token = iota
	_EOF       // EOF

	// names and literals
	_Name    // name
	_Literal // literal

	// operators and operations
	// _Operator is excluding '*' (_Star)
	_Operator // op
	_AssignOp // op=
	_IncOp    // opop
	_Assign   // =
	_Define   // :=
	_Arrow    // <-
	_Star     // *

	// delimiters
	_Lparen    // (
	_Lbrack    // [
	_Lbrace    // {
	_Rparen    // )
	_Rbrack    // ]
	_Rbrace    // }
	_Comma     // ,
	_Semi      // ;
	_Colon     // :
	_Dot       // .
	_DotDotDot // ...

	// keywords
	_Break       // break
	_Case        // case
	_Chan        // chan
	_Const       // const
	_Continue    // continue
	_Default     // default
	_Defer       // defer
	_Else        // else
	_Fallthrough // fallthrough
	_For         // for
	_Func        // func
	_Go          // go
	_Goto        // goto
	_If          // if
	_Import      // import
	_Interface   // interface
	_Map         // map
	_Package     // package
	_Range       // range
	_Return      // return                                                                                                      
	_Select      // select
	_Struct      // struct
	_Switch      // switch
	_Type        // type
	_Var         // var

	// empty line comment to exclude it from .String
	tokenCount //
)
```

扫描器的源码路径为：`$GOROOT/src/cmd/compile/internal/syntax/scanner.go`

核心源码代码为：

```go
func (s *scanner) next() {
	nlsemi := s.nlsemi
	s.nlsemi = false

redo:
	// skip white space
	s.stop()
	startLine, startCol := s.pos()
	for s.ch == ' ' || s.ch == '\t' || s.ch == '\n' && !nlsemi || s.ch == '\r' {
		s.nextch()
	}

	// token start
	s.line, s.col = s.pos()
	s.blank = s.line > startLine || startCol == colbase
	s.start()
	if isLetter(s.ch) || s.ch >= utf8.RuneSelf && s.atIdentChar(true) {
		s.nextch()
		s.ident()
		return
	}

	switch s.ch {
	case -1:
		if nlsemi {
			s.lit = "EOF"
			s.tok = _Semi
			break
		}
		s.tok = _EOF

	case '\n':
		s.nextch()
		s.lit = "newline"
		s.tok = _Semi

	case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
		s.number(false)

	case '"':
		s.stdString()

	case '`':
		s.rawString()

	case '\'':
		s.rune()

	case '(':
		s.nextch()
		s.tok = _Lparen

	case '[':
		s.nextch()
		s.tok = _Lbrack

	case '{':
		s.nextch()
		s.tok = _Lbrace

	case ',':
		s.nextch()
		s.tok = _Comma

	case ';':
		s.nextch()
		s.lit = "semicolon"
		s.tok = _Semi

	case ')':
		s.nextch()
		s.nlsemi = true
		s.tok = _Rparen

	case ']':
		s.nextch()
		s.nlsemi = true
		s.tok = _Rbrack

	case '}':
		s.nextch()
		s.nlsemi = true
		s.tok = _Rbrace

	case ':':
		s.nextch()
		if s.ch == '=' {
			s.nextch()
			s.tok = _Define
			break
		}
		s.tok = _Colon

	case '.':
		s.nextch()
		if isDecimal(s.ch) {
			s.number(true)
			break
		}
		if s.ch == '.' {
			s.nextch()
			if s.ch == '.' {
				s.nextch()
				s.tok = _DotDotDot
				break
			}
			s.rewind() // now s.ch holds 1st '.'
			s.nextch() // consume 1st '.' again
		}
		s.tok = _Dot

	case '+':
		s.nextch()
		s.op, s.prec = Add, precAdd
		if s.ch != '+' {
			goto assignop
		}
		s.nextch()
		s.nlsemi = true
		s.tok = _IncOp

	case '-':
		s.nextch()
		s.op, s.prec = Sub, precAdd
		if s.ch != '-' {
			goto assignop
		}
		s.nextch()
		s.nlsemi = true
		s.tok = _IncOp

	case '*':
		s.nextch()
		s.op, s.prec = Mul, precMul
		// don't goto assignop - want _Star token
		if s.ch == '=' {
			s.nextch()
			s.tok = _AssignOp
			break
		}
		s.tok = _Star

	case '/':
		s.nextch()
		if s.ch == '/' {
			s.nextch()
			s.lineComment()
			goto redo
		}
		if s.ch == '*' {
			s.nextch()
			s.fullComment()
			if line, _ := s.pos(); line > s.line && nlsemi {
				// A multi-line comment acts like a newline;
				// it translates to a ';' if nlsemi is set.
				s.lit = "newline"
				s.tok = _Semi
				break
			}
			goto redo
		}
		s.op, s.prec = Div, precMul
		goto assignop

	case '%':
		s.nextch()
		s.op, s.prec = Rem, precMul
		goto assignop

	case '&':
		s.nextch()
		if s.ch == '&' {
			s.nextch()
			s.op, s.prec = AndAnd, precAndAnd
			s.tok = _Operator
			break
		}
		s.op, s.prec = And, precMul
		if s.ch == '^' {
			s.nextch()
			s.op = AndNot
		}
		goto assignop

	case '|':
		s.nextch()
		if s.ch == '|' {
			s.nextch()
			s.op, s.prec = OrOr, precOrOr
			s.tok = _Operator
			break
		}
		s.op, s.prec = Or, precAdd
		goto assignop

	case '^':
		s.nextch()
		s.op, s.prec = Xor, precAdd
		goto assignop

	case '<':
		s.nextch()
		if s.ch == '=' {
			s.nextch()
			s.op, s.prec = Leq, precCmp
			s.tok = _Operator
			break
		}
		if s.ch == '<' {
			s.nextch()
			s.op, s.prec = Shl, precMul
			goto assignop
		}
		if s.ch == '-' {
			s.nextch()
			s.tok = _Arrow
			break
		}
		s.op, s.prec = Lss, precCmp
		s.tok = _Operator

	case '>':
		s.nextch()
		if s.ch == '=' {
			s.nextch()
			s.op, s.prec = Geq, precCmp
			s.tok = _Operator
			break
		}
		if s.ch == '>' {
			s.nextch()
			s.op, s.prec = Shr, precMul
			goto assignop
		}
		s.op, s.prec = Gtr, precCmp
		s.tok = _Operator

	case '=':
		s.nextch()
		if s.ch == '=' {
			s.nextch()
			s.op, s.prec = Eql, precCmp
			s.tok = _Operator
			break
		}
		s.tok = _Assign

	case '!':
		s.nextch()
		if s.ch == '=' {
			s.nextch()
			s.op, s.prec = Neq, precCmp
			s.tok = _Operator
			break
		}
		s.op, s.prec = Not, 0
		s.tok = _Operator

	case '~':
		s.nextch()
		s.op, s.prec = Tilde, 0
		s.tok = _Operator

	default:
		s.errorf("invalid character %#U", s.ch)
		s.nextch()
		goto redo
	}

	return

assignop:
	if s.ch == '=' {
		s.nextch()
		s.tok = _AssignOp
		return
	}
	s.tok = _Operator
}

func (s *scanner) ident() {
	// accelerate common case (7bit ASCII)
	for isLetter(s.ch) || isDecimal(s.ch) {
		s.nextch()
	}

	// general case
	if s.ch >= utf8.RuneSelf {
		for s.atIdentChar(false) {
			s.nextch()
		}
	}

	// possibly a keyword
	lit := s.segment()
	if len(lit) >= 2 {
		if tok := keywordMap[hash(lit)]; tok != 0 && tokStrFast(tok) == string(lit) {
			s.nlsemi = contains(1<<_Break|1<<_Continue|1<<_Fallthrough|1<<_Return, tok)
			s.tok = tok
			return
		}
	}

	s.nlsemi = true
	s.lit = string(lit)
	s.tok = _Name
}



func (s *source) nextch() {
redo:
	s.col += uint(s.chw)
	if s.ch == '\n' {
		s.line++
		s.col = 0
	}

	// fast common case: at least one ASCII character
	if s.ch = rune(s.buf[s.r]); s.ch < sentinel {
		s.r++
		s.chw = 1
		if s.ch == 0 {
			s.error("invalid NUL character")
			goto redo
		}
		return
	}

	// slower general case: add more bytes to buffer if we don't have a full rune
	for s.e-s.r < utf8.UTFMax && !utf8.FullRune(s.buf[s.r:s.e]) && s.ioerr == nil {
		s.fill()
	}

	// EOF
	if s.r == s.e {
		if s.ioerr != io.EOF {
			// ensure we never start with a '/' (e.g., rooted path) in the error message
			s.error("I/O error: " + s.ioerr.Error())
			s.ioerr = nil
		}
		s.ch = -1
		s.chw = 0
		return
	}

	s.ch, s.chw = utf8.DecodeRune(s.buf[s.r:s.e])
	s.r += s.chw

	if s.ch == utf8.RuneError && s.chw == 1 {
		s.error("invalid UTF-8 encoding")
		goto redo
	}

	// BOM's are only allowed as the first character in a file
	const BOM = 0xfeff
	if s.ch == BOM {
		if s.line > 0 || s.col > 0 {
			s.error("invalid BOM in the middle of the file")
		}
		goto redo
	}
}
```

核心代码就是这个 `next` 函数，它会一个个读取 Go 代码的字符，注意，由于 Golang支持 Unicode 编码，所以它可以直接按照字符来读取而不是字节。上面的代码会不断的循环获取下一个字符，如果遇到空格、回车、换行、tab 字符就会一直掉用 `s.nextch()` ，跳到下一个字符。也就是在扫描的过程中会忽略这些空白字符。然后进入到 `switch` 语句，对当前字符进行判断，直到解析出一个完整的 `Token`，并记录相关的行和列信息，这样不断的通过 `goto` 跳转类似递归的效果直到扫描全部的 go 代码。

我们可以通过调用编译器对应的函数来解析一个go文件查看其生成的token.

需要解析的go文件如下：

https://gitee.com/phper95/go-interview/blob/master/demo/7-3/build-demo/main.go

```go
package main

import "fmt"

func main() {
	fmt.Println("hello world")
}
```

具体实现的代码如下：

https://gitee.com/phper95/go-interview/blob/master/demo/7-3/build-demo/main2.go

```go
package main

import (
	"fmt"
	"go/scanner"
	"go/token"
	"io/ioutil"
	"log"
	"os"
)

func main() {
	// 创建一个文件集
	fset := token.NewFileSet()

	// 创建一个扫描器
	var s scanner.Scanner

	// 打开源文件
	file, err := os.Open("main.go")
	if err != nil {
		panic(err)
	}
	defer file.Close()
	content, err := ioutil.ReadAll(file)
	if err != nil {
		panic(err)
	}
	fileInfo, _ := file.Stat()
	// 初始化扫描器
	s.Init(fset.AddFile("main.go", fset.Base(), int(fileInfo.Size())), content, nil, scanner.ScanComments)

	// 遍历每个token
	log.Println("Token sequence:")
	for {
		pos, tok, lit := s.Scan()
		if tok == token.EOF {
			break
		}
		fmt.Printf("%s\t%s\t%q\n", fset.Position(pos), tok, lit)
	}
}
```

运行 main2.go 输出结果如下：

```go
main.go:1:1     package "package"
main.go:1:9     IDENT   "main"
main.go:1:13    ;       "\n"
main.go:3:1     import  "import"
main.go:3:8     STRING  "\"fmt\""
main.go:3:13    ;       "\n"
main.go:5:1     func    "func"
main.go:5:6     IDENT   "main"
main.go:5:10    (       ""
main.go:5:11    )       ""
main.go:5:13    {       ""
main.go:6:2     IDENT   "fmt"
main.go:6:5     .       ""
main.go:6:6     IDENT   "Println"
main.go:6:13    (       ""
main.go:6:14    STRING  "\"hello world\""
main.go:6:27    )       ""
main.go:6:28    ;       "\n"
main.go:7:1     }       ""
main.go:7:2     ;       "\n"
```

当遇到 `\n` 换行符时，会翻译成一个 `;` 分号，这也是 Go 语言为什么不能以 `;` 结尾

##### 语法分析

在前面的词法分析阶段生成了 `Token` 序列。在语法分析阶段编译器做了什么呢？

1. 在语法分析阶段，语法分析器 将词法分析阶段生成的 `Token` 序列作为输入，按照顺序解析`Token`序列，将 `Token` 序列转换成抽象语法树（`AST`）来表示的程序语法结构。
2. 每个节点表示一个语法元素，如常量，表达式、语句、函数等。而每一个 `AST` 都对应着一个单独的 Go 语言文件。
3. 语法解析的过程中发生的任何语法错误都会被语法解析器发现并将消息打印到标准输出上，整个编译过程也会随着错误的出现而被中止。

###### 1. 什么是抽象语法树?

[抽象语法树](https://en.wikipedia.org/wiki/Abstract_syntax_tree)（Abstract Syntax Tree、AST），是源代码语法的结构的一种抽象表示，它用树状的方式表示编程语言的语法结构。抽象语法树中的每一个 `节点` 都表示源代码中的一个 `元素` ，每一棵 `子树` 都表示一个 `语法元素` 。

以表达式 `1*2+3` 为例，编译器的语法分析阶段会生成如下图所示的抽象语法树：

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E8%AF%AD%E6%B3%95%E6%A0%91.jpg" alt="语法树" style="zoom:45%;" />

抽象语法树最终存储形式如下：

```go
"main.go": SourceFile {
    PackageName: "main",
    ImportDecl: []Import{
        "fmt",
    },
    TopLevelDecl: ...
}
```

值得注意的是：

- 抽象语法树是编译器常用的数据结构，其中空格，括号等字符在生成抽象语法树的过程中会被忽略；

###### 2. 为什么需要语法分析？

语法分析的目的是将 `Token` 序列转换成抽象语法树，而抽象语法树可以用来 `辅助` 编译器进行 `语义分析` ，可以用来检测比如类型是否匹配的问题。

我们可以通过调用编译器对应的函数来解析一个go文件查看其生成的抽象语法树。

需要解析的go文件如下：

https://gitee.com/phper95/go-interview/blob/master/demo/7-3/build-demo/main.go

```go
package main

import "fmt"

func main() {
	fmt.Println("hello world")
}
```

具体实现的代码如下：

https://gitee.com/phper95/go-interview/blob/master/demo/7-3/build-demo/main3.go

```go
package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"log"
)

func main() {
	// 创建一个文件集
	fset := token.NewFileSet()

	// 创建一个解析器
	f, err := parser.ParseFile(fset, "main.go", nil, parser.ParseComments)
	if err != nil {
		panic(err)
	}

	// 打印抽象语法树
	log.Println("Abstract syntax tree:")
	ast.Print(fset, f)
}
```

运行 main3.go 输出结果如下：

```go
     0  *ast.File {  //AST根节点
     1  .  Package: main.go:1:1
     2  .  Name: *ast.Ident {
     3  .  .  NamePos: main.go:1:9  //token的行列
     4  .  .  Name: "main"          //token的原词
     5  .  }
     6  .  Decls: []ast.Decl (len = 2) {
     7  .  .  0: *ast.GenDecl {    //通用声明节点，表示导入，常量，类型或变量声明
     8  .  .  .  TokPos: main.go:3:1
     9  .  .  .  Tok: import
    10  .  .  .  Lparen: -
    11  .  .  .  Specs: []ast.Spec (len = 1) {
    12  .  .  .  .  0: *ast.ImportSpec {
    13  .  .  .  .  .  Path: *ast.BasicLit {
    14  .  .  .  .  .  .  ValuePos: main.go:3:8
    15  .  .  .  .  .  .  Kind: STRING
    16  .  .  .  .  .  .  Value: "\"fmt\""
    17  .  .  .  .  .  }
    18  .  .  .  .  .  EndPos: -
    19  .  .  .  .  }
    20  .  .  .  }
    21  .  .  .  Rparen: -
    22  .  .  }
    23  .  .  1: *ast.FuncDecl {    //函数声明节点
    24  .  .  .  Name: *ast.Ident {
    25  .  .  .  .  NamePos: main.go:5:6
    26  .  .  .  .  Name: "main"
    27  .  .  .  .  Obj: *ast.Object {
    28  .  .  .  .  .  Kind: func
    29  .  .  .  .  .  Name: "main"
    30  .  .  .  .  .  Decl: *(obj @ 23)
    31  .  .  .  .  }
    32  .  .  .  }
    33  .  .  .  Type: *ast.FuncType {
    34  .  .  .  .  Func: main.go:5:1
    35  .  .  .  .  Params: *ast.FieldList {
    36  .  .  .  .  .  Opening: main.go:5:10
    37  .  .  .  .  .  Closing: main.go:5:11
    38  .  .  .  .  }
    39  .  .  .  }
    40  .  .  .  Body: *ast.BlockStmt {  //函数体
    41  .  .  .  .  Lbrace: main.go:5:13
    42  .  .  .  .  List: []ast.Stmt (len = 1) {
    43  .  .  .  .  .  0: *ast.ExprStmt {
    44  .  .  .  .  .  .  X: *ast.CallExpr {
    45  .  .  .  .  .  .  .  Fun: *ast.SelectorExpr {
    46  .  .  .  .  .  .  .  .  X: *ast.Ident {
    47  .  .  .  .  .  .  .  .  .  NamePos: main.go:6:2
    48  .  .  .  .  .  .  .  .  .  Name: "fmt"
    49  .  .  .  .  .  .  .  .  }
    50  .  .  .  .  .  .  .  .  Sel: *ast.Ident {
    51  .  .  .  .  .  .  .  .  .  NamePos: main.go:6:6
    52  .  .  .  .  .  .  .  .  .  Name: "Println"
    53  .  .  .  .  .  .  .  .  }
    54  .  .  .  .  .  .  .  }
    55  .  .  .  .  .  .  .  Lparen: main.go:6:13
    56  .  .  .  .  .  .  .  Args: []ast.Expr (len = 1) {
    57  .  .  .  .  .  .  .  .  0: *ast.BasicLit {
    58  .  .  .  .  .  .  .  .  .  ValuePos: main.go:6:14
    59  .  .  .  .  .  .  .  .  .  Kind: STRING
    60  .  .  .  .  .  .  .  .  .  Value: "\"hello world\""
    61  .  .  .  .  .  .  .  .  }
    62  .  .  .  .  .  .  .  }
    63  .  .  .  .  .  .  .  Ellipsis: -
    64  .  .  .  .  .  .  .  Rparen: main.go:6:27
    65  .  .  .  .  .  .  }
    66  .  .  .  .  .  }
    67  .  .  .  .  }
    68  .  .  .  .  Rbrace: main.go:7:1
    69  .  .  .  }
    70  .  .  }
    71  .  }
    72  .  FileStart: main.go:1:1
    73  .  FileEnd: main.go:7:3
    74  .  Scope: *ast.Scope {
    75  .  .  Objects: map[string]*ast.Object (len = 1) {
    76  .  .  .  "main": *(obj @ 27)
    77  .  .  }
    78  .  }
    79  .  Imports: []*ast.ImportSpec (len = 1) {
    80  .  .  0: *(obj @ 12)
    81  .  }
    82  .  Unresolved: []*ast.Ident (len = 1) {
    83  .  .  0: *(obj @ 46)
    84  .  }
    85  }
```

经过语法分析构建出来的每个语法树都是相应源文件的精确表示，其节点对应于源文件的各种元素，例如表达式、声明和语句。并且语法树还会包括位置信息，用于错误报告和创建调试信息。

##### 类型检查（语义分析）

语法分析只能检测到括号或者操作符是否匹配等常规语法问题，并不能确定语句的具体含义，所以还需要对 `AST` 的每个节点进行 `类型检查`。这个阶段在其他高级语言的编译过程中也被称为 `语义分析` 。

类型检查的源码路径为：`$GOROOT/src/cmd/compile/internal/types2/check.go`

类型检查需要遍历 **抽象语法树** 来识别节点的类型，包括需要推断得出的类型。比如 `i:=1`，其中变量i和常量1都没有直接声明类型，此时编译器会自动推断出对应的类型。

##### 中间代码生成

前面的步骤中完成了编译前端的工作，包括抽象语法树的构建以及语法规则的校验，确保代码没有语法错误。在生成机器码之前，编译器会将源码翻译成介于源代码和目标机器码中间的中间代码（`IR`, Intermediate Representation）。

编译前端完成了 `源代码 -> token -> AST` 的翻译工作，而中间代码生成阶段完成了 `AST -> 基于 AST 的 IR Tree` 的翻译工作.

这个阶段的源码路径：`$GOROOT/src/cmd/compile/internal/noder/irgen.go`

> 为什么要先生成中间代码呢？
>
> 1. 便于对代码进行优化；
> 2. 解耦和复用。
>    - 编译器面对的复杂场景，很多编译器需要将源代码翻译成多种机器码，所以将编程语言到机器码的过程拆成 中间代码生成 和 机器码生成 两个简单步骤可以简化机器码的生成过程，中间代码是一种更接近机器语言的表示形式，对中间代码的优化和分析相比直接分析高级编程语言更容易。
>    - 我们知道，编译后端最终目的是生成不同 `CPU` 架构上的 机器代码，在生成机器码之前我们还需要对代码进行 `优化` ，而这些优化不是针对某个CPU架构的，而是跟编译环境无关的一些代码优化，这时候如果我们将生成机器码之前的这些步骤都耦合到一起，随着不同CPU架构的支持，这些公共代码也得在新的CPU架构上实现一遍。所以为了能复用和解耦，这里将不依赖具体编译环境的一些工作独立出来，先生成中间代码，这样即时调整了一些语法特性，只要编译前端生成了相同的中间代码，则编译后端是不需要改动的。

##### 代码优化

代码优化阶段是我们需要重点掌握的。我们需要知道在这个阶段编译器到底做了哪些优化？

这个阶段的优化主要包括 `死代码消除`，`函数内联`，`逃逸分析`，`闭包重写`，`循环不变量外提`等。这里我们重点介绍前3种：

###### 死代码消除

死代码消除是去除一些无用代码以 **减少程序的体积大小** ，并且还可以避免程序在执行过程中进行一些不必要的运算行为，从而 **减少执行时间** 。

死代码包括两类，一类是程序执行不到的代码，另一类是不会影响函数执行结果的变量：

https://gitee.com/phper95/go-interview/blob/master/demo/7-3/build-demo/main4.go

```go
package main

func main() {
   const x, y = 1, 2
   var max int
   if x < y {
      max = y
   } else {
      max = x
   }
   if max == x {
      panic(x)
   }
}
```

对于常量x,y (注意是常量，常量会在编译阶段估值，而变量是在运行时估值)，这里编译器判定x < y 永远为 true，这里的else分支是永远不会执行到的，所以编译器会直接去掉这个分支条件，优化成如下的代码：

```go
package main

func main() {
   const x, y = 1, 2
   const max = y
   if max == x {
      panic(x)
   }
}
```

由于max是一个常量， max == x永远为false，而所以编译器会进一步消除死码：

```go
package main

func main() {
   const x, y = 1, 2
   const max = y
}
```

如果这些常量没有在其他地方使用，则会再一步消除

```go
package main

func main() {
}
```

我们可以 `dump` 出 `SSA` 的生成过程：

在 linux 环境中执行下面的指令：

```shell
GOSSAFUNC=main go build main4.go
```

会再当前目录下生成 `ssa.html` 文件，该文件中详细展示了 `SSA` 的生成过程。

###### 函数内联

如果程序中存在大量的小函数的调用，函数内联（function call inlining）就会直接用函数体替换掉函数调用来 **减少因为函数调用而造成的额外上下文切换开销** 。

比如下面这个go代码：

https://gitee.com/phper95/go-interview/blob/master/demo/7-3/build-demo/main5.go

```go
package main

func main() {
   n := 1
   for i := 0; i < 10; i++ {
      n = incr(n)
   }
   println(n)
}

func incr(n int) int {
   return  n+1
}
```

优化后为：

```go
package main

func main() {
   n := 1
   for i := 0; i < 10; i++ {
      n +=1
   }
   println(n)
}
```

需要注意的是，编译器进行内联优化时也会考虑编译成本，只有在满足一定的条件下才会进行内联优化，比如 `go`，`defer` 等函数就不会进行内联优化，具体代码可以查看`$GOROOT/src/cmd/compile/internal/inline/inl.go`

我们可以通过下面的指令查看内联优化的详细信息：

```go
go build -gcflags="-m -m" main5.go
```

> 注意：`-m` 越多输出的调试结果越详细

输出结果为：

```shell
# command-line-arguments
./main6.go:11:6: can inline incr with cost 4 as: func(int) int { return n + 1 }
./main6.go:3:6: can inline main with cost 28 as: func() { n := 1; for loop; println(n) }
./main6.go:6:11: inlining call to incr
```

如果我们不希望编译器对函数进行内联优化，也可以通过注释来指定：

```go
package main

func main() {
	n := 1
	for i := 0; i < 10; i++ {
		n = incr(n)
	}
	println(n)
}

//go:noinline
func incr(n int) int {
	return n + 1
}
```

我们在函数 `incr` 上加了一个 `//go:noinline` 的注释，编译器就会对这个函数跳过内联检查。

###### 逃逸分析

由于 Go 语言具有自己的 GC 机制，不需要开发人员手动管理内存，所以在编译阶段，编译器会自动决定将变量分配到 `goroutine` 的栈内存或者全局堆内存上。

我们熟知的一些逃逸规则，比如变量有在函数外使用，则该变量就会逃逸到堆上。当然这只是逃逸规则中的一种，还有很多其他规则。

我们通过下面的代码来查看编译器的逃逸分析：

```go
package main

import (
	"fmt"
	"time"
)

func main() {
    x := 1
    y := 2
    go func() {
        fmt.Println(x, y)
    }()
    x = 2
    time.Sleep(time.Millisecond)
}
```

我们在终端执行：

```go
 go build -gcflags="-m -m" main6.go
```

输出结果为：

```shell
# command-line-arguments
./main6.go:11:6: can inline incr with cost 4 as: func(int) int { return n + 1 }
./main6.go:3:6: can inline main with cost 28 as: func() { n := 1; for loop; println(n) }
./main6.go:6:11: inlining call to incr
lee@DESKTOP-EGAKURF:/mnt/e/code/go/go-interview/demo/7-3/build-demo$ go build -gcflags="-m -m" main5.go
# command-line-arguments
./main5.go:12:6: cannot inline incr: marked go:noinline
./main5.go:3:6: cannot inline main: function too complex: cost 81 exceeds budget 80
lee@DESKTOP-EGAKURF:/mnt/e/code/go/go-interview/demo/7-3/build-demo$ go build -gcflags="-m -m" main5.go
# command-line-arguments
./main5.go:12:6: can inline incr with cost 4 as: func(int) int { return n + 1 }
./main5.go:3:6: can inline main with cost 28 as: func() { n := 1; for loop; println(n) }
./main5.go:6:11: inlining call to incr
lee@DESKTOP-EGAKURF:/mnt/e/code/go/go-interview/demo/7-3/build-demo$ clear
lee@DESKTOP-EGAKURF:/mnt/e/code/go/go-interview/demo/7-3/build-demo$  go build -gcflags="-m -m" main6.go
# command-line-arguments
./main6.go:8:6: cannot inline main: unhandled op GO
./main6.go:11:5: can inline main.func1 with cost 78 as: func() { fmt.Println(x, y) }
./main6.go:12:14: inlining call to fmt.Println
./main6.go:11:5: func literal escapes to heap:
./main6.go:11:5:   flow: {heap} = &{storage for func literal}:
./main6.go:11:5:     from func literal (spill) at ./main6.go:11:5
./main6.go:9:2: main capturing by ref: x (addr=false assign=true width=8)
./main6.go:9:2: x escapes to heap:
./main6.go:9:2:   flow: {storage for func literal} = &x:
./main6.go:9:2:     from x (captured by a closure) at ./main6.go:12:15
./main6.go:9:2:     from x (reference) at ./main6.go:12:15
./main6.go:10:2: main capturing by value: y (addr=false assign=false width=8)
./main6.go:12:18: y escapes to heap:
./main6.go:12:18:   flow: {storage for ... argument} = &{storage for y}:
./main6.go:12:18:     from y (spill) at ./main6.go:12:18
./main6.go:12:18:     from ... argument (slice-literal-element) at ./main6.go:12:14
./main6.go:12:18:   flow: fmt.a = &{storage for ... argument}:
./main6.go:12:18:     from ... argument (spill) at ./main6.go:12:14
./main6.go:12:18:     from fmt.a := ... argument (assign-pair) at ./main6.go:12:14
./main6.go:12:18:   flow: {heap} = *fmt.a:
./main6.go:12:18:     from fmt.Fprintln(os.Stdout, fmt.a...) (call parameter) at ./main6.go:12:14
./main6.go:12:15: x escapes to heap:
./main6.go:12:15:   flow: {storage for ... argument} = &{storage for x}:
./main6.go:12:15:     from x (spill) at ./main6.go:12:15
./main6.go:12:15:     from ... argument (slice-literal-element) at ./main6.go:12:14
./main6.go:12:15:   flow: fmt.a = &{storage for ... argument}:
./main6.go:12:15:     from ... argument (spill) at ./main6.go:12:14
./main6.go:12:15:     from fmt.a := ... argument (assign-pair) at ./main6.go:12:14
./main6.go:12:15:   flow: {heap} = *fmt.a:
./main6.go:12:15:     from fmt.Fprintln(os.Stdout, fmt.a...) (call parameter) at ./main6.go:12:14
./main6.go:9:2: moved to heap: x
./main6.go:11:5: func literal escapes to heap
./main6.go:12:14: ... argument does not escape
./main6.go:12:15: x escapes to heap
./main6.go:12:18: y escapes to heap
```

通过上面的输出我们可以知道，变量`x` 和 `y` 都发生了逃逸。

- 输出中`./main6.go:9:2: main capturing by ref: x`表明`x`被闭包**通过引用方式捕获**。由于`x`在闭包外部被修改（`x = 2`），闭包内需要访问最新的值，因此编译器必须将`x`分配到堆上以保持其生命周期的有效性。
- 输出中`./main6.go:9:2: moved to heap: x`直接声明`x`被移动到堆内存，这是逃逸的核心证据。这表明`x`的生命周期超出了`main`函数的栈帧限制。
- 输出中`./main6.go:10:2: main capturing by value: y`显示`y`被闭包通过**值捕获**。虽然值捕获通常不会逃逸，但后续`fmt.Println`的参数传递导致`y`逃逸。
- `fmt.Println`的参数类型是`interface{}`，编译器无法在编译时确定具体类型，必须将`y`装箱为接口值，导致`y`逃逸到堆。输出中`./main6.go:12:18: y escapes to heap`验证了这一点。

###### 变量捕获

还需要注意的是，此处编译器还进行了变量捕获，变量捕获主要是针对协程启动的闭包函数中使用闭包外的变量的情况。比如这里的变量 x 由于在协程内使用后在协程外对治进行了修改，我们取出带 `capturing` 的行：

```shell
......
./main6.go:9:2: main capturing by ref: x (addr=false assign=true width=8)
......
./main6.go:10:2: main capturing by value: y (addr=false assign=false width=8)
......
```

其中变量 x 的 `assign=true`，而变量 y 的 `assign=fase`，说明这里将变量 x 当地址进行了传值，在后面的 `./main6.go:9:2: flow: {storage for func literal} = &x:` 这行日志中也可以看出来。

需要注意的是，这里即时不使用协程，变量 x 和 y 也会发生逃逸，比如下面的代码：

```go
package main

import (
	"fmt"
)

func main() {
    x := 1
    y := 2
    x = 2
    fmt.Println( x + y)
}
```

由于调用了 `fmt.Println()` 函数，变量 x 和 y 就发生了逃逸。

```go
package main

import (
	"fmt"
)

func main() {
    x := 1
    y := 2
    x = 2
    z:= x + y
    fmt.Println(z)
}
```

而在上面函数中只有变量 z 发生了逃逸。

> `fmt.Println`的函数签名是`func(a ...interface{})`，参数类型为`interface{}`。当传递基本类型（如`int`）给接口时，Go需要将其**装箱（Boxing）**为接口值（包含类型信息和数据指针的复合结构）。
>
> - 装箱操作需要在堆上分配内存存储接口的动态类型和数据值，因此编译器必须将原变量移动到堆上以确保接口值的有效性。
> - 示例中`x + y`的结果会被装箱为接口值，导致`x`和`y`逃逸；而改用中间变量`z`后，仅`z`需要装箱，逃逸范围缩小。

##### SSA生成

`SSA` 是静态单赋值（Static Single Assignment）的缩写，这个阶段 `IR` 将被转换为静态单赋值形式，它是一种具有特定属性的较低级别的中间表示，可以更轻松地实现优化并最终生成机器代码。

> 源码位于：`$GOROOT/src/cmd/compile/internal/ssagen`

##### 机器码生成

最后一步会将优化后的 `SSA` 形式的中间代码转换成特定目标机器（目标 CPU 架构）的 `机器码` ，如x86_64或arm等。

这一步会针对具体目标架构，通过 `SSA` 进行 **多轮转换** 来执行代码优化，包括死代码消除（和之前步骤中的代码优化不同，这些转换和优化是针对目标机器的 CPU 架构）、将数值移到离它们的用途更近的地方、删除多余局部变量、寄存器分配等等。

经过上面的多轮转换后得到 `genssa` 再翻译成 `汇编代码` 就可以调用汇编器 `$GOROOT/src/cmd/compile/internal/obj` 将它们转换为 `机器代码` 并生成最终的 `目标文件` 了。

如果程序使用其他库还会使用静态链接或动态链接将这些依赖引用进来。我们可以在 `go build` 时指定链接方式，通常在没有使用 `CGO` 时，Go 默认会使用静态链接。

### Go程序启动流程

Go 程序启动过程可以分为以下几个步骤：

1. 编译成可执行文件

首先，Go 代码被编译器转换成 `plan9` 汇编代码，然后由汇编器生成目标程序 `.o` 文件，最后由链接器合并链接成可执行文件。

2. 加载程序镜像

Go 程序启动时，操作系统会将程序镜像加载到内存中，并为程序分配一块地址空间。在这个过程中，操作系统会检查程序的可执行文件头部信息，确定程序的入口点和其他必要信息。

3. 初始化运行时环境
   Go 程序启动后，运行时环境会被初始化。这个过程包括创建主 `goroutine`、初始化全局变量、初始化标准库等。

4. 调用 main 函数
   在初始化运行时环境完成后，Go 程序会调用 main 函数。main 函数是程序的入口点，它是程序中第一个被执行的函数。

5. 执行 main 函数
   启动 `m0` 获取可执行的 `goroutine`，当调度器执行到 `runtime.main` 时就会执行程序的 `main` 函数。在 main 函数被调用后，程序会按照 main 函数中的代码顺序执行。

6. 程序退出
   当 main 函数执行完毕或者程序遇到异常情况时，程序会退出。在退出前，运行时环境会清理资源，包括关闭所有 `goroutine`、释放内存等。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/Go%E5%90%AF%E5%8A%A8%E8%BF%87%E7%A8%8B%EF%BC%88%E6%A6%82%E8%BF%B0%EF%BC%89.jpg" alt="Go启动过程（概述）" style="zoom:75%;" />

详细版如下：

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/Go%E5%90%AF%E5%8A%A8%E8%BF%87%E7%A8%8B%EF%BC%88%E6%BA%90%E7%A0%81%EF%BC%89.jpg" alt="Go启动过程（源码）" style="zoom:78%;" />

> - m0
>   - `m0` 是 Go `Runtime` 所创建的第一个系统线程，一个 Go 进程只有一个 `m0`，也叫主线程。`m0` 只是工作线程的一种，它的声明跟其他 `m` 线程一样。普通的工作线程 `m` 是通过调度器P将可执行的 `goroutine` 队列调度给工作线程去执行，而 `m0` 会调度执行 `g0` 。
>
> - g0
>
>   - `g` 就是我们常说的 `goroutine`。 `goroutine` 按照执行的任务类型来划有3种：
>
>     - 启动时执行调度任务的叫 `g0`；
>
>     - 执行用户任务的叫做 `g`；
>
>     - 执行 `runtime.main` 的 `main goroutine`。

> `g0` 和 普通的 `goroutine` 有啥区别？
>
> `g0` 和 `g` 的声明也是相同的，但他们所执行的具体任务及执行流程以及堆栈分配上都是有区别的：
>
> 1. 在数据结构上，`g0` 和其他创建的 `g` 在数据结构上是一样的，但是存在栈的差别。在 `g0` 上的栈分配的是系统栈，在 Linux 上栈大小默认固定 8MB，不能扩缩容。 而常规的 `g` 起始大小为2KB（当然这个起始值根据Go版本和编译器的不同可能会有差异），可扩容；
> 2. 功能上：协程 `g0` 运行在操作系统线程栈上，其作用主要是执行协程调度的一系列运行时代码。而一般的协程则用于执行用户代码。所以 `g0` 比较特殊，每一个 `m` 都只有一个 `g0`，且每个 `m` 都只会绑定一个 `g0`。也正因为如此，`g0` 没有那么多种运行状态，也不会被调度程序抢占，调度本身就是在 `g0` 上运行的。
> 3. 执行流程上：`g0` 作为特殊的调度协程，其执行的函数和流程相对固定，并且，为了避免栈溢出，协程 `g0` 的栈会重复使用。而每个执行用户代码的协程，可能都有不同的执行流程。每次上下文切换回去后，会继续执行之前的流程。

#### main 函数的启动流程

其中 `main` 函数是如何启动的呢？

##### init() 函数

- 作用：程序执行前包的初始化，比如初始化包里的变量等
- 执行顺序：
  - 在同一个Go文件中的多个`init`方法，按照代码顺序依次执行
  - 同一个 `package` 中，不同文件中的 `init` 方法的执行，按照文件名先后执行各个文件中的 `init` 方法
  - 在不同的`package`中，且不相互依赖，按照 `main` 包中 `import` 的顺序调用各自包中的 `init()` 函数
  - 在不同的`package`中，且相互依赖，最后被依赖的最先执行
    - 例如：导入顺序 main –> A –> B –> C，则初始化顺序为 C –> B –> A –> main

##### main() 函数

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

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/image-20250516104634380.png" alt="image-20250516104634380" style="zoom:75%;" />

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

## GC 垃圾回收

### GC的本质

GC（Garbage Collection）泛指垃圾回收机制，它可以实现自动化的内存空间管理，当程序向操作系统申请的内存不再需要时，垃圾回收主动将其回收并供其他代码进行内存申请时候复用，或者将其归还给操作系统，这种针对内存级别资源的自动回收过程就是垃圾回收。而负责垃圾回收的程序模块则被称为垃圾回收器。

所谓的“垃圾”其实就是程序中不再需要的对象，也是垃圾回收需要回收的。如果程序（通过某个变量等等）可能会直接或间接的引用一个对象，那么这个对象就被视为“存活“；与之相反，不再引用的对象则被视为“死亡“。将这些死亡对象找出来，然后作为垃圾进行回收，者就是GC的本质。

### GC的实现方式

#### 1. 追踪（Tracing）

从 `根对象` 出发，根据对象之间的 `引用关系` 一步步扫描整个堆并确定要保留的对象，从而回收可回收的对象。像Java，Golang等的GC实现方式都属于追踪式的。

所谓的 `根对象` 指的是垃圾回收器在标记过程时最先检查的对象，根对象包括下面3类：

1. `全局变量`。在编译期即可确定且存在于程序的整个声明周期；
2. `执行栈`。在 Golang 中每个 `Goroutine` 都有自己的执行栈，执行栈上包含栈上的变量及指向分配的堆内存区块的指针；
3. `寄存器`。寄存器的值可能表示一个指针，这些指针可能指向某些赋值器分配的堆内存区块。

追踪式的 GC 又可以细分成不同的实现方式：

- `标记清除`：最基本的追踪式 GC，只进行标记和清除两个步骤，但会产生内存碎片。
- `标记整理`：为了解决内存碎片问题，在标记后将存活的对象移动到一块连续的内存区域，然后清除剩余的空间。
- `复制`：将内存分为两个相等的区域，每次只使用其中一个区域，当该区域快要满时，将存活的对象复制到另一个区域，并清空原来的区域。这样可以避免内存碎片，但会浪费一半的内存空间。
- `分代`：根据对象的存活时间将对象分为不同的代（年轻代、老年代、永久代等），并针对不同代采用不同的回收策略。
  - 一般来说，年轻代中的对象存活时间较短，回收频率较高，可以采用复制算法；
  - 老年代中的对象存活时间较长，回收频率较低，可以采用标记清除或标记整理算法；
  - 永久代中的对象基本不会被回收，通常存放类信息、常量等元数据。
- `增量`：为了减少 GC 造成的停顿时间，将 **标记** 和 **清除** 的过程分成多个小步骤，在每个步骤之间让用户程序执行一段时间，然后再继续下一个步骤。这样可以让 GC 和用户程序交替执行，降低停顿时间，但会增加总体开销。
- `并发`：为了进一步降低停顿时间，让 GC 和用户程序同时执行，即在多个线程或 CPU 上 `并行` 地进行 **标记** 和 **清除** 。这样可以提高 GC 的效率，但需要考虑并发带来的同步问题，会增加 GC 实现的复杂度。

#### 2. 引用计数（Reference Counting）

给每个对象维护一个引用计数器，当对象被引用时计数器加一，当对象失去引用时计数器减一，当计数器变为零时立即回收该对象。

引用计数式 GC 的优点是实现简单，回收及时；缺点是需要额外的空间和时间来维护计数器，无法回收循环引用的对象。像Python、Objective-C 的GC实现方式属于引用计数的方式。

### GC 实现方式

Go 语言的 GC 使用的是追踪式 GC 的一种变种：**无分代**（对象没有代际之分）、**不整理**（回收过程中不对对象进行移动与整理）、**并发**（与用户代码并发执行）的三色标记清除算法。

我们知道，java 使用的是 分代式GC ，这种GC方式已经相当成熟了，那么Go语言为什么不使用分代式 GC 呢？

1. Go语言具有逃逸分析的特性，使得分代式 GC 在这种场景下不再适用。
   - 分代式GC 依赖分代假设，即 GC 将主要的回收目标放在新创建的对象上（存活时间短，更倾向于被回收），而非频繁检查所有对象。但 Go 的编译器会通过 `逃逸分析` 将大部分新生对象存储在栈上（栈直接被回收），只有那些需要长期存在的对象才会被分配到需要进行垃圾回收的堆中。
   - 也就是说，分代式GC 回收的那些存活时间短的对象在 Go 中是直接被分配到栈上，当 `goroutine` 死亡后栈也会被直接回收，不需要GC的参与，进而分代假设并没有带来直接优势。
2. Go 语言使用的内存分配算法基本没有碎片问题，使得分代式GC 中的对象整理不会带来实质性的性能提升。
   - Go使用的是基于 `tcmalloc` 的现代内存分配算法，对对象进行整理不会带来实质性的性能提升。
   - 而分代式GC 的一个优势是解决内存碎片问题 以及 “允许”使用顺序内存分配器。但Go运行时的分配算法基于 `tcmalloc` ，基本上没有碎片问题。并且顺序内存分配器在多线程的场景下并不适用。
3. Go语言的垃圾回收更倾向于让垃圾回收与用户代码并发执行，而分代式GC 在减少 `STW` 上的优势并不明显。
   - Go的垃圾回收器与用户代码并发执行，使得 `STW` 的时间与对象的代际、对象的size没有关系。Go团队更关注于如何更好地让 GC 与用户代码并发执行（使用适当的CPU来执行垃圾回收），而非减少停顿时间这一单一目标上。

### GC 流程

#### 标记清除算法的流程

早期的标记清除算法的具体过程：

1. 暂停程序业务逻辑，对可达和不可达的对象进行分类，然后做上标记;
2. 找出程序所有可达对象并做上标记；
3. 解除暂停继续执行业务代码，重复上述过程直到指定的处理程序生命周期结束。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%A0%87%E8%AE%B0%E6%B8%85%E9%99%A4.png" alt="标记清除" style="zoom:75%;" />

如上图所示，对象 1,2,3,6 将被标记为可达对象，而对象4 和 对象5 为该程序的不可达对象，最终会被垃圾回收器清理。

标记清除算法简单明了，但这种算法的问题也是比较明显的：

1. 最大的问题是 `STW` 需要暂停业务程序，并且整个 GC 过程都需要暂停。内存占用大的时候会出现明显的卡顿，这对于高性能的后端服务来说是不可容忍的；
2. 另一个问题是标记需要扫描整个 heap，代价很大，导致性能不佳；
3. 清除数据会产生堆内存碎片

#### 标记清除分离

而在1.3 版本重点在于优化了 `STW` 的覆盖范围，将 **标记** 和 **清除** 彻底分离。原本在 **标记** 和 **清除** 的整个过程都需要暂停，而现在只需要在 **标记** 的过程暂停，而 **清除** 的过程则不需要 `STW` 暂停，因为标记完成后已经标记出不可达对象了，既然已经是不可达对象了也就不会出现回收过程中的写冲突，所以清除的过程是不需要 `STW` 暂停的。

#### 三色标记法

经过1.3 版本的优化 `STW` 的时间有了较大幅度的降低，但是仍然没达到后端高性能服务的要求。所以在 1.5 版本中Go研发团队引入了三色标记法，这种算法使得 GC过程可以跟用户的 `Groutine` 并发执行，当然标记的过程中依然需要 `STW` 时间。

所谓三色标记法实际上就是通过三个阶段的标记来确定需要清除的对象：

1. 创建新对象时默认标记为 `白色` ，表示对象未被垃圾回收器访问。GC流程开始时，首先从 `根节点` 开始遍历所有对象，将遍历到的根对象放入“`灰色`”集合。
   - 注意，本轮只会遍历 `根对象` ，比如下图中的对象只会将对象1 和 对象6 标记为灰色。
   - <img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%A0%87%E8%AE%B0%E6%B8%85%E9%99%A4-20250516174414616.png" alt="标记清除" style="zoom:70%;" />
   - 在标记的过程中，垃圾回收器会维护这3种颜色对象的集合，将对应颜色的对象记录到对应的集合中。
2. 上一步我们将 `根对象` 记录到了 `灰色` 集合，接着就开始遍历 `灰色` 集合，同样也只遍历一层，将 `灰色` 对象可直达的对象也放入 `灰色` 集合，同时将之前标记的 `灰色` 对象移动到 `黑色` 对象的集合中。
   - 这一步中，上图的对象2 将会被标记为灰色对象，同时对象1 和 对象6 会被标记为黑色对象。
3. 重复执行第二步，直到 `灰色` 集合中的对象全部被标记。此时全部的内存数据只有 `黑白` 两种颜色。其中 `黑色` 是程序正在使用的对象，而 `白色` 对象是不可达对象，需要被清理。
4. 回收所有 `白色` 集合中的对象。

> 由此我们可以总结这3种颜色的对象的含义了：
>
> - 白色：表示未被垃圾回收器访问到的对象，即根对象不可达的对象，可能是垃圾对象。在回收开始时，所有对象都是白色的；在回收结束时，所有白色对象都是不可达的垃圾。
> - 灰色：表示已被垃圾回收器访问到的对象，但其子对象还未被访问到。灰色对象需要进一步扫描其子对象。
> - 黑色：表示已被垃圾回收器访问到的对象，且其子对象也已被访问到。黑色对象是确定存活的对象，根对象可达，正在被程序使用的对象。

由于 `标记` 过程是 `并发` 执行的，而且执行并发流程的数据可能相互依赖，为了保证数据的并发安全，在开始执行三色标记前会启动 `STW` 暂停程序，在扫描确定黑白对象之后再放开 `STW` 。

这种标记方式下，如果不暂停程序会出现什么问题呢？

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%A0%87%E8%AE%B0%E6%B8%85%E9%99%A4-%E5%B9%B6%E5%8F%91%E9%97%AE%E9%A2%98.png" alt="标记清除-并发问题" style="zoom:80%;" />

由于程序运行过程中对象的引用关系是有可能随时发生改变的，如果在标记阶段发生了变化就会影响标记结果的正确性。

假设上面图中对象2 是通过 指针 指向对象3 ，假设此时对象6 已经被标记为 `黑色` 且垃圾回收器还没扫描到 对象2 的时候，对象2 的指针被移除，同时 对象2 被 对象6 所引用。这时候 对象2 依然是 `白色`，由于对象6已经扫描完成，所以 对象2 和 对象3 就会被垃圾回收器当做垃圾给回收掉，显然这种情况是不符合预期的。

而为了防止这种情况的发生最简单的做法就是 `STW` ，直接暂停用户程序，相当于先加锁，确保对象不会被其他协程改变，等全部标记完再解锁。

### 屏障机制

所以这种三色标记法依然无法避免 GC 过程中的卡顿，那么如何确保在不会被 GC 误杀的情况下能减少 `STW` 的时间呢？

经过上面的分析我们可以总结如果下面两种情况同时发生就会出现对象被 GC 误杀的情况：

1. 一个白色对象被黑色对象引用；
2. 灰色对象同时失去了这个白色对象的可达关系；

而提升 GC 效率只要使用一种机制去打破这两个必要条件就可以了，所以到了1.5版本就出现了 `屏障机制` 。GC回收器在满足下面两种情况中任意一种时，即可确保对象不丢失。这两种情况就是 `强三色不变式` 和 `弱三色不变式` ：

#### 强三色不变式

所谓强三色不变 实际上是强制性地不允许 `黑色` 对象引用 `白色` 对象，这样就不会出现 `白色` 对象被误删的情况。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%BB%A1%E8%B6%B3%E5%BC%BA%E4%B8%89%E8%89%B2%E4%B8%8D%E5%8F%98%E5%BC%8F%E7%9A%84%E6%83%85%E5%86%B5.jpg" alt="满足强三色不变式的情况" style="zoom:80%;" />

#### 弱三色不变式

而弱三色不变式 则 允许 `黑色` 对象引用 `白色` 对象，但必须满足一定的条件：即这个 `白色` 对象必须存在其他 `灰色` 对象对它的引用，或者这个 `白色` 对象的链路上游存在 `灰色` 对象。满足这个条件之后，即使 `黑色` 对象引用 `白色` 对象，使得 `白色` 对象处于一个危险被删除的状态，但是上游 `灰色` 对象的引用，可以保护该 `白色` 对象，使其不会被垃圾回收器回收。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%BB%A1%E8%B6%B3%E5%BC%B1%E4%B8%89%E8%89%B2%E4%B8%8D%E5%8F%98%E5%BC%8F%E7%9A%84%E6%83%85%E5%86%B5.jpg" alt="满足弱三色不变式的情况" style="zoom:80%;" />

如果三色标记法中满足上面两个不变式之一就可以保证对象不丢失。为了实现上面两种方式，GC算法演进了两种屏障方式来避免 `STW` 的时间。

> 这里的屏障怎么去理解呢？

所谓的 `屏障` 本质上是在程序执行过程中增加额外的判断机制，如果满足一定的条件就使用类似 `回调` 或者 `钩子`（Hook）通知垃圾回收器进行进一步的处理。

对应强弱三色不变式，衍生了两种屏障机制来达成这两种不变式的条件。

##### 插入屏障

`插入屏障`（insertion barrier）又称为 `增量更新屏障`（incremental update）， 如果某一对象的引用被插入到已经被标记为 `黑色` 的对象中，这类屏障会**保守地**将其作为 `非白色` 存活对象， 以满足强三色不变性。

比如 对象1 是 `黑色` 对象，当 对象1 指向 对象2 时（也就是 对象1 新增了下游对象时）对象2 将会被标记为 `灰色` ，防止 对象2 被回收。因为三色标记法每次是从 `灰色` 对象开始遍历的，如果将 `白色` 对象挂到 `黑色` 对象下面，会导致该 `白色` 对象无法被扫描到而被回收。

我们根据下面的示意图来具体理解这一过程：

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%8F%92%E5%85%A5%E5%86%99%E5%B1%8F%E9%9A%9C1-%E5%88%9D%E5%A7%8B%E7%8A%B6%E6%80%81.jpg" alt="插入写屏障1-初始状态" style="zoom:90%;" />

我们以上图的对象为例，上图中有7个对象，其中 对象1 引用 对象2 ，对象2 引用 对象3，对象4 引用对象2，对象5 引用 对象6，而 对象7 没有引用任何对象，也没有被任何对象引用。

首先这些对象在创建时会被全部标记为 `白色` 。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%8F%92%E5%85%A5%E5%86%99%E5%B1%8F%E9%9A%9C2-%E6%A0%87%E8%AE%B0%E6%A0%B9%E5%AF%B9%E8%B1%A1.jpg" alt="插入写屏障2-标记根对象" style="zoom:90%;" />

根据三色标记的流程，遍历 `根节点` 集合，非递归形式，只遍历一次，能够标记出第一层的 `灰色` 节点 对象1 和 对象5，同时这些 `灰色` 节点也被添加至 `灰色` 标记的集合中。如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%8F%92%E5%85%A5%E5%86%99%E5%B1%8F%E9%9A%9C3-%E9%81%8D%E5%8E%86%E7%81%B0%E8%89%B2%E5%AF%B9%E8%B1%A1.jpg" alt="插入写屏障3-遍历灰色对象" style="zoom:90%;" />

接下来就遍历 `灰色` 标记表中的 对象1 和 对象5，将可达的对象从 `白色` 标记为 `灰色`。同时被遍历的 `灰色` 对象被标记为 `黑色`。这一轮标记后，对象1 和 对象5 由 `灰色` 对象集合移动到了 `黑色` 对象集合，而 对象1 和 对象5 的可达 对象2 和 6 由 `白色` 对象集合移动到了 `灰色` 对象集合。如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%8F%92%E5%85%A5%E5%86%99%E5%B1%8F%E9%9A%9C4-%E8%A7%A6%E5%8F%91%E6%8F%92%E5%85%A5%E5%86%99%E5%B1%8F%E9%9A%9C%E6%9C%BA%E5%88%B6.png" alt="插入写屏障4-触发插入写屏障机制" style="zoom:90%;" />

此时，业务程序像已经标记为 `黑色` 对象的 对象1 和 对象5 分别添加了 对象8 和 对象9，这时就会触发 `插入屏障` 机制，`黑色` 对象上添加 `白色` 对象，所以插入的 对象8 和 对象9 会变成 `灰色` 对象。之后就是正常的三色标记流程，继续循环上述的流程，直到没有 `灰色` 节点。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%8F%92%E5%85%A5%E5%86%99%E5%B1%8F%E9%9A%9C5-%E8%BF%9B%E8%A1%8C%E4%B8%89%E8%89%B2%E6%A0%87%E8%AE%B0.jpg" alt="插入写屏障5-进行三色标记" style="zoom:90%;" />

最终只有 对象4 和 对象7 是不可达对象，最终会被垃圾回收期回收。

##### 删除屏障

`删除屏障`（deletion barrier）又称为 `基于起始快照` 的屏障（snapshot-at-the-beginning）。当一个 `白色` 或 `灰色` 对象的引用被移除时，或者被上游替换的时候，该对象被标记为 `灰色`。`删除屏障` 实际上是满足弱三色不变式，其目的是保护 `灰色` 对象到 `白色` 对象的路径不会断。

我们根据下面的示意图来具体理解这一过程：

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E5%88%A0%E9%99%A4%E5%B1%8F%E9%9A%9C1.jpg" alt="删除屏障1" style="zoom:90%;" />

假设初始状态下，堆内存空间有 4个对象，这些对象创建后都会被标记为 `白色` 放到 `白色` 标记集合中，如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E5%88%A0%E9%99%A4%E5%B1%8F%E9%9A%9C-%E6%A0%B9%E9%81%8D%E5%8E%86.jpg" alt="删除屏障-根遍历" style="zoom:90%;" />

根据三色标记的流程，先遍历 `根节点` ，非递归遍历一次，此时 对象1 被标记为 `灰色` 对象并被添加到 `灰色` 标记集合中。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E5%88%A0%E9%99%A4%E5%B1%8F%E9%9A%9C3-%E8%A7%A6%E5%8F%91%E5%88%A0%E9%99%A4%E5%B1%8F%E9%9A%9C.jpg" alt="删除屏障3-触发删除屏障" style="zoom:90%;" />

如果此时删除 `灰色` 对象1 的下游 对象2，在没有 `删除屏障` 机制下，对象2 连同其下游 对象 3和 4 将会与主路径断开，最终都会被清除。

而在 `删除屏障` 机制的保护下，被删除的 对象2 会被标记为 `灰色`。由于没有 `STW` 的保护，在删除 对象2 的同时可能会有 `黑色` 对象引用了 对象2，那么 对象2 就不能被回收。这就是 `删除屏障` 的目的所在，虽然会增加扫描次数，但极大的减少了 `STW` 的时间。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E5%88%A0%E9%99%A4%E5%B1%8F%E9%9A%9C4-%E7%81%B0%E5%8F%98%E9%BB%91.jpg" alt="删除屏障4-灰变黑" style="zoom:90%;" />

按照三色标记法的顺序，接下来遍历 `灰色` 标记表中的 `灰色` 对象1 和 对象2 将它们可达的对象从 `白色` 标记为 `灰色`，同时 `灰色` 对象1 和 对象2 被标记为 `黑色`。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E5%88%A0%E9%99%A4%E5%B1%8F%E9%9A%9C5-%E6%9C%80%E7%BB%88%E7%8A%B6%E6%80%81.jpg" alt="删除屏障5-最终状态" style="zoom:90%;" />

继续循环上述流程进行三色标记，直到没有 `灰色` 节点，最终的状态如上图所示，全部对象被标记为 `黑色` 。

对于 `删除屏障` ，在 `GC ` 开始时 `STW` 扫描 **堆栈** 来记录 **初始快照** ，这个过程会保护开始时刻的所有 存活对象，所以 `删除屏障` 又被称为 `基于起始快照的屏障` 。当然，在上面这轮 `GC` 最终结束后，如果 对象2 及其 下游对象 没有被引用，在下一轮 `GC` 中依然有机会被清理。

##### 混合写屏障

虽然 `插入屏障` 和 `删除屏障` 都可以在一定程度上解决 `STW` 带来的无法并行处理的问题，但也有各自的优势和不足，而 `混合写屏障` 就可以在特定的场景下配合使用这两种屏障机制，从而发挥其优势。

- 为了确保 **栈空间** 的性能，**栈空间** 的对象并不使用 `屏障` 机制，如果 **堆栈** 中的对象有相互引用的情况，如果只使用 `插入屏障` ，**栈空间** 的对象需要使用 `STW` 重新扫描来标记 **栈** 上的存活对象，这显然增加了 **栈空间** 的 GC 成本。
- `删除写屏障` 的不足比较明显，它的回收精度低，为了确保对象不被误杀，而使得一些本可以回收的对象只能在后续的GC过程中被回收。

在 Go 的 1.8 版本中引入了 `混合写屏障机制` (Hybrid Write Barrier)，避免了 堆栈 的重新扫描，这也极大的减少了 `STW` 的时间。

同时结合了 `插入写屏障` 和 `删除写屏障` 两者的优势。这也是 Go 的 GC 性能达到 ms 级以内的一个里程碑式的节点，也是 Go 语言 GC 达到比较稳定的最终形态。

### 并发的三色标记法具体实现

> 这里 **并发** 的三色标记法其实就是指引入了 `混合写屏障` 之后的三色标记法。

由于普通的 `标记清除算法` 需要 `STW` 来暂停业务程序，而不进行 `STW` 的保护又可能导致对象被误删除，所以为了确保并发标记的正确性，需要引入 `写屏障` 机制。

`写屏障` 其实就是在修改指针时执行额外操作的一种机制，用来确保 `黑色` 对象不能指向 `白色` 对象，当发生这种情况时将这个 `白色` 对象标记为 `灰色` 来避免 `黑色` 对象下游的 `白色` 对象被回收，或者当 `白色` 对象的引用被解除，其可达关系遭到破坏时，强制将其标记为 `灰色` 保存其引用路径待下一轮 GC 来决定是否可以回收。

接下来我们看下 `混合写屏障` 在 GC 过程中的一些细节。

首先我们需要知道 `混合写屏障` 的几个规则：

1.  GC 开始时优先扫描 **栈** 上的对象并将 **可达** 对象全部标记为 `黑色` ，包括 GC 期间在 **栈** 上创建的新对象也被标记为 `黑色` ；
   - 由于 栈空间 有限且 栈 上对象相对较少，再加上为了确保 栈 的运行效率，所以将 栈 上的对象标记为 `黑色` 的目的其实是为了避免 `STW` 和 进行 二次扫描。
2. 当对象 **删除** 时触发 `删除写屏障`，即将 删除的对象 标记为 `灰色`。
3. 当对象 **新增** 时触发 `插入写屏障` ，将其标记为 `灰色`。

我们通过示意图来理解这个过程：

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C1-%E5%88%9D%E5%A7%8B%E7%8A%B6%E6%80%81.png" alt="混合写屏障1-初始状态" style="zoom:90%;" />

如上图所示：假设在初始状态下 **栈** 上有 4个对象，O1，O2，O3 和 O5，**堆** 上有 6 个对象 O6，O7，O8，O9，O10 和 O11。

如上图所示：

**栈空间** 范围的 `根节点` 引用 对象1，对象1 引用 对象2，对象2 引用 对象3，还有一个游离 对象5。

**堆空间** 范围的 `根节点` 引用 对象6，对象6 引用 对象7，对象7 引用 对象8，另外一个 `根节点` 引用了  对象9，还有一个对象10 引用 对象11，对象10 没有被引用。

初始状态这些对象默认会被标记为 `白色`。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C2-%E6%89%AB%E6%8F%8F%E6%A0%88%E5%AF%B9%E8%B1%A1.jpg" alt="混合写屏障2-扫描栈对象" style="zoom:90%;" />

GC 开始时，首先扫描 **栈** 区，将可达对象全部标记为 `黑色` 。

**栈** 空间上对象 1，2，3 为可达对象，所以当 **栈** 区扫描结束后对象1，2，3 被标记为了 `黑色`。

此时 **栈** 区新增了 对象4，在 GC 期间 **栈** 区新增的对象将会被标记为 `黑色`（注意，不论 对象4 是否被其他对象引用，只要是 GC 期间在 **栈** 上新增的对象就会被标记为 `黑色` 从而避免 **栈** 空间的重复扫描），所以此时栈空间上对象 1，2，3，4 为 `黑色`。如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C3-1-%E5%88%A0%E9%99%A4%E6%A0%88%E5%AF%B9%E8%B1%A1.jpg" alt="混合写屏障3-1-删除栈对象" style="zoom:90%;" />

假设此时 对象4 的引用被指向了 对象2，然后 **删除** 对象1 对 对象2 的引用。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C3-2-%E5%88%A0%E9%99%A4%E6%A0%88%E5%AF%B9%E8%B1%A1%E5%BC%95%E7%94%A8.jpg" alt="混合写屏障3-2-删除栈对象引用" style="zoom:90%;" />

由于是 **栈** 空间，所以 对象4 新增下游 对象2 以及 对象1 删除 对象2 的引用不会触发 `屏障` 机制，直接操作即可。

由于 **栈** 空间可达对象和新增对象均为 `黑色`，所以不必启动 `写屏障` 和 `STW` 机制就能保证对象的安全

假设 对象4 没有被其他对象引用，那么在下一次 `GC` 的过程中也会被回收。对象1 指向 对象2 的引用被移除后的状态如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C3-3%E6%89%AB%E6%8F%8F%E5%A0%86%E5%AF%B9%E8%B1%A1.jpg" alt="混合写屏障3-3扫描堆对象" style="zoom:90%;" />

接着继续执行 `GC` 开始扫描 **堆** ，根据三色标记法，先扫描 `根对象` ，并将 `根对象` 放到 `灰色` 队列等待下一轮扫描。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C3-4%E5%A0%86%E5%88%A0%E9%99%A4%E5%BC%95%E7%94%A8%E6%88%90%E4%B8%BA%E6%A0%88%E7%9A%84%E4%B8%8B%E6%B8%B8.jpg" alt="混合写屏障3-4堆删除引用成为栈的下游" style="zoom:90%;" />

假设此时 **栈** 对象4 的引用指向了 对象7，由于 对象4 是 **栈** 对象，所以当 对象4 添加 对象7 后，依然不会触发 `屏障` 机制，此时 对象7 依然是白色。如果 **堆** 对象6 指向 对象7 的引用不被删除，则 对象7 仍然是安全的，因为 对象7 此时是在 `灰色` 对象的下游。假设此时 **堆** 对象6 指向 堆对象7 的引用被删除会发生什么呢？

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C3-5%E5%A0%86%E5%88%A0%E9%99%A4%E5%BC%95%E7%94%A8%E8%A7%A6%E5%8F%91%E5%B1%8F%E9%9A%9C%E6%9C%BA%E5%88%B6.png" alt="混合写屏障3-5堆删除引用触发屏障机制" style="zoom:90%;" />

由于 对象6 在 **堆** 区，所以 对象6 解除 对象7 的引用属于 `灰色` 对象删除 `白色` 对象，**堆** 上的 **删除** 操作就会触发`删除屏障`，被删除的 对象7 就会被标记为 `灰色` 。这样做是为了为了保留被删除对象的引用路径，防止被删除对象的下游有被使用的对象而被 GC 误删除。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C4%E7%BB%A7%E7%BB%AD%E6%89%AB%E6%8F%8F%E7%81%B0%E8%89%B2%E5%AF%B9%E8%B1%A1.png" alt="混合写屏障4继续扫描灰色对象" style="zoom:90%;" />

接着继续执行三色标记法的流程，扫描 `灰色` 队列中的 对象6，7 和 9，也只扫描一层，将 对象7 的下游对象8 标记为 `灰色`，同时 对象6，7 和 9 被标记为 `黑色`，如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C5-%E5%A0%86%E5%8C%BA%E6%96%B0%E5%A2%9E%E6%8C%87%E9%92%88.jpg" alt="混合写屏障5-堆区新增指针" style="zoom:90%;" />

此时，如果 对象6 新增了对 对象10 的引用，由于 对象6 是 `黑色` 对象，并且是 **堆** 空间范围的对象，所以将 对象6 指向 对象10 时会触发 `插入写屏障` ，对象10 将会从 `白色` 标记为 `灰色` ，这样也间接保护了白色 对象11。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C6-%E5%9B%9E%E6%94%B6%E5%9E%83%E5%9C%BE%E5%AF%B9%E8%B1%A1.jpg" alt="混合写屏障6-回收垃圾对象" style="zoom:90%;" />

再经过两轮三色标记的扫描流程，首先扫描 `灰色` 对象8 和 10 将其标记为 `黑色` 同时将 对象10 的下游 对象11 标记为 `灰色`。然后再进行一轮扫描将对象11标记为 `黑色`。最终 **栈** 区的 `白色` 对象5 被回收。

这里我们再讨论另一种情况，假设 **堆** 区的 `灰色` 对象解除了对下游 `白色` 对象的引用而指向了 **栈** 区 `黑色` 的对象，GC 过程又会怎样呢？

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C7-1-%E6%A0%88%E5%AF%B9%E8%B1%A1%E5%88%A0%E9%99%A4%E5%BC%95%E7%94%A8%E6%88%90%E4%B8%BA%E5%A0%86%E7%9A%84%E4%B8%8B%E6%B8%B8%E7%9A%84%E5%9C%BA%E6%99%AF.jpg" alt="混合写屏障6-回收垃圾对象" style="zoom:90%;" />

假设当前对象的标记状态如上图所示，假设在 GC 的过程中 **栈** 空间目前有 3 个 `黑色` 对象O1，O2，O3，**堆** 空间有一个 `灰色` 对象O4 以及 两个 `白色` 对象 O5 和 O6。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C7-2-%E6%A0%88%E5%AF%B9%E8%B1%A1%E5%88%A0%E9%99%A4%E5%BC%95%E7%94%A8%E6%88%90%E4%B8%BA%E5%A0%86%E7%9A%84%E4%B8%8B%E6%B8%B8%E7%9A%84%E5%9C%BA%E6%99%AF.jpg" alt="混合写屏障6-回收垃圾对象" style="zoom:90%;" />

假设此时将 O1 赋值为 nil，则O1 对 Q2 的引用会断开，相当于O1 **删除** 了对 对象2 的引用，因为对象2 是 **栈** 空间的对象，删除 操作并不会触发 `屏障` 机制，可以直接操作，由于 GC 开始时会扫描 **栈** 的可达对象并标记为 `黑色`，所以即使 删除 `黑色` 对象2，对象2 也不会在这一次垃圾回收中被清理掉。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C7-3-%E6%A0%88%E5%AF%B9%E8%B1%A1%E5%88%A0%E9%99%A4%E5%BC%95%E7%94%A8%E6%88%90%E4%B8%BA%E5%A0%86%E7%9A%84%E4%B8%8B%E6%B8%B8%E7%9A%84%E5%9C%BA%E6%99%AF.jpg" alt="混合写屏障6-回收垃圾对象" style="zoom:90%;" />

接着再将 对象2 赋值给 对象4，这个操作会分两步执行，先是 移除 对象4 对 对象5 的引用，由于 对象5在 **堆** 空间，所以 对象5 的 删除 会触发 `屏障` 机制，此时 对象5 会被标记成 `灰色` 。

接着将 对象4 的指针指向 对象2，这个过程中相当于 对象4 新增了下游对象，会触发 `插入写屏障`，将 对象2 标记为 `灰色`，由于 对象2 已经是 `黑色`，属于安全的对象，所以 对象2 会继续保持 `黑色`。如上图所示。

<img src="./%E7%AC%AC%E4%BA%8C%E7%AB%A0%20GO%E8%AF%AD%E8%A8%80runtime%E7%AF%87.assets/%E6%B7%B7%E5%90%88%E5%86%99%E5%B1%8F%E9%9A%9C7-4-%E6%A0%88%E5%AF%B9%E8%B1%A1%E5%88%A0%E9%99%A4%E5%BC%95%E7%94%A8%E6%88%90%E4%B8%BA%E5%A0%86%E7%9A%84%E4%B8%8B%E6%B8%B8%E7%9A%84%E5%9C%BA%E6%99%AF.jpg" alt="混合写屏障6-回收垃圾对象" style="zoom:90%;" />

最后根据三色标记法继续扫描 `灰色` 对象4 和 5 并将其标记为 `黑色`，同时将 `灰色` 对象5 的下游 对象6 标记为 `灰色`，最后一轮将 对象6 标记为 `黑色` 后 GC 结束，这种情况下没有需要回收的对象。对象5 和 6 属于不可达的游离对象，如果在下一次 GC 过程中依然没有其他可达对象的引用，就会被回收。

