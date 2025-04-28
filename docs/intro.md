# Introduction to bun-router

<p align="center"><img src="https://github.com/stacksjs/bun-router/blob/main/.github/art/cover.jpg?raw=true" alt="bun-router"></p>

## What is bun-router?

bun-router is a high-performance, feature-rich router designed specifically for Bun applications. Built from the ground up to take advantage of Bun's speed and features, it provides an intuitive and powerful API for handling HTTP routing in your web applications.

## Key Features

- **Fast and Efficient**: Optimized for performance with Bun's native features
- **Complete HTTP Method Support**: Handle GET, POST, PUT, DELETE, PATCH, OPTIONS, and HEAD requests
- **Advanced Routing**: Path parameters, constraints, groups, and nested routes
- **Middleware Support**: Built-in middleware and easy custom middleware creation
- **WebSocket Integration**: Seamless WebSocket support with pub/sub capabilities
- **Type Safety**: First-class TypeScript support with type inference
- **Developer Experience**: Intuitive API that makes development a joy

## Why Choose bun-router?

### Performance

bun-router is built to leverage Bun's speed and efficiency. It integrates directly with Bun's `Bun.serve()` API to provide optimal routing performance without unnecessary overhead.

### Feature Completeness

Whether you're building a simple API or a complex web application, bun-router has the features you need - from basic routing to advanced patterns like domain routing, resource routing, and WebSocket communication.

### Type Safety

With first-class TypeScript support, bun-router provides type safety throughout your application. Route parameters are automatically inferred, and middleware is fully typed.

### Easy to Learn, Hard to Outgrow

bun-router is designed to be easy to get started with, but powerful enough to handle complex routing needs as your application grows.

## Next Steps

Ready to get started? Check out the [Installation Guide](/install) to add bun-router to your project.

# bun-router

This is an opinionated TypeScript Starter kit to help kick-start development of your next Bun package.

## Get Started

It's rather simple to get your package development started:

```bash
# you may use this GitHub template or the following command:
bunx degit stacksjs/bun-router my-pkg
cd my-pkg

 # if you don't have pnpm installed, run `npm i -g pnpm`
bun i # install all deps
bun run build # builds the library for production-ready use

# after you have successfully committed, you may create a "release"
bun run release # automates git commits, versioning, and changelog generations
```

_Check out the package.json scripts for more commands._

### Developer Experience (DX)

This Starter Kit comes pre-configured with the following:

- [Powerful Build Process](https://github.com/oven-sh/bun) - via Bun
- [Fully Typed APIs](https://www.typescriptlang.org/) - via TypeScript
- [Documentation-ready](https://vitepress.dev/) - via VitePress
- [CLI & Binary](https://www.npmjs.com/package/bunx) - via Bun & CAC
- [Be a Good Commitizen](https://www.npmjs.com/package/git-cz) - pre-configured Commitizen & git-cz setup to simplify semantic git commits, versioning, and changelog generations
- [Built With Testing In Mind](https://bun.sh/docs/cli/test) - pre-configured unit-testing powered by [Bun](https://bun.sh/docs/cli/test)
- [Renovate](https://renovatebot.com/) - optimized & automated PR dependency updates
- [ESLint](https://eslint.org/) - for code linting _(and formatting)_
- [GitHub Actions](https://github.com/features/actions) - runs your CI _(fixes code style issues, tags releases & creates its changelogs, runs the test suite, etc.)_

## Changelog

Please see our [releases](https://github.com/stacksjs/stacks/releases) page for more information on what has changed recently.

## Stargazers

[![Stargazers](https://starchart.cc/stacksjs/bun-router.svg?variant=adaptive)](https://starchart.cc/stacksjs/bun-router)

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Two things are true: Stacks OSS will always stay open-source, and we do love to receive postcards from wherever Stacks is used! 🌍 _We also publish them on our website. And thank you, Spatie_

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](https://github.com/stacksjs/rpx/graphs/contributors)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/bun-router/tree/main/LICENSE.md) for more information.

Made with 💙

<!-- Badges -->

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/rpx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/rpx -->
