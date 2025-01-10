<template>
  <div v-if="!isAuthenticated" class="password-auth">
    <div class="auth-container s-card">
      <h2>需要密码验证</h2>
      <p>请输入密码以访问内容</p>
      <input
        type="password"
        v-model="password"
        placeholder="请输入密码"
        @keyup.enter="verify"
      />
      <button @click="verify">验证</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'

const password = ref('')
const error = ref('')

// 存储认证状态和过期时间
const auth = useStorage('blog-auth', {
  authenticated: false,
  expireTime: 0
})

const isAuthenticated = computed(() => {
  // 检查是否认证以及是否过期
  if(!auth.value.authenticated) return false
  if(Date.now() > auth.value.expireTime) {
    auth.value.authenticated = false
    return false
  }
  return true
})

const verify = () => {
  if(password.value === '123456') {
    // 设置24小时后过期
    auth.value = {
      authenticated: true,
      expireTime: Date.now() + 24 * 60 * 60 * 1000
    }
    error.value = ''
  } else {
    error.value = '密码错误'
  }
}

defineExpose({
  isAuthenticated
})
</script>

<style lang="scss" scoped>
.password-auth {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--main-background);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;

  .auth-container {
    padding: 2rem;
    text-align: center;

    h2 {
      margin-bottom: 1rem;
    }

    input {
      width: 100%;
      padding: 0.5rem;
      margin: 1rem 0;
      border: 1px solid var(--main-card-border);
      border-radius: 4px;
      background: var(--main-card-second-background);
      color: var(--main-font-color);
    }

    button {
      padding: 0.5rem 2rem;
      background: var(--main-color);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }

    .error {
      color: #ff4d4f;
      margin-top: 1rem;
    }
  }
}
</style>
