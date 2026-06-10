# Validation

bun-router ships with a Laravel-style validation system for incoming request data. You can declare rules as compact strings (`'required|email'`), validate directly inside handlers, attach validation as route middleware, or use the schema-based `InputValidation` middleware for typed schemas with sanitization. Validated data is merged from query parameters, route parameters, and the parsed JSON or form body.

## Basic Usage

The quickest way to validate a route is the fluent `validate()` middleware builder:

```ts
import { jsonBody, Router, validate } from '@stacksjs/bun-router'

const router = new Router()

router.post('/users', async (req) => {
  // Validation already passed — the merged, validated input
  // is available on req.validated
  const data = req.validated

  return Response.json({ user: data }, { status: 201 })
}, 'api', 'users.store', [
  jsonBody(), // parse the JSON body so it is available for validation
  validate()
    .field('name', 'required|string|min:2|max:100')
    .field('email', 'required|email')
    .field('age', 'integer|between:18,120')
    .build(),
])
```

If any rule fails, the middleware throws a `ValidationException` (HTTP 400) and the handler never runs. The data passed to the validator is the merge of `req.query`, `req.params`, `req.jsonBody`, and `req.formBody`.

The builder also accepts multiple fields at once, plus validator configuration:

```ts
import { validate } from '@stacksjs/bun-router'

const userValidation = validate()
  .fields({
    name: 'required|string|min:2',
    email: 'required|email',
    password: 'required|min:8|confirmed', // expects password_confirmation
  })
  .messages({
    'email.required': 'Please provide your email address',
    'password.min': 'Password must be at least 8 characters',
  })
  .attributes({
    email: 'email address',
  })
  .stopOnFirstFailure()
  .build()

router.post('/register', registerHandler, 'api', 'auth.register', [
  jsonBody(),
  userValidation,
])
```

## Rule Strings

Rules use Laravel's familiar string format:

- Multiple rules are separated by a pipe: `'required|string|max:255'`
- Rule parameters follow a colon: `'min:8'`
- Multiple parameters are comma-separated: `'between:18,120'`, `'in:admin,editor,viewer'`
- Nested values can be addressed with dot notation in the field name: `{ 'address.city': 'required|string' }`

## Built-in Rules

| Rule | Example | Passes when... |
| --- | --- | --- |
| `required` | `required` | Value is present and not an empty string, array, or object |
| `string` | `string` | Value is a string |
| `number` | `number` | Value is a number (and not `NaN`) |
| `integer` | `integer` | Value is an integer (numeric strings are coerced) |
| `boolean` | `boolean` | Value is a boolean or `'true'`/`'false'`/`'1'`/`'0'` |
| `email` | `email` | Value is a valid email address |
| `url` | `url` | Value parses as a URL |
| `min` | `min:8` | String/array length or number is at least the given value |
| `max` | `max:255` | String/array length or number is at most the given value |
| `between` | `between:18,120` | Length or number is within the inclusive range |
| `in` | `in:admin,editor` | Value is one of the listed options |
| `not_in` | `not_in:root,admin` | Value is not one of the listed options |
| `regex` | `regex:^[a-z]+$` | Value matches the regular expression |
| `alpha` | `alpha` | Only letters |
| `alpha_num` | `alpha_num` | Only letters and numbers |
| `alpha_dash` | `alpha_dash` | Letters, numbers, dashes, and underscores |
| `date` | `date` | Value parses to a valid date |
| `after` | `after:2026-01-01` | Date is after the given date |
| `before` | `before:2027-01-01` | Date is before the given date |
| `confirmed` | `confirmed` | Value matches `{field}_confirmation` (or `confirmed:otherField`) |
| `same` | `same:password` | Value matches another field |
| `different` | `different:username` | Value differs from another field |
| `json` | `json` | Value is a valid JSON string |
| `uuid` | `uuid` | Value is a valid UUID |
| `array` | `array` | Value is an array |
| `object` | `object` | Value is a plain object |

A `DatabaseRules` set (`unique`, `exists`) is also defined, but these are placeholders: they are not registered by default and require you to provide a real database-backed implementation via `registerRules()`.

## Validating Inside Handlers

The enhanced request exposes Laravel-style `validate()`, `getValidated()`, and `safe()` methods (see the request enhancement helpers in the request module). `req.validate()` validates the merged input and throws on failure — the thrown error carries an `errors` object keyed by field:

```ts
router.post('/posts', async (req) => {
  try {
    const data = await req.validate({
      title: 'required|string|max:200',
      body: 'required|string',
      tags: 'array',
    }, {
      // optional custom messages, keyed by rule or `field.rule`
      'title.required': 'A title is required',
    })

    return Response.json({ post: data }, { status: 201 })
  }
  catch (error) {
    return Response.json({
      message: 'Validation failed',
      errors: (error as Error & { errors: Record<string, string[]> }).errors,
    }, { status: 422 })
  }
})
```

After a successful `validate()` call, the data is also available through:

```ts
// Typed access to the validated data
const data = req.getValidated<{ title: string, body: string }>()

// Safe wrapper with helpers
const safe = req.safe<{ title: string, body: string, tags: string[] }>()
safe.only(['title', 'body']) // pick fields
safe.except(['tags']) // omit fields
safe.all() // everything
safe.has('title') // boolean
safe.get('title') // single value
safe.merge({ authorId: 1 }) // merge extra data
```

## The Validator Class

For full control — including custom rules — use the `Validator` class directly (defined in the validation module):

```ts
import { Validator } from '@stacksjs/bun-router'

const validator = new Validator({
  stopOnFirstFailure: false, // stop validating a field after its first failure
  customMessages: {
    'email.required': 'Please provide your email address',
  },
  customAttributes: {
    email: 'email address',
  },
})

// Returns an errors object — empty when validation passes
const errors = await validator.validate(
  { email: 'not-an-email' },
  { email: 'required|email' },
)
// => { email: ['The email address field must be a valid email address.'] }

// Or throw a ValidationException on failure
await validator.validateOrFail(data, rules)
```

### Custom Rules

Register custom rules with `registerRule()`. A rule has a `name`, a `validate` function (which may be async), and a `message` (string or function). Use `:field` in string messages as a placeholder for the field name:

```ts
validator.registerRule({
  name: 'phone',
  validate: (value, parameters, field, data) => {
    return typeof value === 'string' && /^\+?[\d\s\-()]+$/.test(value)
  },
  message: 'The :field field must be a valid phone number.',
})

const errors = await validator.validate(
  { phone: '+1-555-0123' },
  { phone: 'required|phone' },
)
```

### Fluent Rule Builder

The `rule()` factory builds rule strings programmatically:

```ts
import { rule } from '@stacksjs/bun-router'

const rules = {
  email: rule().required().email().build(), // 'required|email'
  age: rule().integer().between(18, 120).build(), // 'integer|between:18,120'
  role: rule().required().in('admin', 'editor', 'viewer').build(),
}
```

### Validation Helpers

`ValidationHelpers` offers shortcuts for one-off checks:

```ts
import { ValidationHelpers } from '@stacksjs/bun-router'

const errors = await ValidationHelpers.validateValue('abc', 'required|min:5') // string[]
const ok = await ValidationHelpers.passes('user@example.com', 'required|email') // true
const bad = await ValidationHelpers.fails('nope', 'email') // true
```

`createValidationMiddleware(rules, config?)` is the lower-level factory behind the `validate()` builder, if you prefer constructing the middleware directly:

```ts
import { createValidationMiddleware } from '@stacksjs/bun-router'

const middleware = createValidationMiddleware({
  name: 'required|string|min:2',
  email: 'required|email',
}, {
  customMessages: { 'email.email': 'That does not look like an email.' },
})
```

## Error Responses

When validation middleware fails, it throws a `ValidationException` with status `400` and the per-field messages. Use `router.onError()` to convert it into a response:

```ts
import { Errors, Router } from '@stacksjs/bun-router'

const router = new Router()

router.onError((error) => {
  if (error instanceof Errors.ValidationException) {
    return error.toResponse()
  }

  return new Response('Internal Server Error', { status: 500 })
})
```

`ValidationException.toResponse()` produces a JSON body in this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-06-09T12:00:00.000Z",
    "fields": {
      "email": ["The email field must be a valid email address."],
      "name": ["The name field is required."]
    }
  }
}
```

## Schema-Based Validation: InputValidation Middleware

For typed schemas covering the query string, body, headers, and route parameters in one place — with built-in sanitization — use the `inputValidation` middleware:

```ts
import { inputValidation, Router } from '@stacksjs/bun-router'

const router = new Router()

router.post('/api/products/{category}', createProductHandler, 'api', 'products.store', [
  inputValidation({
    schemas: {
      params: {
        category: { type: 'string', enum: ['books', 'games', 'music'] },
      },
      query: {
        draft: { type: 'boolean' },
      },
      body: {
        name: { type: 'string', required: true, min: 2, max: 100 },
        price: { type: 'number', required: true, min: 0 },
        sku: { type: 'regex', pattern: /^[A-Z]{3}-\d{4}$/, required: true },
        contact: {
          // nested schemas are supported
          email: { type: 'email', required: true },
          website: { type: 'url' },
        },
      },
    },
  }),
])
```

The middleware parses JSON, URL-encoded, and multipart bodies, validates everything against the schemas, and attaches the validated body to `req.validatedBody`. On failure it returns a `400` response directly:

```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "errors": [
    { "field": "name", "message": "Field is required", "value": null, "rule": "required" },
    { "field": "price", "message": "Must be at least 0", "value": -5, "rule": "min" }
  ]
}
```

### Schema Rule Fields

Each field in a schema is a `ValidationRule`:

```ts
interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'regex' | 'custom'
  required?: boolean // fail when missing/empty
  min?: number // min length (strings) or min value (numbers)
  max?: number // max length (strings) or max value (numbers)
  pattern?: RegExp // regex the value must match
  enum?: unknown[] // allowed values
  custom?: (value: unknown) => boolean | string // return true, or an error message
  sanitize?: boolean // HTML-escape and trim string values
  transform?: (value: unknown) => unknown // applied after sanitization
}
```

Custom rules return `true` to pass, or a string to use as the error message:

```ts
const schema = {
  username: {
    type: 'custom' as const,
    required: true,
    custom: (value: unknown) =>
      typeof value === 'string' && !value.includes(' ')
        ? true
        : 'Username must not contain spaces',
  },
}
```

### Sanitization and Transformation

When `sanitize` is enabled (or `sanitizeByDefault` is on, which is the default), string values are trimmed and the characters `<`, `>`, `"`, `'`, and `&` are escaped to HTML entities. A `transform` function, when provided, runs afterwards:

```ts
const schema = {
  email: {
    type: 'email' as const,
    required: true,
    transform: value => String(value).toLowerCase(),
  },
}
```

### InputValidation Options

```ts
inputValidation({
  // Enable/disable the middleware (default: true, also configurable
  // via server.security.inputValidation in router.config.ts)
  enabled: true,

  // Schemas for each part of the request
  schemas: {
    query: { /* ... */ },
    body: { /* ... */ },
    headers: { /* ... */ },
    params: { /* ... */ },
  },

  // Sanitize all string values unless a rule opts out (default: true)
  sanitizeByDefault: true,

  // Reject fields not present in the schema. Both strictMode: true and
  // allowUnknownFields: false are required to enforce this.
  strictMode: false, // default
  allowUnknownFields: true, // default

  // Maximum nesting depth for nested schemas (default: 10)
  maxDepth: 10,

  // Customize the error response
  onValidationError: errors =>
    Response.json({ failed: errors.map(e => e.field) }, { status: 422 }),
})
```

Like other security middleware, `InputValidation` reads defaults from the `server.security.inputValidation` section of your `router.config.ts`, so you can configure it globally:

```ts
// router.config.ts
export default {
  server: {
    security: {
      inputValidation: {
        enabled: true,
        sanitizeByDefault: true,
        strictMode: false,
        allowUnknownFields: true,
        maxDepth: 10,
      },
    },
  },
}
```

## Validator Configuration Reference

Options accepted by `new Validator(config)`, `createValidationMiddleware(rules, config)`, and the `validate().configure(config)` builder:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `stopOnFirstFailure` | `boolean` | `false` | Stop validating a field after its first failing rule |
| `bail` | `boolean` | `false` | Alias behavior for stopping on the first failure of a field |
| `customMessages` | `Record<string, string>` | — | Override messages, keyed by `'rule'` or `'field.rule'`; supports `:field`/`:attribute` placeholders |
| `customAttributes` | `Record<string, string>` | — | Human-friendly names used for `:field` in messages (underscores are otherwise replaced with spaces) |
