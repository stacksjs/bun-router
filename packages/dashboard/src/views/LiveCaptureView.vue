<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface CapturedRequest {
  id: string
  method: string
  path: string
  status: number
  time: string
  size: string
  timestamp: string
  host: string
}

const isCapturing = ref(false)
const captureUrl = ref('http://localhost:3000')
const captureMethod = ref('ANY')
const capturePathFilter = ref('')
const capturedRequests = ref<CapturedRequest[]>([])
const maxRequests = ref(50)
const connectionStatus = ref('disconnected')
const showSettingsPanel = ref(false)

// Available methods for filtering
const availableMethods = [
  { label: 'ANY', value: 'ANY' },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'OPTIONS', value: 'OPTIONS' },
  { label: 'HEAD', value: 'HEAD' },
]

// Mock data updates with timer
let captureTimer: number | null = null

onMounted(() => {
  // Initial data
  capturedRequests.value = []
})

onUnmounted(() => {
  stopCapturing()
})

function startCapturing() {
  if (isCapturing.value)
    return

  isCapturing.value = true
  connectionStatus.value = 'connecting'

  // Simulate connection delay
  setTimeout(() => {
    connectionStatus.value = 'connected'

    // Simulate incoming requests every few seconds
    captureTimer = window.setInterval(() => {
      if (capturedRequests.value.length >= maxRequests.value) {
        capturedRequests.value.pop() // Remove oldest
      }

      const randomMethod = availableMethods[Math.floor(Math.random() * (availableMethods.length - 1)) + 1].value
      const randomPaths = [
        '/api/users',
        '/api/products',
        '/api/orders',
        '/api/auth/login',
        '/api/profile',
        '/api/settings',
        '/api/notifications',
        '/api/search',
      ]
      const randomPath = randomPaths[Math.floor(Math.random() * randomPaths.length)]
      const randomStatus = [200, 201, 301, 302, 400, 401, 404, 500][Math.floor(Math.random() * 8)]
      const randomTime = `${Math.floor(Math.random() * 500)}ms`
      const randomSize = `${(Math.random() * 15).toFixed(1)}KB`

      // Skip if method filter is active and doesn't match
      if (captureMethod.value !== 'ANY' && captureMethod.value !== randomMethod) {
        return
      }

      // Skip if path filter is active and doesn't match
      if (capturePathFilter.value && !randomPath.includes(capturePathFilter.value)) {
        return
      }

      // Add to beginning of array
      capturedRequests.value.unshift({
        id: Date.now().toString(),
        method: randomMethod,
        path: randomPath,
        status: randomStatus,
        time: randomTime,
        size: randomSize,
        timestamp: new Date().toISOString(),
        host: new URL(captureUrl.value).host,
      })
    }, 2000)
  }, 1500)
}

function stopCapturing() {
  isCapturing.value = false
  connectionStatus.value = 'disconnected'

  if (captureTimer) {
    clearInterval(captureTimer)
    captureTimer = null
  }
}

function toggleCapturing() {
  if (isCapturing.value) {
    stopCapturing()
  }
  else {
    startCapturing()
  }
}

function clearCapture() {
  capturedRequests.value = []
}

function toggleSettingsPanel() {
  showSettingsPanel.value = !showSettingsPanel.value
}

function getStatusClass(status: number) {
  if (status >= 200 && status < 300)
    return 'text-green-600'
  if (status >= 300 && status < 400)
    return 'text-blue-600'
  if (status >= 400 && status < 500)
    return 'text-orange-600'
  if (status >= 500)
    return 'text-red-600'
  return 'text-gray-600'
}

function getMethodClass(method: string) {
  switch (method) {
    case 'GET': return 'bg-blue-100 text-blue-800'
    case 'POST': return 'bg-green-100 text-green-800'
    case 'PUT': return 'bg-yellow-100 text-yellow-800'
    case 'PATCH': return 'bg-indigo-100 text-indigo-800'
    case 'DELETE': return 'bg-red-100 text-red-800'
    case 'OPTIONS': return 'bg-purple-100 text-purple-800'
    case 'HEAD': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getConnectionStatusClass() {
  switch (connectionStatus.value) {
    case 'connected': return 'bg-green-500'
    case 'connecting': return 'bg-yellow-500'
    case 'disconnected': return 'bg-gray-400'
    case 'error': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}
</script>

<template>
  <div class="live-capture-view">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center">
        <h1 class="text-2xl font-bold mr-4">
          Live HTTP Capture
        </h1>
        <div class="flex items-center">
          <div :class="`inline-block w-3 h-3 rounded-full mr-2 ${getConnectionStatusClass()}`" />
          <span class="text-sm text-gray-600 capitalize">{{ connectionStatus }}</span>
        </div>
      </div>

      <div class="flex space-x-3">
        <button
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          @click="toggleSettingsPanel"
        >
          <span class="i-carbon-settings mr-2" />
          Settings
        </button>

        <button
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          :disabled="capturedRequests.length === 0"
          @click="clearCapture"
        >
          <span class="i-carbon-trash-can mr-2" />
          Clear
        </button>

        <button
          class="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50" :class="[
            isCapturing
              ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
          ]"
          @click="toggleCapturing"
        >
          <span :class="[isCapturing ? 'i-carbon-pause mr-2' : 'i-carbon-play mr-2']" />
          {{ isCapturing ? 'Stop Capture' : 'Start Capture' }}
        </button>
      </div>
    </div>

    <!-- Settings Panel (Collapsible) -->
    <div v-if="showSettingsPanel" class="bg-white rounded-lg shadow p-4 mb-6">
      <h2 class="text-lg font-medium mb-4">
        Capture Settings
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label for="capture-url" class="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
          <input
            id="capture-url"
            v-model="captureUrl"
            type="url"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="http://localhost:3000"
          >
        </div>

        <div>
          <label for="capture-method" class="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
          <select
            id="capture-method"
            v-model="captureMethod"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option v-for="method in availableMethods" :key="method.value" :value="method.value">
              {{ method.label }}
            </option>
          </select>
        </div>

        <div>
          <label for="path-filter" class="block text-sm font-medium text-gray-700 mb-1">Path Filter</label>
          <input
            id="path-filter"
            v-model="capturePathFilter"
            type="text"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Filter by path (e.g. /api)"
          >
        </div>

        <div>
          <label for="max-requests" class="block text-sm font-medium text-gray-700 mb-1">Max Requests</label>
          <input
            id="max-requests"
            v-model="maxRequests"
            type="number"
            min="10"
            max="500"
            step="10"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
        </div>
      </div>
    </div>

    <!-- Requests Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="capturedRequests.length === 0" class="p-8 text-center">
        <div class="flex justify-center mb-4">
          <span class="i-carbon-network-4 text-6xl text-gray-300" />
        </div>
        <p class="text-gray-600 mb-2">
          No requests captured yet.
        </p>
        <p class="text-gray-500 text-sm">
          {{ isCapturing ? 'Waiting for incoming requests...' : 'Click "Start Capture" to begin monitoring HTTP requests.' }}
        </p>
      </div>

      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Method
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Host
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Path
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="request in capturedRequests" :key="request.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(request.timestamp).toLocaleTimeString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${getMethodClass(request.method)}`">
                {{ request.method }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ request.host }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
              {{ request.path }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span :class="`font-medium ${getStatusClass(request.status)}`">
                {{ request.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.size }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.time }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <router-link :to="`/requests/${request.id}`" class="text-indigo-600 hover:text-indigo-900">
                Details
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Connection Instructions -->
    <div class="mt-6 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
      <h3 class="text-lg font-medium text-indigo-800 mb-2">
        How to Connect
      </h3>
      <p class="text-indigo-700 mb-3">
        To capture HTTP requests from your application, add the HTTP Interceptor to your project:
      </p>
      <div class="bg-indigo-800 text-indigo-100 p-3 rounded-md font-mono text-sm overflow-x-auto">
        <code>npm install @http-analyzer/interceptor</code>
      </div>
      <div class="mt-3">
        <p class="text-indigo-700 mb-2">
          Then initialize it in your application:
        </p>
        <div class="bg-indigo-800 text-indigo-100 p-3 rounded-md font-mono text-sm overflow-x-auto">
          <code>import { HttpInterceptor } from '@http-analyzer/interceptor';<br>
            <br>
            // Connect to this dashboard<br>
            const interceptor = new HttpInterceptor({<br>
            &nbsp;&nbsp;target: '{{ captureUrl }}',<br>
            &nbsp;&nbsp;appName: 'My Application'<br>
            });<br>
            <br>
            // Start intercepting<br>
            interceptor.start();</code>
        </div>
      </div>
    </div>
  </div>
</template>
