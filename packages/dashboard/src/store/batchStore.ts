import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RequestItem } from './collectionsStore'

export interface BatchRequestItem extends RequestItem {
  enabled: boolean
  order: number
  response?: {
    status: number
    time: number
    headers: Record<string, string>
    body?: string
    error?: string
  }
  isLoading?: boolean
}

export interface BatchOperation {
  id: string
  name: string
  description?: string
  requests: BatchRequestItem[]
  createdAt: string
  updatedAt: string
  executionMode: 'sequential' | 'parallel'
  delay?: number // delay between requests in ms (for sequential mode)
  lastRun?: {
    timestamp: string
    success: boolean
    totalTime: number
    message?: string
  }
}

export const useBatchStore = defineStore('batch', () => {
  // State
  const batchOperations = ref<BatchOperation[]>([])
  const currentBatchExecution = ref<string | null>(null) // ID of the batch currently being executed
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const hasBatchOperations = computed(() => batchOperations.value.length > 0)

  // Create a new batch operation
  function createBatchOperation(
    name: string,
    description: string = '',
    mode: 'sequential' | 'parallel' = 'sequential',
    delay: number = 0
  ): BatchOperation {
    const newBatch: BatchOperation = {
      id: `batch_${Date.now()}`,
      name,
      description,
      requests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionMode: mode,
      delay: mode === 'sequential' ? delay : undefined
    }

    batchOperations.value.push(newBatch)
    return newBatch
  }

  // Update batch operation
  function updateBatchOperation(id: string, updates: Partial<Omit<BatchOperation, 'id' | 'createdAt' | 'requests'>>) {
    const index = batchOperations.value.findIndex(batch => batch.id === id)
    if (index === -1) return false

    batchOperations.value[index] = {
      ...batchOperations.value[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return true
  }

  // Delete batch operation
  function deleteBatchOperation(id: string) {
    const index = batchOperations.value.findIndex(batch => batch.id === id)
    if (index === -1) return false

    batchOperations.value.splice(index, 1)
    return true
  }

  // Add request to batch
  function addRequestToBatch(batchId: string, request: RequestItem) {
    const batch = batchOperations.value.find(b => b.id === batchId)
    if (!batch) return null

    const batchRequest: BatchRequestItem = {
      ...request,
      enabled: true,
      order: batch.requests.length + 1,
    }

    batch.requests.push(batchRequest)
    batch.updatedAt = new Date().toISOString()

    return batchRequest
  }

  // Remove request from batch
  function removeRequestFromBatch(batchId: string, requestId: string) {
    const batch = batchOperations.value.find(b => b.id === batchId)
    if (!batch) return false

    const index = batch.requests.findIndex(r => r.id === requestId)
    if (index === -1) return false

    batch.requests.splice(index, 1)

    // Update order of remaining requests
    batch.requests.forEach((req, idx) => {
      req.order = idx + 1
    })

    batch.updatedAt = new Date().toISOString()
    return true
  }

  // Toggle request enabled status
  function toggleRequestEnabled(batchId: string, requestId: string) {
    const batch = batchOperations.value.find(b => b.id === batchId)
    if (!batch) return false

    const request = batch.requests.find(r => r.id === requestId)
    if (!request) return false

    request.enabled = !request.enabled
    batch.updatedAt = new Date().toISOString()
    return true
  }

  // Reorder request in batch
  function reorderRequest(batchId: string, requestId: string, newOrder: number) {
    const batch = batchOperations.value.find(b => b.id === batchId)
    if (!batch) return false

    const request = batch.requests.find(r => r.id === requestId)
    if (!request) return false

    const oldOrder = request.order

    // Bound the new order within valid range
    newOrder = Math.max(1, Math.min(newOrder, batch.requests.length))

    // Update orders of affected requests
    if (newOrder > oldOrder) {
      batch.requests.forEach(req => {
        if (req.order > oldOrder && req.order <= newOrder) {
          req.order--
        }
      })
    } else if (newOrder < oldOrder) {
      batch.requests.forEach(req => {
        if (req.order >= newOrder && req.order < oldOrder) {
          req.order++
        }
      })
    }

    request.order = newOrder
    batch.updatedAt = new Date().toISOString()

    // Sort the array by order for consistent display
    batch.requests.sort((a, b) => a.order - b.order)

    return true
  }

  // Clear responses from a batch
  function clearBatchResponses(batchId: string) {
    const batch = batchOperations.value.find(b => b.id === batchId)
    if (!batch) return false

    batch.requests.forEach(req => {
      req.response = undefined
      req.isLoading = false
    })

    batch.updatedAt = new Date().toISOString()
    return true
  }

  // Execute a batch operation
  async function executeBatch(batchId: string) {
    const batch = batchOperations.value.find(b => b.id === batchId)
    if (!batch) return { success: false, message: 'Batch not found' }

    // Only execute enabled requests
    const enabledRequests = batch.requests.filter(r => r.enabled)
    if (enabledRequests.length === 0) {
      return { success: false, message: 'No enabled requests to execute' }
    }

    // Check if already running
    if (currentBatchExecution.value) {
      return { success: false, message: 'Another batch operation is already running' }
    }

    try {
      currentBatchExecution.value = batchId
      isLoading.value = true
      error.value = null

      // Clear previous responses
      clearBatchResponses(batchId)

      const startTime = Date.now()

      if (batch.executionMode === 'parallel') {
        // Execute all requests in parallel
        const promises = enabledRequests.map(request => executeRequest(batch, request))
        await Promise.all(promises)
      } else {
        // Execute requests sequentially with delay
        for (const request of enabledRequests) {
          await executeRequest(batch, request)

          // Apply delay if specified and not the last request
          if (batch.delay && batch.delay > 0 && request !== enabledRequests[enabledRequests.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, batch.delay))
          }
        }
      }

      const totalTime = Date.now() - startTime

      // Update batch with execution results
      updateBatchOperation(batchId, {
        lastRun: {
          timestamp: new Date().toISOString(),
          success: true,
          totalTime,
        }
      })

      return { success: true, totalTime }
    } catch (err: any) {
      error.value = err.message || 'Failed to execute batch operation'

      // Update batch with execution failure
      updateBatchOperation(batchId, {
        lastRun: {
          timestamp: new Date().toISOString(),
          success: false,
          totalTime: Date.now() - (new Date(batch.updatedAt)).getTime(),
          message: error.value || 'Unknown error'
        }
      })

      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
      currentBatchExecution.value = null
    }
  }

  // Execute a single request in a batch
  async function executeRequest(batch: BatchOperation, request: BatchRequestItem): Promise<void> {
    // Mark request as loading
    request.isLoading = true

    try {
      // In a real app, this would make an actual HTTP request
      // Here we'll simulate the request with a delay based on complexity
      const startTime = Date.now()
      const requestComplexity = (request.body?.length || 0) * 0.5 + 200 // Base time + complexity factor
      const randomFactor = Math.random() * 100 + 100 // Add some randomness
      const simulatedDelay = Math.min(Math.max(requestComplexity + randomFactor, 200), 2000) // Between 200ms and 2s

      await new Promise(resolve => setTimeout(resolve, simulatedDelay))

      // Generate a simulated response
      const possibleStatuses = [200, 201, 204, 400, 401, 403, 404, 500]
      const responseTime = Date.now() - startTime

      // Higher chance of success (70%)
      const isSuccess = Math.random() < 0.7
      const statusIndex = isSuccess
        ? Math.floor(Math.random() * 3) // 200, 201, 204
        : 3 + Math.floor(Math.random() * 5) // 400, 401, 403, 404, 500

      const status = possibleStatuses[statusIndex]

      // Generate response headers
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': `req-${Math.random().toString(36).substring(2, 10)}`,
        'Date': new Date().toUTCString()
      }

      // Generate response body based on status
      let responseBody: string | undefined
      let error: string | undefined

      if (status >= 200 && status < 300) {
        // Success response
        if (request.method === 'GET') {
          if (request.url.includes('users')) {
            responseBody = JSON.stringify({
              id: Math.floor(Math.random() * 1000),
              name: 'User Name',
              email: 'user@example.com'
            }, null, 2)
          } else if (request.url.includes('products')) {
            responseBody = JSON.stringify({
              id: Math.floor(Math.random() * 1000),
              name: 'Product Name',
              price: Math.floor(Math.random() * 100) + 0.99
            }, null, 2)
          } else {
            responseBody = JSON.stringify({
              success: true,
              message: 'Operation completed successfully'
            }, null, 2)
          }
        } else if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
          responseBody = JSON.stringify({
            success: true,
            id: Math.floor(Math.random() * 1000),
            message: 'Resource updated successfully'
          }, null, 2)
        } else if (request.method === 'DELETE') {
          responseBody = JSON.stringify({
            success: true,
            message: 'Resource deleted successfully'
          }, null, 2)
        }
      } else {
        // Error response
        const errorMessages = [
          'Invalid request parameters',
          'Authentication required',
          'Permission denied',
          'Resource not found',
          'Internal server error'
        ]

        error = errorMessages[Math.floor(Math.random() * errorMessages.length)]
        responseBody = JSON.stringify({
          success: false,
          error,
          code: status
        }, null, 2)
      }

      // Set the response on the request
      request.response = {
        status,
        time: responseTime,
        headers: responseHeaders,
        body: responseBody,
        error
      }
    } catch (err: any) {
      // Set error response
      request.response = {
        status: 0,
        time: 0,
        headers: {},
        error: err.message || 'Failed to execute request'
      }
    } finally {
      // Mark request as not loading
      request.isLoading = false
    }
  }

  // Create some sample batch operations for demo
  function createSampleBatches() {
    if (batchOperations.value.length > 0) return

    // Sample batch 1: Authentication flow
    const authBatch = createBatchOperation(
      'Authentication Flow',
      'Register, login, and fetch user profile in sequence',
      'sequential',
      500
    )

    addRequestToBatch(authBatch.id, {
      id: 'req_register',
      name: 'Register User',
      method: 'POST',
      url: 'https://api.example.com/auth/register',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    addRequestToBatch(authBatch.id, {
      id: 'req_login',
      name: 'Login User',
      method: 'POST',
      url: 'https://api.example.com/auth/login',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'john@example.com',
        password: 'password123'
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    addRequestToBatch(authBatch.id, {
      id: 'req_profile',
      name: 'Get User Profile',
      method: 'GET',
      url: 'https://api.example.com/users/profile',
      headers: {
        'Authorization': 'Bearer {{token}}'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Sample batch 2: Product API in parallel
    const productBatch = createBatchOperation(
      'Product API Tests',
      'Test different product API endpoints in parallel',
      'parallel'
    )

    addRequestToBatch(productBatch.id, {
      id: 'req_products_list',
      name: 'List Products',
      method: 'GET',
      url: 'https://api.example.com/products?limit=10',
      headers: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    addRequestToBatch(productBatch.id, {
      id: 'req_product_detail',
      name: 'Get Product Details',
      method: 'GET',
      url: 'https://api.example.com/products/42',
      headers: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    addRequestToBatch(productBatch.id, {
      id: 'req_product_create',
      name: 'Create Product',
      method: 'POST',
      url: 'https://api.example.com/products',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token}}'
      },
      body: JSON.stringify({
        name: 'New Product',
        price: 29.99,
        description: 'A brand new product'
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    addRequestToBatch(productBatch.id, {
      id: 'req_product_update',
      name: 'Update Product',
      method: 'PUT',
      url: 'https://api.example.com/products/42',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token}}'
      },
      body: JSON.stringify({
        name: 'Updated Product',
        price: 39.99,
        description: 'An updated product'
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    addRequestToBatch(productBatch.id, {
      id: 'req_product_delete',
      name: 'Delete Product',
      method: 'DELETE',
      url: 'https://api.example.com/products/42',
      headers: {
        'Authorization': 'Bearer {{token}}'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  // Initialize with sample data
  createSampleBatches()

  return {
    batchOperations,
    currentBatchExecution,
    isLoading,
    error,
    hasBatchOperations,
    createBatchOperation,
    updateBatchOperation,
    deleteBatchOperation,
    addRequestToBatch,
    removeRequestFromBatch,
    toggleRequestEnabled,
    reorderRequest,
    clearBatchResponses,
    executeBatch
  }
})