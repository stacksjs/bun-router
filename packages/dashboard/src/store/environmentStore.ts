import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface EnvironmentVariable {
  id: string
  name: string
  value: string
  description?: string
}

export interface Environment {
  id: string
  name: string
  description?: string
  variables: EnvironmentVariable[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const useEnvironmentStore = defineStore('environment', () => {
  // State
  const environments = ref<Environment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedAt = ref<Date | null>(null)

  // Computed
  const hasEnvironments = computed(() => environments.value.length > 0)
  const activeEnvironment = computed(() =>
    environments.value.find(env => env.isActive) || null
  )
  const variableMap = computed(() => {
    if (!activeEnvironment.value) return {}

    return activeEnvironment.value.variables.reduce((map, variable) => {
      map[variable.name] = variable.value
      return map
    }, {} as Record<string, string>)
  })

  // Check if data needs refresh (older than 5 minutes)
  const needsRefresh = (lastFetchTime: Date | null) => {
    if (!lastFetchTime) return true
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return lastFetchTime < fiveMinutesAgo
  }

  // Actions
  async function fetchEnvironments(forceRefresh = false) {
    if (!forceRefresh && hasEnvironments.value && !needsRefresh(lastFetchedAt.value)) {
      return environments.value
    }

    isLoading.value = true
    error.value = null

    try {
      // In a real app, this would be an API call
      // const response = await axios.get('/api/environments')
      // environments.value = response.data

      // Mock data for demo
      await new Promise(resolve => setTimeout(resolve, 800))
      environments.value = [
        {
          id: 'env_1',
          name: 'Development',
          description: 'Local development environment',
          isActive: true,
          variables: [
            {
              id: 'var_1',
              name: 'API_URL',
              value: 'http://localhost:3000/api',
              description: 'Base URL for API calls'
            },
            {
              id: 'var_2',
              name: 'API_KEY',
              value: 'dev_api_key_123',
              description: 'API key for authentication'
            },
            {
              id: 'var_3',
              name: 'DEBUG',
              value: 'true',
              description: 'Enable debug mode'
            }
          ],
          createdAt: '2023-05-10T11:45:00Z',
          updatedAt: '2023-05-11T09:30:00Z'
        },
        {
          id: 'env_2',
          name: 'Staging',
          description: 'Staging environment for testing',
          isActive: false,
          variables: [
            {
              id: 'var_4',
              name: 'API_URL',
              value: 'https://staging-api.example.com',
              description: 'Base URL for API calls'
            },
            {
              id: 'var_5',
              name: 'API_KEY',
              value: 'staging_api_key_456',
              description: 'API key for authentication'
            },
            {
              id: 'var_6',
              name: 'DEBUG',
              value: 'false',
              description: 'Enable debug mode'
            }
          ],
          createdAt: '2023-05-12T09:45:00Z',
          updatedAt: '2023-05-12T10:45:00Z'
        },
        {
          id: 'env_3',
          name: 'Production',
          description: 'Production environment',
          isActive: false,
          variables: [
            {
              id: 'var_7',
              name: 'API_URL',
              value: 'https://api.example.com',
              description: 'Base URL for API calls'
            },
            {
              id: 'var_8',
              name: 'API_KEY',
              value: 'prod_api_key_789',
              description: 'API key for authentication'
            },
            {
              id: 'var_9',
              name: 'DEBUG',
              value: 'false',
              description: 'Enable debug mode'
            }
          ],
          createdAt: '2023-05-15T09:45:00Z',
          updatedAt: '2023-05-15T10:45:00Z'
        }
      ]

      lastFetchedAt.value = new Date()
      return environments.value
    } catch (err) {
      error.value = 'Failed to load environments'
      console.error('Error fetching environments:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function createEnvironment(name: string, description?: string) {
    const newEnvironment: Environment = {
      id: `env_${Date.now()}`,
      name,
      description,
      variables: [],
      isActive: environments.value.length === 0, // Make active if it's the first environment
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    environments.value.push(newEnvironment)
    return newEnvironment
  }

  function updateEnvironment(id: string, updates: Partial<Omit<Environment, 'id' | 'createdAt' | 'variables'>>) {
    const index = environments.value.findIndex(e => e.id === id)
    if (index === -1) return false

    environments.value[index] = {
      ...environments.value[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return true
  }

  function deleteEnvironment(id: string) {
    const index = environments.value.findIndex(e => e.id === id)
    if (index === -1) return false

    // If deleting the active environment, activate another one if available
    if (environments.value[index].isActive && environments.value.length > 1) {
      const nextIndex = index === environments.value.length - 1 ? index - 1 : index + 1
      environments.value[nextIndex].isActive = true
    }

    environments.value.splice(index, 1)
    return true
  }

  function setActiveEnvironment(id: string) {
    const environment = environments.value.find(e => e.id === id)
    if (!environment) return false

    // Deactivate current active environment
    const currentActive = environments.value.find(e => e.isActive)
    if (currentActive) {
      currentActive.isActive = false
    }

    // Activate the new environment
    environment.isActive = true
    return true
  }

  function addVariable(environmentId: string, variable: Omit<EnvironmentVariable, 'id'>) {
    const environment = environments.value.find(e => e.id === environmentId)
    if (!environment) return null

    const newVariable: EnvironmentVariable = {
      id: `var_${Date.now()}`,
      ...variable
    }

    environment.variables.push(newVariable)
    environment.updatedAt = new Date().toISOString()
    return newVariable
  }

  function updateVariable(environmentId: string, variableId: string, updates: Partial<Omit<EnvironmentVariable, 'id'>>) {
    const environment = environments.value.find(e => e.id === environmentId)
    if (!environment) return false

    const variableIndex = environment.variables.findIndex(v => v.id === variableId)
    if (variableIndex === -1) return false

    environment.variables[variableIndex] = {
      ...environment.variables[variableIndex],
      ...updates
    }

    environment.updatedAt = new Date().toISOString()
    return true
  }

  function deleteVariable(environmentId: string, variableId: string) {
    const environment = environments.value.find(e => e.id === environmentId)
    if (!environment) return false

    const variableIndex = environment.variables.findIndex(v => v.id === variableId)
    if (variableIndex === -1) return false

    environment.variables.splice(variableIndex, 1)
    environment.updatedAt = new Date().toISOString()
    return true
  }

  // Used to resolve variable references like {{VAR_NAME}} in strings
  function resolveVariables(text: string): string {
    if (!activeEnvironment.value) return text

    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim()
      return variableMap.value[trimmedName] || match
    })
  }

  // Initialize with sample data
  fetchEnvironments()

  return {
    environments,
    isLoading,
    error,
    lastFetchedAt,
    hasEnvironments,
    activeEnvironment,
    variableMap,
    fetchEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
    addVariable,
    updateVariable,
    deleteVariable,
    resolveVariables
  }
})