# Mybatis

## {}和${}

- {}
  - 预编译
  - PreparedStatement 的 set 方法赋值
- ${}
  - 字符串替换

## 工作原理

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613182156001.png" alt="image-20250613182156001" style="zoom:50%;" />

- 读取 `mybatis-config.xml` 配置文件，加载 `mapper.xml` 映射文件，生成配置对象
- 构造会话工厂：通过环境等配置信息构建 `SqlSessionFactory`
- 创建会话对象：`SqlSessionFactory` 创建 `SqlSession` 对象，包含了执行 `sql` 的所有方法
- `Executor` 执行器：根据 `SqlSession` 传递的参数动态生成 `sql`，同时负责查询缓存的维护
- `StatementHandler`：数据库会话器，串联起参数映射的处理和运行结果映射的处理
  - 参数处理：对输入参数的类型进行处理，并预编译。
  - 结果处理：对返回结果的类型进行处理，根据对象映射规则，返回相应的对象。

## 三种执行器

### SimpleExecutor

- 每执行一次 `update` 或 `select`，就开启一个 `Statement` 对象
- 用完立刻关闭 `Statement` 对象

### ReuseExecutor

- 执行 `update` 或 `select`，以 `sql` 作为 `key` 查找 `Statement` 对象，存在就使用，不存在就创建
- 用完后，不关闭 `Statement` 对象，而是放置于 `Map<String, Statement>` 内，供下一次使用。简言之，就是重复使用 `Statement` 对象

### BatchExecutor

- 执行 `update`（没有 select，JDBC 批处理不支持 select），将所有 `sql` 都添加到批处理中（`addBatch()`），等待统一执行（`executeBatch()`）
- 缓存了多个 `Statement` 对象，每个 `Statement` 对象都是 `addBatch()` 完毕后，等待逐一执行 `executeBatch()` 批处理。与 JDBC 批处理相同

## 缓存机制

### 一级缓存

- 每个 `SqlSession` 中持有了 `Executor`，而每个 `Executor` 中有一个 `LocalCache`
- `sql session` 级别
- 当用户发起查询时，MyBatis 根据当前执行的语句生成 `MappedStatement`，在 `Local Cache` 进行查询，如果缓存命中的话，直接返回结果给用户，如果缓存没有命中的话，查询数据库，结果写入 `Local Cache`，最后返回结果给用户
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613182517778.png" alt="image-20250613182517778" style="zoom:80%;" />

### 二级缓存

- 使用 `CachingExecutor` 装饰 `Executor`，进入一级缓存的查询流程前，先在 `CachingExecutor` 进行二级缓存的查询
- `Mapper`(Namespace) 级别
- 同一个 `namespace` 下的所有操作语句，都影响着同一个 Cache，即二级缓存被多个 `SqlSession` 共享，是一个全局的变量
- <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613182554562.png" alt="image-20250613182554562" style="zoom:90%;" />

## Mapper 接口的工作原理

- 使用 JDK动态代理 为 Dao 接口生成代理 proxy 对象
- 通过 namespace 下的 id，接口全限名，找到唯一一个接口方法

## 分页

- Mybatis 使用 RowBounds 对象进行分页，它是针对 ResultSet 结果集执行的 内存分页
- 分页插件
  - 使用 Mybatis 提供的插件接口，实现自定义插件，在插件的拦截方法内 拦截 待执行的 sql，然后重写 sql，根据 dialect 方言，添加对应的物理分页语句和物理分页参数。
  - select  from student，拦截 sql 后重写为：select t. from （select * from student）t limit 0，10

### 逻辑分页

- 定义： 逻辑分页是指在不实际读取数据的情况下，根据数据的逻辑顺序进行分页，并返回当前页的数据。
- 实现方式： 通常需要预先对数据进行排序，并根据排序结果确定每页数据的起始位置和结束位置。

### 物理分页：

- 定义： 物理分页是指直接从数据库中读取指定范围内的行，并返回这些行。
- 实现方式： 使用数据库提供的分页功能，例如 MySQL 的 LIMIT 和 OFFSET 语法。

## Mybatis 插件原理

- Mybatis 使用 JDK 的动态代理，为目标对象生成代理对象。它提供了一个工具类 Plugin，实现了 InvocationHandler 接口。
- 使用 Plugin 生成代理对象，代理对象在调用方法的时候，就会进入 invoke 方法
- 在 invoke 方法中，如果存在签名的拦截方法，插件的 intercept 方法就会在这里被我们调用，然后就返回结果。如果不存在签名方法，那么将直接反射调用我们要执行的方法
