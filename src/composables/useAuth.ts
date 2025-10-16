import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const isLoading = ref(true)

// Initialize auth state
supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
  session.value = initialSession
  user.value = initialSession?.user ?? null
  isLoading.value = false
})

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, newSession: Session | null) => {
  session.value = newSession
  user.value = newSession?.user ?? null
  isLoading.value = false
})

export function useAuth() {
  const router = useRouter()
  const isAuthenticated = computed(() => !!user.value)
  
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear local state immediately
      user.value = null
      session.value = null
      
      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  
  return {
    user: computed(() => user.value),
    session: computed(() => session.value),
    isAuthenticated,
    isLoading: computed(() => isLoading.value),
    signOut,
  }
}
