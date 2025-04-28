# Resource Routes

Resource routes allow you to quickly define a set of RESTful routes for a resource. This is particularly useful when building APIs or web applications that follow REST conventions for CRUD operations _(Create, Read, Update, Delete)_.

## Basic Resource Routes

To define a complete set of resource routes, use the `resource` method:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

router.resource('posts', 'PostsController')
```

This single line creates the following routes:

| HTTP Method | URI               | Action     | Route Name      |
|-------------|-------------------|------------|-----------------|
| GET         | /posts            | index      | posts.index     |
| GET         | /posts/create     | create     | posts.create    |
| POST        | /posts            | store      | posts.store     |
| GET         | /posts/{id}       | show       | posts.show      |
| GET         | /posts/{id}/edit  | edit       | posts.edit      |
| PUT/PATCH   | /posts/{id}       | update     | posts.update    |
| DELETE      | /posts/{id}       | destroy    | posts.destroy   |

## Controller-Based Resources

In the previous example, we passed a controller name as a string: `'PostsController'`. This assumes you have a controller class or module with methods corresponding to the resource actions:

```typescript
// PostsController.ts
export default class PostsController {
  // GET /posts
  async index(req) {
    const posts = await fetchAllPosts()
    return Response.json(posts)
  }

  // GET /posts/create
  async create(req) {
    return new Response('Create Post Form')
  }

  // POST /posts
  async store(req) {
    const data = await req.json()
    const post = await createPost(data)
    return Response.json(post, { status: 201 })
  }

  // GET /posts/{id}
  async show(req) {
    const post = await fetchPost(req.params.id)
    return Response.json(post)
  }

  // GET /posts/{id}/edit
  async edit(req) {
    const post = await fetchPost(req.params.id)
    return new Response(`Edit Post ${req.params.id} Form`)
  }

  // PUT /posts/{id}
  async update(req) {
    const data = await req.json()
    const post = await updatePost(req.params.id, data)
    return Response.json(post)
  }

  // DELETE /posts/{id}
  async destroy(req) {
    await deletePost(req.params.id)
    return new Response(null, { status: 204 })
  }
}
```

## Using Callback Functions

Instead of a controller name, you can also pass an object with handler functions:

```typescript
router.resource('posts', {
  index: (req) => {
    return Response.json({ posts: [] })
  },

  show: (req) => {
    return Response.json({ id: req.params.id })
  },

  // Define other action handlers as needed
})
```

## Custom Resource Options

You can customize how resource routes are generated:

```typescript
router.resource('photos', 'PhotosController', {
  // Customize parameter name (default is 'id')
  parameterName: 'photoId',

  // Only generate specific actions
  only: ['index', 'show', 'store'],

  // Exclude specific actions
  except: ['create', 'edit'],

  // Add constraints to the parameter
  constraints: {
    photoId: 'uuid'
  },

  // Customize names for the routes
  names: {
    index: 'photos.all',
    show: 'photos.view'
  },

  // Add middleware to all resource routes
  middleware: [authMiddleware()]
})
```

## Nested Resource Routes

Resources can be nested to express parent-child relationships:

```typescript
router.resource('posts.comments', 'CommentsController')
```

This generates nested resource routes such as:

| HTTP Method | URI                                   | Action     | Route Name              |
|-------------|---------------------------------------|------------|-------------------------|
| GET         | /posts/{postId}/comments              | index      | posts.comments.index    |
| GET         | /posts/{postId}/comments/create       | create     | posts.comments.create   |
| POST        | /posts/{postId}/comments              | store      | posts.comments.store    |
| GET         | /posts/{postId}/comments/{id}         | show       | posts.comments.show     |
| GET         | /posts/{postId}/comments/{id}/edit    | edit       | posts.comments.edit     |
| PUT/PATCH   | /posts/{postId}/comments/{id}         | update     | posts.comments.update   |
| DELETE      | /posts/{postId}/comments/{id}         | destroy    | posts.comments.destroy  |

The parent resource ID is available in `req.params.postId` and the comment ID in `req.params.id`.

## Shallow Nesting

For nested resources, you might want to avoid deep nesting for certain actions. Use the `shallow` option for this:

```typescript
router.resource('posts.comments', 'CommentsController', {
  shallow: true
})
```

This generates routes like:

| HTTP Method | URI                                   | Action     | Route Name              |
|-------------|---------------------------------------|------------|-------------------------|
| GET         | /posts/{postId}/comments              | index      | posts.comments.index    |
| GET         | /posts/{postId}/comments/create       | create     | posts.comments.create   |
| POST        | /posts/{postId}/comments              | store      | posts.comments.store    |
| GET         | /comments/{id}                        | show       | posts.comments.show     |
| GET         | /comments/{id}/edit                   | edit       | posts.comments.edit     |
| PUT/PATCH   | /comments/{id}                        | update     | posts.comments.update   |
| DELETE      | /comments/{id}                        | destroy    | posts.comments.destroy  |

Notice how the show, edit, update, and destroy routes are not nested.

## API-Only Resources

If you're building an API and don't need the create/edit routes (which are typically for forms), you can use the `apiOnly` option:

```typescript
router.resource('products', 'ProductsController', {
  apiOnly: true
})
```

This generates only the following routes:

| HTTP Method | URI               | Action     | Route Name      |
|-------------|-------------------|------------|-----------------|
| GET         | /products         | index      | products.index  |
| POST        | /products         | store      | products.store  |
| GET         | /products/{id}    | show       | products.show   |
| PUT/PATCH   | /products/{id}    | update     | products.update |
| DELETE      | /products/{id}    | destroy    | products.destroy|

## Resource Routes in Groups

Resource routes can be defined within route groups:

```typescript
router.group({
  prefix: '/api',
  middleware: [apiAuthMiddleware()],
}, () => {
  router.resource('users', 'UsersController')
  router.resource('posts', 'PostsController')

  // Nested resources
  router.resource('posts.comments', 'CommentsController')
})
```

## Practical Example: Blog API

Here's a complete example of a blog API using resource routes:

```typescript
import { auth, BunRouter, jsonBody } from 'bun-router'

const router = new BunRouter()

// Apply global middleware
router.use(jsonBody())

// Public routes
router.get('/', () => new Response('Blog API'))

// API routes with authentication
router.group({
  prefix: '/api',
  middleware: [auth()],
}, () => {
  // Users resource
  router.resource('users', 'UsersController', {
    except: ['create', 'edit'],
    middleware: {
      index: [adminOnlyMiddleware()],
      destroy: [adminOnlyMiddleware()],
    }
  })

  // Posts resource (API only)
  router.resource('posts', 'PostsController', {
    apiOnly: true,
    middleware: {
      store: [authorRoleMiddleware()],
      update: [ownerOnlyMiddleware()],
      destroy: [ownerOnlyMiddleware()],
    }
  })

  // Comments as a nested resource
  router.resource('posts.comments', 'CommentsController', {
    apiOnly: true,
    shallow: true,
    middleware: {
      destroy: [ownerOrModeratorMiddleware()]
    }
  })

  // Categories (read-only)
  router.resource('categories', 'CategoriesController', {
    only: ['index', 'show']
  })
})

// Start the server
router.serve({ port: 3000 })
```

## Custom Resource Action Methods

If you need additional actions that don't fit the standard CRUD pattern, you can define them separately:

```typescript
// Define the resource
router.resource('posts', 'PostsController')

// Add custom actions
router.post('/posts/{id}/publish', 'PostsController@publish', 'posts.publish')
router.post('/posts/{id}/unpublish', 'PostsController@unpublish', 'posts.unpublish')
router.get('/posts/{id}/history', 'PostsController@history', 'posts.history')
```

Your controller would then include methods for these custom actions:

```typescript
// In PostsController
async publish(req) {
  await publishPost(req.params.id)
  return Response.json({ published: true })
}

async unpublish(req) {
  await unpublishPost(req.params.id)
  return Response.json({ published: false })
}

async history(req) {
  const history = await getPostHistory(req.params.id)
  return Response.json(history)
}
```

## Resource Middleware for Specific Actions

You can apply middleware to specific resource actions:

```typescript
router.resource('posts', 'PostsController', {
  middleware: {
    index: [cachingMiddleware()],
    store: [validatePostMiddleware()],
    update: [validatePostMiddleware(), ownerOnlyMiddleware()],
    destroy: [ownerOnlyMiddleware()]
  }
})
```

## Best Practices

When working with resource routes:

1. **Follow RESTful Conventions**: Stick to standard REST patterns for consistency.

2. **Use Appropriate HTTP Methods**: GET for retrieval, POST for creation, PUT/PATCH for updates, and DELETE for removal.

3. **Organize Controllers Logically**: Keep controller methods organized around resources.

4. **Consider Nesting Carefully**: Deeply nested resources can lead to complex URLs; use shallow nesting when appropriate.

5. **Apply Action-Specific Middleware**: Add middleware only to the actions that need it to keep your application efficient.

## Next Steps

Now that you understand resource routes, check out these related topics:

- [Route Parameters](/features/route-parameters) - Learn more about parameter handling
- [Named Routes](/features/named-routes) - Understand how to use the auto-generated route names
- [Middleware](/features/middleware) - Apply middleware to resource routes
