<script setup lang="ts">
import { computed, ref } from 'vue'
import { useColorMode, useScroll } from '@vueuse/core'
import ParticlesBg from '@/components/ParticlesBg.vue'
import ShimmerButton from '@/components/ShimmerButton.vue'

const isDark = computed(() => useColorMode().value == 'dark')
const scrollerRef = ref<HTMLDivElement | null>(null)
const { y } = useScroll(scrollerRef)
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
const fadeProgress = computed(() => {
  const distance = 320
  const raw = Math.min(Math.max(y.value / distance, 0), 1)
  return easeOutCubic(raw)
})
</script>

<template>
  <div ref="scrollerRef" class="relative h-screen w-full overflow-y-auto scroll-smooth snap-y snap-mandatory bg-background">
    <!-- Section 1: Explore -->
    <section class="relative z-10 flex min-h-screen snap-start items-center justify-center px-6">
      <span
        class="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10 will-change-[opacity,transform]"
        :style="{
          opacity: String(1 - fadeProgress),
          transform: `translateY(${fadeProgress * -24}px) scale(${1 - fadeProgress * 0.05})`,
        }"
      >
        Explore.
      </span>
    </section>

    <!-- Section 2: Start now -->
    <section class="relative z-10 flex min-h-screen snap-start items-center justify-center px-6">
      <RouterLink to="/think">
        <ShimmerButton class="text-white text-base md:text-lg px-8 py-4">Start now</ShimmerButton>
      </RouterLink>
    </section>
    <ParticlesBg class="fixed inset-0 z-0 pointer-events-none" :quantity="100" :ease="100" :color="isDark ? '#FFF' : '#000'" :staticity="10" />
  </div>
</template>


