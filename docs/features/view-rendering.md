# View Rendering

bun-router provides a convenient way to render views (HTML templates) with the `router.view()` method. This feature makes it easy to create web applications that serve dynamic HTML content.

## Basic View Rendering

The most basic usage of `router.view()` defines a route that renders a template with data:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Render a view for the homepage
router.view('/', 'home', {
  title: 'Welcome to my site',
  message: 'Hello, World!',
})
```

This will:

1. Register a GET route at the path `/`
2. Render the `home` template (e.g., `resources/views/home.html`)
3. Pass the data object with `title` and `message` to the template

## View Method Signature

The `view` method is flexible and supports multiple parameter combinations:

```typescript
router.view(
  path: string,                 // The URL path for the route
  viewOrData: string | object,  // The view name or data (if view name is derived from path)
  dataOrOptions: object,        // The data to pass to the view or rendering options
  optionsOrType: object | 'web' | 'api', // Rendering options or route type
  typeOrName: 'web' | 'api' | string,   // Route type or route name
  name?: string                 // Route name (if not provided in previous parameter)
): Promise<Router>
```

## View Rendering Options

You can pass rendering options to customize the view output:

```typescript
router.view('/about', 'about', {
  company: 'Acme Corp'
}, {
  layout: 'main', // Use main.html as the layout template
  status: 200, // HTTP status code (defaults to 200)
  headers: { // Additional response headers
    'Cache-Control': 'max-age=3600'
  }
})
```

## Layouts

Layouts provide a way to wrap content in a common structure (header, footer, navigation). The rendered view will replace the `{{content}}` placeholder in the layout:

```typescript
// Using the layout option
router.view('/dashboard', 'dashboard', userData, {
  layout: 'admin' // Uses resources/views/layouts/admin.html
})
```

You can also set a default layout in your router configuration:

```typescript
const router = new Router({
  views: {
    defaultLayout: 'main',
    // Other view config options...
  }
})
```

## Naming Routes

You can give the view route a name for URL generation:

```typescript
// Last parameter as the route name
router.view('/contact', 'contact', contactData, {}, 'web', 'contact.page')

// Or directly as the typeOrName parameter
router.view('/contact', 'contact', contactData, {}, 'contact.page')

// Later, generate URL to this route
const contactUrl = router.route('contact.page')
```

## Deriving View Name From Path

If you follow a convention where route paths correspond to view names, you can skip specifying the view name:

```typescript
// The view name 'products' is derived from the path '/products'
router.view('/products', { products: productsList })
```

## API vs Web Routes

You can specify if a view route is for API or web:

```typescript
// Default is 'web'
router.view('/profile', 'profile', userData)

// Explicitly mark as web route
router.view('/profile', 'profile', userData, {}, 'web')

// API route with HTML response
router.view('/api/docs', 'api-docs', docsData, {}, 'api')
```

## Template Processing

By default, bun-router uses a simple template engine that supports:

- Variable substitution: `&#123;&#123; variable &#125;&#125;`
- Conditionals: `&#123;&#123;#if condition&#125;&#125; content &#123;&#123;else&#125;&#125; alternative &#123;&#123;/if&#125;&#125;`
- Loops: `&#123;&#123;#each items&#125;&#125; content with &#123;&#123; this.property &#125;&#125; &#123;&#123;/each&#125;&#125;`

Example template:

```html
<h1>&#123;&#123; title &#125;&#125;</h1>

&#123;&#123;#if user&#125;&#125;
  <p>Welcome back, &#123;&#123; user.name &#125;&#125;!</p>
&#123;&#123;else&#125;&#125;
  <p>Please log in</p>
&#123;&#123;/if&#125;&#125;

<h2>Products:</h2>
<ul>
  &#123;&#123;#each products&#125;&#125;
    <li>&#123;&#123; this.name &#125;&#125; - $&#123;&#123; this.price &#125;&#125;</li>
  &#123;&#123;/each&#125;&#125;
</ul>
```

## Custom Template Engines

You can configure a custom template engine in the router options:

```typescript
const router = new Router({
  views: {
    viewsPath: 'resources/views',
    extensions: ['.html', '.eta'],
    customRenderer: (template, data, options) => {
      // Your custom rendering logic
      return customEngine.render(template, data)
    }
  }
})
```

## Practical Example

Here's a complete example showing how to use view rendering for a small web application:

```typescript
import { Router } from 'bun-router'

const router = new Router({
  views: {
    viewsPath: 'resources/views',
    extensions: ['.html'],
    cache: true, // Cache templates in production
    defaultLayout: 'main',
  }
})

// Home page
router.view('/', 'home', {
  title: 'Welcome',
  featured: await getFeaturedItems()
}, {}, 'home.page')

// About page
router.view('/about', 'about', {
  title: 'About Us',
  team: teamMembers
}, {}, 'about.page')

// Dynamic product page
router.get('/products/{id}', async (req) => {
  const product = await getProductById(req.params.id)
  if (!product) {
    return new Response('Product not found', { status: 404 })
  }

  // Render view manually for dynamic routes
  const html = await router.renderView('product-detail', {
    product,
    relatedProducts: await getRelatedProducts(product.id)
  }, { layout: 'main' })

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
})

// Start the server
router.serve({ port: 3000 })
```

## Best Practices

1. **Organize View Files**: Keep a consistent directory structure for your views
2. **Use Layouts**: Create reusable layouts for consistent page structure
3. **Partial Templates**: Break complex templates into smaller, reusable partials
4. **Sanitize Data**: Ensure data passed to templates is properly sanitized to prevent XSS attacks
5. **Cache in Production**: Enable template caching in production for better performance

## Next Steps

Check out these related topics:

- [Route Parameters](/features/route-parameters) - Handling dynamic parameters in routes
- [Named Routes](/features/named-routes) - More on naming routes for URL generation
