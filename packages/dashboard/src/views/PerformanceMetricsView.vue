<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface PerformanceMetric {
  id: string
  url: string
  timestamp: string
  loadTime: number
  firstContentfulPaint: number
  domInteractive: number
  domComplete: number
  timeToFirstByte: number
  resourcesCount: number
  resourcesSize: number
  jsTime: number
  cssTime: number
  imageTime: number
  otherTime: number
  cacheHitRatio: number
}

const metrics = ref<PerformanceMetric[]>([])
const selectedPeriod = ref('24h')
const showComparisonMode = ref(false)
const isLoading = ref(true)
const filterText = ref('')
const sortBy = ref('timestamp')
const sortDirection = ref('desc')
const chartData = ref({})
const chartType = ref('bar')
const selectedMetrics = ref(['loadTime', 'firstContentfulPaint', 'timeToFirstByte'])

const router = useRouter()
const route = useRoute()

// Get the metric ID from the route if it exists
const metricId = computed(() => route.params.id as string)
const selectedMetric = computed(() =>
  metrics.value.find(m => m.id === metricId.value) || null,
)

// Filtered and sorted metrics
const filteredMetrics = computed(() => {
  return metrics.value
    .filter(m =>
      m.url.toLowerCase().includes(filterText.value.toLowerCase())
      || m.id.toLowerCase().includes(filterText.value.toLowerCase()),
    )
    .sort((a, b) => {
      const aValue = a[sortBy.value as keyof PerformanceMetric]
      const bValue = b[sortBy.value as keyof PerformanceMetric]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection.value === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection.value === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }
      return 0
    })
})

// Load metrics data (simulated)
onMounted(() => {
  setTimeout(() => {
    // Generate some random metrics data
    metrics.value = generateMockPerformanceData(50)
    isLoading.value = false
    updateChartData()
  }, 800)
})

function toggleSort(field: string) {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = field
    sortDirection.value = 'desc'
  }
}

function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function viewMetricDetails(metric: PerformanceMetric) {
  router.push(`/performance/${metric.id}`)
}

function closeMetricDetails() {
  router.push('/performance')
}

function selectPeriod(period: string) {
  selectedPeriod.value = period
  isLoading.value = true

  // Simulate loading data for the new period
  setTimeout(() => {
    metrics.value = generateMockPerformanceData(period === '7d' ? 100 : period === '30d' ? 200 : 50)
    isLoading.value = false
    updateChartData()
  }, 600)
}

function toggleComparisonMode() {
  showComparisonMode.value = !showComparisonMode.value
  updateChartData()
}

function toggleMetric(metric: string) {
  if (selectedMetrics.value.includes(metric)) {
    selectedMetrics.value = selectedMetrics.value.filter(m => m !== metric)
  }
  else {
    selectedMetrics.value.push(metric)
  }
  updateChartData()
}

function updateChartData() {
  // In a real app, this would generate actual chart data
  // Here we're just simulating that with an empty object
  chartData.value = {
    labels: metrics.value.slice(0, 10).map(m => new Date(m.timestamp).toLocaleDateString()),
    datasets: selectedMetrics.value.map(metric => ({
      label: metric,
      data: metrics.value.slice(0, 10).map(m => m[metric as keyof PerformanceMetric]),
    })),
  }
}

function changeChartType(type: string) {
  chartType.value = type
}

function generateMockPerformanceData(count: number): PerformanceMetric[] {
  const data: PerformanceMetric[] = []
  const now = new Date()

  const urls = [
    'https://example.com/',
    'https://example.com/products',
    'https://example.com/about',
    'https://example.com/blog',
    'https://example.com/contact',
    'https://api.example.com/v1/users',
    'https://api.example.com/v1/products',
  ]

  for (let i = 0; i < count; i++) {
    const date = new Date(now)
    date.setHours(date.getHours() - Math.floor(Math.random() * 24 * 7))

    const loadTime = 500 + Math.random() * 2000
    const ttfb = 50 + Math.random() * 200
    const fcp = ttfb + 100 + Math.random() * 300
    const domInteractive = fcp + 50 + Math.random() * 200
    const domComplete = domInteractive + 100 + Math.random() * 500

    const jsTime = Math.random() * 500
    const cssTime = Math.random() * 200
    const imageTime = Math.random() * 800
    const otherTime = Math.random() * 300

    const resourcesCount = 10 + Math.floor(Math.random() * 80)
    const resourcesSize = 100000 + Math.random() * 5000000

    data.push({
      id: `perf-${Date.now().toString(36)}-${i}`,
      url: urls[Math.floor(Math.random() * urls.length)],
      timestamp: date.toISOString(),
      loadTime,
      firstContentfulPaint: fcp,
      domInteractive,
      domComplete,
      timeToFirstByte: ttfb,
      resourcesCount,
      resourcesSize,
      jsTime,
      cssTime,
      imageTime,
      otherTime,
      cacheHitRatio: Math.random(),
    })
  }

  return data
}

// Classes for coloring performance indicators
function getPerformanceClass(value: number, metric: string): string {
  let threshold: { good: number, medium: number } = { good: 0, medium: 0 }

  switch (metric) {
    case 'loadTime':
      threshold = { good: 1000, medium: 2500 }
      break
    case 'firstContentfulPaint':
      threshold = { good: 1000, medium: 2500 }
      break
    case 'timeToFirstByte':
      threshold = { good: 100, medium: 200 }
      break
    case 'domComplete':
      threshold = { good: 2000, medium: 4000 }
      break
    default:
      return 'text-gray-700 dark:text-gray-300'
  }

  if (value <= threshold.good)
    return 'text-green-600 dark:text-green-400'
  if (value <= threshold.medium)
    return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}
</script>

<template>
  <div class="performance-metrics-view">
    <div v-if="selectedMetric" class="metric-detail-view">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">
          Performance Metric Details
        </h1>
        <button class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded" @click="closeMetricDetails">
          Back to List
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            URL
          </h3>
          <p class="font-mono text-sm truncate">
            {{ selectedMetric.url }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Timestamp
          </h3>
          <p>{{ formatTimestamp(selectedMetric.timestamp) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Load Time
          </h3>
          <p class="text-xl font-bold" :class="getPerformanceClass(selectedMetric.loadTime, 'loadTime')">
            {{ formatMs(selectedMetric.loadTime) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            First Contentful Paint
          </h3>
          <p class="text-xl font-bold" :class="getPerformanceClass(selectedMetric.firstContentfulPaint, 'firstContentfulPaint')">
            {{ formatMs(selectedMetric.firstContentfulPaint) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Time to First Byte
          </h3>
          <p class="text-xl font-bold" :class="getPerformanceClass(selectedMetric.timeToFirstByte, 'timeToFirstByte')">
            {{ formatMs(selectedMetric.timeToFirstByte) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            DOM Complete
          </h3>
          <p class="text-xl font-bold" :class="getPerformanceClass(selectedMetric.domComplete, 'domComplete')">
            {{ formatMs(selectedMetric.domComplete) }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="font-bold mb-2">
            Resource Breakdown
          </h3>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                JavaScript
              </h4>
              <p>{{ formatMs(selectedMetric.jsTime) }}</p>
            </div>
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                CSS
              </h4>
              <p>{{ formatMs(selectedMetric.cssTime) }}</p>
            </div>
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                Images
              </h4>
              <p>{{ formatMs(selectedMetric.imageTime) }}</p>
            </div>
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                Other
              </h4>
              <p>{{ formatMs(selectedMetric.otherTime) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 class="font-bold mb-2">
            Resource Stats
          </h3>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                Resources Count
              </h4>
              <p>{{ selectedMetric.resourcesCount }}</p>
            </div>
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                Resources Size
              </h4>
              <p>{{ formatSize(selectedMetric.resourcesSize) }}</p>
            </div>
            <div>
              <h4 class="text-sm text-gray-500 dark:text-gray-400">
                Cache Hit Ratio
              </h4>
              <p>{{ formatPercentage(selectedMetric.cacheHitRatio) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h3 class="font-bold mb-2">
          Performance Timeline
        </h3>
        <div class="h-10 relative w-full bg-gray-200 dark:bg-gray-700 rounded">
          <div
            class="absolute h-full bg-blue-200 dark:bg-blue-900"
            :style="{ width: `${(selectedMetric.timeToFirstByte / selectedMetric.loadTime) * 100}%` }"
          >
            <span class="absolute top-10 text-xs">TTFB</span>
          </div>
          <div
            class="absolute h-full bg-green-200 dark:bg-green-900"
            :style="{ left: `${(selectedMetric.timeToFirstByte / selectedMetric.loadTime) * 100}%`,
                      width: `${((selectedMetric.firstContentfulPaint - selectedMetric.timeToFirstByte) / selectedMetric.loadTime) * 100}%` }"
          >
            <span class="absolute top-10 text-xs">FCP</span>
          </div>
          <div
            class="absolute h-full bg-yellow-200 dark:bg-yellow-900"
            :style="{ left: `${(selectedMetric.firstContentfulPaint / selectedMetric.loadTime) * 100}%`,
                      width: `${((selectedMetric.domInteractive - selectedMetric.firstContentfulPaint) / selectedMetric.loadTime) * 100}%` }"
          >
            <span class="absolute top-10 text-xs">Interactive</span>
          </div>
          <div
            class="absolute h-full bg-red-200 dark:bg-red-900"
            :style="{ left: `${(selectedMetric.domInteractive / selectedMetric.loadTime) * 100}%`,
                      width: `${((selectedMetric.domComplete - selectedMetric.domInteractive) / selectedMetric.loadTime) * 100}%` }"
          >
            <span class="absolute top-10 text-xs">Complete</span>
          </div>
        </div>
        <div class="mt-12 text-xs text-gray-500 flex justify-between">
          <span>0ms</span>
          <span>{{ formatMs(selectedMetric.loadTime) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="metrics-list-view">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 class="text-xl font-bold">
          Performance Metrics
        </h1>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="period in ['24h', '7d', '30d']"
            :key="period"
            class="px-3 py-1 text-sm rounded"
            :class="selectedPeriod === period
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
            @click="selectPeriod(period)"
          >
            {{ period }}
          </button>

          <button
            class="px-3 py-1 text-sm rounded"
            :class="showComparisonMode
              ? 'bg-purple-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
            @click="toggleComparisonMode"
          >
            {{ showComparisonMode ? 'Hide Chart' : 'Show Chart' }}
          </button>
        </div>
      </div>

      <div v-if="showComparisonMode" class="mb-6">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <div class="flex justify-between items-center mb-4">
            <div class="flex gap-2">
              <button
                v-for="type in ['bar', 'line']"
                :key="type"
                class="px-2 py-1 text-xs rounded"
                :class="chartType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'"
                @click="changeChartType(type)"
              >
                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
              </button>
            </div>

            <div class="flex gap-2">
              <button
                v-for="metric in ['loadTime', 'firstContentfulPaint', 'timeToFirstByte', 'domComplete']"
                :key="metric"
                class="px-2 py-1 text-xs rounded"
                :class="selectedMetrics.includes(metric)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'"
                @click="toggleMetric(metric)"
              >
                {{ metric === 'loadTime' ? 'Load Time'
                  : metric === 'firstContentfulPaint' ? 'FCP'
                    : metric === 'timeToFirstByte' ? 'TTFB' : 'DOM Complete' }}
              </button>
            </div>
          </div>

          <div class="h-64 bg-gray-100 dark:bg-gray-900 rounded flex items-center justify-center">
            <p class="text-gray-500 dark:text-gray-400">
              [Chart visualization would be rendered here in a real app]
            </p>
          </div>
        </div>
      </div>

      <div class="flex mb-4">
        <input
          v-model="filterText"
          type="text"
          placeholder="Filter by URL..."
          class="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
        >
      </div>

      <div v-if="isLoading" class="flex items-center justify-center h-40">
        <div class="loader" />
      </div>

      <div v-else-if="filteredMetrics.length === 0" class="bg-gray-100 dark:bg-gray-800 p-8 rounded text-center">
        <p class="text-gray-500 dark:text-gray-400">
          No metrics found matching your criteria
        </p>
      </div>

      <div v-else class="bg-white dark:bg-gray-800 rounded shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  @click="toggleSort('timestamp')"
                >
                  Timestamp
                  <span v-if="sortBy === 'timestamp'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  @click="toggleSort('url')"
                >
                  URL
                  <span v-if="sortBy === 'url'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  @click="toggleSort('loadTime')"
                >
                  Load Time
                  <span v-if="sortBy === 'loadTime'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  @click="toggleSort('firstContentfulPaint')"
                >
                  FCP
                  <span v-if="sortBy === 'firstContentfulPaint'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  @click="toggleSort('timeToFirstByte')"
                >
                  TTFB
                  <span v-if="sortBy === 'timeToFirstByte'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  @click="toggleSort('resourcesCount')"
                >
                  Resources
                  <span v-if="sortBy === 'resourcesCount'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="metric in filteredMetrics"
                :key="metric.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {{ formatTimestamp(metric.timestamp) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                  {{ metric.url }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm" :class="getPerformanceClass(metric.loadTime, 'loadTime')">
                  {{ formatMs(metric.loadTime) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm" :class="getPerformanceClass(metric.firstContentfulPaint, 'firstContentfulPaint')">
                  {{ formatMs(metric.firstContentfulPaint) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm" :class="getPerformanceClass(metric.timeToFirstByte, 'timeToFirstByte')">
                  {{ formatMs(metric.timeToFirstByte) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {{ metric.resourcesCount }} ({{ formatSize(metric.resourcesSize) }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right">
                  <button
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    @click="viewMetricDetails(metric)"
                  >
                    Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #09f;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.performance-metrics-view {
  padding: 1rem;
}

@media (min-width: 768px) {
  .performance-metrics-view {
    padding: 1.5rem;
  }
}
</style>
