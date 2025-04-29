<script setup lang="ts">
import { ref } from 'vue'

// App settings
const darkMode = ref(false)
const autoSave = ref(true)
const notificationsEnabled = ref(true)
const maxHistoryItems = ref(100)
const defaultContentType = ref('application/json')
const proxyEnabled = ref(false)
const proxyUrl = ref('http://localhost:8080')
const requestTimeout = ref(30)
const showDeprecationWarnings = ref(true)

// Theme options
const themes = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System Default' }
]
const selectedTheme = ref('system')

// Export formats
const exportFormats = [
  { id: 'json', name: 'JSON' },
  { id: 'har', name: 'HAR (HTTP Archive)' },
  { id: 'curl', name: 'cURL Commands' }
]
const defaultExportFormat = ref('json')

// API key for sharing/sync
const apiKey = ref('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
const showApiKey = ref(false)

function toggleApiKeyVisibility() {
  showApiKey.value = !showApiKey.value
}

function resetSettings() {
  darkMode.value = false
  autoSave.value = true
  notificationsEnabled.value = true
  maxHistoryItems.value = 100
  defaultContentType.value = 'application/json'
  proxyEnabled.value = false
  proxyUrl.value = 'http://localhost:8080'
  requestTimeout.value = 30
  showDeprecationWarnings.value = true
  selectedTheme.value = 'system'
  defaultExportFormat.value = 'json'
}

function saveSettings() {
  // In a real app, would save to local storage or server
  // For demo purposes, just show success message
  const saveMessage = document.getElementById('save-message')
  if (saveMessage) {
    saveMessage.classList.remove('opacity-0')
    saveMessage.classList.add('opacity-100')

    setTimeout(() => {
      saveMessage.classList.remove('opacity-100')
      saveMessage.classList.add('opacity-0')
    }, 3000)
  }
}

function regenerateApiKey() {
  // In a real app, would call an API to regenerate the key
  apiKey.value = 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
}
</script>

<template>
  <div class="settings-view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Settings</h1>
      <div id="save-message" class="text-green-600 opacity-0 transition-opacity duration-300">
        Settings saved successfully
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- General Settings -->
      <div class="bg-white rounded-lg shadow p-4 md:col-span-2">
        <h2 class="text-lg font-medium mb-4">General Settings</h2>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label for="dark-mode" class="block text-sm font-medium text-gray-700">Dark Mode</label>
            <button
              type="button"
              :class="[
                darkMode ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              ]"
              @click="darkMode = !darkMode"
            >
              <span
                aria-hidden="true"
                :class="[
                  darkMode ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                ]"
              ></span>
            </button>
          </div>

          <div class="flex items-center justify-between">
            <label for="auto-save" class="block text-sm font-medium text-gray-700">Auto-save Requests</label>
            <button
              type="button"
              :class="[
                autoSave ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              ]"
              @click="autoSave = !autoSave"
            >
              <span
                aria-hidden="true"
                :class="[
                  autoSave ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                ]"
              ></span>
            </button>
          </div>

          <div class="flex items-center justify-between">
            <label for="notifications" class="block text-sm font-medium text-gray-700">Notifications</label>
            <button
              type="button"
              :class="[
                notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              ]"
              @click="notificationsEnabled = !notificationsEnabled"
            >
              <span
                aria-hidden="true"
                :class="[
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                ]"
              ></span>
            </button>
          </div>

          <div>
            <label for="theme" class="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <select
              id="theme"
              v-model="selectedTheme"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option v-for="theme in themes" :key="theme.id" :value="theme.id">
                {{ theme.name }}
              </option>
            </select>
          </div>

          <div>
            <label for="export-format" class="block text-sm font-medium text-gray-700 mb-1">Default Export Format</label>
            <select
              id="export-format"
              v-model="defaultExportFormat"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option v-for="format in exportFormats" :key="format.id" :value="format.id">
                {{ format.name }}
              </option>
            </select>
          </div>

          <div>
            <label for="history-items" class="block text-sm font-medium text-gray-700 mb-1">Max History Items</label>
            <input
              id="history-items"
              v-model="maxHistoryItems"
              type="number"
              min="10"
              max="1000"
              step="10"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label for="content-type" class="block text-sm font-medium text-gray-700 mb-1">Default Content Type</label>
            <input
              id="content-type"
              v-model="defaultContentType"
              type="text"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label for="request-timeout" class="block text-sm font-medium text-gray-700 mb-1">Request Timeout (seconds)</label>
            <input
              id="request-timeout"
              v-model="requestTimeout"
              type="number"
              min="1"
              max="300"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <!-- Proxy Settings -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="text-lg font-medium mb-4">Proxy Settings</h2>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label for="proxy-enabled" class="block text-sm font-medium text-gray-700">Enable Proxy</label>
            <button
              type="button"
              :class="[
                proxyEnabled ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              ]"
              @click="proxyEnabled = !proxyEnabled"
            >
              <span
                aria-hidden="true"
                :class="[
                  proxyEnabled ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                ]"
              ></span>
            </button>
          </div>

          <div>
            <label for="proxy-url" class="block text-sm font-medium text-gray-700 mb-1">Proxy URL</label>
            <input
              id="proxy-url"
              v-model="proxyUrl"
              type="text"
              :disabled="!proxyEnabled"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="http://localhost:8080"
            />
          </div>

          <div class="flex items-center justify-between">
            <label for="deprecation-warnings" class="block text-sm font-medium text-gray-700">Show Deprecation Warnings</label>
            <button
              type="button"
              :class="[
                showDeprecationWarnings ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              ]"
              @click="showDeprecationWarnings = !showDeprecationWarnings"
            >
              <span
                aria-hidden="true"
                :class="[
                  showDeprecationWarnings ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                ]"
              ></span>
            </button>
          </div>
        </div>
      </div>

      <!-- API Key -->
      <div class="bg-white rounded-lg shadow p-4 md:col-span-2">
        <h2 class="text-lg font-medium mb-4">API Key</h2>

        <p class="text-sm text-gray-600 mb-4">
          Your API key is used to synchronize your requests and collections across devices.
          Keep this private and secure.
        </p>

        <div class="flex items-center space-x-2 mb-4">
          <input
            :type="showApiKey ? 'text' : 'password'"
            v-model="apiKey"
            readonly
            class="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <button
            @click="toggleApiKeyVisibility"
            class="p-2 text-gray-600 hover:text-gray-900"
            :title="showApiKey ? 'Hide API Key' : 'Show API Key'"
          >
            <span :class="showApiKey ? 'i-carbon-view-off' : 'i-carbon-view'"></span>
          </button>
          <button
            @click="regenerateApiKey"
            class="p-2 text-gray-600 hover:text-gray-900"
            title="Regenerate API Key"
          >
            <span class="i-carbon-renew"></span>
          </button>
        </div>
      </div>

      <!-- Data Management -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="text-lg font-medium mb-4">Data Management</h2>

        <div class="space-y-4">
          <button
            class="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Export All Data
          </button>

          <button
            class="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Import Data
          </button>

          <button
            class="w-full px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Clear Request History
          </button>

          <button
            class="w-full px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Reset All Settings
          </button>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end space-x-3">
      <button
        @click="resetSettings"
        class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
      >
        Reset
      </button>

      <button
        @click="saveSettings"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
      >
        Save Settings
      </button>
    </div>
  </div>
</template>