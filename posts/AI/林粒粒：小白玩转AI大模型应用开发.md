
# 先导片

## AIGC是什么

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113121133-5oahuhp.png" alt="image" style="zoom:30%;" />​

`AIGC`​，即AI生成内容（AI generated content），是指AI可以帮忙生成文字、图片、音频视频等类型的内容，例如ChatGPT生成的文章、github copilot生成的代码以及mid journey生成的图片等。

生成式AI所生成的内容就是AIGC，所以像ChatGPT、github copilot这类由AI生成内容的技术都属于生成式AI。在中国，AIGC这个词更流行，有时会被用于指代生成式AI。

## 生成式AI与机器学习、AI、监督学习、无监督学习、强化学习、深度学习以及大语言模型（LLM）等概念之间的关系是怎样的？​​

* `机器学习`​是AI的一个子集，其中的核心在于让计算机通过算法自行学习和改进，而无需显式编程。

  * `机器学习`​领域下包含`监督学习`​、`无监督学习`​和`强化学习`​等分支。

* `深度学习`​是一种`机器学习`​方法，它使用人工神经网络模仿人脑处理信息的方式，通过层级化的方式提取和表示数据特征，并且可以应用于`监督学习`​、`无监督学习`​和`强化学习`​中。
* `生成式AI`​是`深度学习`​的一种应用，利用神经网络来识别现有内容模式并生成新的内容，包括文本、图片、音频等形式。

* `大语言模型（LLM）`​是`深度学习`​的一种应用，主要用于**自然语言处理**任务，拥有大规模参数量和训练数据集，能更好地理解自然语言并生成高质量文本。

  * > 虽然许多大语言模型是生成式AI的应用实例，但并非所有大语言模型都属于生成式AI范畴，例如谷歌的BERT模型虽属于大语言模型，但由于其架构特点不擅长文本生成，故在一些观点中不被认为是生成式AI。
    >

### 显式编程

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113121344-0hm9q93.png" alt="image" style="zoom:25%;" />​

1. 程序通过人类明确编写逻辑判断花种类（比如图片里有红色说明是玫瑰，图片里有橙色说明是向日葵）, 不涉及`机器学习`​，机器未参与学习过程。

### 机器学习

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113122027-wf60cgc.png" alt="image" style="zoom: 33%;" />

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250531121647623.png" alt="image-20250531121647623" style="zoom:50%;" />

1. 给电脑大量玫瑰和向日葵图片，让其识别模式，总结规律，属于`机器学习`​范畴，机器通过学习能预测和判断未知图片。
2. 机器学习领域包括`监督学习`​、`无监督学习`​、`强化学习`​等分支。

#### 监督学习

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113121455-yqsx0lj.png" alt="image" style="zoom:33%;" />​

1. 在`监督学习`​里，`机器学习`​算法会接受有`标签`​的训练，**数据标签就是期望的输出值**，所以每个训练数据点都既包括输入特征，也包括期望的输出值。
2. 算法的目标是学习输入和输出之间的映射关系，从而在给定新的输入特征后，能够准确预测出相应的输出值。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113122912-h1u6hih.png" alt="image" style="zoom:33%;" />​

经典的`监督学习`​任务包括`分类`​和`回归`​

* 分类任务是将数据划分为不同类别，例如根据照片预测是猫还是狗；

  * <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113122949-lxgdb7k.png" alt="image" style="zoom:33%;" />​
* 回归任务是预测数值，如预测房价。

  * <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113123015-gt4v2sm.png" alt="image" style="zoom:33%;" />​

#### 无监督学习

和`监督学习`​不同的是，`无监督学习`​学习的数据是没有`标签`​的。所以算法的任务是自主发现数据里的模式和规律。

经典的`无监督学习`​任务包括`聚类`​，也就是把数据进行分组。比如拿一堆新闻文章，让模型根据主题或内容的特征自动把相似文章进行组织。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113123237-5kmnmt3.png" alt="image" style="zoom:60%;" />​

#### 强化学习

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113123510-t5rochz.png" alt="image" style="zoom:33%;" />​<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113123532-95069to.png" alt="image" style="zoom:33%;" />​

`强化学习`​则是让模型在环境里采取行动，获得结果`反馈`​，从反馈里学习，从而能在给定情况下采取最佳行动来最大化奖励或是最小化损失。

> 就跟训小狗似的，刚开始的时候小狗会随心所欲做出很多动作。但随着和训犬师的互动，小狗会发现某些动作能够获得零食，某些动作没有零食，某些动作甚至会遭受惩罚。通过观察动作和奖惩之间的联系，小狗的行为会逐渐接近训犬师的期望。

强化学习可以应用在很多任务上，比如说让模型下围棋，获得不同行动导致的奖励或损失反馈，从而在一局局游戏里优化策略，学习如何采取行动达到高分。

### 深度学习

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113121625-hk9rrwh.png" alt="image" style="zoom:40%;" />​

`深度学习`​属于机器学习的一个分支，利用人工神经网络模仿人脑处理信息的方式，通过层次化方法提取和表示数据特征，广泛应用于图像识别、自然语言处理等任务。

* `神经网络`​是由许多基本的计算和储存单元组成，这些单元被称为神经元，这些神经元通过层层连接来处理数据，并且深度学习模型通常有很多层，因此称为深度。

> 比如要让计算机识别小猫的照片。在深度学习中，数据首先被传递到一个输入层，就像人类的眼睛看到图片一样。然后数据通过多个隐藏层，每一层都会对数据进行一些复杂的数学运算，来帮助计算机理解图片中的特征，例如小猫的耳朵、眼睛等等，最后计算机会输出一个答案，表明这是否是一张小猫的图片。

`神经网络`​可以用于`监督学习`​、`无监督学习`​、`强化学习`​，所以`深度学习`​不属于它们的子集。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113132654-q9eebzu.png" alt="image" style="zoom:33%;" />​

### 大语言（LLM）模型

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113133154-npcaos7.png" alt="image" style="zoom:40%;" />​

> 大语言模型，如GPT、ChatGLM，参数量大，需海量数据训练，擅长自然语言理解和生成。
>
> 并非所有大语言模型都是生成式AI，例如BERT主要用于理解上下文，不擅长长文本生成，主要用于搜索和文本分类。

1. `大语言模型`​，简称`LLM`​，是一种用于执行多种自然语言处理任务的`深度学习`​模型。这些任务包括生成、分类、总结和改写等，模型能够根据输入文本产生相应的输出。
2. `大语言模型`​的训练涉及大量的`无监督学习`​，使用的训练数据包括互联网上的各种文本，如书籍、新闻文章、科学论文、维基百科和社交媒体帖子等，这些文本帮助模型理解单词与上下文之间的关系，从而更准确地理解和生成文本。
3. `大语言模型`​之所以称为“大”，不仅仅是因为它们使用的训练数据量庞大，更重要的是它们拥有数以亿计的参数，这些参数是模型在训练过程中学习到的知识，决定了模型如何对输入数据做出反应，从而影响其行为能力。

    1. 在过去的语言模型研究中发现，用更多的数据和算力来训练具有更多参数的模型，很多时候能带来更好的模型表现
    2. 就像要AI学习做蛋糕，只允许AI调整面粉、糖、蛋的量和允许AI调整面粉、糖、蛋、奶油、牛奶、苏打粉、可可粉的量，以及烤箱的时长和温度，后者由于可以调整的变量更多，更能让AI模仿做出更好吃的蛋糕。随着参数的增加，他甚至有能力做出别的玩意儿，创造一些全新的品种
4. 随着参数数量的增加，大语言模型不仅能够完成更多的自然语言处理任务，还展现出更强的能力和灵活性，比如总结、分类和提取信息等，不再需要为每种任务训练单独的模型。
5. 虽然大语言模型的发展始于2017年谷歌提出的`transformer`​架构，这一架构彻底改变了自然语言处理的进展方向。随后，OpenAI、谷歌、百度等公司发布了一系列基于`transformer`​架构的模型，标志着大语言模型技术的进步和广泛应用，而2022年发布的ChatGPT等模型则进一步提高了公众对大语言模型的认识和兴趣。

> 以open I的第一个大模型GPT1为例，它有1.17亿个参数。到了GPT2参数有15亿个，而GPT3的参数又增长到了1750亿个。这让大模型不像小模型那样局限于单项或某几项任务，而是具有更加广泛的能力。比如在这之前我们可能要训练单独的模型，分别去做总结、分类、提取等等任务。但现在一个大模型就可以搞定这一切。像ChatGPT cloud、文心一言、通义千问等AI聊天助手，都是基于大语言模型的应用。

#### Transformer架构革新

##### 循环神经网络（RNN）

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113151522-pqezzi3.png" alt="image" style="zoom:50%;" />​

在transformer架构被提出之前，语言模型的主流架构主要是`循环神经网络`​，简称`RNN`​。`RNN`​按顺序逐字处理，每一步的输出取决于先前的隐藏状态和当前的输入，要等上一个步骤完成后才能进行。当前的计算机因此无法并行，计算训练效率低。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113151642-7f10tde.png" alt="image" style="zoom:33%;" />​

而且`RNN`​不擅长处理长序列，也就是长文本。由于`RNN`​的架构特点，此时间**距离**越远，前面对后面的影响越弱，所以它难以有效捕获到长距离的语义关系。但在人类自然语言中，依赖信息之间距离较远是很常见的情况。比如这句话里正确预测下一个词的关键词是距离很远的广东。如果由`RNN`​生成后续内容，到了这里的时候，他可能已经把前面的信息忘没了。

##### 长短期记忆网络（LSTM）

为了捕获长距离依赖性，后来也出现了`RNN`​的改良版本，`LSTM`​长短期记忆网络。但是这也并没有解决传统`RNN`​无法并行计算的问题，而且在处理非常长的序列时也依然受到限制。后来transformer它，这七彩祥云出现了，他有能力学习输入序列里所有词的相关性和上下文，不会受到短时记忆的影响。

##### transformer

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113154844-34gw323.png" alt="image" style="zoom:33%;" />​

###### 自注意力机制

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113154330-8t6zb2x.png" alt="image" style="zoom:33%;" />​

能做到这一点的关键在于`transformer`​的自注意力机制。也正如论文标题所说，attention is all you need, 注意力就是你所需要的一切。即使两个词的位置隔得很远，`transformer`​依然可以捕获到它们之间的依赖关系。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113154709-ubr5ura.png" alt="image" style="zoom: 50%;" />​

简单来说，`transformer`​在处理每个词的时候，不仅会注意这个词本身以及它附近的词，还会去注意输入序列里所有其他的词，然后其余每个词不一样的注意力权重。权重是模型在训练过程中通过大量文本逐渐习得的，因此`transformer`​有能力知道当前这个词和其他词之间的相关性有多强，然后去专注于输入里真正重要的部分。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250217171802304.png" alt="image-20250217171802304" style="zoom:50%;" />

比如这个例子，单从语法上来讲，IT可以指的是离得更近的street，也可以是离得更远的animal。这里自注意力机制捕获到了IT和animal之间更强的关系，因此更集中在animal上。

###### 位置编码

> 除了自注意力机制，`transformer`​的另一项关键创新是位置编码。

在语言里，顺序很重要，即使句子里包含的字都是一样的，但顺序不一样也能导致意思大相径庭。这也是为什么自然语言处理领域会用序列这个词，因为它表示一系列按照特定顺序排序的元素。前面提到`RNN`​和人类阅读文本一样，对输入序列同样是按顺序依次处理。这就造成了训练速度的瓶颈，因为只能串行，没办法并行，也就是没法同时去学习所有信息。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113155325-gl10pl8.png" alt="image" style="zoom:50%;" />​​<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241113155341-kn8774e.png" alt="image" style="zoom:50%;" />​

在将词输入给神经网络之前，`Transformers`​不仅会先对词进行嵌入转换成向量，也就是把每个词用一串数字表示，还会把每个词在句子中的位置也用一串数字表示，添加到输入序列的表示中。这样，神经网络模型就能既理解每个词的意义，又能捕获词在句子中的位置关系，从而理解不同词之间的顺序关系。通过位置编码，词可以不按顺序输入给`Transformers`​模型，可以同时处理输入序列里的所有位置，而不需要像`RNN`​那样需要按顺序处理。因此，每个输出都可以独立计算，不需要等待其他位置的计算结果，这大大提高了训练速度。训练速度一快，训练出巨大的模型也不是那么难了。

#### chagpt背后原理

##### GPT等生成式大语言模型是如何预测并生成下一个词的

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241114134921-donbedb.png" alt="image" style="zoom:50%;" />​

GPT等生成式大语言模型通过预测出现概率最高的下一个词来实现文本生成。它们主要依赖于`transformer`​架构，在该架构中，模型会根据已输入文本的`token`​序列，通过`嵌入层`​将每个`token`​转化为`向量`​表示，并进一步通过`位置编码`​和`自注意力机制`​来理解和捕捉词在句子中的顺序关系以及词与词之间的语义和语法相似性。最终，`解码器`​会基于`编码器`​输出的抽象表示以及自身已生成的文本信息，通过多头自注意力层和前馈神经网络等结构，逐步生成新的`token`​，直到生成结束符为止。

##### transfor架构

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224144910-95pf4bc.png)​

###### 核心组成部分

`transformer`​架构的核心由编码器`encoder`​和解码器`decoder`​两部分组成。

比如在处理翻译任务时，`编码器`​接收输入文本并将其转化为词向量，而`解码器`​则根据`编码器`​输出的表示和自身已生成的文本信息生成对应的输出文本。

> 其中，`编码器`​还包括了`嵌入层`​和`位置编码`​环节，以保留词汇信息、顺序关系以及语义特征；`解码器`​则采用了带掩码的`多头自注意力机制`​，确保生成的文本遵循时间顺序，并能融合`编码器`​输出的信息。

> 比如进行英语到法语的翻译时，如果我们要使用`transformer`​模型，给`编码器`​输入一句英语，`解码器`​返回对应的法语
>
> ![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224144814-fslhlrj.png)​

###### ***编码器器部分***

1. 输入文本 `token`​ 化

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241114135447-xh1pge8.png" alt="image" style="zoom:33%;" />​

即将输入拆分成各个`token`​。

> `Token`​是文本的基本单位，其定义取决于不同的`token`​化方法。
>
> * 短单词通常每个词是一个`token`​
> * 而长单词可能被拆分为多个`token`​。

每个`token`​用一个整数`token ID`​表示，这是因为在计算机内部无法存储文本，所有字符最终都需要转换为数字。在获得数字表示的输入文本后，再将其传入`嵌入层`​。

2. 向量嵌入

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224145418-z0bz413.png" alt="image" style="zoom: 80%;" />​​<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224150548-d98h0c3.png" alt="image" style="zoom:80%;" />​

> `嵌入层`​的作用是将每个`token`​转化为向量表示

那么问题来了，之前明明已经有单个整数表示各个`token`​了，怎么现在又要用一串数字表示各个`token`​？

其中一个原因是，一串数字能表达的含义是大于一个数字的，能包含更多语法、语义、信息等等。这就好比男人和女人这两个词，他们都在描述人类，但性别又是完全相反的。如果只用一个数字表示，这两个数字大小之间应该距离很大还是应该距离很小的。但如果有多个数字，我们就可以进行更多维度的表示。就比如说第一个数字可以表示是雌性的程度，第二个表示年龄大的程度，第三个表示社会阶层高的程度。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224145701-3ctycrb.png)​

因此，`嵌入层`​的向量并非随意生成，而是蕴含了词汇间的语法和语义关系。在向量空间中，相似的词对应着距离更近的向量，而无关的词则有更远的距离。这使得模型可以通过计算向量空间中的距离来捕捉词语在语义和语法方面的相似性。此外，如“男人与国王”和“女人与女王”这类相似关系也可以在多维向量空间中得以体现。因此，词向量不仅有助于模型理解词汇的语义，还能捕捉词汇间的复杂关系。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224150419-0k39m81.png)​

> 为了直观展示，我们使用三维向量空间表示，将向量长度简化为3。而提出的`transformer`​论文中，向量长度为512，GPT-3模型则达到12288。这说明了向量能包含的信息量之大。

3. 向量位置编码

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224150642-cvig1dk.png)​

位置编码的作用是为模型提供文本中各个词的位置信息，它将表示词在文本中顺序的向量与词向量相加以提供给编码器，使得模型不仅能理解每个词的意义，还能掌握词在句子中的相对位置，从而更好地理解不同词之间的顺序关系。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224150744-4boe0y4.png)​

###### ***解码器部分***

1. 多头自注意力机制

> 其主要任务是将输入转换为更抽象的表示形式，该形式既保留了输入文本的词汇信息和顺序关系，又捕获了语法和语义的关键特征。捕捉关键特征的核心是编码器的`自注意力机制`​，该机制在处理每个词时，不仅会关注该词本身和其附近的词，还会关注输入序列中所有其他词。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224151508-oighpk8.png)​

`注意力机制`​通过计算各个单词之间的`相关性`​来决定注意力`权重`​。如果两个单词间的相关性越强，它们之间的注意力权重就越高。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224151551-7lhqs2y.png)​

例如，在这个例子中，虽然“IT”在语法上可以指代“animal”或“strate”，但注意力机制识别到了“IT”与“animal”间的更强关联性，因此赋予了“animal”更高的权重。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224151626-ifqzyqe.png)​

由于`注意力机制`​对上下文的全面关注，`解码器`​输出的不仅包含词本身的信息，还融合了上下文中的相关信息。在语言中，上下文至关重要，它能揭示相同词语在不同语境下的不同含义。因此，`解码器`​输出的向量表示会根据上下文信息进行调整，使得`同一个词`​在不同`上下文`​中具有不同的`抽象`​表示。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224153708-jbpc0cj.png)​

实际上，`transformer`​模型采用了`多头自注意力`​机制，即 **编码器包含多个自注意力模块**，每个模块都有自己的注意力权重，用于关注文本的不同特征或方面，如动词、修饰词、情感和命名实体等。这些模块可以并行运算，即在计算过程中互不影响。每个自注意力头的权重是在之前的训练过程中，通过大量文本逐渐学习和调整得到的。

2. 前馈神经网络

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224154111-ifjmhz4.png)​

在多头自注意力之后，还有一个前馈神经网络，用于进一步处理自注意力模块的输出，以增强模型的表达能力。

3. 带掩码的多个自注意力

`解码器`​中的自注意力机制与`编码器`​有所不同。在`编码器`​处理各个词时，它会关注输入序列中`所有`​其他词。相反，`解码器`​中的自注意力只关注`当前词`​及其`前面`​的词，后面的词被遮盖而不予考虑。这种设计旨在确保解码器在生成文本时能够按照正确的时间顺序进行，不会提前看到未来的信息。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224154745-oixv92s.png)​

4. 转换层

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155244-vo95kjg.png)​

`解码器`​的最终阶段包括一个`线性层`​和一个`Softmax层`​，二者结合将`解码器`​输出的表示转化为词汇表的概率分布。这个词汇表的概率分布代表了下一个生成`token`​的概率，某些`token`​的出现概率会高于其他token。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155305-cca4z1w.png)​

通常情况下，模型会选择概率最高的`token`​作为下一个输出。现在我们知道了解码器本质上是在猜测下一个最可能的输出，至于输出是否符合客观事实，模型无从得知。因此，我们经常能看到模型一本正经地胡说八道，这种现象被称为`幻觉`​。

在解码器中，该流程会重复多次，生成新的`token`​，直到生成一个表示输出序列结束的特殊`token`​。这样，我们就得到了来自解码器的完整输出序列。

###### 总结

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224154423-kgygn3y.png)​

在`transformer`​模型中，编码器并非仅有一个，而是通过多个堆叠起来实现。每个编码器的内部结构相同，但它们的权重并不共享。这种设计使得模型能够更深入地理解和处理更复杂的文本语言内容。解码器肯定也并非一个，也是堆叠到一起的。

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155118-iuf3vl2.png)​

##### 三个变种

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155532-ogdzzmc.png)​

###### 仅编码器

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155517-6r6jc5u.png)​

仅编码器模型，也称为自编码器模型，仅保留了原始结构中的编码器部分，bert 就是这类模型的一个实例。这类模型适用于理解语言的任务，如掩码语言模型，让模型推测被遮盖的词汇，情感分析判断文本的情感倾向等。

###### 仅解码器

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155737-hyvmazc.png)​

仅解码器模型，也称为自回归模型，仅保留了原始结构中的解码器部分，GPT系列模型就是此类的代表。这类模型擅长通过预测下一个词来进行文本生成，我们在ChatGPT中已经见识过其编码器的一面。

###### 编码器-解码器

![image](https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20241224155815-7li04ws.png)​

编码器-解码器模型，也称为序列到序列模型，同时继承了原始架构中的编码器和解码器。T5和Bart都是此类模型的实例。这类模型适用于将一个序列转换为另一个序列的任务，例如翻译和总结。

#### ChatGPT训练步骤

> 1. 通过大量的文本进行无监督学习和训练，生成一个基础模型，能够进行文本生成。
>
> 2. 通过人类撰写的 高质量 对话数据，对基础模型进行监督微调，得到一个微调后的模型，此时的模型除了能够续写文本之外，也会具备更好的对话能力。
>
> 3. 使用问题和对应回答的数据，让人类标注员对回答进行质量排序，基于这些数据训练一个奖励模型，用于对回答进行评分预测。
>
>    接下来，让第二步得到的模型对问题生成回答，并利用奖励模型的评分作为反馈进行强化学习训练。

就这样，ChatGPT模型就训练完成了。

##### 无监督训练

通过大量的文本进行无监督学习和训练，生成一个基础模型，能够进行文本生成。

> 如 gpt3 模型使用的训练数据包括书籍、新闻、文章、科学论文、维基百科、社交媒体等内容，总量达到3000亿 token，从而为模型提供广泛的知识基础。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250217170629799.png" alt="image-20250217170629799" style="zoom:50%;" />

##### 监督微调

通过监督微调，利用人类撰写的高质量对话数据对基座模型进行优化，生成一个除了续写文本之外，还具备良好对话能力的模型。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250217170645860.png" alt="image-20250217170645860" style="zoom:50%;" />

##### 训练奖励模型 + 强化学习训练

通过人类标注员对问题及其多个回答进行质量排序，基于这些标注数据训练出一个奖励模型，用于对回答进行评分预测。

接下来，让第二步中得到的模型对问题生成回答，并使用奖励模型对回答进行评分，以此反馈信息进行强化学习训练，最终形成ChatGPT模型。

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250217170659278.png" alt="image-20250217170659278" style="zoom:50%;" />

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250531121827711.png" alt="image-20250531121827711" style="zoom:50%;" />

# AI 提示工程

## 什么构成了一个好的提示

<img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225231511537.png" alt="image-20250225231511537" style="zoom:50%;" />

在与AI大语言模型的交流中，提示是至关重要的。提示是我们提供给AI的问题或指示，AI会基于提示的内容进行回应。优质的提示能够显著提升AI理解和执行任务的效率，并为用户提供精确且有价值的信息。提示工程致力于研究如何提升与AI的沟通质量和效率，重点在于提示的开发和优化。

官方提出了七条原则：

- 首先是使用最新的模型版本

  - 因为随着迭代更新，新版本的模型通常具有更强的理解和处理能力。

- 第二条原则是在提示开头明确放置指令，并用三个引号分隔指令与上下文内容。

  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225231723165.png" alt="image-20250225231723165" style="zoom:40%;" />

- 第三条原则要求对上下文和输出的长度、格式、风格等给出具体描述性要求。

  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225231813588.png" alt="image-20250225231813588" style="zoom:40%;" />

- 第四条原则建议通过实例阐明期望的输出格式。

  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225231837821.png" alt="image-20250225231837821" style="zoom:40%;" />

- 第五条原则是从零样本提示开始，如果效果不佳则尝试小样本提示。

  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225231930971.png" alt="image-20250225231930971" style="zoom:40%;" />

- 第六条原则是避免空洞和不严谨的描述，保持提示简洁明了。

  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225231958053.png" alt="image-20250225231958053" style="zoom:40%;" />

- 第七条原则强调，与其告知不应做什么，不如明确指示应该做什么。

  - <img src="https://gitee.com/JBL_lun/tuchuang/raw/master/assets/image-20250225232021930.png" alt="image-20250225232021930" style="zoom:40%;" />

  
