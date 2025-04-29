# Route Parameters

Route parameters allow you to capture values from URL segments and access them in your route handlers. This is useful for creating dynamic routes such as user profiles, blog posts, or any resource identified by an ID or slug.

## Basic Parameters

To define a route parameter, use curly braces `{}` in your route path:

```typescript
import { Router } from 'bun-router'

const router = new Router()

router.get('/users/{id}', (req) => {
  // Access the 'id' parameter
  const userId = req.params.id
  return Response.json({ userId })
})
```

When a request is made to `/users/123`, the `id` parameter will be captured as `"123"` and available in `req.params.id`.

## Multiple Parameters

You can include multiple parameters in a single route:

```typescript
router.get('/posts/{postId}/comments/{commentId}', (req) => {
  const { postId, commentId } = req.params
  return Response.json({ postId, commentId })
})
```

A request to `/posts/42/comments/7` would make `req.params.postId` equal to `"42"` and `req.params.commentId` equal to `"7"`.

## Parameter Constraints

bun-router allows you to add constraints to parameters to ensure they match specific patterns. This is useful for validating parameters and improving route matching precision.

### Built-in Constraints

#### Number Constraint

Ensures that the parameter contains only numeric characters:

```typescript
router.get('/users/{id}', getUserHandler)
  .whereNumber('id')
```

This will match `/users/123` but not `/users/abc`.

#### Alpha Constraint

Ensures that the parameter contains only alphabetic characters:

```typescript
router.get('/categories/{name}', getCategoryHandler)
  .whereAlpha('name')
```

This will match `/categories/electronics` but not `/categories/electronics-123`.

#### AlphaNumeric Constraint

Ensures that the parameter contains only alphanumeric characters:

```typescript
router.get('/products/{sku}', getProductHandler)
  .whereAlphaNumeric('sku')
```

This will match `/products/ABC123` but not `/products/ABC-123`.

#### UUID Constraint

Ensures that the parameter is a valid UUID:

```typescript
router.get('/resources/{id}', getResourceHandler)
  .whereUuid('id')
```

This will match `/resources/123e4567-e89b-12d3-a456-426614174000` but not `/resources/123`.

#### Value List Constraint

Ensures that the parameter is one of a specified list of values:

```typescript
router.get('/orders/{status}', getOrdersHandler)
  .whereIn('status', ['pending', 'processing', 'completed', 'cancelled'])
```

This will match `/orders/pending` but not `/orders/unknown`.

### Custom Pattern Constraints

For more complex validation, you can use a regular expression:

```typescript
router.get('/files/{filename}', getFileHandler)
  .where('filename', /^[a-z0-9_-]+\.(jpg|png|pdf)$/)
```

This will match `/files/document-123.pdf` but not `/files/script.js`.

## Optional Parameters

bun-router doesn't directly support optional parameters in the URL path, but you can achieve this by defining multiple routes:

```typescript
// Route with parameter
router.get('/users/{id}', getUserDetailHandler)

// Route without parameter
router.get('/users', getAllUsersHandler)
```

## Query Parameters

Query parameters (the part after `?` in a URL) are automatically parsed and available in the `req.query` object:

```typescript
// For a request to /search?q=Router&page=1
router.get('/search', (req) => {
  const query = req.query.q
  const page = req.query.page

  return Response.json({ query, page })
})
```

## Type Safety with Parameters

When using TypeScript, `bun-router` provides type safety for your route parameters:

```typescript
// The params type is inferred from the route path
router.get('/users/{id}/posts/{postId}', (req) => {
  // TypeScript knows that req.params has 'id' and 'postId' properties
  const { id, postId } = req.params
  return Response.json({ userId: id, postId })
})
```

## Parameter Transformation

If you need to transform parameters before using them (e.g., converting strings to numbers), you can do so in your route handler:

```typescript
router.get('/products/{id}', (req) => {
  // Convert string parameter to number
  const productId = Number.parseInt(req.params.id, 10)

  // Handle possible NaN result
  if (Number.isNaN(productId)) {
    return new Response('Invalid product ID', { status: 400 })
  }

  return Response.json({ productId })
})
```

## Practical Examples

### User Profile Route

```typescript
router.get('/users/{username}', async (req) => {
  const { username } = req.params

  // Fetch user from database
  const user = await getUserByUsername(username)

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  return Response.json(user)
}).whereAlphaNumeric('username')
```

### Blog Post with Slug

```typescript
router.get('/blog/{year}/{month}/{slug}', async (req) => {
  const { year, month, slug } = req.params

  // Validate year and month
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) {
    return new Response('Invalid date format', { status: 400 })
  }

  // Fetch blog post
  const post = await getBlogPost(Number.parseInt(year), Number.parseInt(month), slug)

  if (!post) {
    return new Response('Post not found', { status: 404 })
  }

  return Response.json(post)
})
```

### API Versioning

```typescript
router.get('/api/{version}/users', (req) => {
  const { version } = req.params

  // Handle different API versions
  if (version === 'v1') {
    return handleV1Users()
  }
  else if (version === 'v2') {
    return handleV2Users()
  }
  else {
    return new Response('Unsupported API version', { status: 400 })
  }
}).whereIn('version', ['v1', 'v2'])
```

## Next Steps

Now that you understand route parameters, you might want to explore related topics:

- [Route Groups](/features/route-groups) - Group related routes together
- [Named Routes](/features/named-routes) - Name your routes for URL generation
- [Resource Routes](/features/resource-routes) - Create RESTful resource routes
