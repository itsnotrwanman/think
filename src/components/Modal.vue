<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
      <div
        class="card-surface relative z-10 w-full max-w-lg p-6 transition-all duration-300 ease-out"
      >
        <header class="mb-6 flex items-center justify-between">
          <h3 class="text-xl font-semibold tracking-tight">{{ title }}</h3>
          <button
            class="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-white/10 hover:text-foreground"
            @click="$emit('close')"
          >✕</button>
        </header>
        <div class="space-y-4">
          <slot />
        </div>
        <footer class="mt-6 flex justify-end gap-2">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </teleport>
  
</template>

<script setup lang="ts">
type Props = { open: boolean; title?: string }
withDefaults(defineProps<Props>(), { title: '' })
defineEmits<{ (e: 'close'): void }>()
</script>


