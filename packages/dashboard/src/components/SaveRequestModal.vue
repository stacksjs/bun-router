<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCollectionStore } from '../store/collectionStore'

const props = defineProps<{
  show: boolean
  method: string
  url: string
  headers: { key: string, value: string }[]
  body?: string
}>()

const emit = defineEmits(['close', 'saved'])

const collectionStore = useCollectionStore()
const collections = computed(() => collectionStore.collections)
const selectedCollectionId = ref('')
const requestName = ref('')
const requestDescription = ref('')
const showNewCollectionForm = ref(false)
const newCollectionName = ref('')
const newCollectionDescription = ref('')

function resetForm() {
  requestName.value = ''
  requestDescription.value = ''
  selectedCollectionId.value = collections.value.length > 0 ? collections.value[0].id : ''
  showNewCollectionForm.value = false
  newCollectionName.value = ''
  newCollectionDescription.value = ''
}

function close() {
  resetForm()
  emit('close')
}

function toggleNewCollectionForm() {
  showNewCollectionForm.value = !showNewCollectionForm.value
  if (showNewCollectionForm.value) {
    selectedCollectionId.value = ''
  }
}

function createNewCollection() {
  if (!newCollectionName.value.trim())
    return

  const newCollection = collectionStore.createCollection(
    newCollectionName.value.trim(),
    newCollectionDescription.value.trim() || undefined,
  )

  selectedCollectionId.value = newCollection.id
  showNewCollectionForm.value = false
}

function saveRequest() {
  if (!requestName.value.trim() || !selectedCollectionId.value)
    return

  const request = {
    name: requestName.value.trim(),
    description: requestDescription.value.trim() || undefined,
    method: props.method,
    url: props.url,
    headers: [...props.headers],
    body: props.body,
  }

  const savedRequest = collectionStore.addRequestToCollection(selectedCollectionId.value, request)

  if (savedRequest) {
    emit('saved', {
      request: savedRequest,
      collectionId: selectedCollectionId.value,
    })
    close()
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="close" />

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 id="modal-title" class="text-lg leading-6 font-medium text-gray-900">
                Save Request
              </h3>

              <div class="mt-4 space-y-4">
                <div>
                  <label for="request-name" class="block text-sm font-medium text-gray-700">Request Name</label>
                  <input
                    id="request-name"
                    v-model="requestName"
                    type="text"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="E.g. Get Users, Create Customer"
                  >
                </div>

                <div>
                  <label for="request-description" class="block text-sm font-medium text-gray-700">Description (optional)</label>
                  <input
                    id="request-description"
                    v-model="requestDescription"
                    type="text"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Brief description of what this request does"
                  >
                </div>

                <div v-if="!showNewCollectionForm">
                  <div class="flex justify-between items-center">
                    <label for="collection" class="block text-sm font-medium text-gray-700">Save to Collection</label>
                    <button
                      type="button"
                      class="text-xs text-indigo-600 hover:text-indigo-900"
                      @click="toggleNewCollectionForm"
                    >
                      + New Collection
                    </button>
                  </div>

                  <select
                    id="collection"
                    v-model="selectedCollectionId"
                    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option v-if="collections.length === 0" disabled value="">
                      No collections available
                    </option>
                    <option
                      v-for="collection in collections"
                      :key="collection.id"
                      :value="collection.id"
                    >
                      {{ collection.name }}
                    </option>
                  </select>
                </div>

                <div v-else class="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div class="flex justify-between">
                    <h4 class="text-sm font-medium text-gray-700">
                      New Collection
                    </h4>
                    <button
                      type="button"
                      class="text-xs text-gray-500 hover:text-gray-700"
                      @click="toggleNewCollectionForm"
                    >
                      Cancel
                    </button>
                  </div>

                  <div class="mt-2">
                    <input
                      v-model="newCollectionName"
                      type="text"
                      class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Collection Name"
                    >
                  </div>

                  <div class="mt-2">
                    <input
                      v-model="newCollectionDescription"
                      type="text"
                      class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Description (optional)"
                    >
                  </div>

                  <div class="mt-2">
                    <button
                      type="button"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      :disabled="!newCollectionName.trim()"
                      @click="createNewCollection"
                    >
                      Create Collection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            :disabled="!requestName.trim() || (!selectedCollectionId && !showNewCollectionForm)"
            @click="saveRequest"
          >
            Save Request
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            @click="close"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
