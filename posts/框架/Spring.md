# Spring

## 基础

### spring的核心思想

| **核心思想** | **解决的问题**             | **实现手段**           | **典型应用场景**             |
| ------------ | -------------------------- | ---------------------- | ---------------------------- |
| **IOC**      | 对象创建与依赖管理的高耦合 | 容器管理Bean生命周期   | 动态替换数据库实现、服务组装 |
| **DI**       | 依赖关系的硬编码问题       | Setter/构造器/注解注入 | 注入数据源、服务层依赖DAO层  |
| **AOP**      | 横切逻辑分散在业务代码中   | 动态代理与切面配置     | 日志、事务、权限校验统一处理 |

Spring通过这IOC、DI、AOP三大核心思想，实现了轻量级、高内聚低耦合的企业级应用开发框架，成为Java生态中不可或缺的基石。

### 控制反转

- 没有 IOC 容器时，创建类需要直接 new，主动权在我这；
- 有了 IOC 容器，不需要主动 new 对象了，直接向 IOC 容器要就行

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174322789.png" alt="image-20250613174322789" style="zoom:90%;" />

### DI

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


### AOP

#### 分类

- 静态 AOP
  - AOP 框架在编译阶段对程序源代码进行修改，生成了静态的 AOP 代理类（生成的 *.class 文件已经被改掉了，需要使用特定的编译器）
  - 比如 AspectJ
- 动态 AOP
  - 在运行阶段对动态生成代理对象，JDK 动态代理或者 CGlib

#### 通知类型

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

#### 原理

通过动态代理实现的。如果我们为 `Spring` 的某个 `bean` 配置了切面，那么 `Spring` 在创建这个` bean` 的时候，实际上创建的是这个 `bean` 的一个代理对象，我们后续对 `bean` 中方法的调用，实际上调用的是代理类重写的代理方法。

### 设计模式

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

### BeanFactory、FactoryBean、ApplicationContext

- BeanFactory 是 Bean 的⼯⼚， ApplicationContext 的⽗类，IOC 容器的核⼼，负责⽣产和管理 Bean 对象
- FactoryBean 也称为创建 Bean 的 Bean，可以通过实现 FactoryBean 接⼝定制实例化 Bean 的逻辑，通过代理⼀个 Bean 对象，对⽅法前后做⼀些操作
- BeanFactory 只提供了最基本的实例化对象和拿对象的功能，而 ApplicationContext 是继承了 BeanFactory 所派生出来的产物，额外提供了支持国际化处理，统一资源文件读取等

### [@Autowired ]() 和 [@Resource ]()

- [@Resource ]()
  - Java 自己的注解
  - 先根据名称查找
  - 如果（根据名称）查找不到，再根据类型进行查找
- [@Autowired ]()
  - spring 的注解
  - 先根据类型（byType）查找
  - 如果存在多个 Bean 再根据名称（byName）进行查找
  - 无法辨别注入对象时，那需要依赖 [@Qualifier ]() 或 [@Primary ]() 注解一起来修饰

## IOC 容器

### 原理

- Spring 启动时读取应用程序提供的 Bean 配置信息，并在 Spring 容器中生成一份相应的 Bean 配置注册表
- 然后根据这张注册表实例化 Bean，装配好 Bean 之间的依赖关系，为上层应用提供准备就绪的运行环境。其中 Bean 缓存池为 HashMap 实现

### 加载过程

- 实例化一个 ApplicationContext 的对象
- 循环解析扫描出来的类信息（扫描所有.class 类，看看类上面有没有 @Component，有就注册为 BeanDefinition）
- 直接走 bean 的生命周期

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174440946.png" alt="image-20250613174440946" style="zoom:90%;" />

## spring bean

### bean 的作用域

- singleton
  - 唯一实例，bean 默认都是单例
- prototype
  - 每次请求都会创建一个新的 bean 实例
- request
  - 每一次 HTTP 请求都会产生一个新的 bean，该 bean 仅在当前 HTTP request 内有效
- session
  - 在一个 HTTP Session 中，一个 Bean 定义对应一个实例。该作用域仅在基于 web 的 Spring ApplicationContext 情形下有效

### Bean的单例和非单例

生命周期不一样的，Spring Bean 的生命周期完全由 IoC 容器控制。Spring 只帮我们管理单例模式 Bean 的完整生命周期，对于 `prototype` 的 Bean，Spring 在创建好交给使用者之后，则不会再管理后续的生命周期。

具体区别如下：

| **阶段**       | **单例（Singleton）**                                       | **非单例（如Prototype）**                                    |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| **创建时机**   | 容器启动时创建（或首次请求时，取决于配置）。                | 每次请求时创建新实例。                                       |
| **初始化流程** | 完整执行生命周期流程（属性注入、Aware接口、初始化方法等）。 | 每次创建新实例时都会完整执行生命周期流程（仅到初始化完成）。 |
| **销毁时机**   | 容器关闭时销毁，触发`DisposableBean`或`destroy-method`。    | **容器不管理销毁**，需由调用者自行释放资源（Spring不跟踪实例）。 |
| **内存占用**   | 单实例常驻内存，高效但需注意线程安全。                      | 每次请求生成新实例，内存开销较大，需手动管理资源释放。       |
| **适用场景**   | 无状态服务（如Service、DAO层）。                            | 有状态对象（如用户会话、临时计算对象）。                     |

### bean 的生命周期

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

### Bean 生命周期扩展方式

- `InitializingBean` 和 `DisposableBean` 回调接口
- 针对特殊行为的其他 `Aware` 接口
- 实现 `BeanPostProcessor` 接口，则会回调该接口的前置和后置处理增强
- Bean 配置文件中的 `init()` 方法和 `destroy()` 方法
- [@PostConstruct ]() 和 [@PreDestroy ]() 注解方式

## 循环依赖

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613174643389.png" alt="image-20250613174643389" style="zoom:60%;" />

循环依赖问题在Spring中主要有三种情况：

*   第一种：通过构造方法进行依赖注入时产生的循环依赖问题。
*   第二种：通过setter方法进行依赖注入且是在多例（原型）模式下产生的循环依赖问题。
*   第三种：通过setter方法进行依赖注入且是在单例模式下产生的循环依赖问题。

只有【第三种方式】的循环依赖问题被 Spring 解决了，其他两种方式在遇到循环依赖问题时，Spring都会产生异常。

- Spring 使用三级缓存去解决循环依赖，其核心逻辑就是把 `实例化` 和 `初始化` 的步骤分开，然后放入缓存中，供另一个对象调用

### 三级缓存

- 第一级缓存：用来保存 `实例化`、`初始化` 都完成的对象
- 第二级缓存：用来保存 `实例化` 完成，但是 `未初始化` 完成的对象
- 第三级缓存：用来保存一个 `对象工厂`，提供一个匿名内部类，用于创建 二级缓存 中的对象

### 解决循环依赖的前提

- 不全是 `构造器` 方式的循环依赖 (否则无法分离 `初始化` 和 `实例化`)
- 必须是 `单例` (否则无法保证是同一对象)

### 循环引用流程

- A 完成 `实例化` 后，去创建一个对象工厂，并放入 `三级缓存` 当中
  - 如果 A 被 `AOP` 代理，那么通过这个工厂获取到的就是 A `代理` 后的对象
  - 如果 A 没有被 AOP 代理，那么这个工厂获取到的就是 A `实例化` 的对象
- A 进行属性注入时，去创建 B
- B 进行属性注入，需要 A ，则从 `三级缓存` 中去取 A 工厂代理对象并注入，然后删除 `三级缓存` 中的 A 工厂，将  A 对象放入 `二级缓存`
- B 完成后续属性注入，直到 `初始化` 结束，将 B 放入 `一级缓存`
- A 从 `一级缓存` 中取到 B 并且注入 B， 直到完成后续操作，将 A 从 `二级缓存` 删除并且放入 `一级缓存`，循环依赖结束

### 为什么要用三级缓存

- 如果使用 `二级缓存` 解决循环依赖，意味着所有 Bean 在 `实例化` 后就要完成 `AOP` 代理，这样违背了 Spring 设计的原则，Spring 在设计之初就是在 Bean 生命周期的最后一步来完成 `AOP` 代理，而不是在 `实例化` 后就立马进行 AOP 代理

## 事务

### 编程式事务

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

### 声明式事务

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

#### 步骤

- 首先生成代理对象，解析各个方法上事务的相关属性，根据具体的属性判断，是否需要生成新的事务
- 当需要开启事务时，先获取数据库的连接，关闭自动提交的功能，开启事务
- 执行具体的 sql
- 在操作过程中，如果执行失败了，那么会 `getconnection`，获取连接，然后调用 `rollback` 方法实现回滚
- 如果执行正常，则会 `getconnection`，获取连接，然后调用 `commit` 方法实现提交
- 最后关闭相关事务信息（关闭连接等操作）

### Spring 事务的传播⾏为

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

### Spring的事务什么情况下会失效？

Spring Boot通过Spring框架的事务管理模块来支持事务操作。事务管理在Spring Boot中通常是通过 @Transactional 注解来实现的。事务可能会失效的一些常见情况包括:

1.  **未捕获异常**: 如果一个事务方法中发生了未捕获的异常，并且异常未被处理或传播到事务边界之外，那么事务会失效，所有的数据库操作会回滚。
2.  **非受检异常**: 默认情况下，Spring对非受检异常（RuntimeException或其子类）进行回滚处理，这意味着当事务方法中抛出这些异常时，事务会回滚。
3.  **事务传播属性设置不当**: 如果在多个事务之间存在事务嵌套，且事务传播属性配置不正确，可能导致事务失效。特别是在方法内部调用有 @Transactional 注解的方法时要特别注意。
4.  **多数据源的事务管理**: 如果在使用多数据源时，事务管理没有正确配置或者存在多个 @Transactional 注解时，可能会导致事务失效。
5.  **跨方法调用事务问题**: 如果一个事务方法内部调用另一个方法，而这个被调用的方法没有 @Transactional 注解，这种情况下外层事务可能会失效。
6.  **事务在非公开方法中失效**: 如果 @Transactional 注解标注在私有方法上或者非 public 方法上，事务也会失效。

### Spring的事务，使用this调用是否生效？

不能生效。

因为Spring事务是通过代理对象来控制的，只有通过代理对象的方法调用才会应用事务管理的相关规则。当使用`this`直接调用时，是绕过了Spring的代理机制，因此不会应用事务设置。
