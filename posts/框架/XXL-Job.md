# XXL-Job

## 背景

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214301585.png" alt="image-20250613214301585" style="zoom:30%;" />

**`xxlJob`**架构分为两大模块，即**`调度中心`**和**`执行器`**

简单理解: **执行器即我们的服务启动后注册到调度中心，调度中心管理着所有执行器、任务，根据任务触发时间点下发到执行器执行。**

## **`执行器的注册与注销`**

### 执行器注册

#### 执行器发起注册

在`xxjob`官方`springboot`案例中，我们可以看到定义了一个`XxlJobConfig`配置类，同时在这个配置类中创建了`XxlJobSpringExecutor`这个`bean`，并且传入了`xxljob admin`地址、`appname（执行器的名称）`等信息

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214547413.png" alt="image-20250613214547413" style="zoom:60%;" />

我们进入`XxlJobSpringExecutor`可见，它实现了`SmartInitializingSingleton、DisposableBean`，并重写了`afterSingletonsInstantiated、destroy`方法，其中👇🏻

**`afterSingletonsInstantiated`** **在所有单例 bean 都初始化完成以后进行调用**

```java
@Override
public void afterSingletonsInstantiated() {

    // init JobHandler Repository
    /*initJobHandlerRepository(applicationContext);*/

    // init JobHandler Repository (for method)
    initJobHandlerMethodRepository(applicationContext); // 初始化并注册任务方法

    // refresh GlueFactory
    GlueFactory.refreshInstance(1); // 创建GlueFactory

    // super start
    try {
        super.start(); // 调用父类的start方法
    } catch (Exception e) {
        throw new RuntimeException(e);
    }
}
```

关于`initJobHandlerMethodRepository`方法，其源码比较简单，就不深究了

**具体逻辑是拿到**`Spring`**容器里所有**`bean` **，挨个遍历，看看**`bean`**中是否有方法是被** **`@XxlJob`**注解修饰的，如果存在这样的方法，最终将其封装为**`MethodJobHandler`** **，以**`jobhandler name`**为**`key` **，**`MethodJobHandler`**为**  **`value`**添加到**`ConcurrentMap`**中进行维护

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214614186.png" alt="image-20250613214614186" style="zoom:60%;" />

```java
/**
 * 1、简单任务示例（Bean模式）
*/
@XxlJob("demoJobHandler") // handler Name
public void demoJobHandler() throws Exception {
    XxlJobHelper.log("XXL-JOB, Hello World.");

    for (int i = 0; i < 5; i++) {
        XxlJobHelper.log("beat at:" + i);
        TimeUnit.SECONDS.sleep(2);
    }
    // default success
}
```

注册完任务，咱们接着来看`start`逻辑，咱们重点了解`initEmbedServer`逻辑

```java
public class XxlJobExecutor  {

  // ---------------------- start + stop ----------------------
  public void start() throws Exception {

    // init logpath
    XxlJobFileAppender.initLogPath(logPath); // 初始化日志路径

    // 初始化xxljob admin地址，可能存在多个节点，根据，分隔
    initAdminBizList(adminAddresses, accessToken);

    // 启动日志文件清理线程，用来清理日志文件
    JobLogFileCleanThread.getInstance().start(logRetentionDays);

    // 启动回调线程
    TriggerCallbackThread.getInstance().start();

    // 向调度中心发起注册
    initEmbedServer(address, ip, port, appname, accessToken);
  }
}
private void initEmbedServer(String address, String ip, int port, String appname, String accessToken) throws Exception {

    // fill ip port
    port = port>0?port: NetUtil.findAvailablePort(9999);
    ip = (ip!=null&&ip.trim().length()>0)?ip: IpUtil.getIp(); // 填充ip和端口

    // generate address
    if (address==null || address.trim().length()==0) {  // 生成地址
        String ip_port_address = IpUtil.getIpPort(ip, port);   // registry-address：default use address to registry , otherwise use ip:port if address is null
        address = "http://{ip_port}/".replace("{ip_port}", ip_port_address);
    }

    // accessToken
    if (accessToken==null || accessToken.trim().length()==0) { // 访问Token
        logger.warn(">>>>>>>>>>> xxl-job accessToken is empty. To ensure system security, please set the accessToken.");
    }

    // start
    embedServer = new EmbedServer(); // 启动服务
    embedServer.start(address, port, appname, accessToken);
}
```

`initEmbedServer`中先简单做了下参数处理，**如果没有指定本机**`address、port`**则会进行获取**

随后创建了`EmbedServer`，并进行`start`

```java
public class EmbedServer {
    private static final Logger logger = LoggerFactory.getLogger(EmbedServer.class);

    private ExecutorBiz executorBiz;
    private Thread thread;

    /**创建了一个Netty服务端，监听端口。然后由Netty来帮忙进行Http协议的编码和解码。而我们只需要关注业务，也就是EmbedHttpServerHandler的处理逻辑**/
    public void start(final String address, final int port, final String appname, final String accessToken) {
        executorBiz = new ExecutorBizImpl(); // 实现业务操作功能
        thread = new Thread(new Runnable() { // 创建一个线程
            @Override
            public void run() {
                // 采用 netty 进行网络服务
                EventLoopGroup bossGroup = new NioEventLoopGroup();
                EventLoopGroup workerGroup = new NioEventLoopGroup();
                ThreadPoolExecutor bizThreadPool = new ThreadPoolExecutor(
                    0,
                    200,
                    60L,
                    TimeUnit.SECONDS,
                    new LinkedBlockingQueue<Runnable>(2000),
                    new ThreadFactory() {
                        @Override
                        public Thread newThread(Runnable r) {
                            return new Thread(r, "xxl-job, EmbedServer bizThreadPool-" + r.hashCode());
                        }
                    },
                    new RejectedExecutionHandler() {
                        @Override
                        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
                            throw new RuntimeException("xxl-job, EmbedServer bizThreadPool is EXHAUSTED!");
                        }
                    });
                try {
                    // start server
                    ServerBootstrap bootstrap = new ServerBootstrap(); // 开启网络服务
                    bootstrap.group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .childHandler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        public void initChannel(SocketChannel channel) throws Exception {
                            channel.pipeline()
                            // 空闲检测
                            .addLast(new IdleStateHandler(0, 0, 30 * 3, TimeUnit.SECONDS))  // beat 3N, close if idle
                            // 支持http协议
                            .addLast(new HttpServerCodec())
                            .addLast(new HttpObjectAggregator(5 * 1024 * 1024))  // merge request & reponse to FULL
                            // 业务逻辑处理
                            .addLast(new EmbedHttpServerHandler(executorBiz, accessToken, bizThreadPool));
                        }
                    })
                    .childOption(ChannelOption.SO_KEEPALIVE, true);

                    // bind
                    ChannelFuture future = bootstrap.bind(port).sync();

                    logger.info(">>>>>>>>>>> xxl-job remoting server start success, nettype = {}, port = {}", EmbedServer.class, port);

                    // start registry
                    startRegistry(appname, address); // 启动注册

                    // wait util stop
                    future.channel().closeFuture().sync();

                } catch (InterruptedException e) {
                    logger.info(">>>>>>>>>>> xxl-job remoting server stop.");
                } catch (Exception e) {
                    logger.error(">>>>>>>>>>> xxl-job remoting server error.", e);
                } finally {
                    // stop
                    try {
                        workerGroup.shutdownGracefully();
                        bossGroup.shutdownGracefully();
                    } catch (Exception e) {
                        logger.error(e.getMessage(), e);
                    }
                }
            }
        });
        // 设置为后台线程
        thread.setDaemon(true);    // daemon, service jvm, user thread leave >>> daemon leave >>> jvm leave
        thread.start();
    }
}
```

大致扫一眼，虽然看着`start`方法中代码挺多的，但其中无非也就两件事，**创建**`netty server`**和**`start registry`**

继续看注册，最终也是来到`ExecutorRegistryThread`中的`start`方法，其中管理着`执行器的注册与注销`逻辑

先看注册，注册逻辑很简单，**遍历所有**`admin`**节点，挨个注册上去**

```java
public class ExecutorRegistryThread {
  private static Logger logger = LoggerFactory.getLogger(ExecutorRegistryThread.class);

  private static ExecutorRegistryThread instance = new ExecutorRegistryThread();
  public static ExecutorRegistryThread getInstance(){
    return instance;
  }

  private Thread registryThread;
  private volatile boolean toStop = false;
  
  public void start(final String appname, final String address){
    // ......
  
    registryThread = new Thread(new Runnable() {
      @Override
      public void run() {

        // 发起注册
        while (!toStop) {
          try {
            RegistryParam registryParam = new RegistryParam(RegistryConfig.RegistType.EXECUTOR.name(), appname, address);
            // todo 前面提到了，admin可能存在多个节点，这里就遍历，注册到每一个节点上去
            for (AdminBiz adminBiz: XxlJobExecutor.getAdminBizList()) {
              try {
                // todo 发起注册请求
                ReturnT<String> registryResult = adminBiz.registry(registryParam);
                if (registryResult!=null && ReturnT.SUCCESS_CODE == registryResult.getCode()) {
                  registryResult = ReturnT.SUCCESS;
                  logger.debug(">>>>>>>>>>> xxl-job registry success, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                  break;
                } else {
                  logger.info(">>>>>>>>>>> xxl-job registry fail, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                }
              } catch (Exception e) {
                logger.info(">>>>>>>>>>> xxl-job registry error, registryParam:{}", registryParam, e);
              }

            }
          } catch (Exception e) {
            if (!toStop) {
              logger.error(e.getMessage(), e);
            }

          }

          try {
            if (!toStop) {
              TimeUnit.SECONDS.sleep(RegistryConfig.BEAT_TIMEOUT);
            }
          } catch (InterruptedException e) {
            if (!toStop) {
              logger.warn(">>>>>>>>>>> xxl-job, executor registry thread interrupted, error msg:{}", e.getMessage());
            }
          }
        }

        // ..... 注销

      }
    });
    registryThread.setDaemon(true);
    registryThread.setName("xxl-job, executor ExecutorRegistryThread");
    registryThread.start();
  }
}
```

**最终发起**`http post`**请求，调用**`registry`**接口，进行注册。**

```java
@Override
public ReturnT<String> registry(RegistryParam registryParam) {
    return XxlJobRemotingUtil.postBody(addressUrl + "api/registry", accessToken, timeout, registryParam, String.class);
}
```

#### 调度中心处理注册

上面我们了解了`执行器发起注册`逻辑，最终是发起`post`请求调用`api/registry`接口

则来到`JobApiController#api`

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214704116.png" alt="image-20250613214704116" style="zoom:50%;" />

相比于**执行器发起注册**的逻辑，**调度中心处理注册**的逻辑就简单很多了

1. 参数校验
2. 异步完成注册

    1. **先进行更新操作**
    2. 如果**操作行数**  **&lt;**  **1**，**说明记录不存在，则执行插入操作**，写入到`xxl_job_registry`**表中**，完成注册

3. 直接返回注册成功响应

```java
// com.xxl.job.admin.core.thread.JobRegistryHelper#registry
public ReturnT<String> registry(RegistryParam registryParam) {

  // 参数校验
  if (!StringUtils.hasText(registryParam.getRegistryGroup())
      || !StringUtils.hasText(registryParam.getRegistryKey())
      || !StringUtils.hasText(registryParam.getRegistryValue())) {
    return new ReturnT<String>(ReturnT.FAIL_CODE, "Illegal Argument.");
  }

  // 异步写入数据库完成注册
  registryOrRemoveThreadPool.execute(new Runnable() {
    @Override
    public void run() {
      // 先进行更新操作
      int ret = XxlJobAdminConfig.getAdminConfig().getXxlJobRegistryDao().registryUpdate(registryParam.getRegistryGroup(), registryParam.getRegistryKey(), registryParam.getRegistryValue(), new Date());
      if (ret < 1) {
        // 操作行数 < 1，说明记录不存在，则执行插入操作，写入到xxl_job_registry表中
        XxlJobAdminConfig.getAdminConfig().getXxlJobRegistryDao().registrySave(registryParam.getRegistryGroup(), registryParam.getRegistryKey(), registryParam.getRegistryValue(), new Date());

        // fresh
        freshGroupRegistryInfo(registryParam);
      }
    }
  });

  // 直接返回成功
  return ReturnT.SUCCESS;
}
```

### 执行器注销

执行器注销分为**主动注销**和**被动注销**

**主动注销很好理解，例如服务发布，会用新节点替换旧节点，那么旧节点需要告诉调度中心我要下线了，请把我注销掉，然后新节点再主动注册到调度中心，这样任务调度就会调度到新节点执行。**

像这种经典的`client server`通信，那么必不可少的就是`探活机制`，当**探活失败时，调度中心会主动注销掉**`client`** **，那么对于**`client`**来说就是被动注销**

#### 主动注销

回到最开始，我们了解到`XxlJobSpringExecutor`是实现了`DisposableBean`接口的，当服务下线时，会回调`destroy`方法

```java
public class XxlJobSpringExecutor extends XxlJobExecutor implements ApplicationContextAware, SmartInitializingSingleton, DisposableBean {

  // destroy
  @Override
  public void destroy() {
    super.destroy();
  }
}
// com.xxl.job.core.executor.XxlJobExecutor#destroy
public void destroy(){
  // 注销netty server
  stopEmbedServer();

  // 停止所有job线程
  if (jobThreadRepository.size() > 0) {
    for (Map.Entry<Integer, JobThread> item: jobThreadRepository.entrySet()) {
      JobThread oldJobThread = removeJobThread(item.getKey(), "web container destroy and kill the job.");
      // 如果存在正在执行的job thread，则等待其执行完毕
      if (oldJobThread != null) {
        try {
          oldJobThread.join();
        } catch (InterruptedException e) {
          logger.error(">>>>>>>>>>> xxl-job, JobThread destroy(join) error, jobId:{}", item.getKey(), e);
        }
      }
    }
  
    // 清空 jobThread
    jobThreadRepository.clear();
  }

  // 清空jobhandler
  jobHandlerRepository.clear();


  // ......
}
```

`stopEmbedServer`最终也还是来到了前面提到过的`ExecutorRegistryThread#toStop`中，**将**`toStop`**标识设置为**`true`** **，打断镔铁同步等待**`registryThread`**执行完毕**

**`registryThread#run`**方法中，当**`toStop = true`**则跳出循环，向所有**`admin`**节点发起注销请求**

```java
public class ExecutorRegistryThread {

  private volatile boolean toStop = false;

  public void toStop() {
    toStop = true;

    // interrupt and wait
    if (registryThread != null) {
      registryThread.interrupt();
      try {
        registryThread.join();
      } catch (InterruptedException e) {
        logger.error(e.getMessage(), e);
      }
    }

  }

  public void start(final String appname, final String address){
    registryThread = new Thread(new Runnable() {
      @Override
      public void run() {

        while(!toStop) {
          // ..... execute register
        }

        // registry remove
        try {
          RegistryParam registryParam = new RegistryParam(RegistryConfig.RegistType.EXECUTOR.name(), appname, address);
          // todo 遍历所有admin节点，一个一个发起注销请求
          for (AdminBiz adminBiz: XxlJobExecutor.getAdminBizList()) {
            try {
              // todo 发起注销请求
              ReturnT<String> registryResult = adminBiz.registryRemove(registryParam);
              if (registryResult!=null && ReturnT.SUCCESS_CODE == registryResult.getCode()) {
                registryResult = ReturnT.SUCCESS;
                logger.info(">>>>>>>>>>> xxl-job registry-remove success, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
                break;
              } else {
                logger.info(">>>>>>>>>>> xxl-job registry-remove fail, registryParam:{}, registryResult:{}", new Object[]{registryParam, registryResult});
              }
            } catch (Exception e) {
              if (!toStop) {
                logger.info(">>>>>>>>>>> xxl-job registry-remove error, registryParam:{}", registryParam, e);
              }

            }

          }
        } catch (Exception e) {
          if (!toStop) {
            logger.error(e.getMessage(), e);
          }
        }
        logger.info(">>>>>>>>>>> xxl-job, executor registry thread destroy.");

      }
    });
    registryThread.setDaemon(true);
    registryThread.setName("xxl-job, executor ExecutorRegistryThread");
    registryThread.start();
  }
}
```

**同注册一样，只不过这次是请求的**`registryRemove`**接口**

```java
@Override
public ReturnT<String> registryRemove(RegistryParam registryParam) {
    return XxlJobRemotingUtil.postBody(addressUrl + "api/registryRemove", accessToken, timeout, registryParam, String.class);
}
```

`JobApiController`处理注销请求，**本质上就是从**`xxl_job_registry`**表中删除记录**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214742347.png" alt="image-20250613214742347" style="zoom:60%;" />

#### 被动注销

**调度中心**`init`**的时候，会开启一个**`registryMonitorThread`**线程，其中每隔**`30s`**会查询超过**`90s`**没有更新的执行器节点记录（认为探活失败）, 查出来后会直接移除掉**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214814006.png" alt="image-20250613214814006" style="zoom:40%;" />

**在执行器启动的时候会向调度中心发起注册**

**之后每隔**`30s`**会再次发起注册，此时就会去更新节点在**`xxl_job_registry`**的**`update_time` **，这样一样就能维持探活，节点就不会被移除**

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214840106.png" alt="image-20250613214840106" style="zoom:40%;" />

### 总结

在`spring`的环境下，利用`spring`留下的扩展接口（`SmartInitializingSingleton` -- 所有单例 Bean 初始化完成后执行初始化逻辑），将执行器的节点信息注册到`调度中心`, `注销`机制同理，同时`调度中心`与`执行器`之间建立心跳机制，保证任务的正常调度。

## 任务调度

### 执行一次调度

#### 调度中心向执行器发起执行任务请求

在控制台手动执行一次任务，我们可以看到请求的`/jobinfo/trigger`接口

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214904935.png" alt="image-20250613214904935" style="zoom:30%;" />

```java
@Controller
@RequestMapping("/jobinfo")
public class JobInfoController {
  @RequestMapping("/trigger")
  @ResponseBody
  //@PermissionLimit(limit = false)
  public ReturnT<String> triggerJob(int id, String executorParam, String addressList) {
    // force cover job param
    if (executorParam == null) {
      executorParam = "";
    }

    // todo 处理
    JobTriggerPoolHelper.trigger(id, TriggerTypeEnum.MANUAL, -1, null, executorParam, addressList);
    return ReturnT.SUCCESS;
  }
}
```

在`controller`简单做了下参数校验后来到`JobTriggerPoolHelper#addTrigger`继续处理\~

```java
// com.xxl.job.admin.core.thread.JobTriggerPoolHelper#addTrigger
public void addTrigger(final int jobId,
                       final TriggerTypeEnum triggerType,
                       final int failRetryCount,
                       final String executorShardingParam,
                       final String executorParam,
                       final String addressList) {

  // 选择线程池
  ThreadPoolExecutor triggerPool_ = fastTriggerPool;
  AtomicInteger jobTimeoutCount = jobTimeoutCountMap.get(jobId);
  
  // 任务在1分钟窗口期内，超时次数超过10次，则让其进入slowTriggerPool
  if (jobTimeoutCount!=null && jobTimeoutCount.get() > 10) {      // job-timeout 10 times in 1 min
    triggerPool_ = slowTriggerPool;
  }

  // trigger
  triggerPool_.execute(new Runnable() {
    @Override
    public void run() {

      long start = System.currentTimeMillis();

      try {
        // todo 执行任务
        XxlJobTrigger.trigger(jobId, triggerType, failRetryCount, executorShardingParam, executorParam, addressList);
      } catch (Exception e) {
        logger.error(e.getMessage(), e);
      } finally {

        // 检查窗口期，如果是新的1分钟窗口，则清除jobTimeoutCountMap信息，重新计算
        long minTim_now = System.currentTimeMillis()/60000;
        if (minTim != minTim_now) {
          minTim = minTim_now;
          jobTimeoutCountMap.clear();
        }

        // 计算任务耗时，如果超过500ms，则记录到jobTimeoutCountMap中
        long cost = System.currentTimeMillis()-start;
        if (cost > 500) {       // ob-timeout threshold 500ms
          AtomicInteger timeoutCount = jobTimeoutCountMap.putIfAbsent(jobId, new AtomicInteger(1));
          if (timeoutCount != null) {
            timeoutCount.incrementAndGet();
          }
        }

      }

    }
  });
}
```

**`JobTriggerPoolHelper#addTrigger`**中会先选择一个线程池，然后交由线程池进行异步执行

线程池选择方式如下:

1. **默认选择**`fastTriggerPool`
2. **同时存在一个**`jobTimeoutCountMap`**记录任务超时次数，如果超过**`10`**次，则选择**`slowTriggerPool`

继续跟踪任务的执行逻辑，我们来到了`XxlJobTrigger#trigger`

```java
// com.xxl.job.admin.core.trigger.XxlJobTrigger#trigger
public static void trigger(int jobId,
                           TriggerTypeEnum triggerType,
                           int failRetryCount,
                           String executorShardingParam,
                           String executorParam,
                           String addressList) {

  // 根据jobId从数据库中查询job相关信息
  XxlJobInfo jobInfo = XxlJobAdminConfig.getAdminConfig().getXxlJobInfoDao().loadById(jobId);
  if (jobInfo == null) {
    logger.warn(">>>>>>>>>>>> trigger fail, jobId invalid，jobId={}", jobId);
    return;
  }

  // 手动执行一次时，xxljob支持传入参数，这里就是如果手动传入了，那么会覆盖数据库里的执行参数
  if (executorParam != null) {
    jobInfo.setExecutorParam(executorParam);
  }

  // 失败重试次数
  int finalFailRetryCount = failRetryCount >=0 ? failRetryCount : jobInfo.getExecutorFailRetryCount();

  // 获取jobGroup信息，可以理解为job归属的服务信息，例如: order、pay、product等
  XxlJobGroup group = XxlJobAdminConfig.getAdminConfig().getXxlJobGroupDao().load(jobInfo.getJobGroup());

  // cover addressList
  if (addressList!=null && addressList.trim().length()>0) {
    group.setAddressType(1);
    group.setAddressList(addressList.trim());
  }

  // sharding param
  int[] shardingParam = null;
  if (executorShardingParam!=null){
    String[] shardingArr = executorShardingParam.split("/");
    if (shardingArr.length==2 && isNumeric(shardingArr[0]) && isNumeric(shardingArr[1])) {
      shardingParam = new int[2];
      shardingParam[0] = Integer.valueOf(shardingArr[0]);
      shardingParam[1] = Integer.valueOf(shardingArr[1]);
    }
  }

  // 分片广播执行
  if (ExecutorRouteStrategyEnum.SHARDING_BROADCAST==ExecutorRouteStrategyEnum.match(jobInfo.getExecutorRouteStrategy(), null)
      && group.getRegistryList()!=null && !group.getRegistryList().isEmpty()
      && shardingParam==null) {
    for (int i = 0; i < group.getRegistryList().size(); i++) {
      processTrigger(group, jobInfo, finalFailRetryCount, triggerType, i, group.getRegistryList().size());
    }
  } else {
    if (shardingParam == null) {
      shardingParam = new int[]{0, 1};
    }

    // todo 执行任务
    processTrigger(group, jobInfo, finalFailRetryCount, triggerType, shardingParam[0], shardingParam[1]);
  }

}
```

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613214942695.png" alt="image-20250613214942695" style="zoom:50%;" />

手动执行时，支持传入**执行参数、指定的机器地址**

而`XxlJobTrigger#trigger`的逻辑就是，从数据库中查出`job`的相关信息，将手动设置的参数进行覆盖，执行时会有两种执行模式，一种是单机执行 一种是分片执行，这里我们就看单机执行.

```java
private static void processTrigger(XxlJobGroup group, XxlJobInfo jobInfo, int finalFailRetryCount, TriggerTypeEnum triggerType, int index, int total){

  // ......
  
  // 4、trigger remote executor
  ReturnT<String> triggerResult = null;
  if (address != null) {
    triggerResult = runExecutor(triggerParam, address);
  } else {
    triggerResult = new ReturnT<String>(ReturnT.FAIL_CODE, null);
  }

  // .....
  
}
public static ReturnT<String> runExecutor(TriggerParam triggerParam, String address){
  ReturnT<String> runResult = null;
  try {
    // 根据address 获取执行器
    ExecutorBiz executorBiz = XxlJobScheduler.getExecutorBiz(address);
    // todo 执行任务~
    runResult = executorBiz.run(triggerParam);
  } catch (Exception e) {
    logger.error(">>>>>>>>>>> xxl-job trigger error, please check if the executor[{}] is running.", address, e);
    runResult = new ReturnT<String>(ReturnT.FAIL_CODE, ThrowableUtil.toString(e));
  }
  // .....
  return runResult;
}
```

**最终是向目标机器携带执行参数等信息，发起**`run`**请求**

```java
// com.xxl.job.core.biz.client.ExecutorBizClient#run
public ReturnT<String> run(TriggerParam triggerParam) {
  return XxlJobRemotingUtil.postBody(addressUrl + "run", accessToken, timeout, triggerParam, String.class);
}
```

#### 执行器处理执行任务请求

在执行器启动的时候，会开启一个`Netty server`来处理`http`请求，其中自定义了`EmbedHttpServerHandler`处理器

```java
public class EmbedServer {

  public void start(final String address, final int port, final String appname, final String accessToken) {
    executorBiz = new ExecutorBizImpl();
    thread = new Thread(new Runnable() {
      @Override
      public void run() {
        // .....
        try {
          // start server
          ServerBootstrap bootstrap = new ServerBootstrap();
          bootstrap.group(bossGroup, workerGroup)
            .channel(NioServerSocketChannel.class)
            .childHandler(new ChannelInitializer<SocketChannel>() {
              @Override
              public void initChannel(SocketChannel channel) throws Exception {
                channel.pipeline()
                  .addLast(new IdleStateHandler(0, 0, 30 * 3, TimeUnit.SECONDS))  // beat 3N, close if idle
                  .addLast(new HttpServerCodec())
                  .addLast(new HttpObjectAggregator(5 * 1024 * 1024))  // merge request & reponse to FULL
                  .addLast(new EmbedHttpServerHandler(executorBiz, accessToken, bizThreadPool));
              }
            })
            .childOption(ChannelOption.SO_KEEPALIVE, true);

          // bind
          ChannelFuture future = bootstrap.bind(port).sync();
      
          // ......

          // wait util stop
          future.channel().closeFuture().sync();

        } catch (InterruptedException e) {
          logger.info(">>>>>>>>>>> xxl-job remoting server stop.");
        } catch (Exception e) {
          logger.error(">>>>>>>>>>> xxl-job remoting server error.", e);
        } finally {
          // stop
          try {
            workerGroup.shutdownGracefully();
            bossGroup.shutdownGracefully();
          } catch (Exception e) {
            logger.error(e.getMessage(), e);
          }
        }
      }
    });
    thread.setDaemon(true);    // daemon, service jvm, user thread leave >>> daemon leave >>> jvm leave
    thread.start();
  }
}
public static class EmbedHttpServerHandler extends SimpleChannelInboundHandler<FullHttpRequest> {

  @Override
  protected void channelRead0(final ChannelHandlerContext ctx, FullHttpRequest msg) throws Exception {
    // request parse
    //final byte[] requestBytes = ByteBufUtil.getBytes(msg.content());    // byteBuf.toString(io.netty.util.CharsetUtil.UTF_8);
    String requestData = msg.content().toString(CharsetUtil.UTF_8);
    String uri = msg.uri();
    HttpMethod httpMethod = msg.method();
    boolean keepAlive = HttpUtil.isKeepAlive(msg);
    String accessTokenReq = msg.headers().get(XxlJobRemotingUtil.XXL_JOB_ACCESS_TOKEN);

    // invoke
    bizThreadPool.execute(new Runnable() {
      @Override
      public void run() {
        // 处理请求
        Object responseObj = process(httpMethod, uri, requestData, accessTokenReq);

        // to json
        String responseJson = GsonTool.toJson(responseObj);

        // write response
        writeResponse(ctx, keepAlive, responseJson);
      }
    });
  }

  private Object process(HttpMethod httpMethod, String uri, String requestData, String accessTokenReq) {
    // .....

    // services mapping
    try {
      switch (uri) {
        // ......
        case "/run":
          TriggerParam triggerParam = GsonTool.fromJson(requestData, TriggerParam.class);
          // todo 执行任务
          return executorBiz.run(triggerParam);
        // ......
      }
    } catch (Exception e) {
      logger.error(e.getMessage(), e);
      return new ReturnT<String>(ReturnT.FAIL_CODE, "request error:" + ThrowableUtil.toString(e));
    }
  }

}
```

`EmbedHttpServerHandler`中，接收到请求后，仍然是交由线程池进行异步执行\~

**在**`process`**中，根据**`url`**来**`switch` **，进行不同的逻辑处理~**

```java
// com.xxl.job.core.biz.impl.ExecutorBizImpl#run
public ReturnT<String> run(TriggerParam triggerParam) {
  
  // 根据jobId查询任务执行线程（根据源码来看一个任务对应一个线程）
  JobThread jobThread = XxlJobExecutor.loadJobThread(triggerParam.getJobId());
  IJobHandler jobHandler = jobThread != null ? jobThread.getHandler() : null;
  String removeOldReason = null;

  // valid：jobHandler + jobThread
  GlueTypeEnum glueTypeEnum = GlueTypeEnum.match(triggerParam.getGlueType());
  
  // spring bean模式
  if (GlueTypeEnum.BEAN == glueTypeEnum) {
  
    // new jobhandler
    IJobHandler newJobHandler = XxlJobExecutor.loadJobHandler(triggerParam.getExecutorHandler());

    // 这个判断说明要可能修改了要执行的handlerName，与之前的不一致，需要把之前的任务remove掉
    if (jobThread!=null && jobHandler != newJobHandler) {
      // change handler, need kill old thread
      removeOldReason = "change jobhandler or glue type, and terminate the old job thread.";

      jobThread = null;
      jobHandler = null;
    }

    // valid handler
    if (jobHandler == null) {
      jobHandler = newJobHandler;
      if (jobHandler == null) {
        return new ReturnT<String>(ReturnT.FAIL_CODE, "job handler [" + triggerParam.getExecutorHandler() + "] not found.");
      }
    }

  } // .....


  // replace thread (new or exists invalid)
  if (jobThread == null) {
    // 第一次执行 or 执行的新的handlerName与之前的不一致
    jobThread = XxlJobExecutor.registJobThread(triggerParam.getJobId(), jobHandler, removeOldReason);
  }

  // 添加任务到队列中
  ReturnT<String> pushResult = jobThread.pushTriggerQueue(triggerParam);
  return pushResult;
}
```

1. **根据**`jobId`**查询任务对应的执行线程**`JobThread`
2. **匹配任务类型，创建**`IJobHandler` **，此时如果新需要执行的**`IJobHandler`**与**`oldIJobHandler`**不一致，那么需要以新的为准，销毁旧的任务线程**
3. **将任务添加到对应任务线程的队列中**

> 根据源码来看，我们可以得出**一个任务对应一个线程**的结论

下面是注册任务线程的逻辑，本质上是一个`map`维护着`jobId -> jobThead`的映射关系

```java
private static ConcurrentMap<Integer, JobThread> jobThreadRepository = new ConcurrentHashMap<Integer, JobThread>();

public static JobThread registJobThread(int jobId, IJobHandler handler, String removeOldReason) {
  // 创建任务线程
  JobThread newJobThread = new JobThread(jobId, handler);
  // 启动线程
  newJobThread.start();
  logger.info(">>>>>>>>>>> xxl-job regist JobThread success, jobId:{}, handler:{}", new Object[]{jobId, handler});

  // todo 注册，维护映射关系
  JobThread oldJobThread = jobThreadRepository.put(jobId, newJobThread); // putIfAbsent | oh my god, map's put method return the old value!!!
  if (oldJobThread != null) {
    // todo 打断旧的任务线程
    oldJobThread.toStop(removeOldReason);
    oldJobThread.interrupt();
  }

  return newJobThread;
}
```

再来看，`JobThread`继承了`Thread`，实例化好后便`start`了，在`run`方法中，**会阻塞从队列中获取任务，超时时间为3秒**

**成功获取任务后，将其封装为**`FutureTask` **, 再开启一个新的线程去执行（进行超时控制），内部最终调用**`handler.execute();`

```java
public class JobThread extends Thread {
  
  // todo 任务队列
  private LinkedBlockingQueue<TriggerParam> triggerQueue;
  
  public ReturnT<String> pushTriggerQueue(TriggerParam triggerParam) {
    // ......
  
    // 添加到队列中
    triggerQueue.add(triggerParam);
    return ReturnT.SUCCESS;
  }

  @Override
  public void run() {

    // ......

    // execute
    while(!toStop) {
      running = false;
      idleTimes++;

      TriggerParam triggerParam = null;
      try {
        // 会阻塞从队列中获取任务，超时时间为3秒
        triggerParam = triggerQueue.poll(3L, TimeUnit.SECONDS);
        if (triggerParam!=null) {
      
            // ......

          if (triggerParam.getExecutorTimeout() > 0) {
            // limit timeout
            Thread futureThread = null;
            try {
              FutureTask<Boolean> futureTask = new FutureTask<Boolean>(new Callable<Boolean>() {
                @Override
                public Boolean call() throws Exception {

                  // init job context
                  XxlJobContext.setXxlJobContext(xxlJobContext);

                  // todo 执行任务
                  handler.execute();
                  return true;
                }
              });
              // 创建一个新的线程去执行
              futureThread = new Thread(futureTask);
              futureThread.start();

              // 进行超时控制
              Boolean tempResult = futureTask.get(triggerParam.getExecutorTimeout(), TimeUnit.SECONDS);
            } catch (TimeoutException e) {
              // .....
          } else {
            // just execute
            handler.execute();
          }

          // .....

        } else {
          // .....
        }
      } catch (Throwable e) {
        // .....
      } finally {
        // .....
      }
    }

    // .....
  }
}
```

**对于**`Spring`**来说，其对应的**`IJobHandler`**是**`MethodJobHandler` **，所以这就是终点了，最终调用了被** **`@XxlJob`**修饰的任务~

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613215111438.png" alt="image-20250613215111438" style="zoom:50%;" />

### 定时调度

**在调度中心启动时，存在一个**`XxlJobAdminConfig bean`   **，在初始化后会对**`xxlJobScheduler`**进行实例初始化~**

```java
@Component
public class XxlJobAdminConfig implements InitializingBean, DisposableBean {

  private static XxlJobAdminConfig adminConfig = null;
  public static XxlJobAdminConfig getAdminConfig() {
    return adminConfig;
  }


  // ---------------------- XxlJobScheduler ----------------------

  private XxlJobScheduler xxlJobScheduler;

  @Override
  public void afterPropertiesSet() throws Exception {
    adminConfig = this;

    xxlJobScheduler = new XxlJobScheduler();
    // todo 初始化
    xxlJobScheduler.init();
  }
}
```

**我们直接看定时调度部分**

```java
public class XxlJobScheduler  {
    private static final Logger logger = LoggerFactory.getLogger(XxlJobScheduler.class);


    public void init() throws Exception {
        // init i18n
        initI18n(); // 初始化国际化内容

        // admin trigger pool start
        JobTriggerPoolHelper.toStart(); // 任务触发帮助类启动

        // admin registry monitor run
        JobRegistryHelper.getInstance().start(); // 注册帮助类启动

        // admin fail-monitor run
        JobFailMonitorHelper.getInstance().start(); // 失败监控帮助类启动

        // admin lose-monitor run ( depend on JobTriggerPoolHelper )
        JobCompleteHelper.getInstance().start(); // 丢失监控帮助类启动

        // admin log report start
        JobLogReportHelper.getInstance().start(); // 日志报表帮助类启动

        // start-schedule  ( depend on JobTriggerPoolHelper )
        JobScheduleHelper.getInstance().start(); // 启动定时调度

        logger.info(">>>>>>>>> init xxl-job admin success.");
    }
}
```

**在**`JobScheduleHelper#start`**中，创建并启动了**`scheduleThread、ringThread`

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613215142130.png" alt="image-20250613215142130" style="zoom:50%;" />

- `scheduleThread`：**定时从数据库中扫描出即将要执行的任务**
- `ringThread`： **定时扫出来的任务可能还未到执行时间，则放入到时间轮中进行调度**

#### 定时任务线程 `scheduleThread`

既然是定时，那么我们先来看看这个定时的间隔是多少\~

```java
// 计算花费的时间
if (cost < 1000) {  // scan-overtime, not wait
    try {
        // pre-read period: success > scan each second; fail > skip this period;
        //如果成功扫出来任务，则等待0s-1s，然后快速触发下一次，没有扫出来任务，就等待0s-5s内再触发下一次
        TimeUnit.MILLISECONDS.sleep((preReadSuc ? 1000 : PRE_READ_MS) - System.currentTimeMillis() % 1000);
    } catch (InterruptedException e) {
        if (!scheduleThreadToStop) {
            logger.error(e.getMessage(), e);
        }
    }
}
```

当任务执行时间`< 1s`时，会进行`sleep`，`preReadSuc`代表是否扫描出将要执行的任务，如果扫描出来，则`sleep 1s`，反之则是`5s`，同时再`- System.currentTimeMillis() % 1000`, 打散多`admin`节点下时的调度，防止同时进行锁竞争。

> 为什么没扫描出来任务时，需要`sleep 5s` ?

因为在任务扫描时，是扫描出未来`5s`内要执行的任务，如果没扫出来，则可以`sleep 5s`等到下一个扫描的时间节点\~ 代码如👇🏻

```java
public void start() {
  // schedule thread
  scheduleThread = new Thread(new Runnable() {
    @Override
    public void run() {

      try {
        TimeUnit.MILLISECONDS.sleep(5000 - System.currentTimeMillis() % 1000);
      } catch (InterruptedException e) {
        if (!scheduleThreadToStop) {
          logger.error(e.getMessage(), e);
        }
      }

      // pageSize，扫描出的最大任务数，默认6000
      int preReadCount = (XxlJobAdminConfig.getAdminConfig().getTriggerPoolFastMax() + XxlJobAdminConfig.getAdminConfig().getTriggerPoolSlowMax()) * 20;

      while (!scheduleThreadToStop) {
        long start = System.currentTimeMillis();

        Connection conn = null;
        Boolean connAutoCommit = null;
        PreparedStatement preparedStatement = null;

        boolean preReadSuc = true;
        try {

          conn = XxlJobAdminConfig.getAdminConfig().getDataSource().getConnection();
          connAutoCommit = conn.getAutoCommit();
          conn.setAutoCommit(false);

          // todo db行锁
          preparedStatement = conn.prepareStatement("select * from xxl_job_lock where lock_name = 'schedule_lock' for update");
          preparedStatement.execute();

          // tx start

          // 1、pre read
          long nowTime = System.currentTimeMillis();

          // todo 从数据库中取出，未来5s内要执行的任务
          List<XxlJobInfo> scheduleList = XxlJobAdminConfig.getAdminConfig().getXxlJobInfoDao().scheduleJobQuery(nowTime + PRE_READ_MS, preReadCount);

          // ......

        } catch(Exception e){
        }
      }
    }
  });
}
```

**在扫描出来任务后，根据任务不同超时区间，进行不同的逻辑处理~**

##### 超时5s以上

```java
for (XxlJobInfo jobInfo: scheduleList) {

  // 超时5s以上
  if (nowTime > jobInfo.getTriggerNextTime() + PRE_READ_MS) {

    // 匹配操作策略，默认忽略
    MisfireStrategyEnum misfireStrategyEnum = MisfireStrategyEnum.match(jobInfo.getMisfireStrategy(), MisfireStrategyEnum.DO_NOTHING);
  
    // todo 如果是立刻执行一次
    if (MisfireStrategyEnum.FIRE_ONCE_NOW == misfireStrategyEnum) {
      // todo 与前面讲到的执行一次任务逻辑一致~
      JobTriggerPoolHelper.trigger(jobInfo.getId(), TriggerTypeEnum.MISFIRE, -1, null, null, null);
      logger.debug(">>>>>>>>>>> xxl-job, schedule push trigger : jobId = " + jobInfo.getId() );
    }

    // todo 更新jobInfo中下一次的执行时间
    refreshNextValidTime(jobInfo, new Date());

  }
}
```

当任务超时`5s`以上时，会触发**调度过期策略**，默认是 **`忽略`** **，但如果配置了**立即执行，则会执行一次任务（逻辑最开始讲解的执行一次任务逻辑一致）

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250613215214851.png" alt="image-20250613215214851" style="zoom:40%;" />

##### 超时，但未超过5s

```java
for (XxlJobInfo jobInfo: scheduleList) {

  // todo 超时，但是未超过5s
  else if (nowTime > jobInfo.getTriggerNextTime()) {

    // 1、trigger
    JobTriggerPoolHelper.trigger(jobInfo.getId(), TriggerTypeEnum.CRON, -1, null, null, null);
    logger.debug(">>>>>>>>>>> xxl-job, schedule push trigger : jobId = " + jobInfo.getId() );

    // todo 更新jobInfo中下一次的执行时间
    refreshNextValidTime(jobInfo, new Date());

    // 执行成功，并且下一次执行时机 < 5s
    if (jobInfo.getTriggerStatus()==1 && nowTime + PRE_READ_MS > jobInfo.getTriggerNextTime()) {

      // 计算下一次执行时间的秒数
      int ringSecond = (int)((jobInfo.getTriggerNextTime()/1000)%60);

      // 添加到时间轮中进行调度
      pushTimeRing(ringSecond, jobInfo.getId());

      // 再次刷新下次执行时间
      refreshNextValidTime(jobInfo, new Date(jobInfo.getTriggerNextTime()));

    }

  }
}
```

**当任务超时，但是未超过**`5s`**时，会立即执行一次任务**

**并且如果任务执行成功，且下一次执行的时间在未来**`5s`**之内，则把当前任务加入到时间轮中进行调度**

##### 未超时（未到执行时间）

```java
for (XxlJobInfo jobInfo: scheduleList) {

  // todo 未超时
  else  {

    // 1、make ring second
    int ringSecond = (int)((jobInfo.getTriggerNextTime()/1000)%60);

    // 2、push time ring
    pushTimeRing(ringSecond, jobInfo.getId());

    // 3、fresh next
    refreshNextValidTime(jobInfo, new Date(jobInfo.getTriggerNextTime()));

  }

}
```

**任务未超时，但任务会在未来**`5s`**内执行，所以把任务加入到时间轮中进行调度**

#### 时间轮线程 `ringThread`

```java
private volatile static Map<Integer, List<Integer>> ringData = new ConcurrentHashMap<>();

// ring thread
ringThread = new Thread(new Runnable() {
  @Override
  public void run() {

    while (!ringThreadToStop) {
      try {
        // todo sleep 1s，
        // - System.currentTimeMillis() % 1000: 打散多节点调度
        TimeUnit.MILLISECONDS.sleep(1000 - System.currentTimeMillis() % 1000);
      } catch (InterruptedException e) {
        if (!ringThreadToStop) {
          logger.error(e.getMessage(), e);
        }
      }

      try {
        // 待执行任务id集合
        List<Integer> ringItemData = new ArrayList<>();
    
        // todo 拿到当前秒待执行的任务和前一秒待执行的任务
        int nowSecond = Calendar.getInstance().get(Calendar.SECOND);   // 避免处理耗时太长，跨过刻度，向前校验一个刻度；
        for (int i = 0; i < 2; i++) {
          // remove掉，这样可以避免重复拿到已经执行过的任务id
          List<Integer> tmpData = ringData.remove( (nowSecond+60-i)%60 );
          if (tmpData != null) {
            ringItemData.addAll(tmpData);
          }
        }

        if (ringItemData.size() > 0) {
          // todo 遍历执行任务
          for (int jobId: ringItemData) {
            JobTriggerPoolHelper.trigger(jobId, TriggerTypeEnum.CRON, -1, null, null, null);
          }
          // clear
          ringItemData.clear();
        }
      } catch (Exception e) {
        if (!ringThreadToStop) {
          logger.error(">>>>>>>>>>> xxl-job, JobScheduleHelper#ringThread error:{}", e);
        }
      }
    }
  }
});
```

**`xxlJob`**中的时间轮，本质上是一个**`ConcurrentHashMap`** **，**`key为秒数` **，**`value为秒对应的需要执行的任务id集合`。

**在**`ringThread` **，只要线程没有被停止，那么每隔近**`1s`**从**`map`**中取出当前秒和前一秒对应的待执行任务，取出前一秒的任务，是担心逻辑处理时间过长导致会跳过**`1s`**的任务。**

**这里采用**`remove`**的方式，移除并返回任务，防止任务被重复获取执行。**
