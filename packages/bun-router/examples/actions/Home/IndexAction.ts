import type { ActionHandlerClass, EnhancedRequest } from '../../../src/types'

/**
 * @description The home page action handler that renders the main landing page of the application.
 * Supports theme customization and internationalization through query parameters.
 *
 * @tags Home, UI
 * @security none
 *
 * @param {string} query.theme - Optional theme preference (light/dark)
 * @param {string} query.lang - Optional language preference (en/es/fr)
 *
 * @response {200} Successfully rendered the home page
 * @response {400} Invalid query parameters
 * @response {500} Server error while rendering the page
 *
 * @example request
 * ```
 * GET /?theme=dark&lang=es HTTP/1.1
 * Host: example.com
 * Accept: text/html
 * ```
 *
 * @example response
 * ```
 * HTTP/1.1 200 OK
 * Content-Type: text/html
 *
 * <!DOCTYPE html>
 * <html lang="es">
 *   <head>
 *     <title>Bienvenido a Bun Router</title>
 *     ...
 *   </head>
 *   <body class="dark">
 *     ...
 *   </body>
 * </html>
 * ```
 */
export default class IndexAction implements ActionHandlerClass {
  async handle(request: EnhancedRequest): Promise<Response> {
    // Get query parameters
    const url = new URL(request.url)
    const theme = url.searchParams.get('theme') || 'light'
    const lang = url.searchParams.get('lang') || 'en'

    // Validate parameters
    if (theme !== 'light' && theme !== 'dark') {
      return new Response('Invalid theme parameter', { status: 400 })
    }

    if (!['en', 'es', 'fr'].includes(lang)) {
      return new Response('Invalid language parameter', { status: 400 })
    }

    // In a real application, you would likely use a template engine
    // or return a React/Vue component here
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Bun Router</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-100 ${theme === 'dark' ? 'dark' : ''}">
          <div class="container mx-auto px-4 py-8">
            <h1 class="text-4xl font-bold mb-4">Welcome to Bun Router</h1>
            <p class="text-lg text-gray-700 mb-4">
              A fast, type-safe router for Bun applications.
            </p>
            <div class="flex space-x-4">
              <a href="/about" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                About Us
              </a>
              <a href="/contact" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Contact
              </a>
            </div>
          </div>
        </body>
      </html>
    `

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  }
}
