<!-- 普通页面 -->
<template>
  <div :class="[frontmatter.layout || 'page', { 'has-aside': frontmatter.aside }]">
    <div class="page-content">
      <!-- 页面内容 -->
      <Content id="page-content" :class="['markdown-main-style', { 's-card': frontmatter.card }]" />
    </div>
    <Aside v-if="frontmatter.aside" />
  </div>
</template>

<script setup>
const { frontmatter } = useData();
</script>

<style lang="scss" scoped>
.page {
  .page-content {
    padding: 2rem;
    
    :deep(.markdown-main-style) {
      background: var(--main-card-background);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      padding: 2rem;
      
      &.s-card {
        transition: all 0.3s ease;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }
}
</style>
