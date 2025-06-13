# Spring 篇章



## SpringMVC

### 核心组件

记住了下面这些组件，也就记住了 SpringMVC 的工作原理。

- DispatcherServlet ：核心的中央处理器
  - 负责接收请求、分发，并给予客户端响应。
- HandlerMapping ：处理器映射器
  - 根据 uri 去匹配查找能处理的 Handler ，并会将请求涉及到的拦截器和 Handler 一起封装。
- HandlerAdapter ：处理器适配器
  - 根据 HandlerMapping 找到的 Handler ，适配执行对应的 Handler；
- Handler ：请求处理器
  - 处理实际请求的处理器。
- ViewResolver ：视图解析器
  - 根据 Handler 返回的逻辑视图 / 视图，解析并渲染真正的视图，并传递给 DispatcherServlet 响应客户端

### 工作原理

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/1716791047520-ac0d9673-be0a-4005-8732-30bdedc8f1af.webp" style="zoom:80%;" />

- 客户端（浏览器）发送请求， DispatcherServlet 拦截请求
- DispatcherServlet 根据请求信息调用 HandlerMapping 。
- HandlerMapping 根据 uri 去匹配查找能处理的 Handler（也就是我们平常说的 Controller 控制器）
- DispatcherServlet 调用 HandlerAdapter 适配执行 Handler
- Handler 完成对用户请求的处理后，会返回一个 ModelAndView 对象给 DispatcherServlet
  - ModelAndView 顾名思义，包含了数据模型以及相应的视图的信息。
  - Model 是返回的数据对象，View 是个逻辑上的 View
- ViewResolver 解析后返回具体的 View
- DispatcherServlet 根据 View 进行视图渲染（将模型数据填充至视图中），把 View 返回给请求者（浏览器）

## Spring

### 基础

#### spring的核心思想

| **核心思想** | **解决的问题**             | **实现手段**           | **典型应用场景**             |
| ------------ | -------------------------- | ---------------------- | ---------------------------- |
| **IOC**      | 对象创建与依赖管理的高耦合 | 容器管理Bean生命周期   | 动态替换数据库实现、服务组装 |
| **DI**       | 依赖关系的硬编码问题       | Setter/构造器/注解注入 | 注入数据源、服务层依赖DAO层  |
| **AOP**      | 横切逻辑分散在业务代码中   | 动态代理与切面配置     | 日志、事务、权限校验统一处理 |

Spring通过这IOC、DI、AOP三大核心思想，实现了轻量级、高内聚低耦合的企业级应用开发框架，成为Java生态中不可或缺的基石。

#### 控制反转

- 没有 IOC 容器时，创建类需要直接 new，主动权在我这；
- 有了 IOC 容器，不需要主动 new 对象了，直接向 IOC 容器要就行

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174322789.png" alt="image-20250613174322789" style="zoom:90%;" />

#### DI

- 控制反转是一种思想，依赖注入是实现方式

- 三种注入方式

  *   **构造器注入：**通过构造函数传递依赖对象，保证对象初始化时依赖已就绪。

  ```java
  @Service
  public class UserService {
      private final UserRepository userRepository;
      
      // 构造器注入（Spring 4.3+ 自动识别单构造器，无需显式@Autowired）
      public UserService(UserRepository userRepository) {
          this.userRepository = userRepository;
      }
  } 
  ```

  *   **Setter 方法注入：**通过 Setter 方法设置依赖，灵活性高，但依赖可能未完全初始化。

  ```java
  public class PaymentService {
      private PaymentGateway gateway;
      
      @Autowired
      public void setGateway(PaymentGateway gateway) {
          this.gateway = gateway;
      }
  } 
  ```

  *   **字段注入：**直接通过 `@Autowired` 注解字段，代码简洁但隐藏依赖关系，不推荐生产代码。

  ```java
  @Service
  public class OrderService {
      @Autowired
      private OrderRepository orderRepository;
  } 
  ```


#### AOP

##### 分类

- 静态 AOP
  - AOP 框架在编译阶段对程序源代码进行修改，生成了静态的 AOP 代理类（生成的 *.class 文件已经被改掉了，需要使用特定的编译器）
  - 比如 AspectJ
- 动态 AOP
  - 在运行阶段对动态生成代理对象，JDK 动态代理或者 CGlib

##### 通知类型

- [@Before ]()
  - 在目标方法调用前去通知
- [@AfterReturning ]()
  - 在目标方法返回或异常后调用
- [@AfterThrowing ]()
  - 在异常后调用
- [@After ]()
  - 方法执行退出时执行增强，不管是正常返回，还是抛出异常退出，相当于 try{} catch{} finally{} 中的 finally 的语句
- [@Around ]()
  - 最强大的通知，环绕在目标方法前后执行

##### 原理

通过动态代理实现的。如果我们为 `Spring` 的某个 `bean` 配置了切面，那么 `Spring` 在创建这个` bean` 的时候，实际上创建的是这个 `bean` 的一个代理对象，我们后续对 `bean` 中方法的调用，实际上调用的是代理类重写的代理方法。

#### 设计模式

- 工厂模式
  - 通过 `BeanFactory` 和 `ApplicationContext` 来生产 `Bean` 对象
- 代理模式
  - `AOP` 的实现方式
- 单例模式
  - Spring 中的 Bean 默认都是单例的
- 模板模式
  - Spring 中 `jdbcTemplate`
- 观察者模式
  - Spring 事件驱动 模型观察者模式的

#### BeanFactory、FactoryBean、ApplicationContext

- BeanFactory 是 Bean 的⼯⼚， ApplicationContext 的⽗类，IOC 容器的核⼼，负责⽣产和管理 Bean 对象
- FactoryBean 也称为创建 Bean 的 Bean，可以通过实现 FactoryBean 接⼝定制实例化 Bean 的逻辑，通过代理⼀个 Bean 对象，对⽅法前后做⼀些操作
- BeanFactory 只提供了最基本的实例化对象和拿对象的功能，而 ApplicationContext 是继承了 BeanFactory 所派生出来的产物，额外提供了支持国际化处理，统一资源文件读取等

#### [@Autowired ]() 和 [@Resource ]()

- [@Resource ]()
  - Java 自己的注解
  - 先根据名称查找
  - 如果（根据名称）查找不到，再根据类型进行查找
- [@Autowired ]()
  - spring 的注解
  - 先根据类型（byType）查找
  - 如果存在多个 Bean 再根据名称（byName）进行查找
  - 无法辨别注入对象时，那需要依赖 [@Qualifier ]() 或 [@Primary ]() 注解一起来修饰

### IOC 容器

#### 原理

- Spring 启动时读取应用程序提供的 Bean 配置信息，并在 Spring 容器中生成一份相应的 Bean 配置注册表
- 然后根据这张注册表实例化 Bean，装配好 Bean 之间的依赖关系，为上层应用提供准备就绪的运行环境。其中 Bean 缓存池为 HashMap 实现

#### 加载过程

- 实例化一个 ApplicationContext 的对象
- 循环解析扫描出来的类信息（扫描所有.class 类，看看类上面有没有 @Component，有就注册为 BeanDefinition）
- 直接走 bean 的生命周期

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174440946.png" alt="image-20250613174440946" style="zoom:90%;" />

### spring bean

#### bean 的作用域

- singleton
  - 唯一实例，bean 默认都是单例
- prototype
  - 每次请求都会创建一个新的 bean 实例
- request
  - 每一次 HTTP 请求都会产生一个新的 bean，该 bean 仅在当前 HTTP request 内有效
- session
  - 在一个 HTTP Session 中，一个 Bean 定义对应一个实例。该作用域仅在基于 web 的 Spring ApplicationContext 情形下有效

#### Bean的单例和非单例

生命周期不一样的，Spring Bean 的生命周期完全由 IoC 容器控制。Spring 只帮我们管理单例模式 Bean 的完整生命周期，对于 `prototype` 的 Bean，Spring 在创建好交给使用者之后，则不会再管理后续的生命周期。

具体区别如下：

| **阶段**       | **单例（Singleton）**                                       | **非单例（如Prototype）**                                    |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| **创建时机**   | 容器启动时创建（或首次请求时，取决于配置）。                | 每次请求时创建新实例。                                       |
| **初始化流程** | 完整执行生命周期流程（属性注入、Aware接口、初始化方法等）。 | 每次创建新实例时都会完整执行生命周期流程（仅到初始化完成）。 |
| **销毁时机**   | 容器关闭时销毁，触发`DisposableBean`或`destroy-method`。    | **容器不管理销毁**，需由调用者自行释放资源（Spring不跟踪实例）。 |
| **内存占用**   | 单实例常驻内存，高效但需注意线程安全。                      | 每次请求生成新实例，内存开销较大，需手动管理资源释放。       |
| **适用场景**   | 无状态服务（如Service、DAO层）。                            | 有状态对象（如用户会话、临时计算对象）。                     |

#### bean 的生命周期

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/1719570477922-ad595a67-be98-4272-9e13-8ad73dd75c13.png" style="zoom:80%;" />

SpringBean 生命周期大致分为 4 个阶段：

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174513724.png" alt="image-20250613174513724" style="zoom:60%;" />

1. 实例化 Bean 对象
   - Bean 容器找到配置文件如 Spring.xml 中 Spring Bean 的定义
   - 反射生成 bean 实例

2. 填充对象属性

- 涉及到一些属性值，利用 set()方法设置一些属性值
- 循环依赖问题（三级缓存）

3. 初始化

- 如果实现了 `Aware` 会通过其接口获取容器资源
  - 比如如果 Bean 实现了 `BeanNameAware` 接口，调用 setBeanName() 方法，传入 Bean 的名字
  - 如果 Bean 实现了 `BeanClassLoaderAware` 接口，调用 setBeanClassLoader() 方法，传入 ClassLoader 对象的实例。
- 如果实现了 `BeanPostProcessor` 接口，执行 postProcessBeforeInitialization() 方法
  - ApplicationContextPostProcessor，设置 ApplicationContext，Environment 等
- 如果 Bean 实现了 `InitializingBean` 接口，执行 afterPropertiesSet() 方法
- 如果 Bean 在配置文件中的定义包含 `init-method` 属性，执行指定的方法
- 如果实现了 `BeanPostProcessor` 接口，执行 `postProcessAfterInitialization()` 方法
  - （AOP，AbstractAutoProxyCreator）

4. 销毁

- 如果 Bean 实现了 `DisposableBean` 接口，执行 destroy() 方法
- 如果 Bean 在配置文件中的定义包含 `destroy-method` 属性，执行指定的方法

#### Bean 生命周期扩展方式

- `InitializingBean` 和 `DisposableBean` 回调接口
- 针对特殊行为的其他 `Aware` 接口
- 实现 `BeanPostProcessor` 接口，则会回调该接口的前置和后置处理增强
- Bean 配置文件中的 `init()` 方法和 `destroy()` 方法
- [@PostConstruct ]() 和 [@PreDestroy ]() 注解方式

### 循环依赖

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174643389.png" alt="image-20250613174643389" style="zoom:60%;" />

循环依赖问题在Spring中主要有三种情况：

*   第一种：通过构造方法进行依赖注入时产生的循环依赖问题。
*   第二种：通过setter方法进行依赖注入且是在多例（原型）模式下产生的循环依赖问题。
*   第三种：通过setter方法进行依赖注入且是在单例模式下产生的循环依赖问题。

只有【第三种方式】的循环依赖问题被 Spring 解决了，其他两种方式在遇到循环依赖问题时，Spring都会产生异常。

- Spring 使用三级缓存去解决循环依赖，其核心逻辑就是把 `实例化` 和 `初始化` 的步骤分开，然后放入缓存中，供另一个对象调用

#### 三级缓存

- 第一级缓存：用来保存 `实例化`、`初始化` 都完成的对象
- 第二级缓存：用来保存 `实例化` 完成，但是 `未初始化` 完成的对象
- 第三级缓存：用来保存一个 `对象工厂`，提供一个匿名内部类，用于创建 二级缓存 中的对象

#### 解决循环依赖的前提

- 不全是 `构造器` 方式的循环依赖 (否则无法分离 `初始化` 和 `实例化`)
- 必须是 `单例` (否则无法保证是同一对象)

#### 循环引用流程

- A 完成 `实例化` 后，去创建一个对象工厂，并放入 `三级缓存` 当中
  - 如果 A 被 `AOP` 代理，那么通过这个工厂获取到的就是 A `代理` 后的对象
  - 如果 A 没有被 AOP 代理，那么这个工厂获取到的就是 A `实例化` 的对象
- A 进行属性注入时，去创建 B
- B 进行属性注入，需要 A ，则从 `三级缓存` 中去取 A 工厂代理对象并注入，然后删除 `三级缓存` 中的 A 工厂，将  A 对象放入 `二级缓存`
- B 完成后续属性注入，直到 `初始化` 结束，将 B 放入 `一级缓存`
- A 从 `一级缓存` 中取到 B 并且注入 B， 直到完成后续操作，将 A 从 `二级缓存` 删除并且放入 `一级缓存`，循环依赖结束

#### 为什么要用三级缓存

- 如果使用 `二级缓存` 解决循环依赖，意味着所有 Bean 在 `实例化` 后就要完成 `AOP` 代理，这样违背了 Spring 设计的原则，Spring 在设计之初就是在 Bean 生命周期的最后一步来完成 `AOP` 代理，而不是在 `实例化` 后就立马进行 AOP 代理

### 事务

#### 编程式事务

- 通过 TransactionTemplate 或者 TransactionManager 手动管理事务

```java
@Autowired
private PlatformTransactionManager transactionManager;

public void testTransaction() {

    TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
    try {
        // ....  业务代码
        transactionManager.commit(status);
    } catch (Exception e) {
        transactionManager.rollback(status);
    }
}
```

#### 声明式事务

- [@Transactional ]() AOP 实现
- 如果目标对象实现了接口，默认情况下会采用 JDK 的动态代理，如果目标对象没有实现了接口,会使用 CGLIB 动态代理

```java
@Transactional(propagation = Propagation.REQUIRED)
public void aMethod {
  //do something
  B b = new B();
  C c = new C();
  b.bMethod();
  c.cMethod();
}
```

##### 步骤

- 首先生成代理对象，解析各个方法上事务的相关属性，根据具体的属性判断，是否需要生成新的事务
- 当需要开启事务时，先获取数据库的连接，关闭自动提交的功能，开启事务
- 执行具体的 sql
- 在操作过程中，如果执行失败了，那么会 `getconnection`，获取连接，然后调用 `rollback` 方法实现回滚
- 如果执行正常，则会 `getconnection`，获取连接，然后调用 `commit` 方法实现提交
- 最后关闭相关事务信息（关闭连接等操作）

#### Spring 事务的传播⾏为

- ⽀持当前事务
  - REQUIRED
    - 如果当前存在事务，则加⼊该事务。如果当前没有事务，则创建⼀个新的事务
  - SUPPORTS
    - 如果当前存在事务，则加⼊该事务 。如果当前没有事务， 则以⾮事务的⽅式继续运⾏
  - MANDATORY
    - 如果当前存在事务，则加⼊该事务 。如果当前没有事务，则抛出异常
- 不⽀持当前事务
  - NOT_SUPPORTED
    - 以⾮事务⽅式运⾏，如果当前存在事务，则把当前事务挂起
  - NEVER
    - 以⾮事务⽅式运⾏，如果当前存在事务，则抛出异常
- 其他情况
  - NESTED
    - 如果当前存在事务，则创建⼀个事务作为当前事务的嵌套事务来执⾏ 。如果当前没有事务，则该取值等价于 REQUIRED

#### Spring的事务什么情况下会失效？

Spring Boot通过Spring框架的事务管理模块来支持事务操作。事务管理在Spring Boot中通常是通过 @Transactional 注解来实现的。事务可能会失效的一些常见情况包括:

1.  **未捕获异常**: 如果一个事务方法中发生了未捕获的异常，并且异常未被处理或传播到事务边界之外，那么事务会失效，所有的数据库操作会回滚。
2.  **非受检异常**: 默认情况下，Spring对非受检异常（RuntimeException或其子类）进行回滚处理，这意味着当事务方法中抛出这些异常时，事务会回滚。
3.  **事务传播属性设置不当**: 如果在多个事务之间存在事务嵌套，且事务传播属性配置不正确，可能导致事务失效。特别是在方法内部调用有 @Transactional 注解的方法时要特别注意。
4.  **多数据源的事务管理**: 如果在使用多数据源时，事务管理没有正确配置或者存在多个 @Transactional 注解时，可能会导致事务失效。
5.  **跨方法调用事务问题**: 如果一个事务方法内部调用另一个方法，而这个被调用的方法没有 @Transactional 注解，这种情况下外层事务可能会失效。
6.  **事务在非公开方法中失效**: 如果 @Transactional 注解标注在私有方法上或者非 public 方法上，事务也会失效。

#### Spring的事务，使用this调用是否生效？

不能生效。

因为Spring事务是通过代理对象来控制的，只有通过代理对象的方法调用才会应用事务管理的相关规则。当使用`this`直接调用时，是绕过了Spring的代理机制，因此不会应用事务设置。

## springboot

### Spring Boot Starter

- 一系列依赖关系的集合
- 不用一个一个添加依赖，只需要这一个依赖就行

举个例子：在没有 Spring Boot Starters 之前，我们开发 REST 服务或 Web 应用程序时; 我们需要使用像 Spring MVC，Tomcat 和 Jackson 这样的库，这些依赖我们需要手动一个一个添加。但是，有了 Spring Boot Starters 我们只需要一个只需添加一个 spring-boot-starter-web 一个依赖就可以了，这个依赖包含的子依赖中包含了我们开发 REST 服务需要的所有依赖。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

### @Autowired 注解实现原理

@Autowired 注解的实现原理是基于 Java 的反射机制实现的。

当 Spring 容器初始化时，会扫描指定的包和类路径，查找带有特定注解（如 `@Component`、`@Service`、`@Repository` 等）的类。

当需要注入依赖的 Bean 时，Spring 会通过反射机制找到对应的 Bean，并将其注入到指定的位置。

- 按类型注入（By Type）：Spring 容器会查找所有类型的 bean，然后根据上下文选择最合适的 bean 进行注入。
- 按名称注入（By Name）：如果 @Autowired 注解上指定了名称，Spring 容器会根据名称查找对应的 bean 进行注入。

如果存在多个类型相同的 Bean，则会抛出异常。也可以结合使用 @Qualifier 注解来指定具体的 Bean。

### 自动装配原理

1. Spring Boot 关于自动配置的源码在 `spring-boot-autoconfigure-x.x.x.x.jar` 中
2. `@SpringBootApplication`
   - `@EnableAutoConfiguration`：启用 SpringBoot 的自动配置机制
   - `@ComponentScan`： 扫描被 [@Component ]() 注解的 bean，注解默认会扫描该类所在的包下所有的类。
   - `@Configuration`：允许在上下文中注册额外的 bean 或导入其他配置类（当做配置 bean 注入到 spring 容器中）

1. 其中 `@EnableAutoConfiguration` 注解通过 Spring 提供的 [@Import ]() 注解导入了 `AutoConfigurationImportSelector` 类
   - `AutoConfigurationImportSelector` 类中 `getCandidateConfigurations` 方法会将所有自动配置类的信息以 List 的形式返回

1. 通过 `SpringFactoriesLoader.loadFactoryNames()` 扫描 `META-INF/spring.factories` 配置文件中的自动配置类，是一组一组的 key=value 键值对
   - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613180629381.png" alt="image-20250613180629381" style="zoom:80%;" />
   - 其中一个 key 是 `EnableAutoConfiguration` 类的全类名，而它的 value 是一个 `xxxxAutoConfiguration` 的类名的列表，它实际上是一个 javaConfig 形式的 Spring 容器配置类，根据 `@ConditionalOnClass` 注解条件，选择性的将这些自动配置类加载到 Spring 容器中。

### 全局捕获异常

1. 使用 @ControllerAdvice 和 @ExceptionHandler 处理全局异常
2. @ExceptionHandler 处理 Controller 级别的异常
3. ResponseStatusException

#### 使用 @ControllerAdvice 和 @ExceptionHandler 处理全局异常

这是目前很常用的一种方式，非常推荐。测试代码中用到了 Junit 5，如果你新建项目验证下面的代码的话，记得添加上相关依赖。

1. 新建异常信息实体类

非必要的类，主要用于包装异常信息。
 `src/main/java/com/twuc/webApp/exception/ErrorResponse.java`

```java
/**
 * @author shuang.kou
 */
public class ErrorResponse {
    private String message;
    private String errorTypeName;

    public ErrorResponse(Exception e) {
        this(e.getClass().getName(), e.getMessage());
    }

    public ErrorResponse(String errorTypeName, String message) {
        this.errorTypeName = errorTypeName;
        this.message = message;
    }
    ......省略getter/setter方法
}
```

2. 自定义异常类型

`src/main/java/com/twuc/webApp/exception/ResourceNotFoundException.java`

一般我们处理的都是 RuntimeException ，所以如果你需要自定义异常类型的话直接集成这个类就可以了。

```java
/**
 * @author shuang.kou
 * 自定义异常类型
 */
public class ResourceNotFoundException extends RuntimeException {
    private String message;

    public ResourceNotFoundException() {
        super();
    }

    public ResourceNotFoundException(String message) {
        super(message);
        this.message = message;
    }

    @Override
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
```

3. 新建异常处理类

我们只需要在类上加上 @ControllerAdvice 注解这个类就成为了全局异常处理类，当然你也可以通过 assignableTypes 指定特定的 Controller 类，让异常处理类只处理特定类抛出的异常。

`src/main/java/com/twuc/webApp/exception/GlobalExceptionHandler.java`

```java
/**
 * @author shuang.kou
 */
@ControllerAdvice(assignableTypes = {ExceptionController.class})
@ResponseBody
public class GlobalExceptionHandler {

    ErrorResponse illegalArgumentResponse = new ErrorResponse(new IllegalArgumentException("参数错误!"));
    ErrorResponse resourseNotFoundResponse = new ErrorResponse(new ResourceNotFoundException("Sorry, the resourse not found!"));

    @ExceptionHandler(value = Exception.class)// 拦截所有异常, 这里只是为了演示，一般情况下一个方法特定处理一种异常
    public ResponseEntity<ErrorResponse> exceptionHandler(Exception e) {

        if (e instanceof IllegalArgumentException) {
            return ResponseEntity.status(400).body(illegalArgumentResponse);
        } else if (e instanceof ResourceNotFoundException) {
            return ResponseEntity.status(404).body(resourseNotFoundResponse);
        }
        return null;
    }
}
```

4. controller 模拟抛出异常

`src/main/java/com/twuc/webApp/web/ExceptionController.java`

```java
/**
 * @author shuang.kou
 */
@RestController
@RequestMapping("/api")
public class ExceptionController {

    @GetMapping("/illegalArgumentException")
    public void throwException() {
        throw new IllegalArgumentException();
    }

    @GetMapping("/resourceNotFoundException")
    public void throwException2() {
        throw new ResourceNotFoundException();
    }
}
```

使用 Get 请求 localhost:8080/api/resourceNotFoundException[1] （curl -i -s -X GET url），服务端返回的 JSON 数据如下：

```java
{
    "message": "Sorry, the resourse not found!",
    "errorTypeName": "com.twuc.webApp.exception.ResourceNotFoundException"
}
```

5. 编写测试类

MockMvc 由 org.springframework.boot.test 包提供，实现了对 Http 请求的模拟，一般用于我们测试 controller 层。

```java
/**
 * @author shuang.kou
 */
@AutoConfigureMockMvc
@SpringBootTest
public class ExceptionTest {
    @Autowired
    MockMvc mockMvc;

    @Test
    void should_return_400_if_param_not_valid() throws Exception {
        mockMvc.perform(get("/api/illegalArgumentException"))
                .andExpect(status().is(400))
                .andExpect(jsonPath("$.message").value("参数错误!"));
    }

    @Test
    void should_return_404_if_resourse_not_found() throws Exception {
        mockMvc.perform(get("/api/resourceNotFoundException"))
                .andExpect(status().is(404))
                .andExpect(jsonPath("$.message").value("Sorry, the resourse not found!"));
    }
}
```

#### @ExceptionHandler 处理 Controller 级别的异常

我们刚刚也说了使用 @ControllerAdvice 注解 可以通过 assignableTypes 指定特定的类，让异常处理类只处理特定类抛出的异常。所以这种处理异常的方式，实际上现在使用的比较少了。

我们把下面这段代码移到 src/main/java/com/twuc/webApp/exception/GlobalExceptionHandler.java 中就可以了。

```java
@ExceptionHandler(value = Exception.class)// 拦截所有异常
public ResponseEntity<ErrorResponse> exceptionHandler(Exception e) {

    if (e instanceof IllegalArgumentException) {
        return ResponseEntity.status(400).body(illegalArgumentResponse);
    } else if (e instanceof ResourceNotFoundException) {
        return ResponseEntity.status(404).body(resourseNotFoundResponse);
    }
    return null;
}
```

#### ResponseStatusException

研究 ResponseStatusException 我们先来看看，通过 ResponseStatus 注解简单处理异常的方法（将异常映射为状态码）。
 src/main/java/com/twuc/webApp/exception/ResourceNotFoundException.java

```java
@ResponseStatus(code = HttpStatus.NOT_FOUND)
public class ResourseNotFoundException2 extends RuntimeException {

    public ResourseNotFoundException2() {
    }

    public ResourseNotFoundException2(String message) {
        super(message);
    }
}
```

src/main/java/com/twuc/webApp/web/ResponseStatusExceptionController.java

```java
@RestController
@RequestMapping("/api")
public class ResponseStatusExceptionController {
    @GetMapping("/resourceNotFoundException2")
    public void throwException3() {
        throw new ResourseNotFoundException2("Sorry, the resourse not found!");
    }
}
```

使用 Get 请求 localhost:8080/api/resourceNotFoundException2[2] ，服务端返回的 JSON 数据如下：

```java
{
    "timestamp": "2019-08-21T07:11:43.744+0000",
    "status": 404,
    "error": "Not Found",
    "message": "Sorry, the resourse not found!",
    "path": "/api/resourceNotFoundException2"
}
```

这种通过 ResponseStatus 注解简单处理异常的方法是的好处是比较简单，但是一般我们不会这样做，通过 ResponseStatusException 会更加方便,可以避免我们额外的异常类。

```java
@GetMapping("/resourceNotFoundException2")
public void throwException3() {
    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sorry, the resourse not found!", new ResourceNotFoundException());
}
```

使用 Get 请求 localhost:8080/api/resourceNotFoundException2[3] ，服务端返回的 JSON 数据如下,和使用 ResponseStatus 实现的效果一样：

```java
{
    "timestamp": "2019-08-21T07:28:12.017+0000",
    "status": 404,
    "error": "Not Found",
    "message": "Sorry, the resourse not found!",
    "path": "/api/resourceNotFoundException3"
}
```

ResponseStatusException 提供了三个构造方法：

```java
public ResponseStatusException(HttpStatus status) {
	this(status, null, null);
}

public ResponseStatusException(HttpStatus status, @Nullable String reason) {
    this(status, reason, null);
}

public ResponseStatusException(HttpStatus status, @Nullable String reason, @Nullable Throwable cause) {
    super(null, cause);
    Assert.notNull(status, "HttpStatus is required");
    this.status = status;
    this.reason = reason;
}
```

> 构造函数中的参数解释如下：
>
> - status ：http status
> - reason ：response 的消息内容
> - cause ：抛出的异常

#### 原理

ExceptionHandlerMethodResolver.java 中 getMappedMethod 决定了具体被哪个方法处理。

```java
@Nullable
private Method getMappedMethod(Class<? extends Throwable> exceptionType) {
    List<Class<? extends Throwable>> matches = new ArrayList<>();
    //找到可以处理的所有异常信息。mappedMethods 中存放了异常和处理异常的方法的对应关系
    for (Class<? extends Throwable> mappedException : this.mappedMethods.keySet()) {
        if (mappedException.isAssignableFrom(exceptionType)) {
            matches.add(mappedException);
        }
    }
    // 不为空说明有方法处理异常
    if (!matches.isEmpty()) {
        // 按照匹配程度从小到大排序
        matches.sort(new ExceptionDepthComparator(exceptionType));
        // 返回处理异常的方法
        return this.mappedMethods.get(matches.get(0));
    }
    else {
        return null;
    }
}
```

从源代码看出：getMappedMethod()会首先找到可以匹配处理异常的所有方法信息，然后对其进行从小到大的排序，最后取最小的那一个匹配的方法(即匹配度最高的那个)。

### springboot 配置加载顺序

- properties
- YAML
- 系统环境变量
- 命令⾏参数

## Mybatis

### {}和${}

- {}
  - 预编译
  - PreparedStatement 的 set 方法赋值
- ${}
  - 字符串替换

### 工作原理

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613182156001.png" alt="image-20250613182156001" style="zoom:50%;" />

- 读取 `mybatis-config.xml` 配置文件，加载 `mapper.xml` 映射文件，生成配置对象
- 构造会话工厂：通过环境等配置信息构建 `SqlSessionFactory`
- 创建会话对象：`SqlSessionFactory` 创建 `SqlSession` 对象，包含了执行 `sql` 的所有方法
- `Executor` 执行器：根据 `SqlSession` 传递的参数动态生成 `sql`，同时负责查询缓存的维护
- `StatementHandler`：数据库会话器，串联起参数映射的处理和运行结果映射的处理
  - 参数处理：对输入参数的类型进行处理，并预编译。
  - 结果处理：对返回结果的类型进行处理，根据对象映射规则，返回相应的对象。

### 三种执行器

#### SimpleExecutor

- 每执行一次 `update` 或 `select`，就开启一个 `Statement` 对象
- 用完立刻关闭 `Statement` 对象

#### ReuseExecutor

- 执行 `update` 或 `select`，以 `sql` 作为 `key` 查找 `Statement` 对象，存在就使用，不存在就创建
- 用完后，不关闭 `Statement` 对象，而是放置于 `Map<String, Statement>` 内，供下一次使用。简言之，就是重复使用 `Statement` 对象

#### BatchExecutor

- 执行 `update`（没有 select，JDBC 批处理不支持 select），将所有 `sql` 都添加到批处理中（`addBatch()`），等待统一执行（`executeBatch()`）
- 缓存了多个 `Statement` 对象，每个 `Statement` 对象都是 `addBatch()` 完毕后，等待逐一执行 `executeBatch()` 批处理。与 JDBC 批处理相同

### 缓存机制

#### 一级缓存

- 每个 `SqlSession` 中持有了 `Executor`，而每个 `Executor` 中有一个 `LocalCache`
- `sql session` 级别
- 当用户发起查询时，MyBatis 根据当前执行的语句生成 `MappedStatement`，在 `Local Cache` 进行查询，如果缓存命中的话，直接返回结果给用户，如果缓存没有命中的话，查询数据库，结果写入 `Local Cache`，最后返回结果给用户
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613182517778.png" alt="image-20250613182517778" style="zoom:80%;" />

#### 二级缓存

- 使用 `CachingExecutor` 装饰 `Executor`，进入一级缓存的查询流程前，先在 `CachingExecutor` 进行二级缓存的查询
- `Mapper`(Namespace) 级别
- 同一个 `namespace` 下的所有操作语句，都影响着同一个 Cache，即二级缓存被多个 `SqlSession` 共享，是一个全局的变量
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613182554562.png" alt="image-20250613182554562" style="zoom:90%;" />

### Mapper 接口的工作原理

- 使用 JDK动态代理 为 Dao 接口生成代理 proxy 对象
- 通过 namespace 下的 id，接口全限名，找到唯一一个接口方法

### 分页

- Mybatis 使用 RowBounds 对象进行分页，它是针对 ResultSet 结果集执行的 内存分页
- 分页插件
  - 使用 Mybatis 提供的插件接口，实现自定义插件，在插件的拦截方法内 拦截 待执行的 sql，然后重写 sql，根据 dialect 方言，添加对应的物理分页语句和物理分页参数。
  - select  from student，拦截 sql 后重写为：select t. from （select * from student）t limit 0，10

#### 逻辑分页

- 定义： 逻辑分页是指在不实际读取数据的情况下，根据数据的逻辑顺序进行分页，并返回当前页的数据。
- 实现方式： 通常需要预先对数据进行排序，并根据排序结果确定每页数据的起始位置和结束位置。

#### 物理分页：

- 定义： 物理分页是指直接从数据库中读取指定范围内的行，并返回这些行。
- 实现方式： 使用数据库提供的分页功能，例如 MySQL 的 LIMIT 和 OFFSET 语法。

### Mybatis 插件原理

- Mybatis 使用 JDK 的动态代理，为目标对象生成代理对象。它提供了一个工具类 Plugin，实现了 InvocationHandler 接口。
- 使用 Plugin 生成代理对象，代理对象在调用方法的时候，就会进入 invoke 方法
- 在 invoke 方法中，如果存在签名的拦截方法，插件的 intercept 方法就会在这里被我们调用，然后就返回结果。如果不存在签名方法，那么将直接反射调用我们要执行的方法
