<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useColorMode } from '@vueuse/core'
import FlipCard from '@/components/FlipCard.vue'
import ShimmerButton from '@/components/ShimmerButton.vue'
import ParticlesBg from '@/components/ParticlesBg.vue'
import Modal from '@/components/Modal.vue'

type Idea = { id: number; title: string; tagline: string; description: string; x: number; y: number }
const ideas = ref<Idea[]>([])
let nextId = 1

function addIdea() {
  editingId.value = null
  draftTitle.value = ''
  draftDescription.value = ''
  isModalOpen.value = true
}

const isDark = computed(() => useColorMode().value == 'dark')

// modal state
const isModalOpen = ref(false)
const editingId = ref<number | null>(null)
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

function saveIdea() {
  const title = draftTitle.value.trim()
  const tagline = draftTagline.value.trim()
  const description = draftDescription.value.trim()
  if (!title) return
  if (editingId.value == null) {
    const centerX = window.innerWidth / 2 - 112 // approx half card width (w-56)
    const centerY = window.scrollY + 160
    ideas.value.push({ id: nextId++, title, tagline, description, x: centerX, y: centerY })
  } else {
    const idx = ideas.value.findIndex((i) => i.id === editingId.value)
    if (idx !== -1) ideas.value[idx] = { ...ideas.value[idx], title, tagline, description } as Idea
  }
  isModalOpen.value = false
}

function deleteIdea() {
  if (editingId.value == null) {
    isModalOpen.value = false
    return
  }
  const idx = ideas.value.findIndex((i) => i.id === editingId.value)
  if (idx !== -1) ideas.value.splice(idx, 1)
  isModalOpen.value = false
}

// drag state
const draggingId = ref<number | null>(null)
let dragOffsetX = 0
let dragOffsetY = 0

function onPointerDown(e: PointerEvent, idea: Idea) {
  draggingId.value = idea.id
  dragOffsetX = e.clientX - idea.x
  dragOffsetY = e.clientY - idea.y
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (draggingId.value == null) return
  const idx = ideas.value.findIndex((i) => i.id === draggingId.value)
  if (idx === -1) return
  const x = e.clientX - dragOffsetX
  const y = e.clientY - dragOffsetY
  ideas.value[idx] = { ...ideas.value[idx], x, y } as Idea
}

function onPointerUp() {
  draggingId.value = null
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="relative min-h-screen">
    <div class="relative z-10 mx-auto max-w-5xl px-6 py-16">
      <div class="mb-8 flex justify-between">
      <h1 class="text-3xl font-semibold tracking-tight">Think</h1>
      <ShimmerButton class="text-white" @click="addIdea">+
        <span class="ml-2">Add card</span>
      </ShimmerButton>
      </div>

      <div class="relative min-h-[60vh]">
        <div
          v-for="idea in ideas"
          :key="idea.id"
          class="absolute select-none"
          :style="{ left: idea.x + 'px', top: idea.y + 'px' }"
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


