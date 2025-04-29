import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface HistoryItem {
  id: string
  method: string
  url: string
  path: string
  status: number
  timestamp: string
  duration: number
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: string
  responseBody?: string
  queryParams: Record<string, string>
  error?: string
  tags?: string[]
}

export const useHistoryStore = defineStore('history', () => {
  // State
  const history = ref<HistoryItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedAt = ref<Date | null>(null)

  // Computed
  const hasHistory = computed(() => history.value.length > 0)

  // Methods to index items for full-text search
  function getSearchableText(item: HistoryItem): string {
    return [
      item.method,
      item.url,
      item.path,
      item.status.toString(),
      new Date(item.timestamp).toLocaleString(),
      item.duration?.toString() || '',
      Object.entries(item.requestHeaders || {}).map(([key, value]) => `${key}:${value}`).join(' '),
      Object.entries(item.responseHeaders || {}).map(([key, value]) => `${key}:${value}`).join(' '),
      item.requestBody || '',
      item.responseBody || '',
      Object.entries(item.queryParams || {}).map(([key, value]) => `${key}=${value}`).join('&'),
      item.error || '',
      (item.tags || []).join(' ')
    ].join(' ').toLowerCase()
  }

  // Check if data needs refresh (older than 5 minutes)
  const needsRefresh = (lastFetchTime: Date | null) => {
    if (!lastFetchTime) return true
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return lastFetchTime < fiveMinutesAgo
  }

  // Actions
  async function fetchHistory(forceRefresh = false) {
    if (!forceRefresh && hasHistory.value && !needsRefresh(lastFetchedAt.value)) {
      return history.value
    }

    isLoading.value = true
    error.value = null

    try {
      // In a real app, this would be an API call
      // const response = await axios.get('/api/history')
      // history.value = response.data

      // Mock data for demo
      await new Promise(resolve => setTimeout(resolve, 800))

      // Generate random history data
      const mockHistory: HistoryItem[] = []

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      const statuses = [200, 201, 204, 400, 401, 403, 404, 500]
      const paths = [
        '/api/users',
        '/api/products',
        '/api/orders',
        '/api/cart',
        '/api/checkout',
        '/api/auth/login',
        '/api/auth/register',
        '/api/profile',
        '/api/settings',
        '/api/analytics'
      ]

      // Generate a set of domains
      const domains = [
        'api.example.com',
        'api.myapp.io',
        'dev-api.service.org',
        'localhost:3000',
        'api.staging.app'
      ]

      // Generate different content types
      const contentTypes = [
        'application/json',
        'application/xml',
        'text/html',
        'text/plain',
        'application/octet-stream'
      ]

      const randomTags = [
        'auth', 'user', 'product', 'order', 'payment',
        'error', 'success', 'important', 'debug', 'test',
        'production', 'staging', 'development'
      ]

      // Generate 100 random history items
      for (let i = 0; i < 100; i++) {
        const method = methods[Math.floor(Math.random() * methods.length)]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const path = paths[Math.floor(Math.random() * paths.length)]
        const domain = domains[Math.floor(Math.random() * domains.length)]
        const url = `https://${domain}${path}`

        // Create random date in the last 30 days
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * 30))

        // Generate random query params for some requests
        const queryParams: Record<string, string> = {}
        if (Math.random() > 0.5) {
          if (path.includes('users')) {
            queryParams.page = Math.floor(Math.random() * 10).toString()
            queryParams.limit = (10 * Math.floor(Math.random() * 5) + 10).toString()
          } else if (path.includes('products')) {
            queryParams.category = ['electronics', 'clothing', 'home', 'books'][Math.floor(Math.random() * 4)]
            queryParams.sort = ['price', 'name', 'date'][Math.floor(Math.random() * 3)]
          } else if (path.includes('orders')) {
            queryParams.status = ['pending', 'completed', 'canceled'][Math.floor(Math.random() * 3)]
          }
        }

        // Request headers
        const requestHeaders: Record<string, string> = {
          'Content-Type': contentTypes[Math.floor(Math.random() * contentTypes.length)]
        }

        if (path.includes('auth') || Math.random() > 0.7) {
          requestHeaders['Authorization'] = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }

        if (Math.random() > 0.8) {
          requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        // Response headers
        const responseHeaders: Record<string, string> = {
          'Content-Type': contentTypes[Math.floor(Math.random() * contentTypes.length)],
          'Cache-Control': 'no-cache',
          'X-Request-Id': `req-${Math.random().toString(36).substring(2, 10)}`
        }

        // Request and response bodies
        let requestBody: string | undefined
        let responseBody: string | undefined

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          if (path.includes('users')) {
            requestBody = JSON.stringify({
              name: 'John Doe',
              email: 'john@example.com',
              role: 'user'
            }, null, 2)
          } else if (path.includes('products')) {
            requestBody = JSON.stringify({
              name: 'Product Name',
              price: Math.floor(Math.random() * 100) + 1,
              description: 'Product description here'
            }, null, 2)
          } else if (path.includes('auth')) {
            requestBody = JSON.stringify({
              email: 'user@example.com',
              password: 'password123'
            }, null, 2)
          }
        }

        if (status >= 200 && status < 300) {
          if (path.includes('users')) {
            responseBody = JSON.stringify({
              id: Math.floor(Math.random() * 1000) + 1,
              name: 'John Doe',
              email: 'john@example.com',
              role: 'user',
              createdAt: new Date().toISOString()
            }, null, 2)
          } else if (path.includes('products')) {
            responseBody = JSON.stringify({
              id: Math.floor(Math.random() * 1000) + 1,
              name: 'Product Name',
              price: Math.floor(Math.random() * 100) + 1,
              description: 'Product description here',
              inStock: Math.random() > 0.3
            }, null, 2)
          } else if (path.includes('auth/login')) {
            responseBody = JSON.stringify({
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              user: {
                id: Math.floor(Math.random() * 1000) + 1,
                name: 'John Doe',
                email: 'john@example.com'
              }
            }, null, 2)
          }
        } else {
          responseBody = JSON.stringify({
            error: 'Error message',
            code: status,
            message: `An error occurred while processing your request to ${path}`
          }, null, 2)
        }

        // Error message for error responses
        let errorMessage
        if (status >= 400) {
          const errorMessages = [
            'Invalid request parameters',
            'Authentication required',
            'Permission denied',
            'Resource not found',
            'Internal server error'
          ]
          errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)]
        }

        // Random tags
        let tags: string[] = []
        if (Math.random() > 0.7) {
          const numTags = Math.floor(Math.random() * 3) + 1
          for (let j = 0; j < numTags; j++) {
            const tag = randomTags[Math.floor(Math.random() * randomTags.length)]
            if (!tags.includes(tag)) {
              tags.push(tag)
            }
          }
        }

        // Create history item
        mockHistory.push({
          id: `req_${i}_${Math.random().toString(36).substring(2, 10)}`,
          method,
          url,
          path,
          status,
          timestamp: date.toISOString(),
          duration: Math.floor(Math.random() * 1000) + 20, // duration in ms
          requestHeaders,
          responseHeaders,
          requestBody,
          responseBody,
          queryParams,
          error: errorMessage,
          tags
        })
      }

      // Sort by timestamp descending (newest first)
      mockHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      history.value = mockHistory
      lastFetchedAt.value = new Date()
      return history.value
    } catch (err) {
      error.value = 'Failed to load request history'
      console.error('Error fetching history:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Full-text search implementation
  function searchHistory(query: string) {
    if (!query.trim()) {
      return history.value
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)

    return history.value.filter(item => {
      const searchableText = getSearchableText(item)
      return searchTerms.every(term => searchableText.includes(term))
    })
  }

  // Delete history item
  function deleteHistoryItem(id: string) {
    const index = history.value.findIndex(item => item.id === id)
    if (index !== -1) {
      history.value.splice(index, 1)
    }
  }

  // Clear all history
  function clearHistory() {
    history.value = []
  }

  // Add tags to history item
  function addTagToHistoryItem(id: string, tag: string) {
    const item = history.value.find(item => item.id === id)
    if (item) {
      if (!item.tags) {
        item.tags = []
      }
      if (!item.tags.includes(tag)) {
        item.tags.push(tag)
      }
    }
  }

  // Remove tag from history item
  function removeTagFromHistoryItem(id: string, tag: string) {
    const item = history.value.find(item => item.id === id)
    if (item && item.tags) {
      item.tags = item.tags.filter(t => t !== tag)
    }
  }

  return {
    history,
    isLoading,
    error,
    hasHistory,
    fetchHistory,
    searchHistory,
    deleteHistoryItem,
    clearHistory,
    addTagToHistoryItem,
    removeTagFromHistoryItem
  }
})