# Spring MVC

## 核心组件

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

## 工作原理

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
