<!-- src/.vitepress/components/PasswordProtect.vue -->
<template>
  <div v-if="!isAuthenticated" class="password-protect">
    <input v-model="password" type="password" placeholder="Enter password" @keyup.enter="verifyPassword" />
    <button @click="verifyPassword">提交</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const password = ref('');
const isAuthenticated = ref(false);
const intervalId = ref(null); // 用于存储定时器的ID

const emit = defineEmits(['authenticated', 'expired']);

const verifyPassword = () => {
  // 这里应该是一个与你的环境变量中设置的密码进行比较的逻辑
  if (password.value === import.meta.env.VITE_SITE_PASSWORD) {
    isAuthenticated.value = true;
    // 存储验证状态和时间戳
    const currentTime = Date.now();
    const expirationTimeInMinutes = 1; // 设置过期时间为60分钟
    const expirationTime = currentTime + expirationTimeInMinutes * 60 * 1000; // 毫秒

    localStorage.setItem('authTimestamp', currentTime.toString());
    localStorage.setItem('expirationTime', expirationTime.toString());
    localStorage.setItem('isAuthenticated', 'true');

    emit('authenticated', true); // 通知父组件密码验证成功
  } else {
    alert('Incorrect password');
  }
};

// 设置定时器，每分钟检查一次认证状态
const startExpirationCheck = () => {
  intervalId.value = setInterval(() => {
    checkExpiration();
  }, 60 * 1000); // 60000毫秒等于1分钟
};

// 清除定时器
const stopExpirationCheck = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
};

const checkExpiration = () => {
  const authTimestamp = localStorage.getItem('authTimestamp');
  const expirationTime = localStorage.getItem('expirationTime');

  if (authTimestamp && expirationTime) {
    const currentTime = Date.now();
    if (currentTime > parseInt(expirationTime, 10)) {
      // 已过期，清除localStorage并重置状态
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authTimestamp');
      localStorage.removeItem('expirationTime');
      isAuthenticated.value = false;
      // 可能还需要通知父组件或执行其他逻辑
      emit('expired', true);
      location.reload();
    } else {
      isAuthenticated.value = true;
    }
  }
};


// 组件加载
onMounted(() => {
  checkExpiration();
  if (isAuthenticated.value) {
    emit('authenticated', true); // 如果用户未过期，通知父组件
  }
  startExpirationCheck(); // 启动定时器
});

onUnmounted(() => {
  stopExpirationCheck(); // 组件卸载时清除定时器
});

</script>

<!--<style scoped>-->
<!--.password-protect {-->
<!--  /* 你的样式 */-->
<!--}-->
<!--</style>-->
<style scoped>
.password-protect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh; /* 使容器占满整个视口高度 */
  width: 100vw; /* 使容器占满整个视口宽度 */
}

input[type="password"] {
  padding: 10px;
  margin: 10px 0;
  width: 300px; /* 你可以根据需要调整宽度 */
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #0056b3;
}

/* 添加一些额外的样式来美化 */
.password-protect::before {
  content: '';
  background-image: url('/images/logo/logo.webp'); /* 可选：添加背景图片 */
  background-size: cover;
  background-position: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1; /* 确保内容在背景之上 */
  opacity: 0.5; /* 可选：调整背景透明度 */
}
</style>
