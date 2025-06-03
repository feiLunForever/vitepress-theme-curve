
# yh自定义分词器

# 分词

## 核心类

* YhAnalyzer：入口类
* QuantifierProcessor：量词处理

  * 比如 花生牛奶*12瓶，切出* *​`12`​*​`瓶`​ 作为量词
* Dictionary：词典，加载各类词典

  * MapDict：主要用来存储词属性，如词对应的词性、词频
  * DicSegment：从IkAnalyzer复制过来的词典类，用多叉树开发的快速词条查找

    * > ps. java版结巴分词器也是copy的这个类，只能用来存储词条，不支持存储其他属性
      >
  * FstDict：lucene的词典类，除了词条之外，还可以顺带存储词频，没有在用
* Segmenter：分词接口

  * MMSegmenter：前向最大匹配
  * RMMSegmenter：后向最大匹配
  * BMMSegmenter：双向最大匹配，包装了上述两个最大匹配
  * EnglishLetters：英文字符处理，按指定连接字符切词，不考虑其他
* Arbitrator：消歧接口

  * BMMArbitrator：双向最大匹配切词结果的裁决，用来判断哪个结果为最终输出，比如 蔬菜/包装、蔬菜包/装，输出 蔬菜/包装，裁决依据参考prd
  * PoSArbitrator：词性裁决，用来判断分词结果各个词的词性，基于统计的成词词频，比如 雪碧(SPU)/柠檬(SPU)，输出 雪碧(SPU)/柠檬(ATTR)

## 主要流程

### preProcess 前置处理

* 归一化，大写转小写，全角转半角
* 处理成char[]

### 计算前后项匹配结果

* 遍历char[]  参照DictSegment ik分词器
* 量词处理 （*1件）
* 分词 前向最大匹配 /  后向最大匹配 trie前缀树  会有两种结果

### 分歧

* 双向分歧

  * 根据前后项结果，判断分词结果数量，取词数更少者
  * 如果分词数量一致，取单字数更少者
* 词性分歧

  * SPU，ATTR，BRD
  * 业务逻辑 凝固度计算

‍
