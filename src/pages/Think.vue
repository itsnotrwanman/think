<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useColorMode } from '@vueuse/core'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/lib/supabase'
import FlipCard from '@/components/FlipCard.vue'
import ShimmerButton from '@/components/ShimmerButton.vue'
import ParticlesBg from '@/components/ParticlesBg.vue'
import Modal from '@/components/Modal.vue'

type Idea = { id: string; title: string; tagline: string; description: string; x: number; y: number }
const ideas = ref<Idea[]>([])
const isLoading = ref(true)
const boardRef = ref<HTMLDivElement | null>(null)

function addIdea() {
  editingId.value = null
  draftTitle.value = ''
  draftDescription.value = ''
  isModalOpen.value = true
}

const isDark = computed(() => useColorMode().value == 'dark')
const { user, signOut } = useAuth()

// modal state
const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const draftTitle = ref('')
const draftDescription = ref('')
const draftTagline = ref('')

function openEdit(idea: Idea) {
  editingId.value = idea.id
  draftTitle.value = idea.title
  draftTagline.value = idea.tagline
  draftDescription.value = idea.description
  isModalOpen.value = true
}

async function saveIdea() {
  const title = draftTitle.value.trim()
  const tagline = draftTagline.value.trim()
  const description = draftDescription.value.trim()
  if (!title || !user.value) return
  
  try {
    if (editingId.value == null) {
      // Create new idea at container center
      const rect = boardRef.value?.getBoundingClientRect()
      const centerX = Math.round(rect ? rect.width / 2 - 112 : window.innerWidth / 2 - 112)
      const centerY = Math.round(rect ? rect.height / 2 - 160 : window.scrollY + 160)
      
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          title,
          tagline,
          description,
          x: centerX,
          y: centerY,
          user_id: user.value.id
        })
        .select()
        .single()
      
      if (error) throw error
      const created: Idea = {
        id: String((data as any).id),
        title: (data as any).title ?? title,
        tagline: (data as any).tagline ?? tagline,
        description: (data as any).description ?? description,
        x: Number((data as any).x ?? centerX),
        y: Number((data as any).y ?? centerY),
      }
      ideas.value.push(created)
    } else {
      // Update existing idea
      const { error } = await supabase
        .from('ideas')
        .update({ title, tagline, description })
        .eq('id', editingId.value)
      
      if (error) throw error
      
      const idx = ideas.value.findIndex((i) => i.id === editingId.value)
      if (idx !== -1) {
        ideas.value[idx] = { ...ideas.value[idx], title, tagline, description } as Idea
      }
    }
    isModalOpen.value = false
  } catch (error) {
    console.error('Error saving idea:', error)
  }
}

async function deleteIdea() {
  if (editingId.value == null) {
    isModalOpen.value = false
    return
  }
  
  try {
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', editingId.value)
    
    if (error) throw error
    
    const idx = ideas.value.findIndex((i) => i.id === editingId.value)
    if (idx !== -1) ideas.value.splice(idx, 1)
    isModalOpen.value = false
  } catch (error) {
    console.error('Error deleting idea:', error)
  }
}

// drag state
const draggingId = ref<string | null>(null)
let dragOffsetX = 0
let dragOffsetY = 0
let savePositionTimer: number | null = null

function onPointerDown(e: PointerEvent, idea: Idea) {
  draggingId.value = idea.id
  const rect = boardRef.value?.getBoundingClientRect()
  const left = rect?.left ?? 0
  const top = rect?.top ?? 0
  dragOffsetX = e.clientX - left - idea.x
  dragOffsetY = e.clientY - top - idea.y
  console.log('Drag start:', { ideaId: idea.id, x: idea.x, y: idea.y, containerRect: rect })
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (draggingId.value == null) return
  const idx = ideas.value.findIndex((i) => i.id === draggingId.value)
  if (idx === -1) return
  const rect = boardRef.value?.getBoundingClientRect()
  const left = rect?.left ?? 0
  const top = rect?.top ?? 0
  const x = Math.round(e.clientX - left - dragOffsetX)
  const y = Math.round(e.clientY - top - dragOffsetY)
  ideas.value[idx] = { ...ideas.value[idx], x, y } as Idea

  // Debounced background save while dragging
  if (savePositionTimer) window.clearTimeout(savePositionTimer)
  savePositionTimer = window.setTimeout(async () => {
    const idea = ideas.value[idx]
    if (!idea) return
    try {
      await supabase
        .from('ideas')
        .update({ x: idea.x, y: idea.y })
        .eq('id', idea.id)
    } catch (error) {
      console.error('Error autosaving position:', error)
    }
  }, 300)
}

async function onPointerUp() {
  if (draggingId.value) {
    // Save position to database
    const idea = ideas.value.find(i => i.id === draggingId.value)
    if (idea) {
      console.log('Saving position:', { ideaId: idea.id, x: idea.x, y: idea.y })
      try {
        const { data, error } = await supabase
          .from('ideas')
          .update({ x: idea.x, y: idea.y })
          .eq('id', idea.id)
          .select()
          .single()
        if (error) throw error
        console.log('Position saved to DB:', data)
        // Ensure local state mirrors DB
        const idx = ideas.value.findIndex(i => i.id === idea.id)
        if (idx !== -1 && data) {
          ideas.value[idx] = {
            ...ideas.value[idx],
            x: Number((data as any).x ?? idea.x),
            y: Number((data as any).y ?? idea.y),
          } as Idea
        }
      } catch (error) {
        console.error('Error saving position:', error)
      }
    }
  }
  draggingId.value = null
  if (savePositionTimer) {
    window.clearTimeout(savePositionTimer)
    savePositionTimer = null
  }
}

async function loadIdeas() {
  if (!user.value) return
  
  try {
    isLoading.value = true
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    // Coerce positions to numbers and provide sane defaults
    const rect = boardRef.value?.getBoundingClientRect()
    const fallbackX = Math.round(Math.max(16, (rect ? rect.width : window.innerWidth) / 2 - 112))
    const fallbackY = Math.round(rect ? rect.height / 2 - 160 : window.scrollY + 160)
    console.log('Loading ideas:', { 
      dataCount: data?.length, 
      containerRect: rect, 
      fallbackX, 
      fallbackY 
    })
    ideas.value = (data || []).map((row: any) => {
      const x = Math.round(typeof row.x === 'number' ? row.x : Number(row.x ?? fallbackX))
      const y = Math.round(typeof row.y === 'number' ? row.y : Number(row.y ?? fallbackY))
      console.log('Loading idea:', { id: row.id, savedX: row.x, savedY: row.y, finalX: x, finalY: y })
      return {
        id: String(row.id),
        title: row.title ?? '',
        tagline: row.tagline ?? '',
        description: row.description ?? '',
        x,
        y,
      }
    })
  } catch (error) {
    console.error('Error loading ideas:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  // Persist if the user leaves while dragging
  const persistIfDragging = () => { if (draggingId.value) onPointerUp() }
  window.addEventListener('visibilitychange', persistIfDragging)
  window.addEventListener('beforeunload', persistIfDragging)
  await loadIdeas()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('visibilitychange', () => {})
  window.removeEventListener('beforeunload', () => {})
})

// Load ideas whenever the authenticated user changes (e.g., after login)
watch(user, async (u) => {
  if (u) {
    await loadIdeas()
  } else {
    ideas.value = []
  }
}, { immediate: true })
</script>

<template>
  <div class="relative min-h-screen">
    <div class="relative z-10 mx-auto max-w-5xl px-6 py-16">
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">Think</h1>
          <p class="text-sm text-muted-foreground">{{ user?.email }}</p>
        </div>
        <div class="flex gap-2">
          <ShimmerButton class="text-white" @click="addIdea">+
            <span class="ml-2">Add card</span>
          </ShimmerButton>
          <button
            @click="signOut"
            class="rounded-md border border-border bg-transparent px-4 py-2 text-sm hover:bg-accent"
          >
            Sign out
          </button>
        </div>
      </div>

      <div ref="boardRef" class="relative min-h-[60vh]" @pointerup.stop="onPointerUp" @pointercancel.stop="onPointerUp">
        <div v-if="isLoading" class="flex items-center justify-center h-64">
          <div class="text-muted-foreground">Loading your ideas...</div>
        </div>
        <div v-else-if="ideas.length === 0" class="flex items-center justify-center h-64">
          <div class="text-center text-muted-foreground">
            <p class="text-lg mb-2">No ideas yet</p>
            <p class="text-sm">Click "Add card" to create your first idea</p>
          </div>
        </div>
        <div
          v-else
          v-for="idea in ideas"
          :key="idea.id"
          class="absolute select-none"
          :style="{ transform: `translate(${idea.x}px, ${idea.y}px)` }"
          @pointerdown.stop.prevent="onPointerDown($event, idea)"
          @dblclick.stop="openEdit(idea)"
        >
          <FlipCard class="relative">
            <template #default>
              <div class="card-surface flex h-full flex-col items-start justify-between p-4">
                <div class="w-full space-y-1">
                  <div class="text-lg font-semibold leading-tight">{{ idea.title || 'Untitled idea' }}</div>
                  <div class="text-sm text-muted-foreground leading-snug">{{ idea.tagline }}</div>
                </div>
              </div>
            </template>
            <template #back>
              <div class="card-surface h-full w-full whitespace-pre-wrap p-4">{{ idea.description }}</div>
            </template>
          </FlipCard>
        </div>
      </div>
    </div>
    <Modal :open="isModalOpen" title="Idea" @close="isModalOpen = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-muted-foreground">Idea name</label>
          <input v-model="draftTitle" class="w-full rounded-md border bg-transparent px-3 py-2 outline-none" placeholder="My idea" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-muted-foreground">Tagline</label>
          <input v-model="draftTagline" class="w-full rounded-md border bg-transparent px-3 py-2 outline-none" placeholder="A short sentence" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-muted-foreground">Description</label>
          <textarea v-model="draftDescription" rows="4" class="w-full rounded-md border bg-transparent px-3 py-2 outline-none" placeholder="Describe your idea" />
        </div>
      </div>
      <template #footer>
        <div class="flex w-full items-center justify-between gap-2">
          <button
            v-if="editingId !== null"
            class="rounded-md bg-red-600/80 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500/90"
            @click="deleteIdea"
          >
            Delete
          </button>
          <div class="ml-auto flex gap-2">
            <button class="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="isModalOpen = false">Cancel</button>
            <ShimmerButton class="text-white" @click="saveIdea">Save</ShimmerButton>
          </div>
        </div>
      </template>
    </Modal>
    <ParticlesBg class="fixed inset-0 z-0 pointer-events-none" :quantity="100" :ease="100" :color="isDark ? '#FFF' : '#000'" :staticity="10" />
  </div>
</template>


