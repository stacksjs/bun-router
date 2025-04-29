<script setup lang="ts">
const props = defineProps<{
  title: string
  value: string | number
  icon?: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  trendNegative?: boolean
}>()

const getTrendClass = () => {
  if (!props.trendDirection || props.trendDirection === 'neutral')
    return 'text-gray-500'

  if (props.trendDirection === 'up') {
    return props.trendNegative
      ? 'text-red-500'
      : 'text-green-500'
  }

  return props.trendNegative
    ? 'text-green-500'
    : 'text-red-500'
}

const getTrendIcon = () => {
  if (!props.trendDirection || props.trendDirection === 'neutral')
    return 'i-carbon-circle-dash'

  return props.trendDirection === 'up'
    ? 'i-carbon-arrow-up'
    : 'i-carbon-arrow-down'
}
</script>

<template>
  <div class="bg-white rounded-lg shadow p-5">
    <div class="flex items-center mb-3">
      <span v-if="icon" :class="icon + ' text-indigo-600 text-lg mr-2'" />
      <p class="text-sm font-medium text-gray-500">
        {{ title }}
      </p>
    </div>
    <div class="flex items-baseline">
      <p class="text-2xl font-semibold text-gray-800 mr-2">
        {{ value }}
      </p>
      <div v-if="trend" class="flex items-center text-sm" :class="getTrendClass()">
        <span :class="getTrendIcon() + ' mr-1'" />
        {{ trend }}
      </div>
    </div>
  </div>
</template>
