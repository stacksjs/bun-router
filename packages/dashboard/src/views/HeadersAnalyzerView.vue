<script setup lang="ts">
import { computed, ref } from 'vue'

const headerInput = ref('')
const headerType = ref('request') // 'request' or 'response'
const securityScore = ref(0)
const headerAnalysis = ref<{ name: string, value: string, status: 'good' | 'warning' | 'error', message: string }[]>([])
const showAnalysisResults = ref(false)

// Common headers with descriptions and best practices
const commonHeaders = {
  request: {
    'Accept': {
      description: 'Indicates what media types are acceptable for the response',
      examples: ['application/json, text/plain, */*'],
    },
    'Accept-Encoding': {
      description: 'Indicates the content encoding that are acceptable for the response',
      examples: ['gzip, deflate, br'],
    },
    'Accept-Language': {
      description: 'Indicates the natural language that is preferred for the response',
      examples: ['en-US,en;q=0.9'],
    },
    'Authorization': {
      description: 'Contains credentials to authenticate a user with a server',
      examples: ['Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'],
    },
    'Content-Type': {
      description: 'Indicates the media type of the resource',
      examples: ['application/json', 'application/x-www-form-urlencoded'],
    },
    'User-Agent': {
      description: 'Identifies the client software originating the request',
      examples: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'],
    },
  },
  response: {
    'Access-Control-Allow-Origin': {
      description: 'Indicates whether the response can be shared with requesting code from the given origin',
      examples: ['*', 'https://example.com'],
    },
    'Cache-Control': {
      description: 'Directives for caching mechanisms in both requests and responses',
      examples: ['no-cache', 'max-age=3600', 'public, max-age=31536000'],
    },
    'Content-Type': {
      description: 'Indicates the media type of the resource',
      examples: ['application/json; charset=utf-8', 'text/html; charset=utf-8'],
    },
    'Content-Security-Policy': {
      description: 'Controls resources the user agent is allowed to load for a given page',
      examples: ['default-src \'self\'; script-src \'self\' https://trusted.com'],
    },
    'Strict-Transport-Security': {
      description: 'Force communication using HTTPS instead of HTTP',
      examples: ['max-age=31536000; includeSubDomains'],
    },
    'X-Content-Type-Options': {
      description: 'Prevents browsers from MIME-sniffing a response away from the declared content-type',
      examples: ['nosniff'],
    },
    'X-Frame-Options': {
      description: 'Indicates whether a browser should be allowed to render a page in a <frame>, <iframe>, <embed> or <object>',
      examples: ['DENY', 'SAMEORIGIN'],
    },
  },
}

const headerSections = computed(() => {
  return Object.entries(commonHeaders[headerType.value as keyof typeof commonHeaders]).map(([name, info]) => ({
    name,
    ...info,
  }))
})

function analyzeHeaders() {
  // Reset analysis results
  headerAnalysis.value = []

  if (!headerInput.value.trim()) {
    return
  }

  // Parse headers from input
  const headerLines = headerInput.value.split('\n').filter(line => line.trim() !== '')
  const parsedHeaders: Record<string, string> = {}

  for (const line of headerLines) {
    const colonPos = line.indexOf(':')
    if (colonPos > 0) {
      const name = line.slice(0, colonPos).trim()
      const value = line.slice(colonPos + 1).trim()
      parsedHeaders[name.toLowerCase()] = value
    }
  }

  // Analyze parsed headers
  let score = 0
  let maxScore = 0

  // Security headers analysis for response headers
  if (headerType.value === 'response') {
    // Check for Content-Security-Policy
    maxScore += 20
    if (parsedHeaders['content-security-policy']) {
      score += 20
      headerAnalysis.value.push({
        name: 'Content-Security-Policy',
        value: parsedHeaders['content-security-policy'],
        status: 'good',
        message: 'Content Security Policy is properly set',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'Content-Security-Policy',
        value: 'Not set',
        status: 'error',
        message: 'Missing Content Security Policy - this helps prevent XSS attacks',
      })
    }

    // Check for X-Content-Type-Options
    maxScore += 15
    if (parsedHeaders['x-content-type-options'] === 'nosniff') {
      score += 15
      headerAnalysis.value.push({
        name: 'X-Content-Type-Options',
        value: parsedHeaders['x-content-type-options'],
        status: 'good',
        message: 'X-Content-Type-Options is set to nosniff',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'X-Content-Type-Options',
        value: parsedHeaders['x-content-type-options'] || 'Not set',
        status: 'error',
        message: 'Missing or incorrect X-Content-Type-Options header',
      })
    }

    // Check for X-Frame-Options
    maxScore += 15
    if (parsedHeaders['x-frame-options']) {
      score += 15
      headerAnalysis.value.push({
        name: 'X-Frame-Options',
        value: parsedHeaders['x-frame-options'],
        status: 'good',
        message: 'X-Frame-Options is set to prevent clickjacking',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'X-Frame-Options',
        value: 'Not set',
        status: 'error',
        message: 'Missing X-Frame-Options header - this helps prevent clickjacking attacks',
      })
    }

    // Check for Strict-Transport-Security (HSTS)
    maxScore += 20
    if (parsedHeaders['strict-transport-security']) {
      const value = parsedHeaders['strict-transport-security']
      if (value.includes('max-age=') && Number.parseInt(value.match(/max-age=(\d+)/)?.[1] || '0') >= 31536000) {
        score += 20
        headerAnalysis.value.push({
          name: 'Strict-Transport-Security',
          value,
          status: 'good',
          message: 'HSTS is properly set with a long max-age',
        })
      }
      else {
        score += 10
        headerAnalysis.value.push({
          name: 'Strict-Transport-Security',
          value,
          status: 'warning',
          message: 'HSTS is set but max-age should be at least 1 year (31536000 seconds)',
        })
      }
    }
    else {
      headerAnalysis.value.push({
        name: 'Strict-Transport-Security',
        value: 'Not set',
        status: 'error',
        message: 'Missing HSTS header - this ensures the browser always uses HTTPS',
      })
    }

    // Check Cache-Control
    maxScore += 10
    if (parsedHeaders['cache-control']) {
      score += 10
      headerAnalysis.value.push({
        name: 'Cache-Control',
        value: parsedHeaders['cache-control'],
        status: 'good',
        message: 'Cache-Control header is set',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'Cache-Control',
        value: 'Not set',
        status: 'warning',
        message: 'Cache-Control header not set - consider setting appropriate caching policies',
      })
    }

    // Check for Server header (information disclosure)
    maxScore += 10
    if (parsedHeaders.server) {
      const serverValue = parsedHeaders.server
      if (serverValue.includes('version') || /\d+\.\d+/.test(serverValue)) {
        headerAnalysis.value.push({
          name: 'Server',
          value: serverValue,
          status: 'warning',
          message: 'Server header reveals version information, which could be a security risk',
        })
      }
      else {
        score += 5
        headerAnalysis.value.push({
          name: 'Server',
          value: serverValue,
          status: 'warning',
          message: 'Server header present but doesn\'t reveal version information',
        })
      }
    }
    else {
      score += 10
      headerAnalysis.value.push({
        name: 'Server',
        value: 'Not set',
        status: 'good',
        message: 'Server header is not present, which helps prevent information disclosure',
      })
    }

    // Check for X-XSS-Protection
    maxScore += 10
    if (parsedHeaders['x-xss-protection'] === '1; mode=block') {
      score += 10
      headerAnalysis.value.push({
        name: 'X-XSS-Protection',
        value: parsedHeaders['x-xss-protection'],
        status: 'good',
        message: 'X-XSS-Protection is properly set',
      })
    }
    else if (parsedHeaders['x-xss-protection']) {
      score += 5
      headerAnalysis.value.push({
        name: 'X-XSS-Protection',
        value: parsedHeaders['x-xss-protection'],
        status: 'warning',
        message: 'X-XSS-Protection is set but not optimal (should be "1; mode=block")',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'X-XSS-Protection',
        value: 'Not set',
        status: 'warning',
        message: 'X-XSS-Protection header not set',
      })
    }
  }
  else if (headerType.value === 'request') {
    // Request header analysis

    // Check for Content-Type
    maxScore += 20
    if (parsedHeaders['content-type']) {
      score += 20
      headerAnalysis.value.push({
        name: 'Content-Type',
        value: parsedHeaders['content-type'],
        status: 'good',
        message: 'Content-Type is properly set',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'Content-Type',
        value: 'Not set',
        status: 'warning',
        message: 'Content-Type header not set - this may be required for POST/PUT requests',
      })
    }

    // Check for Accept
    maxScore += 15
    if (parsedHeaders.accept) {
      score += 15
      headerAnalysis.value.push({
        name: 'Accept',
        value: parsedHeaders.accept,
        status: 'good',
        message: 'Accept header is properly set',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'Accept',
        value: 'Not set',
        status: 'warning',
        message: 'Accept header not set - this helps specify preferred response format',
      })
    }

    // Check for User-Agent
    maxScore += 10
    if (parsedHeaders['user-agent']) {
      score += 10
      headerAnalysis.value.push({
        name: 'User-Agent',
        value: parsedHeaders['user-agent'],
        status: 'good',
        message: 'User-Agent is set',
      })
    }
    else {
      headerAnalysis.value.push({
        name: 'User-Agent',
        value: 'Not set',
        status: 'warning',
        message: 'User-Agent header not set',
      })
    }
  }

  // Calculate final score
  securityScore.value = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  showAnalysisResults.value = true
}

function getHeaderExample(header: string): string {
  const headerInfo = commonHeaders[headerType.value as keyof typeof commonHeaders][header as keyof typeof commonHeaders[keyof typeof commonHeaders]]
  return headerInfo?.examples?.[0] || ''
}

function addExampleHeader(header: string) {
  const example = getHeaderExample(header)
  const headerText = `${header}: ${example}`

  if (headerInput.value) {
    headerInput.value += `\n${headerText}`
  }
  else {
    headerInput.value = headerText
  }
}

function clearHeaders() {
  headerInput.value = ''
  showAnalysisResults.value = false
}

function getScoreClass(score: number): string {
  if (score >= 80)
    return 'text-green-600'
  if (score >= 60)
    return 'text-yellow-600'
  return 'text-red-600'
}

function getStatusColorClass(status: string): string {
  switch (status) {
    case 'good': return 'text-green-600 bg-green-100'
    case 'warning': return 'text-yellow-600 bg-yellow-100'
    case 'error': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

// Generate some example headers
const exampleRequestHeaders = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36
Accept: application/json, text/plain, */*
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Origin: https://example.com
Referer: https://example.com/login
Connection: keep-alive`

const exampleResponseHeaders = `Content-Type: application/json; charset=utf-8
Cache-Control: max-age=3600, public
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.com
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Access-Control-Allow-Origin: https://example.com
Vary: Accept, Accept-Encoding`

function loadExampleHeaders() {
  headerInput.value = headerType.value === 'request' ? exampleRequestHeaders : exampleResponseHeaders
}
</script>

<template>
  <div class="headers-analyzer-view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">
        HTTP Headers Analyzer
      </h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Input Panel -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex justify-between items-center mb-4">
            <div class="flex space-x-2">
              <button
                class="px-3 py-1 rounded-md text-sm font-medium" :class="[
                  headerType === 'request'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                ]"
                @click="headerType = 'request'"
              >
                Request Headers
              </button>
              <button
                class="px-3 py-1 rounded-md text-sm font-medium" :class="[
                  headerType === 'response'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                ]"
                @click="headerType = 'response'"
              >
                Response Headers
              </button>
            </div>
            <div class="flex space-x-2">
              <button
                class="text-sm text-indigo-600 hover:text-indigo-800"
                @click="loadExampleHeaders"
              >
                Load Example
              </button>
              <button
                class="text-sm text-gray-600 hover:text-gray-800"
                :disabled="!headerInput"
                @click="clearHeaders"
              >
                Clear
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label for="header-input" class="block text-sm font-medium text-gray-700 mb-1">
              Paste your {{ headerType }} headers below (one per line):
            </label>
            <textarea
              id="header-input"
              v-model="headerInput"
              rows="10"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
              placeholder="Header-Name: header value"
            />
          </div>

          <div class="flex justify-end">
            <button
              class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              :disabled="!headerInput.trim()"
              @click="analyzeHeaders"
            >
              Analyze Headers
            </button>
          </div>
        </div>

        <!-- Analysis Results -->
        <div v-if="showAnalysisResults" class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium">
              Analysis Results
            </h2>
            <div class="flex items-center">
              <div class="mr-2 text-sm font-medium">
                Security Score:
              </div>
              <div :class="`text-lg font-bold ${getScoreClass(securityScore)}`">
                {{ securityScore }}/100
              </div>
            </div>
          </div>

          <div class="overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Header
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comment
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(header, index) in headerAnalysis" :key="index" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ header.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                    {{ header.value }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${getStatusColorClass(header.status)}`">
                      {{ header.status.charAt(0).toUpperCase() + header.status.slice(1) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ header.message }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Common Headers Reference -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <h2 class="text-lg font-medium mb-4">
            Common {{ headerType === 'request' ? 'Request' : 'Response' }} Headers
          </h2>

          <div class="space-y-4">
            <div v-for="header in headerSections" :key="header.name" class="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <div class="flex justify-between items-start">
                <h3 class="text-md font-medium text-gray-900">
                  {{ header.name }}
                </h3>
                <button
                  class="text-xs text-indigo-600 hover:text-indigo-800"
                  @click="addExampleHeader(header.name)"
                >
                  Add
                </button>
              </div>
              <p class="text-sm text-gray-600 mb-1">
                {{ header.description }}
              </p>
              <div class="text-xs font-mono bg-gray-50 p-1 rounded">
                {{ header.name }}: {{ header.examples[0] }}
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-medium mb-2">
            Tips
          </h2>
          <ul class="text-sm text-gray-600 space-y-2">
            <li>• Analyze your headers to identify security weaknesses</li>
            <li>• Make sure to use HTTPS and set appropriate security headers</li>
            <li>• Content-Security-Policy helps prevent XSS attacks</li>
            <li>• X-Content-Type-Options prevents MIME sniffing</li>
            <li>• X-Frame-Options prevents clickjacking</li>
            <li>• Strict-Transport-Security enforces HTTPS</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
