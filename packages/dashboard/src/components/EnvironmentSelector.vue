<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useEnvironmentStore } from '../store/environmentStore'

const environmentStore = useEnvironmentStore()
const showDropdown = ref(false)

const currentEnvironment = computed(() => environmentStore.activeEnvironment)
const environments = computed(() => environmentStore.environments)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function closeDropdown() {
  showDropdown.value = false
}

function selectEnvironment(id: string) {
  environmentStore.setActiveEnvironment(id)
  closeDropdown()
}

onMounted(async () => {
  await environmentStore.fetchEnvironments()
})
</script>

<template>
  <div class="environment-selector relative">
    <button
      class="flex items-center px-3 py-1.5 rounded-md bg-white border border-gray-300 text-sm hover:bg-gray-50"
      @click="toggleDropdown"
    >
      <span class="i-carbon-earth text-indigo-600 mr-1.5" />
      <span v-if="currentEnvironment" class="text-gray-700">{{ currentEnvironment.name }}</span>
      <span v-else class="text-gray-500">No Environment</span>
      <span class="i-carbon-chevron-down ml-1.5 text-gray-500 text-xs" />
    </button>

    <div
      v-if="showDropdown"
      class="absolute z-50 top-full left-0 mt-1 w-60 bg-white rounded-md shadow-lg border border-gray-200"
    >
      <div class="p-2 border-b border-gray-200 flex justify-between items-center">
        <span class="text-xs font-medium text-gray-500">ENVIRONMENTS</span>
        <router-link
          to="/settings#environments"
          class="text-xs text-indigo-600 hover:text-indigo-800"
          @click="closeDropdown"
        >
          Manage
        </router-link>
      </div>

      <div v-if="environments.length === 0" class="p-4 text-center text-gray-500 text-sm">
        No environments available
      </div>

      <ul v-else class="max-h-64 overflow-y-auto">
        <li
          v-for="env in environments"
          :key="env.id"
          class="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center"
          :class="{ 'bg-indigo-50': env.isActive }"
          @click="selectEnvironment(env.id)"
        >
          <span
            v-if="env.isActive"
            class="w-2 h-2 bg-green-500 rounded-full mr-2"
          />
          <span
            v-else
            class="w-2 h-2 bg-transparent mr-2"
          />
          <div>
            <div class="text-sm text-gray-800 font-medium">
              {{ env.name }}
            </div>
            <div v-if="env.description" class="text-xs text-gray-500 truncate">
              {{ env.description }}
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.environment-selector {
  position: relative;
}
</style>
