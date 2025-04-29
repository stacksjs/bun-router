import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface HistoryItem {
  id: string
  method: string
  url: string
  headers: { key: string, value: string }[]
  body?: string
  status?: number
  statusText?: string
  responseTime?: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  timestamp: string
}

export const useHistoryStore = defineStore('history', () => {
  // State
  const history = ref<HistoryItem[]>([])
  const maxHistoryItems = ref(50)

  // Computed
  const hasHistory = computed(() => history.value.length > 0)
  const sortedHistory = computed(() =>
    [...history.value].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
  )

  // Actions
  function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
    const historyItem: HistoryItem = {
      id: `hist_${Date.now()}`,
      ...item,
      timestamp: new Date().toISOString(),
    }

    // Add to the beginning of the array
    history.value.unshift(historyItem)

    // Trim history if it exceeds max items
    if (history.value.length > maxHistoryItems.value) {
      history.value = history.value.slice(0, maxHistoryItems.value)
    }

    return historyItem
  }

  function clearHistory() {
    history.value = []
  }

  function removeHistoryItem(id: string) {
    const index = history.value.findIndex(item => item.id === id)
    if (index !== -1) {
      history.value.splice(index, 1)
      return true
    }
    return false
  }

  function setMaxHistoryItems(max: number) {
    maxHistoryItems.value = max
    // Trim history if it exceeds new max
    if (history.value.length > maxHistoryItems.value) {
      history.value = history.value.slice(0, maxHistoryItems.value)
    }
  }

  // Initialize with some sample data for demonstration
  addToHistory({
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: [{ key: 'Authorization', value: 'Bearer token123' }],
    status: 200,
    statusText: 'OK',
    responseTime: 120,
    responseBody: '{"users": [{"id": 1, "name": "John"}]}',
    responseHeaders: { 'content-type': 'application/json' },
  })

  addToHistory({
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: [
      { key: 'Authorization', value: 'Bearer token123' },
      { key: 'Content-Type', value: 'application/json' },
    ],
    body: '{"name": "Alice", "email": "alice@example.com"}',
    status: 201,
    statusText: 'Created',
    responseTime: 150,
    responseBody: '{"id": 2, "name": "Alice"}',
    responseHeaders: { 'content-type': 'application/json' },
  })

  return {
    history,
    maxHistoryItems,
    hasHistory,
    sortedHistory,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    setMaxHistoryItems,
  }
})
