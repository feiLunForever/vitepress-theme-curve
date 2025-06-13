# Dubbo

## Dubbo 是什么

Dubbo 是一款高性能、轻量级的开源 RPC 框架，提供服务自动注册、自动发 现等高效服务治理方案， 可以和 Spring 框架无缝集成

## 服务器注册与发现的流程

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613212432892.png" alt="image-20250613212432892" style="zoom:60%;" />

- 服务容器 `Container`

  - 负责启动，加载，运行服务提供者
- 服务提供者 `Provider`

  - 在启动时，向注册中心注册自己提供的服务
- 服务消费者 `Consumer`

  - 在启动时，向注册中心订阅自己所需的服务
  - 从提供者地址列表中，基于软负载均衡算法，选一台提供者进行调用，如果调用失败，再选另一台调用
- 注册中心 `Registry`

  - 返回服务提供者地址列表给消费者
  - 如果有变更，注册中心 将基于长连接推送变更数据给消费者
- 监控中心 `Monitor`

  - 服务消费者 `Consumer` 和提供者 `Provider`，在内存中累计调用次数和调用时间，定时每分钟发送一次统计数据到监控中心

## Dubbo 工作原理

- `service` 层，接口层

  - 给服务提供者和消费者来实现的(留给开发人员来实现)
- `config` 层，配置层

  - 主要是对 Dubbo 进行各种配置的，Dubbo 相关配置
- `proxy` 层，服务代理层

  - 调用远程方法像调用本地的方法一样简单的一个关键，真实调用过程依赖代理类
- `registry` 层，服务注册层

  - 负责服务的注册与发现
- `cluster` 层，集群层

  - 封装多个服务提供者的路由以及负载均衡，将多个实例组合成一个服务
- `monitor` 层，监控层

  - 对 rpc 接口的调用次数和调用时间进行监控
- `protocol` 层，远程调用层

  - 封装 rpc 调用
- `exchange` 层，信息交换层

  - 封装请求响应模式，同步转异步
- `transport` 层，网络传输层

  - 抽象 mina 和 netty 为统一接口
- `serialize` 层，数据序列化层

  - 对需要在网络传输的数据进行序列化

## 注册中心挂了，consumer 还能不能调用 provider

初始化时，`consumer` 会将需要的所有 `provider` 的地址等信息拉取到 `本地缓存`，所以注册中心挂了可以继续通信。

但是 `provider` 挂了，那就没法调用了。

## 怎么实现动态感知服务下线

- 服务订阅方式

  - pull 模式需要客户端定时向注册中心拉取配置
  - push 模式采用注册中心主动推送数据给客户端
- Dubbo ZooKeeper 注册中心采用是 `事件通知与客户端拉取` 方式
- 服务 `第一次订阅` 的时候将会拉取对应目录下 `全量` 数据，然后在订阅的 `节点` 注册一个 ` watcher`
- 一旦目录 `节点` 下发生任何数据变化， ZooKeeper 将会通过 `watcher` 通知客户端
- 客户端接到通知，将会 `重新` 拉取该目录下 `全量` 数据， 并重新注册 `watcher`
- 另外， ZooKeeper 提供了“`心跳检测`”功能，它会定时向各个服务提供者发送一个请求(实际上建立的是一个 socket 长连接)，如果长期没有响应，服务中心就认为该服务提供者已经“挂了”，并将其剔除。

## Dubbo 容错策略

### failover cluster 模式

- provider 宕机重试以后，请求会分到其他的 provider 上

### failback 模式

- 失败自动恢复会在调用失败后，返回一个空结果给服务消费者
- 并通过定时任务对失败的调用进行重试，适合执行消息通知等操作

### failfast cluster 模式

- 快速失败只会进行一次调用，失败后立即抛出异常
- 适用于幂等操作、写操作

### failsafe cluster 模式

- 当调用过程中出现异常时，仅会打印异常，而不会抛出异常
- 适用于写入审计日志等操作

### forking cluster 模式

- 并行调用多个服务器，只要一个成功即返回
- 通常用于实时性要求较高的读操作，但需要浪费更多服务资源

### broadcacst cluster 模式

- 广播调用所有提供者，逐个调用，任意一台报错则报错
- 通常用于通知所有提供者更新缓存或日志等本地资源信息

## 负载均衡策略

### Random LoadBalance

- 随机选取提供者策略，有利于动态调整提供者权重。截面碰撞率高，调用次数越多，分布越均匀
- 默认

### RoundRobin LoadBalance

- 轮循选取提供者策略，平均分布，但是存在请求累积的问题

### LeastActive LoadBalance

- 少活跃调用策略，解决慢提供者接收更少的请求

### ConstantHash LoadBalance

- 一致性 Hash 策略，使相同参数请求总是发到同一提供者，一台机器宕机，可以基于虚拟节点，分摊至其 他提供者，避免引起提供者的剧烈变动

## Dubbo 与 Spring Cloud 的区别

### 通信方式

- Dubbo 使用的是 RPC 通信
- Spring Cloud 使用的是 HTTP RestFul 方式

### 注册中心

- Dubbo 使用 ZooKeeper(官方推荐)，还有 Redis、Multicast、Simple 注册中心，但不推荐
- Spring Cloud 使用的是 Spring Cloud Netflix Eureka

## Dubbo SPI 和 Java SPI

### JDK SPI

- 将接口的实现类放在配置文件中，我们在程序运行过程中读取配置文件，通过反射加载实现类
- 会一次性加载所有的扩展实现

#### jdbc

> - 在 `DriverManager` 类的静态代码块中调用了 `loadInitialDrivers()` 方法
> - 该方法会通过 `ServiceLoader` 查找服务接口的实现类
> - 通过该 jar 包 `META-INF/services/` 里的配置文件找到具体的实现类名，并装载实例化，完成模块的注入

我们先来看看 Java 中 SPI 定义的一个核心类：`DriverManager`，该类位于 `rt.jar` 包中，是 Java 中用于管理不同数据库厂商实现的驱动，同时这些各厂商实现的 Driver 驱动类，都继承自 Java 的核心类 `java.sql.Driver`，如 MySQL 的 `com.mysql.cj.jdbc.Driver` 的驱动类。先看看 `DriverManager` 的源码，如下：

```java
// rt.jar包 → DriverManager类
public class DriverManager {
    // .......

    // 静态代码块
    static {
        // 加载并初始化驱动
        loadInitialDrivers();
        println("JDBC DriverManager initialized");
    }

// DriverManager类 → loadInitialDrivers()方法
 private static void loadInitialDrivers() {
    // 先读取系统属性 jdbc.drivers
    String drivers;
    try {
        drivers = AccessController.doPrivileged(new PrivilegedAction<String>() {
            public String run() {
                return System.getProperty("jdbc.drivers");
            }
        });
    } catch (Exception ex) {
        drivers = null;
    }
  
    AccessController.doPrivileged(new PrivilegedAction<Void>() {
        public Void run() {
            //通过ServiceLoader类查找驱动类的文件位置并加载
            ServiceLoader<Driver> loadedDrivers =
            ServiceLoader.load(Driver.class);
            //省略......
        }
    });
    //省略......
}
```

在 `DriverManager` 类的静态代码块中调用了 `loadInitialDrivers()` 方法，该方法中，会通过 `ServiceLoader` 查找服务接口的实现类。前面分析 Java 的 SPI 机制时，曾提到过：Java 的 SPI 存在一种动态的服务发现机制，在程序启动时，会自动去 jar 包中的 `META-INF/services/` 目录查找以服务命名的文件，mysql-connector-java-6.0.6.jar 包文件目录如下：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613212510626.png" alt="image-20250613212510626" style="zoom:80%;" />

观察如上工程结构，我们明确可以看到，在 MySQL 的 jar 包中存在一个 `META-INF/services/` 目录，而在该目录下，存在一个 `java.sql.Driver` 文件，该文件中指定了 MySQL 驱动 `Driver` 类的路径，该类源码如下：

```java
// com.mysql.cj.jdbc.Driver类
public class Driver extends NonRegisteringDriver 
                        implements java.sql.Driver {
    public Driver() throws SQLException {
    }
    // 省略.....
}
```

可以看到，该类是实现了 Java 定义的 SPI 接口 `java.sql.Driver` 的，所以在启动时，SPI 的动态服务发现机制可以发现指定的位置下的驱动类。

最终来看看 SPI 机制是如何加载对应实现类的，`ServiceLoader.load()` 源码如下：

```java
// ServiceLoader类 → load()方法
public static <S> ServiceLoader<S> load(Class<S> service) {
    // 获取线程上下文类加载器
    ClassLoader cl = Thread.currentThread().getContextClassLoader();
    // 使用线程上下文类加载器对驱动类进行加载
    return ServiceLoader.load(service, cl);
}
```

通过如上源码可以清晰的看见：最终是通过 `Thread.currentThread().getContextClassLoader()` 获取的当前执行线程的线程上下文类加载器对 SPI 接口的实现类进行了加载。

### DUBBO SPI

为什么 Dubbo 自己实现 SPI，而不直接使用 Java SPI 呢？其主要原因有：

- Java SPI 一次性实例化所有扩展点的实现，会造成不必要的资源浪费（比如，实例化了系统中用不到的扩展点实现、初始化时间过长等）；
- Java SPI 不支持依赖注入，对扩展点的依赖不友好。Dubbo SPI 支持依赖注入，即在实例化扩展点的过程中，通过反射调用扩展点的 setXXX 方法，注入依赖的扩展点；
- Java SPI 获取实现类方式单一，只能通过遍历获取。Dubbo SPI 支持通过 key 获取实现类，使用起来更方便、更灵活；
- 另外，Dubbo SPI 还实现了强大的自适应扩展和自动激活功能，通过这两个功能可以实现在运行时替换具体实现类（运行到具体的方法时才决定使用哪个实现）以及简化配置。

  - 对 Dubbo 进行扩展，不需要改动 Dubbo 的源码
  - 比如说我们想要实现自己的负载均衡策略，我们创建对应的实现类 `XxxLoadBalance` 实现 `LoadBalance` 接口或者 `AbstractLoadBalance` 类
  - 将这个实现类的路径写入到 `resources` 目录下的 `META-INF/dubbo/org.apache.dubbo.rpc.cluster.LoadBalance` 文件中即可
