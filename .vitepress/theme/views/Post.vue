<!-- 文章页面 -->
<template>
  <div v-if="postMetaData" class="post">
    <div class="post-meta">
      <div class="meta">
        <div class="categories">
          <a
            v-for="(item, index) in postMetaData.categories"
            :key="index"
            :href="`/pages/categories/${item}`"
            class="cat-item"
          >
            <i class="iconfont icon-folder" />
            <span class="name">{{ item }}</span>
          </a>
        </div>
        <div class="tags">
          <a
            v-for="(item, index) in postMetaData.tags"
            :key="index"
            :href="`/pages/tags/${item}`"
            class="tag-item"
          >
            <i class="iconfont icon-hashtag" />
            <span class="name">{{ item }}</span>
          </a>
        </div>
      </div>
      <h1 class="title">
        {{ postMetaData.title || "未命名文章" }}
      </h1>
      <div class="other-meta">
        <span class="meta date">
          <i class="iconfont icon-date" />
          {{ formatTimestamp(postMetaData.date) }}
        </span>
        <span class="update meta">
          <i class="iconfont icon-time" />
          {{ formatTimestamp(page?.lastUpdated || postMetaData.lastModified) }}
        </span>
      </div>
    </div>
    <div class="post-content">
      <Aside showToc />
      <article class="post-article s-card">
        <!-- 过期提醒 -->
        <div class="expired s-card" v-if="postMetaData?.expired >= 180">
          本文发表于 <strong>{{ postMetaData?.expired }}</strong> 天前，其中的信息可能已经事过境迁
        </div>
        <!-- AI 摘要 -->
        <ArticleGPT />
        <!-- 文章内容 -->
        <Content id="page-content" class="markdown-main-style" />
        <!-- 参考资料 -->
        <References />
        <!-- 版权 -->
<!--        <Copyright v-if="frontmatter.copyright !== false" :postData="postMetaData" />-->
        <!-- 其他信息 -->
<!--        <div class="other-meta">-->
<!--          <div class="all-tags">-->
<!--            <a-->
<!--              v-for="(item, index) in postMetaData.tags"-->
<!--              :key="index"-->
<!--              :href="`/pages/tags/${item}`"-->
<!--              class="tag-item"-->
<!--            >-->
<!--              <i class="iconfont icon-hashtag" />-->
<!--              <span class="name">{{ item }}</span>-->
<!--            </a>-->
<!--          </div>-->
<!--        </div>-->
        <RewardBtn />
        <!-- 下一篇 -->
        <NextPost />
        <!-- 相关文章 -->
        <RelatedPost />
      </article>
    </div>
  </div>
</template>

<script setup>
import { formatTimestamp } from "@/utils/helper";
import { generateId } from "@/utils/commonTools";
import initFancybox from "@/utils/initFancybox";

const { page, theme, frontmatter } = useData();

// 获取对应文章数据
const postMetaData = computed(() => {
  const postId = generateId(page.value.relativePath);
  return theme.value.postData.find((item) => item.id === postId);
});

onMounted(() => {
  initFancybox(theme.value);
});
</script>

<style lang="scss" scoped>
@use "../style/post.scss";

.post-content {
  padding: 1.5rem; // 增加内边距
  border-radius: 16px; // 增加圆角
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); // 增加阴影
}
</style>
