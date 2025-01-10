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
import { ref, onMounted, onUnmounted } from 'vue'
import CryptoJS from 'crypto-js'

const password = ref('')
const error = ref('')
const isAuthenticated = ref(false)
const intervalId = ref(null)

// 检查过期状态
const checkExpiration = () => {
  const authTimestamp = localStorage.getItem('authTimestamp')
  const expirationTime = localStorage.getItem('expirationTime')

  if (authTimestamp && expirationTime) {
    const currentTime = Date.now()
    if (currentTime > parseInt(expirationTime, 10)) {
      // 已过期，清除状态
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('authTimestamp')
      localStorage.removeItem('expirationTime')
      isAuthenticated.value = false
      location.reload()
    } else {
      isAuthenticated.value = true
    }
  }
}

// 启动定时检查
const startExpirationCheck = () => {
  intervalId.value = setInterval(() => {
    checkExpiration()
  }, 60 * 1000) // 每分钟检查一次
}

// 停止定时检查
const stopExpirationCheck = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
}

// 验证密码
const verify = () => {
  const hashedPassword = CryptoJS.MD5(password.value).toString()

  if (hashedPassword === import.meta.env.VITE_PASSWORD) {
    isAuthenticated.value = true

    // 存储验证状态和时间戳
    const currentTime = Date.now()
    const expirationTimeInMinutes = 60 // 60分钟后过期
    const expirationTime = currentTime + expirationTimeInMinutes * 60 * 1000

    localStorage.setItem('authTimestamp', currentTime.toString())
    localStorage.setItem('expirationTime', expirationTime.toString())
    localStorage.setItem('isAuthenticated', 'true')

    error.value = ''
  } else {
    error.value = '密码错误'
  }
}

onMounted(() => {
  checkExpiration() // 立即检查一次
  startExpirationCheck() // 启动定时检查
})

onUnmounted(() => {
  stopExpirationCheck() // 清理定时器
})

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
