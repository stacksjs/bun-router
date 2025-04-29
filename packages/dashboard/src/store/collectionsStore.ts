import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface RequestItem {
  id: string
  name: string
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  createdAt: string
  updatedAt: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  requests: RequestItem[]
  createdAt: string
  updatedAt: string
}

export const useCollectionsStore = defineStore('collections', () => {
  // State
  const collections = ref<Collection[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedAt = ref<Date | null>(null)

  // Computed
  const hasCollections = computed(() => collections.value.length > 0)
  const totalRequests = computed(() => {
    return collections.value.reduce((total, collection) =>
      total + collection.requests.length, 0)
  })

  // Check if data needs refresh (older than 5 minutes)
  const needsRefresh = (lastFetchTime: Date | null) => {
    if (!lastFetchTime) return true
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return lastFetchTime < fiveMinutesAgo
  }

  // Actions
  async function fetchCollections(forceRefresh = false) {
    if (!forceRefresh && hasCollections.value && !needsRefresh(lastFetchedAt.value)) {
      return collections.value
    }

    isLoading.value = true
    error.value = null

    try {
      // In a real app, this would be an API call
      // const response = await axios.get('/api/collections')
      // collections.value = response.data

      // Mock data for demo
      await new Promise(resolve => setTimeout(resolve, 800))
      collections.value = [
        {
          id: 'col_1',
          name: 'Authentication APIs',
          description: 'API requests related to user authentication',
          requests: [
            {
              id: 'req_1',
              name: 'Login',
              method: 'POST',
              url: '/api/auth/login',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: 'user@example.com',
                password: 'password'
              }),
              createdAt: '2023-05-10T12:00:00Z',
              updatedAt: '2023-05-10T12:00:00Z'
            },
            {
              id: 'req_2',
              name: 'Register',
              method: 'POST',
              url: '/api/auth/register',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: 'New User',
                email: 'newuser@example.com',
                password: 'password'
              }),
              createdAt: '2023-05-10T12:15:00Z',
              updatedAt: '2023-05-10T12:15:00Z'
            },
            {
              id: 'req_3',
              name: 'Logout',
              method: 'POST',
              url: '/api/auth/logout',
              headers: {
                'Authorization': 'Bearer {{token}}'
              },
              createdAt: '2023-05-10T12:30:00Z',
              updatedAt: '2023-05-10T12:30:00Z'
            }
          ],
          createdAt: '2023-05-10T11:45:00Z',
          updatedAt: '2023-05-11T09:30:00Z'
        },
        {
          id: 'col_2',
          name: 'User Management',
          description: 'API requests for managing user profiles',
          requests: [
            {
              id: 'req_4',
              name: 'Get User Profile',
              method: 'GET',
              url: '/api/users/profile',
              headers: {
                'Authorization': 'Bearer {{token}}'
              },
              createdAt: '2023-05-11T14:00:00Z',
              updatedAt: '2023-05-11T14:00:00Z'
            },
            {
              id: 'req_5',
              name: 'Update Profile',
              method: 'PUT',
              url: '/api/users/profile',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {{token}}'
              },
              body: JSON.stringify({
                name: 'Updated Name',
                bio: 'Updated bio information'
              }),
              createdAt: '2023-05-11T14:30:00Z',
              updatedAt: '2023-05-11T14:30:00Z'
            }
          ],
          createdAt: '2023-05-11T13:45:00Z',
          updatedAt: '2023-05-11T14:45:00Z'
        },
        {
          id: 'col_3',
          name: 'Product APIs',
          description: 'API requests for product data',
          requests: [
            {
              id: 'req_6',
              name: 'List Products',
              method: 'GET',
              url: '/api/products',
              headers: {},
              createdAt: '2023-05-12T10:00:00Z',
              updatedAt: '2023-05-12T10:00:00Z'
            },
            {
              id: 'req_7',
              name: 'Get Product Details',
              method: 'GET',
              url: '/api/products/1',
              headers: {},
              createdAt: '2023-05-12T10:15:00Z',
              updatedAt: '2023-05-12T10:15:00Z'
            },
            {
              id: 'req_8',
              name: 'Create Product',
              method: 'POST',
              url: '/api/products',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {{token}}'
              },
              body: JSON.stringify({
                name: 'New Product',
                price: 29.99,
                description: 'A brand new product'
              }),
              createdAt: '2023-05-12T10:30:00Z',
              updatedAt: '2023-05-12T10:30:00Z'
            }
          ],
          createdAt: '2023-05-12T09:45:00Z',
          updatedAt: '2023-05-12T10:45:00Z'
        }
      ]

      lastFetchedAt.value = new Date()
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

  function updateCollection(id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) {
    const index = collections.value.findIndex(c => c.id === id)
    if (index === -1) return false

    collections.value[index] = {
      ...collections.value[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return true
  }

  function deleteCollection(id: string) {
    const index = collections.value.findIndex(c => c.id === id)
    if (index === -1) return false

    collections.value.splice(index, 1)
    return true
  }

  function addRequestToCollection(collectionId: string, request: Omit<RequestItem, 'id' | 'createdAt' | 'updatedAt'>) {
    const collection = collections.value.find(c => c.id === collectionId)
    if (!collection) return null

    const newRequest: RequestItem = {
      id: `req_${Date.now()}`,
      ...request,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    collection.requests.push(newRequest)
    collection.updatedAt = new Date().toISOString()

    return newRequest
  }

  function updateRequest(collectionId: string, requestId: string, updates: Partial<Omit<RequestItem, 'id' | 'createdAt'>>) {
    const collection = collections.value.find(c => c.id === collectionId)
    if (!collection) return false

    const requestIndex = collection.requests.findIndex(r => r.id === requestId)
    if (requestIndex === -1) return false

    collection.requests[requestIndex] = {
      ...collection.requests[requestIndex],
      ...updates,
      updatedAt: new Date().toISOString()
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

  return {
    collections,
    isLoading,
    error,
    hasCollections,
    totalRequests,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addRequestToCollection,
    updateRequest,
    deleteRequest
  }
})