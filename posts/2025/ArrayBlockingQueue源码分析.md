---
title: ArrayBlockingQueue源码分析
tags:
  - JAVA
  - 源码
categories:
  - JAVA
date: '2025-01-03'
description: 欢迎使用 Curve 主题，这是你的第一篇文章
articleGPT: 这是一篇初始化文章，旨在告诉用户一些使用说明和须知。
#cover: "/images/logo/logo.webp"
---

# ArrayBlockingQueue源码分析

## 成员变量

* ​`final ReentrantLock lock;`​

  * **作用**：提供独占锁机制，用于保护竞争资源。
  * **特点**：确保同一时刻只有一个线程能访问队列的临界区。

* ​`private final Condition notEmpty;`​

  * **作用**：表示“锁的非空条件”。
  * **线程等待**：当线程尝试从队列中获取数据但队列为空时，线程会通过`notEmpty.await()`​方法等待。
  * **线程唤醒**：当其他线程向队列中插入元素后，会调用`notEmpty.signal()`​方法唤醒等待的线程。

* ​`private final Condition notFull;`​

  * **作用**：表示“锁满的条件”。
  * **线程等待**：当线程尝试向队列中插入元素但队列已满时，线程会通过`notFull.await()`​方法等待。**线程唤醒**：当其他线程从队列中取出元素后，会调用`notFull.signal()`​方法唤醒等待的线程。

## 入队

* ​`offer(E e)`​：尝试添加元素，队列满时返回`false`​。
* ​`put(E e)`​：添加元素，队列满时阻塞线程，直到有空位。

```java
// 加入成功返回true,否则返回false 
public boolean offer(E e) {  
    checkNotNull(e);  
    final ReentrantLock lock = this.lock;  
    lock.lock();//上锁  
    try {  
        if (count == items.length) //超过数组的容量  
            return false;  
        else {  
            enqueue(e); //放入元素  
            return true;  
        }  
    } finally {  
        lock.unlock();  
    }  
}  

// 如果队列已满的话，就会等待  
public void put(E e) throws InterruptedException {  
    checkNotNull(e);  
    final ReentrantLock lock = this.lock;  
    lock.lockInterruptibly();//和lock()方法的区别是让它在阻塞时也可抛出异常跳出  
    try {  
        while (count == items.length)  // 防止虚拟唤醒
        	notFull.await(); //这里就是阻塞了，要注意。如果运行到这里，那么它会释放上面的锁，一直等到notify  
        enqueue(e);  
    } finally {  
        lock.unlock();  
    }  
}
```

​`enqueue()`​方法是最终增加元素的方法：

```java
// 元素放入队列，注意调用这个方法时都要先加锁 
private void enqueue(E x) {  
    final Object[] items = this.items;  
    items[putIndex] = x;  
    if (++putIndex == items.length)  //循环队列，计算下标
        putIndex = 0;  
    count++;//当前拥有元素个数加1  
    notEmpty.signal();//有一个元素加入成功，那肯定队列不为空  
}  
```

## 出队

* ​`poll()`​

  * **特点**：队列为空时返回`null`​，不会阻塞线程。
  * **使用场景**：适用于需要非阻塞操作的场合。
* ​`take()`​

  * **特点**：队列为空时，会阻塞线程直到有元素可返回。
  * **使用场景**：适用于需要阻塞等待元素的场合。
* ​`remove()`​

  * **特点**：移除指定元素，不存在时抛出异常。
  * **使用场景**：需要确保元素存在并移除时使用。

```java
// 实现的方法，如果当前队列为空，返回null  
public E poll() {  
    final ReentrantLock lock = this.lock;  
    lock.lock();  
    try {  
        return (count == 0) ? null : dequeue();  
    } finally {  
        lock.unlock();  
    }  
}  
// 实现的方法，如果当前队列为空，一直阻塞  
public E take() throws InterruptedException {  
    final ReentrantLock lock = this.lock;  
    lock.lockInterruptibly();  
    try {  
        while (count == 0)  // 防止虚拟唤醒
        	notEmpty.await();//队列为空，阻塞方法  
        return dequeue();  
    } finally {  
        lock.unlock();  
    }  
}  
// 带有超时时间的取元素方法，否则返回Null  
public E poll(long timeout, TimeUnit unit) throws InterruptedException {  
    long nanos = unit.toNanos(timeout);  
    final ReentrantLock lock = this.lock;  
    lock.lockInterruptibly();  
    try {  
        while (count == 0) {  
            if (nanos <= 0)  
                return null;  
            nanos = notEmpty.awaitNanos(nanos);//超时等待  
        }  
        return dequeue();//取得元素  
    } finally {  
        lock.unlock();  
    }  
}
```

真正出队的方法是`dequeue()`​方法：

```java
// 元素出队，注意调用这个方法时都要先加锁
private E dequeue() {  
    final Object[] items = this.items;  
    @SuppressWarnings("unchecked")  
    E x = (E) items[takeIndex];  
    items[takeIndex] = null;  
    if (++takeIndex == items.length)  
        takeIndex = 0;  
    count--;//当前拥有元素个数减1  
    if (itrs != null)  
        itrs.elementDequeued();  
    notFull.signal();//有一个元素取出成功，那肯定队列不满  
    return x;  
}
```
