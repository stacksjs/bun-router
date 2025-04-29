<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface HttpRequest {
  id: string
  method: string
  path: string
  status: number
  time: string
  size: string
  timestamp: string
  ip: string
  userAgent?: string
}

const requests = ref<HttpRequest[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<number | null>(null)
const methodFilter = ref<string | null>(null)

// Filter options
const statusOptions = [
  { label: 'All', value: null },
  { label: '2xx Success', value: 200 },
  { label: '3xx Redirect', value: 300 },
  { label: '4xx Client Error', value: 400 },
  { label: '5xx Server Error', value: 500 }
]

const methodOptions = [
  { label: 'All', value: null },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'OPTIONS', value: 'OPTIONS' },
  { label: 'HEAD', value: 'HEAD' }
]

// Load mock data
onMounted(() => {
  setTimeout(() => {
    requests.value = [
      { id: '1', method: 'GET', path: '/api/users', status: 200, time: '12ms', size: '14.2KB', timestamp: '2023-05-15T14:23:45', ip: '192.168.1.101', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      { id: '2', method: 'POST', path: '/api/auth/login', status: 200, time: '245ms', size: '2.1KB', timestamp: '2023-05-15T14:22:30', ip: '192.168.1.102', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      { id: '3', method: 'GET', path: '/api/products', status: 404, time: '34ms', size: '0.8KB', timestamp: '2023-05-15T14:20:12', ip: '192.168.1.103', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3)' },
      { id: '4', method: 'PUT', path: '/api/users/5', status: 204, time: '89ms', size: '0.5KB', timestamp: '2023-05-15T14:18:45', ip: '192.168.1.104', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
      { id: '5', method: 'DELETE', path: '/api/posts/12', status: 500, time: '120ms', size: '1.7KB', timestamp: '2023-05-15T14:15:23', ip: '192.168.1.105', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      { id: '6', method: 'GET', path: '/api/comments?post=12', status: 200, time: '56ms', size: '8.3KB', timestamp: '2023-05-15T14:10:18', ip: '192.168.1.106', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      { id: '7', method: 'POST', path: '/api/comments', status: 201, time: '78ms', size: '1.2KB', timestamp: '2023-05-15T14:08:52', ip: '192.168.1.107', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      { id: '8', method: 'PATCH', path: '/api/profiles/3', status: 403, time: '45ms', size: '0.6KB', timestamp: '2023-05-15T14:05:39', ip: '192.168.1.108', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3)' },
      { id: '9', method: 'GET', path: '/api/settings', status: 304, time: '22ms', size: '0.3KB', timestamp: '2023-05-15T14:03:21', ip: '192.168.1.109', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
      { id: '10', method: 'OPTIONS', path: '/api/users', status: 204, time: '18ms', size: '0.2KB', timestamp: '2023-05-15T14:01:45', ip: '192.168.1.110', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    ]
    isLoading.value = false
  }, 800)
})

// Computed filtered requests
const filteredRequests = computed(() => {
  return requests.value.filter(request => {
    // Filter by search query
    const matchesQuery = searchQuery.value === '' ||
      request.path.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      request.ip.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (request.userAgent && request.userAgent.toLowerCase().includes(searchQuery.value.toLowerCase()))

    // Filter by status
    const matchesStatus = statusFilter.value === null ||
      (request.status >= statusFilter.value && request.status < statusFilter.value + 100)

    // Filter by method
    const matchesMethod = methodFilter.value === null ||
      request.method === methodFilter.value

    return matchesQuery && matchesStatus && matchesMethod
  })
})

const getStatusClass = (status: number) => {
  if (status >= 200 && status < 300) return 'text-green-600'
  if (status >= 300 && status < 400) return 'text-blue-600'
  if (status >= 400 && status < 500) return 'text-orange-600'
  if (status >= 500) return 'text-red-600'
  return 'text-gray-600'
}

const getMethodClass = (method: string) => {
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
</script>

<template>
  <div class="requests-view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">HTTP Requests</h1>
      <button class="btn-primary px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
        Capture New
      </button>
    </div>

    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            id="search"
            v-model="searchQuery"
            placeholder="Search by path, IP, or user agent..."
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">Status Code</label>
          <select
            id="status-filter"
            v-model="statusFilter"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option v-for="option in statusOptions" :key="option.label" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div>
          <label for="method-filter" class="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
          <select
            id="method-filter"
            v-model="methodFilter"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option v-for="option in methodOptions" :key="option.label" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p class="mt-2 text-gray-600">Loading requests...</p>
      </div>

      <div v-else-if="filteredRequests.length === 0" class="p-8 text-center">
        <p class="text-gray-600">No requests found matching your filters.</p>
      </div>

      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="request in filteredRequests" :key="request.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${getMethodClass(request.method)}`">
                {{ request.method }}
              </span>
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
              {{ request.time }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.size }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ request.ip }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(request.timestamp).toLocaleString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <router-link :to="`/requests/${request.id}`" class="text-indigo-600 hover:text-indigo-900">
                Details
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="px-6 py-4 flex items-center justify-between border-t">
        <div class="text-sm text-gray-500">
          Showing <span class="font-medium">{{ filteredRequests.length }}</span> of <span class="font-medium">{{ requests.length }}</span> requests
        </div>
        <div class="flex space-x-2">
          <button class="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
            Previous
          </button>
          <button class="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>