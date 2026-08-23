# Typing the strings

A router deals in strings that are really identifiers. `'Actions/CreateUser'` names a
file. `'auth'` names a middleware. `'users.show'` names a route. The compiler sees
three strings and has nothing to say about any of them, so a typo in the first is a
500 on one endpoint, a typo in the third is a thrown error at render time — and a
typo in the second is an endpoint that quietly serves without the middleware you
thought was on it.

The router cannot know which ones exist. Your application can, so it says so.

## Declaring what exists

```ts
// types/router.d.ts
declare module '@stacksjs/bun-router' {
  interface RouterTypeRegistry {
    actions: 'Actions/CreateUserAction' | 'Actions/ListUsersAction'
    middleware: 'auth' | 'throttle' | 'signed'
    routes: {
      'users.index': '/users'
      'users.show': '/users/{id}'
      'posts.show': '/posts/{slug?}'
    }
  }
}
```

From that point on:

```ts
router.post('/users', 'Actions/CreateUsrAction')
//                     ^ Argument of type '"Actions/CreateUsrAction"' is not assignable…

router.get('/admin', handler, 'web', 'admin', ['atuh'])
//                                             ^ not a middleware this app has

url('users.show')
//  ^ Expected 2 arguments — this route's path declares an `id`

url('users.show', { id: 42 })   // '/users/42'
url('users.show', { id: 42, tab: 'profile' })   // '/users/42?tab=profile'
url('posts.show')               // '/posts' — the only param is optional
```

## Every key is independent, and every one is optional

| Key | Constrains | Falls back to |
|---|---|---|
| `actions` | the string handler form | `Actions/…Action`, `actions/…Action`, `…Controller@method` |
| `middleware` | middleware lists and group names | any string |
| `routes` | `url()`'s name, and its params | any name, free-form params |

Declare one, two, or none. An application that declares nothing sees exactly what it
saw before this existed — that is a hard requirement of the design, not a courtesy.
The `middleware` union always includes the built-ins on top of whatever you list,
because listing your own aliases says "these are mine", not "the ones the package
ships no longer exist".

Middleware **group** names go in `middleware` too. A group name is a middleware
reference as far as a call site is concerned — `.middleware('web')` expands to the
group — so both live in the same union.

## Generating it

All three unions are facts a build step already knows. Anything that scans an
`app/Actions/` directory, reads a middleware alias map, or walks the route table can
emit this augmentation into a `.d.ts` and the whole surface types itself with nothing
written by hand. Writing it by hand is perfectly reasonable for a smaller app — it is
one interface.

## What it does not do

It does not check that the action file exists on disk, only that the string is one
you said exists. If your generated union is stale, the types are confidently wrong —
which is the argument for generating it from the same source the router loads from,
rather than maintaining a second list.

It does not constrain route *registration* names, only `url()` lookups. Registering a
name you have not declared is allowed; you simply cannot then look it up. Constraining
registration would mean declaring a route's name before you are allowed to write it,
which is the tail wagging the dog.
