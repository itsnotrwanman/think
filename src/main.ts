import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import Think from './pages/Think.vue'
import { supabase } from './lib/supabase'

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
router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      next('/login')
      return
    }
  }
  next()
})

app.use(router).mount('#app')
