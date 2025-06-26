# Java 对象分析

## Java 对象内存布局

Java 对象一般在内存中的布局通常由 `对象头`、`实例数据`、`对齐填充`三部分组成，如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613231819575.png" alt="image-20250613231819575" style="zoom:50%;" />

32 位/64 位的对象头信息，对象头结构及存储大小说明如下：

|虚拟机|对象头结构信息|说明|大小|
| ------| ------------------------------| --------------------------------------------------------------------| -----------|
|32 位|MarkWord|HashCode、分代年龄、是否偏向锁和锁标记位|4byte/32bit|
|32 位|ClassMetadataAddress/KlassWord|类型指针指向对象的类元数据，JVM 通过这个指针确定该对象是哪个类的实例|4byte/32bit|
|32 位|ArrayLenght|如果是数组对象存储数组长度，非数组对象不存在|4byte/32bit|

|虚拟机|对象头结构信息|说明|大小||
| ------| ------------------------------| --------------------------------------------------------------------| -----------| ----------------------------------|
|64 位|MarkWord|unused、HashCode、分代年龄、是否偏向锁和锁标记位|8byte/64bit||
|64 位|ClassMetadataAddress/KlassWord|类型指针指向对象的类元数据，JVM 通过这个指针确定该对象是哪个类的实例|8byte/64bit|开启指针压缩的情况下为 4byte/32bit|
|64 位|ArrayLenght|如果是数组对象存储数组长度，非数组对象不存在|4byte/32bit||

### 对象头

#### MarkWord

存储对象自身的运行时数据，如哈希码（HashCode）、GC 分代年龄、锁状态标志、线程持有的锁、偏向线程 ID、偏向时间戳等等。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613231836492.png" alt="image-20250613231836492" style="zoom:80%;" />

- `unused` ：未使用的区域。
- `identity_hashcode` ：对象最原始的哈希值，就算重写 `hashcode()` 也不会改变。
- `age` ：对象年龄。
- `biased_lock` ：是否偏向锁。
- `lock` ：锁标记位。
- `ThreadID` ：持有锁资源的线程ID。
- `epoch` ：偏向锁时间戳。
- `ptr_to_lock_record` ：指向线程栈中 `lock_record` 的指针。
- `ptr_to_heavyweight_monitor` ：指向堆中 `monitor` 对象的指针。

#### 类型指针

对象指向它的类元数据的指针，虚拟机通过这个指针来确定这个对象是那个类的实例。在 32 位系统占 4 字节，在 64 位系统中占 8 字节。

#### Length

只在数组对象中存在，用来记录数组的长度，占用 4 字节

### 实例数据

实例数据，对象实际数据，对象实际数据包括了对象的所有成员变量，其大小由各个成员变量的大小决定。(这里不包括静态成员变量，因为其是在方法区维护的)

### 对齐填充

Java 对象占用空间是 8 字节对齐的，即所有 Java 对象占用 bytes 数必须是 8 的倍数，因为当我们从磁盘中取一个数据时，不会说我想取一个字节就是一个字节，都是按照一块儿一块儿来取的，这一块大小是 8 个字节，所以为了完整，padding 的作用就是补充字节，**保证对象是 8 字节的整数倍**

## 对象大小计算

在 Java 中创建一个 Object 对象会占用多少内存呢？

```java
public static void main(String[] args){
    Object obj = new Object();
    System.out.println(ClassLayout.parseInstance(obj).toPrintable());
}
```

可以来进行初步计算，对象头大小应该理论上为 `mrakword` + `klassword` = `16bytes` ，同时 Object 类中是没有定义任何属性的，所以不存在实例数据。

但如果在开启指针压缩的情况下，只会有 `12bytes`，因为对象头中的类元指针会被压缩一半，所以会出现 4bytes 的对齐填充，最终不管是否开启了指针压缩，大小应该为 `16字节`。

结果运行如下：

```java
java.lang.Object object internals:
OFFSET  SIZE   TYPE DESCRIPTION            VALUE
0     4        (object header)        ......  
4     4        (object header)        ...... 
8     4        (object header)        ......  
12     4        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
```

从结果中可以很明显的看到，0–12byte 为对象头，12–16byte 为对齐填充数据，最终大小为 `16bytes`，与上述的推测无误，在开启指针压缩的环境下，会出现 `4bytes` 的对齐填充数据。

> 上述简单分析了 Object 对象的大小之后，我们再来看一个案例，如下：

```java
public static void main(String[] args){
    Object obj = new int[9];
    System.out.println(ClassLayout.parseInstance(obj).toPrintable());
}
```

此时大小又为多少呢？因为该数组为 int 数组，而 int 类型的大小为 32bit/4bytes，所以理论上它的大小为：`(12bytes对象头 + 9*4 = 36bytes 数组空间) = 48bytes`，对吗？

先看看运行结果：

```powershell
[I object internals:
 OFFSET  SIZE   TYPE DESCRIPTION          VALUE
      0     4        (object header)      .....
      4     4        (object header)      .....
      8     4        (object header)      .....
     12     4        (object header)      .....
     16    36    int [I.<elements>        N/A
     52     4        (loss due to the next object alignment)
Instance size: 56 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
```

从结果中可以看出最终大小为 `56bytes`，实际的大小与前面的推断存在明显出入，为什么呢？

这是因为目前的 obj 对象是一个数组对象，在前面分析对象头构成的时候曾分析过，如果一个对象是数组对象，那么它的对象头中也会使用 `4bytes` 存储数组的长度，所以此时的 obj 对象头大小为 16bytes，其中 12~16bytes 用于存储数组的长度，再加上 9 个 int 类型的数组空间 36bytes，大小为 52bytes，因为 52 不为 8 的整数倍，所以 JVM 会为其补充 `4bytes` 的 `对齐填充` 数据，最终大小就成了上述运行结果中的 `56bytes`。

## java 对象分配过程

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613231855261.png" alt="image-20250613231855261" style="zoom:60%;" />

### 类加载检查

虚拟机遇到一条 `new` 指令时，首先将去检查这个指令的参数是否能在 `常量池` 中定位到这个 `类` 的 `符号引用`，并且检查这个符号引用代表的类是否已被加载过、解析和初始化过。如果没有，那必须先执行相应的类加载过程。

[类加载过程](第二章 类加载子系统篇.md) ，请参考 「第二章 类加载子系统篇」。

### 分配内存

Java 的对象并不是直接一开始就尝试在堆上进行分配的，分配过程如下：

![image-20250613231912204](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613231912204.png)

#### 首先尝试栈上分配

如果对象被分配在 `栈` 上，那么该对象就无需 GC 机制回收它，该对象会随着方法栈帧的销毁随之自动回收。但如果一个对象大小超过了栈可用空间（栈总大小-已使用空间），那么此时就不会尝试将对象进行栈上分配。

在 `hotspot 逃逸分析` 的基础上，使用 `标量替换` 拆解聚合量，以基本量代替对象，然后最终做到将对象拆散分配在虚拟机栈的局部变量表中，从而减少对象实例的产生，减少堆内存的使用以及 GC 次数。

> - `逃逸分析`：逃逸分析是建立在方法为单位之上的，如果一个成员在方法体中产生，但是直至方法结束也没有走出方法体的作用域，那么该成员就可以被理解为未逃逸。反之，如果一个成员在方法最后被 return 出去了或在方法体的逻辑中被赋值给了外部成员，那么则代表着该成员逃逸了。
> - `标量替换`：建立在逃逸分析的基础上使用基本量标量代替对象这种聚合量，标量泛指不可再拆解的数据，八大基本数据类型就是典型的标量。

#### 尝试 TLAB 分配

在 Eden 区为每条线程划分的一块私有缓冲内存。

> 大部分的 Java 对象是会被分配在堆上的，但也说到过堆是线程共享的，那么此时就会出现一个问题：当 JVM 运行时，如果出现两条线程选择了同一块内存区域分配对象时，不可避免的肯定会发生竞争，这样就导致了分配速度下降。
>
> 虚拟机为了根治这个问题，为每条线程专门分配一块内存区域，这块区域就被称为 TLAB 区，当一条线程尝试为一个对象分配内存时，如果开启了 TLAB 分配的情况下，那么会先尝试在 TLAB 区域进行分配。
>
> 一般情况只有当 TLAB 区分配失败时才会开始尝试在堆上分配。

#### 年老代分配

初次分配时，`大对象` 直接进入年老代。  

一般对象进入年老代的情况只有三种：`大对象`、`长期存活对象` 以及`动态年龄判断符合条件的对象`。

> 动态年龄符合条件的对象：sum(Survivor 区中相同年龄的所有对象大小) > Survivor 空间 / 2

#### 新生代分配

如果栈上分配、TLAB 分配、年老代分配都未成功，此时就会来到 Eden 区尝试新生代分配。而在新生代分配时，会存在两种分配方式：

- `指针碰撞`：如果 Java 堆的内存是规整，即所有用过的内存放在一边，而空闲的放在另一边。分配内存时将位于中间的指针指示器向空闲的内存移动一段与对象大小相等的距离，这样便完成分配内存工作。
- `空闲列表`：如果 Java 堆的内存不是规整的，则需要由虚拟机维护一个列表来记录 那些内存是可用的，这样在分配的时候可以从列表中查询到足够大的内存分配给对象，并在分配后更新列表记录。

##### **内存分配并发问题**

在创建对象的时候有一个很重要的问题，就是线程安全，因为在实际开发过程中，创建对象是很频繁的事情，作为虚拟机来说，必须要保证线程是安全的，通常来讲，虚拟机采用两种方式来保证线程安全：

- **CAS+ 失败重试**： CAS 是乐观锁的一种实现方式。所谓乐观锁就是，每次不加锁而是假设没有冲突而去完成某项操作，如果因为冲突失败就重试，直到成功为止。**虚拟机采用 CAS 配上失败重试的方式保证更新操作的原子性**。
- **TLAB**： 为每一个线程预先在 Eden 区分配一块儿内存，JVM 在给线程中的对象分配内存时，首先在 TLAB 分配，当对象大于 TLAB 中的剩余内存或 TLAB 的内存已用尽时，再采用上述的 CAS 进行内存分配。

### 初始化（设置零值）

经过内存分配的步骤之后，当前创建的 Java 对象会在内存中被分配到一块区域，接着则会初始化分配到的这块空间，JVM 会将分配到的内存空间（不包括对象头）都初始化为零值。

这样做的好处在于：可以保证对象的实例字段在 Java 代码中不赋初始值就直接使用，程序可以访问到字段对应数据类型所对应的零值，避免不赋值直接访问导致的空指针异常。

> - 如果对象是被分配在栈上，那所有数据都会被分配在栈帧中的局部变量表中。
> - 如果对象是 `TLAB` 分配，那么初始化内存这步操作会被提前到内存分配的阶段进行。

### 设置对象头

- 当初始化零值完成后，紧接着会对于对象的对象头进行设置。首先会将对象的原始哈希码、GC 年龄、锁标志、锁信息组装成  `MrakWord` 放入对象头中
- 然后会将指向当前对象类元数据的类型指针 `KlassWord` 也加入对象头中
- 如果当前对象是数组对象，那么还会将编码时指定的数组长度 ArrayLength 放入对象中

### 执行 <init> 函数

最后会执行 <init> 函数，也就是构造函数，经过这个步骤之后才能够在真正意义上构建出一个可用对象。

## 对象引用类型

### 强引用

以前我们使用的大部分引用实际上都是强引用，这是使用最普遍的引用。

如果一个对象具有强引用，那就类似于必不可少的生活用品，垃圾回收器绝不会回收它。当内存空间不足，Java 虚拟机宁愿抛出 OutOfMemoryError 错误，使程序异常终止，也不会靠随意回收具有强引用的对象来解决内存不足问题。 

下例中，b 就是强引用。

```java
public static void main(String[] args) {
    Object a = new Object();
    Object b = a;
    a = null;
    System.out.println(b); //java.lang.Object@4554617c
}
```

### 软引用

> 内存不够就回收

软引用是指使用 `java.lang.ref.SoftReference` 类型修饰的对象，当一个对象只存在软引用时，在堆内存不足的情况下，该引用级别的对象将被 GC 机制回收。

如果需要实现 JVM 级别的简单缓存，那么可以使用该级别的引用类型实现。使用案例如下：

```java
SoftReference<HashMap> cacheSoftRef = 
    new SoftReference<HashMap>(new HashMap<Object,Object>());
cacheSoftRef.get().put("竹子","熊猫");
System.out.println(cacheSoftRef.get().get("竹子"));
```

### 弱引用

> 一定回收

弱引用类型是指使用 `java.lang.ref.WeakReference` 类型修饰的对象，与软引用的区别在于：弱引用类型的对象生命周期更短，因为弱引用类型的对象只要被GC发现，不管当前的堆内存资源是否紧张，都会被GC机制回收。

```java
public static void weakReferenceTest() {
    Object a = new Object();
    ReferenceQueue < Object > queue = new ReferenceQueue < > ();
    WeakReference < Object > weakReference = new WeakReference < > (a, queue);
    System.out.println(a); //java.lang.Object@4554617c
    System.out.println(weakReference.get()); //java.lang.Object@4554617c
    System.out.println(queue.poll()); //null
    System.out.println("-------------------");
    a = null;
    System.gc();
    System.out.println(a); //null
    System.out.println(weakReference.get()); //null
    //虚引用在回收之前被加入到了引用队列中
    System.out.println(queue.poll()); //java.lang.ref.WeakReference@74a14482
}
```

### 虚引用

> 一定回收，get 出来就是 null，引用形同虚设，主要和引用队列联合使用，在 finalize 之前会被放到引用队列中

与其他的几种引用类型不同的是：虚引用不会决定 GC 机制对一个对象的回收权，如果一个对象仅仅存在虚引用，那么 GC 机制将会把他当成一个没有任何引用类型的对象，随时随刻可以回收它。

不过它还有个额外的用途：跟踪垃圾回收过程，也正是由于虚引用可以跟踪对象的回收时间，所以也可以将一些资源释放操作放置在虚引用中执行和记录。

```java
public static void phantomReferenceTest() {
    Object a = new Object();
    ReferenceQueue < Object > queue = new ReferenceQueue < > ();
    PhantomReference < Object > phantomReference = new PhantomReference < > (a, queue);
    System.out.println(a); //java.lang.Object@4554617c
    System.out.println(phantomReference.get()); //null
    System.out.println(queue.poll()); //null
    System.out.println("-------------------");
    a = null;
    System.gc();
    System.out.println(a); //null
    System.out.println(phantomReference.get()); //null
    //引用在回收之前被加入到了引用队列中
    System.out.println(queue.poll()); //java.lang.ref.WeakReference@74a14482
}
```
