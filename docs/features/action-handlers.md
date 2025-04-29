# Action Handlers

In bun-router, "action handlers" are functions or classes that process HTTP requests and return responses. This page explains the different ways to define action handlers and how to use them effectively.

## Types of Action Handlers

bun-router supports three types of action handlers:

1. **Inline Functions**: Direct function handlers defined in your route declaration
2. **Action Classes**: Classes with a `handle` method that process requests
3. **String Paths**: Strings that reference action classes to be loaded dynamically

## Inline Function Handlers

The simplest way to define an action handler is as a function directly in your route declaration:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Basic inline handler
router.get('/hello', (req) => {
  return new Response('Hello, World!')
})

// Handler using request parameters
router.get('/users/{id}', (req) => {
  const userId = req.params.id
  return Response.json({ id: userId, name: `User ${userId}` })
})

// Async handler with database access
router.get('/products', async (req) => {
  const products = await fetchProductsFromDatabase()
  return Response.json(products)
})
```

## Action Classes

For more complex handlers, you can create classes that implement the `ActionHandlerClass` interface:

```typescript
import type { ActionHandlerClass, EnhancedRequest } from 'bun-router'
import { Router } from 'bun-router'

// Define an action class
class UserController implements ActionHandlerClass {
  async handle(req: EnhancedRequest): Promise<Response> {
    const users = await this.fetchUsers()
    return Response.json(users)
  }

  private async fetchUsers() {
    // Implementation of user fetching logic
    return [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Smith' }]
  }
}

const router = new Router()

// Use the action class for a route
router.get('/users', UserController)
```

Using action classes has several benefits:

- Better organization for complex logic
- Ability to use dependency injection
- Reuse the same controller for multiple routes
- Separation of concerns

## Dynamic Action Loading via String Paths

bun-router can dynamically load action handlers from string paths, which is particularly useful for organizing large applications:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Load action from 'actions/HomeController'
router.get('/', 'HomeController')

// Load action from 'actions/users/show'
router.get('/users/{id}', 'Users/Show')
```

When you provide a string path, bun-router:

1. Converts the path to a valid file path (e.g., `Users/Show` becomes `users_show`)
2. Looks for the file in the `actions` directory
3. Loads the default export which should be an action class
4. Instantiates the class and calls its `handle` method

Example action file (`actions/users_show.ts`):

```typescript
import type { ActionHandlerClass, EnhancedRequest } from 'bun-router'
import { UserService } from '../services/UserService'

export default class ShowUserAction implements ActionHandlerClass {
  private userService = new UserService()

  async handle(req: EnhancedRequest): Promise<Response> {
    try {
      const user = await this.userService.findById(req.params.id)

      if (!user) {
        return new Response('User not found', { status: 404 })
      }

      return Response.json(user)
    }
    catch (error) {
      console.error('Error fetching user:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}
```

## Using Action Handlers with Resources

Action handlers work especially well with resource routes:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Define a complete resource with a controller path
router.resource('posts', 'PostsController')
```

This creates routes that map to specific methods on your controller:

| HTTP Method | Path         | Action Method     | Action Path               |
|-------------|--------------|------------------|---------------------------|
| GET         | /posts       | index()          | PostsController/index     |
| GET         | /posts/{id}  | show()           | PostsController/show      |
| POST        | /posts       | store()          | PostsController/store     |
| PUT         | /posts/{id}  | update()         | PostsController/update    |
| DELETE      | /posts/{id}  | destroy()        | PostsController/destroy   |

## Action Handlers with Middleware

You can apply middleware to action handlers:

```typescript
// Apply middleware to routes with specific action handlers
router.get('/admin/dashboard', 'Admin/DashboardController', {
  middleware: [authMiddleware, adminMiddleware]
})

// Apply middleware to an entire resource
router.resource('users', 'UsersController', {
  middleware: {
    index: [authMiddleware, adminMiddleware],
    show: [authMiddleware],
    update: [authMiddleware, ownerMiddleware],
    destroy: [authMiddleware, adminMiddleware]
  }
})
```

## Organizing Action Handlers

For larger applications, it's recommended to organize your action handlers using a consistent pattern:

```
src/
├── actions/
│   ├── home.ts
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   └── logout.ts
│   ├── users/
│   │   ├── index.ts
│   │   ├── show.ts
│   │   ├── store.ts
│   │   ├── update.ts
│   │   └── destroy.ts
│   └── posts/
│       ├── index.ts
│       ├── show.ts
│       └── ...
└── ...
```

## Single Action Classes vs. Controller Classes

bun-router supports both single-action classes and controller-style classes:

### Single Action Pattern

Each file handles one specific action:

```typescript
// actions/posts/show.ts
export default class ShowPostAction implements ActionHandlerClass {
  async handle(req: EnhancedRequest): Promise<Response> {
    // Logic to show a specific post
  }
}
```

### Controller Pattern

A single class handles multiple related actions:

```typescript
// PostsController.ts
export default class PostsController {
  async index(req: EnhancedRequest): Promise<Response> {
    // Return list of posts
  }

  async show(req: EnhancedRequest): Promise<Response> {
    // Show a specific post
  }

  async store(req: EnhancedRequest): Promise<Response> {
    // Create a new post
  }

  // Other action methods...
}
```

## Error Handling in Action Handlers

It's a good practice to handle errors properly in your action handlers:

```typescript
router.get('/api/data', async (req) => {
  try {
    const data = await fetchData()
    return Response.json(data)
  }
  catch (error) {
    console.error('Error fetching data:', error)

    // Return appropriate error response
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```

## Testing Action Handlers

Action handlers can be tested independently of the router:

```typescript
import { expect, test } from 'bun:test'
import ShowUserAction from '../src/actions/users/show'

test('ShowUserAction returns a user when found', async () => {
  // Setup
  const action = new ShowUserAction()
  const mockRequest = {
    params: { id: '1' },
    // Other request properties
  } as EnhancedRequest

  // Execute
  const response = await action.handle(mockRequest)
  const data = await response.json()

  // Verify
  expect(response.status).toBe(200)
  expect(data.id).toBe('1')
  expect(data.name).toBeDefined()
})
```

## Best Practices

When working with action handlers:

1. **Use the Right Type for the Job**: Choose between inline functions, classes, or string paths based on complexity
2. **Consistent Organization**: Follow a consistent pattern for organizing your actions
3. **Keep Handlers Focused**: Each handler should do one thing well
4. **Dependency Injection**: Use constructor injection to make handlers testable
5. **Error Handling**: Always handle errors and return appropriate responses
6. **Validation**: Validate input before processing
7. **Logging**: Include appropriate logging for debugging and monitoring

## Next Steps

Now that you understand action handlers, check out these related topics:

- [Route Parameters](/features/route-parameters) - Working with parameters in action handlers
- [Middleware](/features/middleware) - Applying middleware to action handlers
- [Resource Routes](/features/resource-routes) - Using actions with RESTful resources
