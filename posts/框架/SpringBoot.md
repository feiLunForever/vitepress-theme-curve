# Springboot

## Spring Boot Starter

- 一系列依赖关系的集合
- 不用一个一个添加依赖，只需要这一个依赖就行

举个例子：在没有 Spring Boot Starters 之前，我们开发 REST 服务或 Web 应用程序时; 我们需要使用像 Spring MVC，Tomcat 和 Jackson 这样的库，这些依赖我们需要手动一个一个添加。但是，有了 Spring Boot Starters 我们只需要一个只需添加一个 spring-boot-starter-web 一个依赖就可以了，这个依赖包含的子依赖中包含了我们开发 REST 服务需要的所有依赖。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

## @Autowired 注解实现原理

@Autowired 注解的实现原理是基于 Java 的反射机制实现的。

当 Spring 容器初始化时，会扫描指定的包和类路径，查找带有特定注解（如 `@Component`、`@Service`、`@Repository` 等）的类。

当需要注入依赖的 Bean 时，Spring 会通过反射机制找到对应的 Bean，并将其注入到指定的位置。

- 按类型注入（By Type）：Spring 容器会查找所有类型的 bean，然后根据上下文选择最合适的 bean 进行注入。
- 按名称注入（By Name）：如果 @Autowired 注解上指定了名称，Spring 容器会根据名称查找对应的 bean 进行注入。

如果存在多个类型相同的 Bean，则会抛出异常。也可以结合使用 @Qualifier 注解来指定具体的 Bean。

## 自动装配原理

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

## 全局捕获异常

1. 使用 @ControllerAdvice 和 @ExceptionHandler 处理全局异常
2. @ExceptionHandler 处理 Controller 级别的异常
3. ResponseStatusException

### 使用 @ControllerAdvice 和 @ExceptionHandler 处理全局异常

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

### @ExceptionHandler 处理 Controller 级别的异常

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

### ResponseStatusException

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

### 原理

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

## springboot 配置加载顺序

- properties
- YAML
- 系统环境变量
- 命令⾏参数
