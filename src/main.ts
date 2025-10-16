import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import Think from './pages/Think.vue'
import { useAuth } from './composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: () => import('./pages/Login.vue') },
    { path: '/think', component: Think, meta: { requiresAuth: true } },
  ],
})

const app = createApp(App)

// Auth guard
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()
  
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else {
    next()
  }
})

app.use(router).mount('#app')
