import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface RequestItem {
  id: string
  name: string
  method: string
  url: string
  headers: { key: string, value: string }[]
  body?: string
  description?: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  requests: RequestItem[]
  createdAt: string
  updatedAt: string
}

export const useCollectionStore = defineStore('collection', () => {
  // State
  const collections = ref<Collection[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasCollections = computed(() => collections.value.length > 0)

  // Find a request by ID across all collections
  const findRequestById = computed(() => (requestId: string) => {
    for (const collection of collections.value) {
      const request = collection.requests.find(req => req.id === requestId)
      if (request) {
        return { request, collectionId: collection.id }
      }
    }
    return null
  })

  // Actions
  async function fetchCollections() {
    if (hasCollections.value) {
      return collections.value
    }

    isLoading.value = true
    error.value = null

    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock data for demonstration
      collections.value = [
        {
          id: 'col_1',
          name: 'API Tests',
          description: 'Common API endpoints for testing',
          requests: [
            {
              id: 'req_1',
              name: 'Get Users',
              method: 'GET',
              url: '{{API_URL}}/users',
              headers: [
                { key: 'Authorization', value: 'Bearer {{API_KEY}}' }
              ]
            },
            {
              id: 'req_2',
              name: 'Create User',
              method: 'POST',
              url: '{{API_URL}}/users',
              headers: [
                { key: 'Authorization', value: 'Bearer {{API_KEY}}' },
                { key: 'Content-Type', value: 'application/json' }
              ],
              body: '{\n  "name": "New User",\n  "email": "{{TEST_EMAIL}}"\n}'
            }
          ],
          createdAt: '2023-06-15T10:30:00Z',
          updatedAt: '2023-06-16T14:20:00Z'
        },
        {
          id: 'col_2',
          name: 'Authentication',
          description: 'Auth-related endpoints',
          requests: [
            {
              id: 'req_3',
              name: 'Login',
              method: 'POST',
              url: '{{API_URL}}/auth/login',
              headers: [
                { key: 'Content-Type', value: 'application/json' }
              ],
              body: '{\n  "email": "{{TEST_EMAIL}}",\n  "password": "{{TEST_PASSWORD}}"\n}'
            },
            {
              id: 'req_4',
              name: 'Refresh Token',
              method: 'POST',
              url: '{{API_URL}}/auth/refresh',
              headers: [
                { key: 'Authorization', value: 'Bearer {{REFRESH_TOKEN}}' },
                { key: 'Content-Type', value: 'application/json' }
              ]
            }
          ],
          createdAt: '2023-06-17T08:15:00Z',
          updatedAt: '2023-06-17T09:30:00Z'
        }
      ]

      return collections.value
    } catch (err) {
      error.value = 'Failed to load collections'
      console.error('Error fetching collections:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function createCollection(name: string, description?: string) {
    const newCollection: Collection = {
      id: `col_${Date.now()}`,
      name,
      description,
      requests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    collections.value.push(newCollection)
    return newCollection
  }

  function addRequestToCollection(collectionId: string, request: Omit<RequestItem, 'id'>) {
    const collection = collections.value.find(c => c.id === collectionId)
    if (!collection) return null

    const newRequest: RequestItem = {
      id: `req_${Date.now()}`,
      ...request
    }

    collection.requests.push(newRequest)
    collection.updatedAt = new Date().toISOString()
    return newRequest
  }

  function updateRequest(collectionId: string, requestId: string, updates: Partial<Omit<RequestItem, 'id'>>) {
    const collection = collections.value.find(c => c.id === collectionId)
    if (!collection) return false

    const requestIndex = collection.requests.findIndex(r => r.id === requestId)
    if (requestIndex === -1) return false

    collection.requests[requestIndex] = {
      ...collection.requests[requestIndex],
      ...updates
    }

    collection.updatedAt = new Date().toISOString()
    return true
  }

  function deleteRequest(collectionId: string, requestId: string) {
    const collection = collections.value.find(c => c.id === collectionId)
    if (!collection) return false

    const requestIndex = collection.requests.findIndex(r => r.id === requestId)
    if (requestIndex === -1) return false

    collection.requests.splice(requestIndex, 1)
    collection.updatedAt = new Date().toISOString()
    return true
  }

  function deleteCollection(collectionId: string) {
    const index = collections.value.findIndex(c => c.id === collectionId)
    if (index === -1) return false

    collections.value.splice(index, 1)
    return true
  }

  // Initialize with sample data
  fetchCollections()

  return {
    collections,
    isLoading,
    error,
    hasCollections,
    findRequestById,
    fetchCollections,
    createCollection,
    addRequestToCollection,
    updateRequest,
    deleteRequest,
    deleteCollection
  }
})