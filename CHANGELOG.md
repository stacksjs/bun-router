[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.15...v0.0.16)

### 🐛 Bug Fixes

- **csrf**: auto-skip CSRF on bearer-authed requests ([7db9cad](https://github.com/stacksjs/bun-router/commit/7db9cad)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **scripts**: stop double-generating CHANGELOG on release ([9eb32ef](https://github.com/stacksjs/bun-router/commit/9eb32ef)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_
- **release**: publish bun-router from package directory ([713e095](https://github.com/stacksjs/bun-router/commit/713e095)) _(by Chris <chrisbreuer93@gmail.com>)_

### ⚡ Performance Improvements

- **router**: precompile route patterns to speed up matchPath ~3x ([a05895a](https://github.com/stacksjs/bun-router/commit/a05895a)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🤖 Continuous Integration

- **buddy-bot**: add daily cleanup cron to workflow ([29a4d2b](https://github.com/stacksjs/bun-router/commit/29a4d2b)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_

### 🧹 Chores

- release v0.0.16 ([c649bfc](https://github.com/stacksjs/bun-router/commit/c649bfc)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: refresh bun.lock to pick up @stacksjs/logsmith 0.2.3 ([7ad425f](https://github.com/stacksjs/bun-router/commit/7ad425f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up buddy-bot 0.9.20 ([09ee4bf](https://github.com/stacksjs/bun-router/commit/09ee4bf)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _Glenn Michael Torregosa <gtorregosa@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.14...v0.0.15)

### 🐛 Bug Fixes

- **streaming**: close errored response streams gracefully ([f172676](https://github.com/stacksjs/bun-router/commit/f172676)) _(by Chris <chrisbreuer93@gmail.com>)_
- **release**: publish bun-router package workspace ([3a4f31c](https://github.com/stacksjs/bun-router/commit/3a4f31c)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🤖 Continuous Integration

- **buddy-bot**: regenerate workflow from current template ([50d41ab](https://github.com/stacksjs/bun-router/commit/50d41ab)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_

### 🧹 Chores

- release v0.0.15 ([8181792](https://github.com/stacksjs/bun-router/commit/8181792)) _(by Chris <chrisbreuer93@gmail.com>)_
- **auth**: keep invalid basic auth quiet ([f219d38](https://github.com/stacksjs/bun-router/commit/f219d38)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _Glenn Michael Torregosa <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.14...HEAD)

### 🐛 Bug Fixes

- **streaming**: close errored response streams gracefully ([f172676](https://github.com/stacksjs/bun-router/commit/f172676)) _(by Chris <chrisbreuer93@gmail.com>)_
- **release**: publish bun-router package workspace ([3a4f31c](https://github.com/stacksjs/bun-router/commit/3a4f31c)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🤖 Continuous Integration

- **buddy-bot**: regenerate workflow from current template ([50d41ab](https://github.com/stacksjs/bun-router/commit/50d41ab)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_

### 🧹 Chores

- **auth**: keep invalid basic auth quiet ([f219d38](https://github.com/stacksjs/bun-router/commit/f219d38)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _Glenn Michael Torregosa <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.13...v0.0.14)

### 🚀 Features

- typed request.file(name) accessor on EnhancedRequest ([999cea6](https://github.com/stacksjs/bun-router/commit/999cea6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **router**: thread TPath through route methods for inline-handler param narrowing (stacksjs/stacks#1851) ([469128f](https://github.com/stacksjs/bun-router/commit/469128f)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1851](https://github.com/stacksjs/bun-router/issues/1851), [#1851](https://github.com/stacksjs/bun-router/issues/1851))

### 🐛 Bug Fixes

- response macros accept both ResponseInit and positional args ([efa36e9](https://github.com/stacksjs/bun-router/commit/efa36e9)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **file-based-routing**: honor disableFileRouting() and isolate per-instance routes ([1dd04d6](https://github.com/stacksjs/bun-router/commit/1dd04d6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **test**: use cmd.rawName to read namespaced command names ([ee6187f](https://github.com/stacksjs/bun-router/commit/ee6187f)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- release v0.0.14 ([56bb0b8](https://github.com/stacksjs/bun-router/commit/56bb0b8)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- switch lint scripts from eslint to pickier ([67e9d97](https://github.com/stacksjs/bun-router/commit/67e9d97)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9ee0607](https://github.com/stacksjs/bun-router/commit/9ee0607)) _(by Chris <chrisbreuer93@gmail.com>)_
- refresh bun.lock to pick up bun-plugin-dtsx@0.9.18 ([e487e34](https://github.com/stacksjs/bun-router/commit/e487e34)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.13...HEAD)

### 🚀 Features

- typed request.file(name) accessor on EnhancedRequest ([999cea6](https://github.com/stacksjs/bun-router/commit/999cea6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **router**: thread TPath through route methods for inline-handler param narrowing (stacksjs/stacks#1851) ([469128f](https://github.com/stacksjs/bun-router/commit/469128f)) _(by glennmichael123 <gtorregosa@gmail.com>)_ ([#1851](https://github.com/stacksjs/bun-router/issues/1851), [#1851](https://github.com/stacksjs/bun-router/issues/1851))

### 🐛 Bug Fixes

- response macros accept both ResponseInit and positional args ([efa36e9](https://github.com/stacksjs/bun-router/commit/efa36e9)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **file-based-routing**: honor disableFileRouting() and isolate per-instance routes ([1dd04d6](https://github.com/stacksjs/bun-router/commit/1dd04d6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **test**: use cmd.rawName to read namespaced command names ([ee6187f](https://github.com/stacksjs/bun-router/commit/ee6187f)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- switch lint scripts from eslint to pickier ([67e9d97](https://github.com/stacksjs/bun-router/commit/67e9d97)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9ee0607](https://github.com/stacksjs/bun-router/commit/9ee0607)) _(by Chris <chrisbreuer93@gmail.com>)_
- refresh bun.lock to pick up bun-plugin-dtsx@0.9.18 ([e487e34](https://github.com/stacksjs/bun-router/commit/e487e34)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.12...v0.0.13)

### 🐛 Bug Fixes

- remove unused query builder dependency ([16d678c](https://github.com/stacksjs/bun-router/commit/16d678c)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.0.13 ([d61e456](https://github.com/stacksjs/bun-router/commit/d61e456)) _(by Chris <chrisbreuer93@gmail.com>)_
- add cloud patch publish script ([3298c0a](https://github.com/stacksjs/bun-router/commit/3298c0a)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.12...HEAD)

### 🐛 Bug Fixes

- remove unused query builder dependency ([16d678c](https://github.com/stacksjs/bun-router/commit/16d678c)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- add cloud patch publish script ([3298c0a](https://github.com/stacksjs/bun-router/commit/3298c0a)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.11...v0.0.12)

### 🧹 Chores

- release v0.0.12 ([dc11c1f](https://github.com/stacksjs/bun-router/commit/dc11c1f)) _(by Chris <chrisbreuer93@gmail.com>)_
- split cross-platform compile out of prepublishOnly ([9a8de7f](https://github.com/stacksjs/bun-router/commit/9a8de7f)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.11...HEAD)

### 🧹 Chores

- split cross-platform compile out of prepublishOnly ([9a8de7f](https://github.com/stacksjs/bun-router/commit/9a8de7f)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.10...v0.0.11)

### 🧹 Chores

- release v0.0.11 ([3f89d29](https://github.com/stacksjs/bun-router/commit/3f89d29)) _(by Chris <chrisbreuer93@gmail.com>)_
- bump ts-rate-limiter to ^0.4.2 ([ebb015a](https://github.com/stacksjs/bun-router/commit/ebb015a)) _(by Chris <chrisbreuer93@gmail.com>)_
- refresh bun.lock and apply pickier --fix ([be38c6f](https://github.com/stacksjs/bun-router/commit/be38c6f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock ([f76a362](https://github.com/stacksjs/bun-router/commit/f76a362)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.10...HEAD)

### 🧹 Chores

- bump ts-rate-limiter to ^0.4.2 ([ebb015a](https://github.com/stacksjs/bun-router/commit/ebb015a)) _(by Chris <chrisbreuer93@gmail.com>)_
- refresh bun.lock and apply pickier --fix ([be38c6f](https://github.com/stacksjs/bun-router/commit/be38c6f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock ([f76a362](https://github.com/stacksjs/bun-router/commit/f76a362)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.9...v0.0.10)

### 🐛 Bug Fixes

- **request**: attach getParam/cookie/get on the registered enhanceRequest override ([80f1925](https://github.com/stacksjs/bun-router/commit/80f1925)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🤖 Continuous Integration

- **release**: revert explicit build step ([db5d727](https://github.com/stacksjs/bun-router/commit/db5d727)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.0.10 ([e263c73](https://github.com/stacksjs/bun-router/commit/e263c73)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.8...v0.0.9)

### 🚀 Features

- **request**: add cookie() helper + applyRequestEnhancements export ([e8561de](https://github.com/stacksjs/bun-router/commit/e8561de)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🐛 Bug Fixes

- type json() response in not-found enrichment tests ([8329698](https://github.com/stacksjs/bun-router/commit/8329698)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add setup-bun to publish-commit job ([dd3ecc3](https://github.com/stacksjs/bun-router/commit/dd3ecc3)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **response**: accept status number as 2nd arg to response.json() ([79c6066](https://github.com/stacksjs/bun-router/commit/79c6066)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- apply request macros to every incoming request in `enhanceRequest` ([3a9e0a2](https://github.com/stacksjs/bun-router/commit/3a9e0a2)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🤖 Continuous Integration

- **release**: rebuild dist before publishing ([f23eebd](https://github.com/stacksjs/bun-router/commit/f23eebd)) _(by Chris <chrisbreuer93@gmail.com>)_
- drop redundant setup-bun (pantry installs bun via deps.yaml) ([16f152c](https://github.com/stacksjs/bun-router/commit/16f152c)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- release v0.0.9 ([947e60c](https://github.com/stacksjs/bun-router/commit/947e60c)) _(by Chris <chrisbreuer93@gmail.com>)_
- **lint**: silence pickier false positive in template literal ([9c19c76](https://github.com/stacksjs/bun-router/commit/9c19c76)) _(by Chris <chrisbreuer93@gmail.com>)_
- release v0.0.8 ([7dfb277](https://github.com/stacksjs/bun-router/commit/7dfb277)) _(by Chris <chrisbreuer93@gmail.com>)_
- lint:fix ([4a3b0e4](https://github.com/stacksjs/bun-router/commit/4a3b0e4)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock to pick up latest pickier ([ce11cd4](https://github.com/stacksjs/bun-router/commit/ce11cd4)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up dtsx 0.9.14 and bunfig 0.15.9 ([2cdc04c](https://github.com/stacksjs/bun-router/commit/2cdc04c)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.7...v0.0.8)

### 🚀 Features

- **request**: add cookie() helper + applyRequestEnhancements export ([1cb8953](https://github.com/stacksjs/bun-router/commit/1cb8953)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.0.8 ([44c06f6](https://github.com/stacksjs/bun-router/commit/44c06f6)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.7...HEAD)

### 🚀 Features

- **request**: add cookie() helper + applyRequestEnhancements export ([1cb8953](https://github.com/stacksjs/bun-router/commit/1cb8953)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.6...v0.0.7)

### 🐛 Bug Fixes

- **router**: enrich 404/405 + run global middleware on unmatched routes ([73c205c](https://github.com/stacksjs/bun-router/commit/73c205c)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.0.7 ([dcef8ac](https://github.com/stacksjs/bun-router/commit/dcef8ac)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.6...HEAD)

### 🐛 Bug Fixes

- **router**: enrich 404/405 + run global middleware on unmatched routes ([73c205c](https://github.com/stacksjs/bun-router/commit/73c205c)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.5...v0.0.6)

### 🚀 Features

- add request context (AsyncLocalStorage) and named-route url() helper ([aefe808](https://github.com/stacksjs/bun-router/commit/aefe808)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **router**: expose bearerToken, header, getParam, params on EnhancedRequest ([fdb51e2](https://github.com/stacksjs/bun-router/commit/fdb51e2)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.0.6 ([6b54b75](https://github.com/stacksjs/bun-router/commit/6b54b75)) _(by Chris <chrisbreuer93@gmail.com>)_
- ship src/ + add release:patch/minor/major scripts ([0da27fa](https://github.com/stacksjs/bun-router/commit/0da27fa)) _(by Chris <chrisbreuer93@gmail.com>)_

### 📄 Miscellaneous

- Merge remote-tracking branch 'origin/main' ([711a0ca](https://github.com/stacksjs/bun-router/commit/711a0ca)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.4...v0.0.5)

### 🐛 Bug Fixes

- repair garbled ternary in performance dashboard template ([643ba27](https://github.com/stacksjs/bun-router/commit/643ba27)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- resolve typecheck errors ([3a4e3ba](https://github.com/stacksjs/bun-router/commit/3a4e3ba)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- release v0.0.5 ([92aed01](https://github.com/stacksjs/bun-router/commit/92aed01)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([d977fdf](https://github.com/stacksjs/bun-router/commit/d977fdf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up pickier 0.1.21 ([7f4fa63](https://github.com/stacksjs/bun-router/commit/7f4fa63)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint errors ([3419db5](https://github.com/stacksjs/bun-router/commit/3419db5)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add publishConfig so "bun" condition resolves on npm installs ([c33161f](https://github.com/stacksjs/bun-router/commit/c33161f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint errors ([0e2838c](https://github.com/stacksjs/bun-router/commit/0e2838c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- auto-fix lint errors ([38bc50e](https://github.com/stacksjs/bun-router/commit/38bc50e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- include md in pickier lint extensions ([ae41aa4](https://github.com/stacksjs/bun-router/commit/ae41aa4)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.4...HEAD)

### 🐛 Bug Fixes

- repair garbled ternary in performance dashboard template ([643ba27](https://github.com/stacksjs/bun-router/commit/643ba27)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- resolve typecheck errors ([3a4e3ba](https://github.com/stacksjs/bun-router/commit/3a4e3ba)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 🧹 Chores

- wip ([d977fdf](https://github.com/stacksjs/bun-router/commit/d977fdf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up pickier 0.1.21 ([7f4fa63](https://github.com/stacksjs/bun-router/commit/7f4fa63)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint errors ([3419db5](https://github.com/stacksjs/bun-router/commit/3419db5)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add publishConfig so "bun" condition resolves on npm installs ([c33161f](https://github.com/stacksjs/bun-router/commit/c33161f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint errors ([0e2838c](https://github.com/stacksjs/bun-router/commit/0e2838c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- auto-fix lint errors ([38bc50e](https://github.com/stacksjs/bun-router/commit/38bc50e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- include md in pickier lint extensions ([ae41aa4](https://github.com/stacksjs/bun-router/commit/ae41aa4)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.3...v0.0.4)

### 🧹 Chores

- release v0.0.4 ([6be9b9f](https://github.com/stacksjs/bun-router/commit/6be9b9f)) _(by Chris <chrisbreuer93@gmail.com>)_
- update rate limiter ([97777da](https://github.com/stacksjs/bun-router/commit/97777da)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.3...HEAD)

### 🧹 Chores

- update rate limiter ([97777da](https://github.com/stacksjs/bun-router/commit/97777da)) _(by Chris <chrisbreuer93@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.2...v0.0.3)

### 🐛 Bug Fixes

- resolve CI failures - typecheck errors, build hang, and workflow ordering ([42425e5](https://github.com/stacksjs/bun-router/commit/42425e5)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- release v0.0.3 ([c87ce70](https://github.com/stacksjs/bun-router/commit/c87ce70)) _(by Chris <chrisbreuer93@gmail.com>)_
- update vscode config ([420d337](https://github.com/stacksjs/bun-router/commit/420d337)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update vscode config ([de0900d](https://github.com/stacksjs/bun-router/commit/de0900d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([692c277](https://github.com/stacksjs/bun-router/commit/692c277)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5dc7504](https://github.com/stacksjs/bun-router/commit/5dc7504)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([40fd129](https://github.com/stacksjs/bun-router/commit/40fd129)) _(by Chris <chrisbreuer93@gmail.com>)_
- repo cleanup and modernization ([e9e8b8e](https://github.com/stacksjs/bun-router/commit/e9e8b8e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add git-hooks config ([604095a](https://github.com/stacksjs/bun-router/commit/604095a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3d79de6](https://github.com/stacksjs/bun-router/commit/3d79de6)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8c310cf](https://github.com/stacksjs/bun-router/commit/8c310cf)) _(by Chris <chrisbreuer93@gmail.com>)_
- use Pantry action for publish-commit and add job dependencies ([59a48ef](https://github.com/stacksjs/bun-router/commit/59a48ef)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([70bf107](https://github.com/stacksjs/bun-router/commit/70bf107)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([30c216d](https://github.com/stacksjs/bun-router/commit/30c216d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([674f0e7](https://github.com/stacksjs/bun-router/commit/674f0e7)) _(by Chris <chrisbreuer93@gmail.com>)_
- update lockfiles ([0704ffe](https://github.com/stacksjs/bun-router/commit/0704ffe)) _(by Chris <chrisbreuer93@gmail.com>)_
- minor updates ([fbebbb0](https://github.com/stacksjs/bun-router/commit/fbebbb0)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update all non-major dependencies (rebased) (#871) ([3b75049](https://github.com/stacksjs/bun-router/commit/3b75049)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#871](https://github.com/stacksjs/bun-router/issues/871), [#871](https://github.com/stacksjs/bun-router/issues/871))
- wip ([ae76301](https://github.com/stacksjs/bun-router/commit/ae76301)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- remove file ignores from pickier config ([8365a7a](https://github.com/stacksjs/bun-router/commit/8365a7a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint warnings ([438d50e](https://github.com/stacksjs/bun-router/commit/438d50e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint warnings ([4cdfc61](https://github.com/stacksjs/bun-router/commit/4cdfc61)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint warnings ([d3b839b](https://github.com/stacksjs/bun-router/commit/d3b839b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- remove .pickierignore ([01b70be](https://github.com/stacksjs/bun-router/commit/01b70be)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- enrich CLAUDE.md with detailed project context from README ([8642c13](https://github.com/stacksjs/bun-router/commit/8642c13)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update CLAUDE.md with project context and crosswind details ([fa9407f](https://github.com/stacksjs/bun-router/commit/fa9407f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add proper claude code guidelines ([f1b0f2a](https://github.com/stacksjs/bun-router/commit/f1b0f2a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- use pantry monorepo action instead of pantry-setup ([17cc746](https://github.com/stacksjs/bun-router/commit/17cc746)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- ignore claude config in linter ([62cf7cf](https://github.com/stacksjs/bun-router/commit/62cf7cf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add claude code guidelines ([542dae2](https://github.com/stacksjs/bun-router/commit/542dae2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update github actions (#868) ([6103155](https://github.com/stacksjs/bun-router/commit/6103155)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#868](https://github.com/stacksjs/bun-router/issues/868), [#868](https://github.com/stacksjs/bun-router/issues/868))
- **deps**: update all non-major dependencies (rebased) (#865) ([e4e64fb](https://github.com/stacksjs/bun-router/commit/e4e64fb)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#865](https://github.com/stacksjs/bun-router/issues/865), [#865](https://github.com/stacksjs/bun-router/issues/865))
- **deps**: update github actions (rebased) (#867) ([e98152a](https://github.com/stacksjs/bun-router/commit/e98152a)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#867](https://github.com/stacksjs/bun-router/issues/867), [#867](https://github.com/stacksjs/bun-router/issues/867))
- **deps**: update github actions (rebased) (#863) ([937a8e4](https://github.com/stacksjs/bun-router/commit/937a8e4)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#863](https://github.com/stacksjs/bun-router/issues/863), [#863](https://github.com/stacksjs/bun-router/issues/863))
- **deps**: update all non-major dependencies (updated) (#864) ([e6ddfd7](https://github.com/stacksjs/bun-router/commit/e6ddfd7)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#864](https://github.com/stacksjs/bun-router/issues/864), [#864](https://github.com/stacksjs/bun-router/issues/864))
- wip ([bae1979](https://github.com/stacksjs/bun-router/commit/bae1979)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f20a48f](https://github.com/stacksjs/bun-router/commit/f20a48f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0f010e6](https://github.com/stacksjs/bun-router/commit/0f010e6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3f2ba45](https://github.com/stacksjs/bun-router/commit/3f2ba45)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([79e3b7b](https://github.com/stacksjs/bun-router/commit/79e3b7b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([cb8fded](https://github.com/stacksjs/bun-router/commit/cb8fded)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([88a97dd](https://github.com/stacksjs/bun-router/commit/88a97dd)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([51d9b9d](https://github.com/stacksjs/bun-router/commit/51d9b9d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([15d102c](https://github.com/stacksjs/bun-router/commit/15d102c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ef6eaad](https://github.com/stacksjs/bun-router/commit/ef6eaad)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix const assignment error and add STX config options ([37f7b54](https://github.com/stacksjs/bun-router/commit/37f7b54)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f059d80](https://github.com/stacksjs/bun-router/commit/f059d80)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c220e66](https://github.com/stacksjs/bun-router/commit/c220e66)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([93a1bec](https://github.com/stacksjs/bun-router/commit/93a1bec)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([38157f6](https://github.com/stacksjs/bun-router/commit/38157f6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3406315](https://github.com/stacksjs/bun-router/commit/3406315)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e81491c](https://github.com/stacksjs/bun-router/commit/e81491c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f3cbd5f](https://github.com/stacksjs/bun-router/commit/f3cbd5f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0c39c3f](https://github.com/stacksjs/bun-router/commit/0c39c3f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e09f21c](https://github.com/stacksjs/bun-router/commit/e09f21c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([4cbfc4e](https://github.com/stacksjs/bun-router/commit/4cbfc4e)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.2...HEAD)

### 🐛 Bug Fixes

- resolve CI failures - typecheck errors, build hang, and workflow ordering ([42425e5](https://github.com/stacksjs/bun-router/commit/42425e5)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- update vscode config ([420d337](https://github.com/stacksjs/bun-router/commit/420d337)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update vscode config ([de0900d](https://github.com/stacksjs/bun-router/commit/de0900d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([692c277](https://github.com/stacksjs/bun-router/commit/692c277)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5dc7504](https://github.com/stacksjs/bun-router/commit/5dc7504)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([40fd129](https://github.com/stacksjs/bun-router/commit/40fd129)) _(by Chris <chrisbreuer93@gmail.com>)_
- repo cleanup and modernization ([e9e8b8e](https://github.com/stacksjs/bun-router/commit/e9e8b8e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add git-hooks config ([604095a](https://github.com/stacksjs/bun-router/commit/604095a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3d79de6](https://github.com/stacksjs/bun-router/commit/3d79de6)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8c310cf](https://github.com/stacksjs/bun-router/commit/8c310cf)) _(by Chris <chrisbreuer93@gmail.com>)_
- use Pantry action for publish-commit and add job dependencies ([59a48ef](https://github.com/stacksjs/bun-router/commit/59a48ef)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([70bf107](https://github.com/stacksjs/bun-router/commit/70bf107)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([30c216d](https://github.com/stacksjs/bun-router/commit/30c216d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([674f0e7](https://github.com/stacksjs/bun-router/commit/674f0e7)) _(by Chris <chrisbreuer93@gmail.com>)_
- update lockfiles ([0704ffe](https://github.com/stacksjs/bun-router/commit/0704ffe)) _(by Chris <chrisbreuer93@gmail.com>)_
- minor updates ([fbebbb0](https://github.com/stacksjs/bun-router/commit/fbebbb0)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update all non-major dependencies (rebased) (#871) ([3b75049](https://github.com/stacksjs/bun-router/commit/3b75049)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#871](https://github.com/stacksjs/bun-router/issues/871), [#871](https://github.com/stacksjs/bun-router/issues/871))
- wip ([ae76301](https://github.com/stacksjs/bun-router/commit/ae76301)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- remove file ignores from pickier config ([8365a7a](https://github.com/stacksjs/bun-router/commit/8365a7a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint warnings ([438d50e](https://github.com/stacksjs/bun-router/commit/438d50e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint warnings ([4cdfc61](https://github.com/stacksjs/bun-router/commit/4cdfc61)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix lint warnings ([d3b839b](https://github.com/stacksjs/bun-router/commit/d3b839b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- remove .pickierignore ([01b70be](https://github.com/stacksjs/bun-router/commit/01b70be)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- enrich CLAUDE.md with detailed project context from README ([8642c13](https://github.com/stacksjs/bun-router/commit/8642c13)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update CLAUDE.md with project context and crosswind details ([fa9407f](https://github.com/stacksjs/bun-router/commit/fa9407f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add proper claude code guidelines ([f1b0f2a](https://github.com/stacksjs/bun-router/commit/f1b0f2a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- use pantry monorepo action instead of pantry-setup ([17cc746](https://github.com/stacksjs/bun-router/commit/17cc746)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- ignore claude config in linter ([62cf7cf](https://github.com/stacksjs/bun-router/commit/62cf7cf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add claude code guidelines ([542dae2](https://github.com/stacksjs/bun-router/commit/542dae2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update github actions (#868) ([6103155](https://github.com/stacksjs/bun-router/commit/6103155)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#868](https://github.com/stacksjs/bun-router/issues/868), [#868](https://github.com/stacksjs/bun-router/issues/868))
- **deps**: update all non-major dependencies (rebased) (#865) ([e4e64fb](https://github.com/stacksjs/bun-router/commit/e4e64fb)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#865](https://github.com/stacksjs/bun-router/issues/865), [#865](https://github.com/stacksjs/bun-router/issues/865))
- **deps**: update github actions (rebased) (#867) ([e98152a](https://github.com/stacksjs/bun-router/commit/e98152a)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#867](https://github.com/stacksjs/bun-router/issues/867), [#867](https://github.com/stacksjs/bun-router/issues/867))
- **deps**: update github actions (rebased) (#863) ([937a8e4](https://github.com/stacksjs/bun-router/commit/937a8e4)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#863](https://github.com/stacksjs/bun-router/issues/863), [#863](https://github.com/stacksjs/bun-router/issues/863))
- **deps**: update all non-major dependencies (updated) (#864) ([e6ddfd7](https://github.com/stacksjs/bun-router/commit/e6ddfd7)) _(by [github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>](https://github.com/github-actions[bot]))_ ([#864](https://github.com/stacksjs/bun-router/issues/864), [#864](https://github.com/stacksjs/bun-router/issues/864))
- wip ([bae1979](https://github.com/stacksjs/bun-router/commit/bae1979)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f20a48f](https://github.com/stacksjs/bun-router/commit/f20a48f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0f010e6](https://github.com/stacksjs/bun-router/commit/0f010e6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3f2ba45](https://github.com/stacksjs/bun-router/commit/3f2ba45)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([79e3b7b](https://github.com/stacksjs/bun-router/commit/79e3b7b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([cb8fded](https://github.com/stacksjs/bun-router/commit/cb8fded)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([88a97dd](https://github.com/stacksjs/bun-router/commit/88a97dd)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([51d9b9d](https://github.com/stacksjs/bun-router/commit/51d9b9d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([15d102c](https://github.com/stacksjs/bun-router/commit/15d102c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ef6eaad](https://github.com/stacksjs/bun-router/commit/ef6eaad)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fix const assignment error and add STX config options ([37f7b54](https://github.com/stacksjs/bun-router/commit/37f7b54)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f059d80](https://github.com/stacksjs/bun-router/commit/f059d80)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c220e66](https://github.com/stacksjs/bun-router/commit/c220e66)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([93a1bec](https://github.com/stacksjs/bun-router/commit/93a1bec)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([38157f6](https://github.com/stacksjs/bun-router/commit/38157f6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3406315](https://github.com/stacksjs/bun-router/commit/3406315)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e81491c](https://github.com/stacksjs/bun-router/commit/e81491c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f3cbd5f](https://github.com/stacksjs/bun-router/commit/f3cbd5f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0c39c3f](https://github.com/stacksjs/bun-router/commit/0c39c3f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e09f21c](https://github.com/stacksjs/bun-router/commit/e09f21c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([4cbfc4e](https://github.com/stacksjs/bun-router/commit/4cbfc4e)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.1...v0.0.2)

### 🚀 Features

- new release script using pantry (#109) ([f9513bc](https://github.com/stacksjs/bun-router/commit/f9513bc)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_ ([#109](https://github.com/stacksjs/bun-router/issues/109), [#109](https://github.com/stacksjs/bun-router/issues/109))

### 🧹 Chores

- release v0.0.2 ([2f49179](https://github.com/stacksjs/bun-router/commit/2f49179)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#837) ([3523c22](https://github.com/stacksjs/bun-router/commit/3523c22)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#837](https://github.com/stacksjs/bun-router/issues/837), [#837](https://github.com/stacksjs/bun-router/issues/837))
- wip ([bd2ede7](https://github.com/stacksjs/bun-router/commit/bd2ede7)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5826706](https://github.com/stacksjs/bun-router/commit/5826706)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([bf4fb78](https://github.com/stacksjs/bun-router/commit/bf4fb78)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency vue-router to 5.0.2 (#804) ([fbf4df6](https://github.com/stacksjs/bun-router/commit/fbf4df6)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#804](https://github.com/stacksjs/bun-router/issues/804), [#804](https://github.com/stacksjs/bun-router/issues/804))
- **deps**: update dependency vue-router to v5 (#382) ([9d5f9b2](https://github.com/stacksjs/bun-router/commit/9d5f9b2)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#382](https://github.com/stacksjs/bun-router/issues/382), [#382](https://github.com/stacksjs/bun-router/issues/382))
- **deps**: update all non-major dependencies (#836) ([854b46e](https://github.com/stacksjs/bun-router/commit/854b46e)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#836](https://github.com/stacksjs/bun-router/issues/836), [#836](https://github.com/stacksjs/bun-router/issues/836))
- wip ([33e37d2](https://github.com/stacksjs/bun-router/commit/33e37d2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([17dfc05](https://github.com/stacksjs/bun-router/commit/17dfc05)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c9e4437](https://github.com/stacksjs/bun-router/commit/c9e4437)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0a52cc1](https://github.com/stacksjs/bun-router/commit/0a52cc1)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0d30651](https://github.com/stacksjs/bun-router/commit/0d30651)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([745f9f0](https://github.com/stacksjs/bun-router/commit/745f9f0)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([6c38290](https://github.com/stacksjs/bun-router/commit/6c38290)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c5bd2fe](https://github.com/stacksjs/bun-router/commit/c5bd2fe)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([322bd86](https://github.com/stacksjs/bun-router/commit/322bd86)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([c06daa5](https://github.com/stacksjs/bun-router/commit/c06daa5)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#116) ([100106f](https://github.com/stacksjs/bun-router/commit/100106f)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#116](https://github.com/stacksjs/bun-router/issues/116), [#116](https://github.com/stacksjs/bun-router/issues/116))
- wip ([4c51d7a](https://github.com/stacksjs/bun-router/commit/4c51d7a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency actions/cache to v5.0.1 (#110) ([c3afa3c](https://github.com/stacksjs/bun-router/commit/c3afa3c)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#110](https://github.com/stacksjs/bun-router/issues/110), [#110](https://github.com/stacksjs/bun-router/issues/110))
- **deps**: update all non-major dependencies (#111) ([04ed5e7](https://github.com/stacksjs/bun-router/commit/04ed5e7)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#111](https://github.com/stacksjs/bun-router/issues/111), [#111](https://github.com/stacksjs/bun-router/issues/111))
- wip ([e476db9](https://github.com/stacksjs/bun-router/commit/e476db9)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ad4de86](https://github.com/stacksjs/bun-router/commit/ad4de86)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([477b661](https://github.com/stacksjs/bun-router/commit/477b661)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c5eee68](https://github.com/stacksjs/bun-router/commit/c5eee68)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5adc062](https://github.com/stacksjs/bun-router/commit/5adc062)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update oven-sh/setup-bun action to v2.1.0 (#101) ([4b1ba30](https://github.com/stacksjs/bun-router/commit/4b1ba30)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#101](https://github.com/stacksjs/bun-router/issues/101), [#101](https://github.com/stacksjs/bun-router/issues/101))
- **deps**: update dependency node to v24 (#108) ([6fdc99a](https://github.com/stacksjs/bun-router/commit/6fdc99a)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#108](https://github.com/stacksjs/bun-router/issues/108), [#108](https://github.com/stacksjs/bun-router/issues/108))
- **deps**: update actions/setup-node action to v6 (#105) ([cf7f352](https://github.com/stacksjs/bun-router/commit/cf7f352)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#105](https://github.com/stacksjs/bun-router/issues/105), [#105](https://github.com/stacksjs/bun-router/issues/105))
- **deps**: update dependency actions/cache to v5.0.1 (#103) ([e85363d](https://github.com/stacksjs/bun-router/commit/e85363d)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#103](https://github.com/stacksjs/bun-router/issues/103), [#103](https://github.com/stacksjs/bun-router/issues/103))
- **deps**: update all non-major dependencies (#100) ([b43b8ca](https://github.com/stacksjs/bun-router/commit/b43b8ca)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#100](https://github.com/stacksjs/bun-router/issues/100), [#100](https://github.com/stacksjs/bun-router/issues/100))
- **deps**: update actions/checkout action to v6 (#104) ([47c18a0](https://github.com/stacksjs/bun-router/commit/47c18a0)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#104](https://github.com/stacksjs/bun-router/issues/104), [#104](https://github.com/stacksjs/bun-router/issues/104))
- wip ([e83c895](https://github.com/stacksjs/bun-router/commit/e83c895)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([bc0ab54](https://github.com/stacksjs/bun-router/commit/bc0ab54)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([d4c8164](https://github.com/stacksjs/bun-router/commit/d4c8164)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([81e18cc](https://github.com/stacksjs/bun-router/commit/81e18cc)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e25e2d5](https://github.com/stacksjs/bun-router/commit/e25e2d5)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([7806e59](https://github.com/stacksjs/bun-router/commit/7806e59)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5797f11](https://github.com/stacksjs/bun-router/commit/5797f11)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0960b72](https://github.com/stacksjs/bun-router/commit/0960b72)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([41a1870](https://github.com/stacksjs/bun-router/commit/41a1870)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([eddbcac](https://github.com/stacksjs/bun-router/commit/eddbcac)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e41e495](https://github.com/stacksjs/bun-router/commit/e41e495)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([801e8df](https://github.com/stacksjs/bun-router/commit/801e8df)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([efc3561](https://github.com/stacksjs/bun-router/commit/efc3561)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9f7b44b](https://github.com/stacksjs/bun-router/commit/9f7b44b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([460bc3a](https://github.com/stacksjs/bun-router/commit/460bc3a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([2126f3a](https://github.com/stacksjs/bun-router/commit/2126f3a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ea78f67](https://github.com/stacksjs/bun-router/commit/ea78f67)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#99) ([cdc56d6](https://github.com/stacksjs/bun-router/commit/cdc56d6)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#99](https://github.com/stacksjs/bun-router/issues/99), [#99](https://github.com/stacksjs/bun-router/issues/99))
- **deps**: update all non-major dependencies (#98) ([80eb95a](https://github.com/stacksjs/bun-router/commit/80eb95a)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#98](https://github.com/stacksjs/bun-router/issues/98), [#98](https://github.com/stacksjs/bun-router/issues/98))
- wip ([3f037d2](https://github.com/stacksjs/bun-router/commit/3f037d2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([8415af1](https://github.com/stacksjs/bun-router/commit/8415af1)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([52baa4a](https://github.com/stacksjs/bun-router/commit/52baa4a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([304d59a](https://github.com/stacksjs/bun-router/commit/304d59a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([a96e006](https://github.com/stacksjs/bun-router/commit/a96e006)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#97) ([b4a64bb](https://github.com/stacksjs/bun-router/commit/b4a64bb)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#97](https://github.com/stacksjs/bun-router/issues/97), [#97](https://github.com/stacksjs/bun-router/issues/97))
- wip ([c16e068](https://github.com/stacksjs/bun-router/commit/c16e068)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update actions/checkout action to v6.0.1 (#96) ([259f22d](https://github.com/stacksjs/bun-router/commit/259f22d)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#96](https://github.com/stacksjs/bun-router/issues/96), [#96](https://github.com/stacksjs/bun-router/issues/96))
- wip ([941935d](https://github.com/stacksjs/bun-router/commit/941935d)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 📄 Miscellaneous

- Update middleware.ts ([bbe4657](https://github.com/stacksjs/bun-router/commit/bbe4657)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- Update package.json ([8eb1c29](https://github.com/stacksjs/bun-router/commit/8eb1c29)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _Glenn Michael Torregosa <gtorregosa@gmail.com>_
- _[renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot])_
- _glennmichael123 <gtorregosa@gmail.com>_

[Compare changes](https://github.com/stacksjs/bun-router/compare/v0.0.1...HEAD)

### 🚀 Features

- new release script using pantry (#109) ([f9513bc](https://github.com/stacksjs/bun-router/commit/f9513bc)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_ ([#109](https://github.com/stacksjs/bun-router/issues/109), [#109](https://github.com/stacksjs/bun-router/issues/109))

### 🧹 Chores

- **deps**: update all non-major dependencies (#837) ([3523c22](https://github.com/stacksjs/bun-router/commit/3523c22)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#837](https://github.com/stacksjs/bun-router/issues/837), [#837](https://github.com/stacksjs/bun-router/issues/837))
- wip ([bd2ede7](https://github.com/stacksjs/bun-router/commit/bd2ede7)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5826706](https://github.com/stacksjs/bun-router/commit/5826706)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([bf4fb78](https://github.com/stacksjs/bun-router/commit/bf4fb78)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency vue-router to 5.0.2 (#804) ([fbf4df6](https://github.com/stacksjs/bun-router/commit/fbf4df6)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#804](https://github.com/stacksjs/bun-router/issues/804), [#804](https://github.com/stacksjs/bun-router/issues/804))
- **deps**: update dependency vue-router to v5 (#382) ([9d5f9b2](https://github.com/stacksjs/bun-router/commit/9d5f9b2)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#382](https://github.com/stacksjs/bun-router/issues/382), [#382](https://github.com/stacksjs/bun-router/issues/382))
- **deps**: update all non-major dependencies (#836) ([854b46e](https://github.com/stacksjs/bun-router/commit/854b46e)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#836](https://github.com/stacksjs/bun-router/issues/836), [#836](https://github.com/stacksjs/bun-router/issues/836))
- wip ([33e37d2](https://github.com/stacksjs/bun-router/commit/33e37d2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([17dfc05](https://github.com/stacksjs/bun-router/commit/17dfc05)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c9e4437](https://github.com/stacksjs/bun-router/commit/c9e4437)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0a52cc1](https://github.com/stacksjs/bun-router/commit/0a52cc1)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0d30651](https://github.com/stacksjs/bun-router/commit/0d30651)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([745f9f0](https://github.com/stacksjs/bun-router/commit/745f9f0)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([6c38290](https://github.com/stacksjs/bun-router/commit/6c38290)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c5bd2fe](https://github.com/stacksjs/bun-router/commit/c5bd2fe)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([322bd86](https://github.com/stacksjs/bun-router/commit/322bd86)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([c06daa5](https://github.com/stacksjs/bun-router/commit/c06daa5)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#116) ([100106f](https://github.com/stacksjs/bun-router/commit/100106f)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#116](https://github.com/stacksjs/bun-router/issues/116), [#116](https://github.com/stacksjs/bun-router/issues/116))
- wip ([4c51d7a](https://github.com/stacksjs/bun-router/commit/4c51d7a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency actions/cache to v5.0.1 (#110) ([c3afa3c](https://github.com/stacksjs/bun-router/commit/c3afa3c)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#110](https://github.com/stacksjs/bun-router/issues/110), [#110](https://github.com/stacksjs/bun-router/issues/110))
- **deps**: update all non-major dependencies (#111) ([04ed5e7](https://github.com/stacksjs/bun-router/commit/04ed5e7)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#111](https://github.com/stacksjs/bun-router/issues/111), [#111](https://github.com/stacksjs/bun-router/issues/111))
- wip ([e476db9](https://github.com/stacksjs/bun-router/commit/e476db9)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ad4de86](https://github.com/stacksjs/bun-router/commit/ad4de86)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([477b661](https://github.com/stacksjs/bun-router/commit/477b661)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c5eee68](https://github.com/stacksjs/bun-router/commit/c5eee68)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5adc062](https://github.com/stacksjs/bun-router/commit/5adc062)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update oven-sh/setup-bun action to v2.1.0 (#101) ([4b1ba30](https://github.com/stacksjs/bun-router/commit/4b1ba30)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#101](https://github.com/stacksjs/bun-router/issues/101), [#101](https://github.com/stacksjs/bun-router/issues/101))
- **deps**: update dependency node to v24 (#108) ([6fdc99a](https://github.com/stacksjs/bun-router/commit/6fdc99a)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#108](https://github.com/stacksjs/bun-router/issues/108), [#108](https://github.com/stacksjs/bun-router/issues/108))
- **deps**: update actions/setup-node action to v6 (#105) ([cf7f352](https://github.com/stacksjs/bun-router/commit/cf7f352)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#105](https://github.com/stacksjs/bun-router/issues/105), [#105](https://github.com/stacksjs/bun-router/issues/105))
- **deps**: update dependency actions/cache to v5.0.1 (#103) ([e85363d](https://github.com/stacksjs/bun-router/commit/e85363d)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#103](https://github.com/stacksjs/bun-router/issues/103), [#103](https://github.com/stacksjs/bun-router/issues/103))
- **deps**: update all non-major dependencies (#100) ([b43b8ca](https://github.com/stacksjs/bun-router/commit/b43b8ca)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#100](https://github.com/stacksjs/bun-router/issues/100), [#100](https://github.com/stacksjs/bun-router/issues/100))
- **deps**: update actions/checkout action to v6 (#104) ([47c18a0](https://github.com/stacksjs/bun-router/commit/47c18a0)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#104](https://github.com/stacksjs/bun-router/issues/104), [#104](https://github.com/stacksjs/bun-router/issues/104))
- wip ([e83c895](https://github.com/stacksjs/bun-router/commit/e83c895)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([bc0ab54](https://github.com/stacksjs/bun-router/commit/bc0ab54)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([d4c8164](https://github.com/stacksjs/bun-router/commit/d4c8164)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([81e18cc](https://github.com/stacksjs/bun-router/commit/81e18cc)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e25e2d5](https://github.com/stacksjs/bun-router/commit/e25e2d5)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([7806e59](https://github.com/stacksjs/bun-router/commit/7806e59)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5797f11](https://github.com/stacksjs/bun-router/commit/5797f11)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0960b72](https://github.com/stacksjs/bun-router/commit/0960b72)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([41a1870](https://github.com/stacksjs/bun-router/commit/41a1870)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([eddbcac](https://github.com/stacksjs/bun-router/commit/eddbcac)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e41e495](https://github.com/stacksjs/bun-router/commit/e41e495)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([801e8df](https://github.com/stacksjs/bun-router/commit/801e8df)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([efc3561](https://github.com/stacksjs/bun-router/commit/efc3561)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9f7b44b](https://github.com/stacksjs/bun-router/commit/9f7b44b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([460bc3a](https://github.com/stacksjs/bun-router/commit/460bc3a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([2126f3a](https://github.com/stacksjs/bun-router/commit/2126f3a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ea78f67](https://github.com/stacksjs/bun-router/commit/ea78f67)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#99) ([cdc56d6](https://github.com/stacksjs/bun-router/commit/cdc56d6)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#99](https://github.com/stacksjs/bun-router/issues/99), [#99](https://github.com/stacksjs/bun-router/issues/99))
- **deps**: update all non-major dependencies (#98) ([80eb95a](https://github.com/stacksjs/bun-router/commit/80eb95a)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#98](https://github.com/stacksjs/bun-router/issues/98), [#98](https://github.com/stacksjs/bun-router/issues/98))
- wip ([3f037d2](https://github.com/stacksjs/bun-router/commit/3f037d2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([8415af1](https://github.com/stacksjs/bun-router/commit/8415af1)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([52baa4a](https://github.com/stacksjs/bun-router/commit/52baa4a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([304d59a](https://github.com/stacksjs/bun-router/commit/304d59a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([a96e006](https://github.com/stacksjs/bun-router/commit/a96e006)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#97) ([b4a64bb](https://github.com/stacksjs/bun-router/commit/b4a64bb)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#97](https://github.com/stacksjs/bun-router/issues/97), [#97](https://github.com/stacksjs/bun-router/issues/97))
- wip ([c16e068](https://github.com/stacksjs/bun-router/commit/c16e068)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update actions/checkout action to v6.0.1 (#96) ([259f22d](https://github.com/stacksjs/bun-router/commit/259f22d)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#96](https://github.com/stacksjs/bun-router/issues/96), [#96](https://github.com/stacksjs/bun-router/issues/96))
- wip ([941935d](https://github.com/stacksjs/bun-router/commit/941935d)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### 📄 Miscellaneous

- Update middleware.ts ([bbe4657](https://github.com/stacksjs/bun-router/commit/bbe4657)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- Update package.json ([8eb1c29](https://github.com/stacksjs/bun-router/commit/8eb1c29)) _(by glennmichael123 <gtorregosa@gmail.com>)_

### Contributors

- _Chris <chrisbreuer93@gmail.com>_
- _Glenn Michael Torregosa <gtorregosa@gmail.com>_
- _[renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot])_
- _glennmichael123 <gtorregosa@gmail.com>_

### 🚀 Features

- add proper streaming support ([83967ef](https://github.com/stacksjs/bun-router/commit/83967ef)) _(by Chris <chrisbreuer93@gmail.com>)_

### 🧹 Chores

- wip ([1d1dbf0](https://github.com/stacksjs/bun-router/commit/1d1dbf0)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#53) ([0e88f2b](https://github.com/stacksjs/bun-router/commit/0e88f2b)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#53](https://github.com/stacksjs/bun-router/issues/53), [#53](https://github.com/stacksjs/bun-router/issues/53))
- wip ([bca1141](https://github.com/stacksjs/bun-router/commit/bca1141)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5c94442](https://github.com/stacksjs/bun-router/commit/5c94442)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([cdd99cc](https://github.com/stacksjs/bun-router/commit/cdd99cc)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d2a86bb](https://github.com/stacksjs/bun-router/commit/d2a86bb)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update all non-major dependencies (#49) ([2515a07](https://github.com/stacksjs/bun-router/commit/2515a07)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#49](https://github.com/stacksjs/bun-router/issues/49), [#49](https://github.com/stacksjs/bun-router/issues/49))
- **deps**: update dependency actions/checkout to v6.0.0 (#51) ([9a24b59](https://github.com/stacksjs/bun-router/commit/9a24b59)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#51](https://github.com/stacksjs/bun-router/issues/51), [#51](https://github.com/stacksjs/bun-router/issues/51))
- **deps**: update all non-major dependencies (#50) ([73d8185](https://github.com/stacksjs/bun-router/commit/73d8185)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#50](https://github.com/stacksjs/bun-router/issues/50), [#50](https://github.com/stacksjs/bun-router/issues/50))
- **deps**: update actions/checkout action to v6 (#52) ([9f3614b](https://github.com/stacksjs/bun-router/commit/9f3614b)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#52](https://github.com/stacksjs/bun-router/issues/52), [#52](https://github.com/stacksjs/bun-router/issues/52))
- wip ([d2c01bf](https://github.com/stacksjs/bun-router/commit/d2c01bf)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([2d03dd2](https://github.com/stacksjs/bun-router/commit/2d03dd2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0da32a2](https://github.com/stacksjs/bun-router/commit/0da32a2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([af6bbde](https://github.com/stacksjs/bun-router/commit/af6bbde)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#47) ([f2fe841](https://github.com/stacksjs/bun-router/commit/f2fe841)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#47](https://github.com/stacksjs/bun-router/issues/47), [#47](https://github.com/stacksjs/bun-router/issues/47))
- **deps**: update softprops/action-gh-release action to v2.4.2 (#45) ([0222e0e](https://github.com/stacksjs/bun-router/commit/0222e0e)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#45](https://github.com/stacksjs/bun-router/issues/45), [#45](https://github.com/stacksjs/bun-router/issues/45))
- wip ([1fcc6d6](https://github.com/stacksjs/bun-router/commit/1fcc6d6)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([46e5221](https://github.com/stacksjs/bun-router/commit/46e5221)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#44) ([a4097a8](https://github.com/stacksjs/bun-router/commit/a4097a8)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#44](https://github.com/stacksjs/bun-router/issues/44), [#44](https://github.com/stacksjs/bun-router/issues/44))
- **deps**: update all non-major dependencies to ^66.5.5 (#43) ([a5bd8c0](https://github.com/stacksjs/bun-router/commit/a5bd8c0)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#43](https://github.com/stacksjs/bun-router/issues/43), [#43](https://github.com/stacksjs/bun-router/issues/43))
- **deps**: update all non-major dependencies (#41) ([bd6d298](https://github.com/stacksjs/bun-router/commit/bd6d298)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#41](https://github.com/stacksjs/bun-router/issues/41), [#41](https://github.com/stacksjs/bun-router/issues/41))
- wip ([9c10acf](https://github.com/stacksjs/bun-router/commit/9c10acf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([01374ec](https://github.com/stacksjs/bun-router/commit/01374ec)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#40) ([1ee80a7](https://github.com/stacksjs/bun-router/commit/1ee80a7)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#40](https://github.com/stacksjs/bun-router/issues/40), [#40](https://github.com/stacksjs/bun-router/issues/40))
- **deps**: update dependency bun-plugin-dtsx to ^0.21.16 (#39) ([9a27dba](https://github.com/stacksjs/bun-router/commit/9a27dba)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#39](https://github.com/stacksjs/bun-router/issues/39), [#39](https://github.com/stacksjs/bun-router/issues/39))
- **deps**: update all non-major dependencies (#34) ([39a2644](https://github.com/stacksjs/bun-router/commit/39a2644)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#34](https://github.com/stacksjs/bun-router/issues/34), [#34](https://github.com/stacksjs/bun-router/issues/34))
- wip ([a810374](https://github.com/stacksjs/bun-router/commit/a810374)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#36) ([9b56d46](https://github.com/stacksjs/bun-router/commit/9b56d46)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#36](https://github.com/stacksjs/bun-router/issues/36), [#36](https://github.com/stacksjs/bun-router/issues/36))
- **deps**: update all non-major dependencies (#35) ([d117059](https://github.com/stacksjs/bun-router/commit/d117059)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#35](https://github.com/stacksjs/bun-router/issues/35), [#35](https://github.com/stacksjs/bun-router/issues/35))
- wip ([19c9c06](https://github.com/stacksjs/bun-router/commit/19c9c06)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([866ea38](https://github.com/stacksjs/bun-router/commit/866ea38)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([d3607e9](https://github.com/stacksjs/bun-router/commit/d3607e9)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0ff16d2](https://github.com/stacksjs/bun-router/commit/0ff16d2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update all non-major dependencies (#33) ([d53f389](https://github.com/stacksjs/bun-router/commit/d53f389)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#33](https://github.com/stacksjs/bun-router/issues/33), [#33](https://github.com/stacksjs/bun-router/issues/33))
- **deps**: update all non-major dependencies (#32) ([e1b9ab7](https://github.com/stacksjs/bun-router/commit/e1b9ab7)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#32](https://github.com/stacksjs/bun-router/issues/32), [#32](https://github.com/stacksjs/bun-router/issues/32))
- wip ([210b539](https://github.com/stacksjs/bun-router/commit/210b539)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency vite to 7.1.11 (#26) ([4764845](https://github.com/stacksjs/bun-router/commit/4764845)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#26](https://github.com/stacksjs/bun-router/issues/26), [#26](https://github.com/stacksjs/bun-router/issues/26))
- **deps**: update dependency actions/checkout to v5.0.0 (#29) ([0b8070d](https://github.com/stacksjs/bun-router/commit/0b8070d)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#29](https://github.com/stacksjs/bun-router/issues/29), [#29](https://github.com/stacksjs/bun-router/issues/29))
- wip ([20da93e](https://github.com/stacksjs/bun-router/commit/20da93e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([4869262](https://github.com/stacksjs/bun-router/commit/4869262)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([2a9fbbf](https://github.com/stacksjs/bun-router/commit/2a9fbbf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([cdf839e](https://github.com/stacksjs/bun-router/commit/cdf839e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5e01912](https://github.com/stacksjs/bun-router/commit/5e01912)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency @vitejs/plugin-vue to 6.0.1 (updated) (#16) ([0d4e065](https://github.com/stacksjs/bun-router/commit/0d4e065)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#16](https://github.com/stacksjs/bun-router/issues/16), [#16](https://github.com/stacksjs/bun-router/issues/16))
- wip ([5b57dcc](https://github.com/stacksjs/bun-router/commit/5b57dcc)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency vue-tsc to 3.1.1 (#27) ([b0f06d6](https://github.com/stacksjs/bun-router/commit/b0f06d6)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#27](https://github.com/stacksjs/bun-router/issues/27), [#27](https://github.com/stacksjs/bun-router/issues/27))
- wip ([390c266](https://github.com/stacksjs/bun-router/commit/390c266)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([60e8bdd](https://github.com/stacksjs/bun-router/commit/60e8bdd)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ae36fa1](https://github.com/stacksjs/bun-router/commit/ae36fa1)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([8bfc858](https://github.com/stacksjs/bun-router/commit/8bfc858)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9276052](https://github.com/stacksjs/bun-router/commit/9276052)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e498e74](https://github.com/stacksjs/bun-router/commit/e498e74)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([9f57c8b](https://github.com/stacksjs/bun-router/commit/9f57c8b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8831b6c](https://github.com/stacksjs/bun-router/commit/8831b6c)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([9b08a8b](https://github.com/stacksjs/bun-router/commit/9b08a8b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b3e406b](https://github.com/stacksjs/bun-router/commit/b3e406b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([cee107a](https://github.com/stacksjs/bun-router/commit/cee107a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([4513849](https://github.com/stacksjs/bun-router/commit/4513849)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5a69106](https://github.com/stacksjs/bun-router/commit/5a69106)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d744388](https://github.com/stacksjs/bun-router/commit/d744388)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([93fb67f](https://github.com/stacksjs/bun-router/commit/93fb67f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([532dde8](https://github.com/stacksjs/bun-router/commit/532dde8)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8f2a0d6](https://github.com/stacksjs/bun-router/commit/8f2a0d6)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([f19821b](https://github.com/stacksjs/bun-router/commit/f19821b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([c6705dd](https://github.com/stacksjs/bun-router/commit/c6705dd)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8bf0569](https://github.com/stacksjs/bun-router/commit/8bf0569)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5e7ab2f](https://github.com/stacksjs/bun-router/commit/5e7ab2f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([4fda9ac](https://github.com/stacksjs/bun-router/commit/4fda9ac)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e3df40a](https://github.com/stacksjs/bun-router/commit/e3df40a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([db8fbee](https://github.com/stacksjs/bun-router/commit/db8fbee)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9184f3d](https://github.com/stacksjs/bun-router/commit/9184f3d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([4f9d5e8](https://github.com/stacksjs/bun-router/commit/4f9d5e8)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([07d542e](https://github.com/stacksjs/bun-router/commit/07d542e)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([67aab70](https://github.com/stacksjs/bun-router/commit/67aab70)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e9dbbfd](https://github.com/stacksjs/bun-router/commit/e9dbbfd)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([4ce5dd2](https://github.com/stacksjs/bun-router/commit/4ce5dd2)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([ef7a612](https://github.com/stacksjs/bun-router/commit/ef7a612)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([2323953](https://github.com/stacksjs/bun-router/commit/2323953)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([e5f5bc8](https://github.com/stacksjs/bun-router/commit/e5f5bc8)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([9f0d503](https://github.com/stacksjs/bun-router/commit/9f0d503)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([0ef5a66](https://github.com/stacksjs/bun-router/commit/0ef5a66)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([c75e762](https://github.com/stacksjs/bun-router/commit/c75e762)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([59c515a](https://github.com/stacksjs/bun-router/commit/59c515a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([7367969](https://github.com/stacksjs/bun-router/commit/7367969)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ba4829e](https://github.com/stacksjs/bun-router/commit/ba4829e)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([488eb28](https://github.com/stacksjs/bun-router/commit/488eb28)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([977c52f](https://github.com/stacksjs/bun-router/commit/977c52f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([67d1d36](https://github.com/stacksjs/bun-router/commit/67d1d36)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([365dc4b](https://github.com/stacksjs/bun-router/commit/365dc4b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a570554](https://github.com/stacksjs/bun-router/commit/a570554)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([66323dc](https://github.com/stacksjs/bun-router/commit/66323dc)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b489f8f](https://github.com/stacksjs/bun-router/commit/b489f8f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d0ad11c](https://github.com/stacksjs/bun-router/commit/d0ad11c)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a4c058b](https://github.com/stacksjs/bun-router/commit/a4c058b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5577fc7](https://github.com/stacksjs/bun-router/commit/5577fc7)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([9d25ddb](https://github.com/stacksjs/bun-router/commit/9d25ddb)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([4d599b9](https://github.com/stacksjs/bun-router/commit/4d599b9)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([c050074](https://github.com/stacksjs/bun-router/commit/c050074)) _(by Chris <chrisbreuer93@gmail.com>)_
- update tools ([b9398a4](https://github.com/stacksjs/bun-router/commit/b9398a4)) _(by Adelino Ngomacha <adelinob335@gmail.com>)_
- update tools ([9ade182](https://github.com/stacksjs/bun-router/commit/9ade182)) _(by Adelino Ngomacha <adelinob335@gmail.com>)_
- **deps**: update all non-major dependencies (#8) ([a9b3e7f](https://github.com/stacksjs/bun-router/commit/a9b3e7f)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#8](https://github.com/stacksjs/bun-router/issues/8), [#8](https://github.com/stacksjs/bun-router/issues/8))
- **deps**: update dependency bunfig to ^0.8.4 (#7) ([c804b46](https://github.com/stacksjs/bun-router/commit/c804b46)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#7](https://github.com/stacksjs/bun-router/issues/7), [#7](https://github.com/stacksjs/bun-router/issues/7))
- wip ([a9a620f](https://github.com/stacksjs/bun-router/commit/a9a620f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([52e229c](https://github.com/stacksjs/bun-router/commit/52e229c)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d634dbd](https://github.com/stacksjs/bun-router/commit/d634dbd)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([28ecdbe](https://github.com/stacksjs/bun-router/commit/28ecdbe)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([525e2e1](https://github.com/stacksjs/bun-router/commit/525e2e1)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0ba9506](https://github.com/stacksjs/bun-router/commit/0ba9506)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([72a1cf3](https://github.com/stacksjs/bun-router/commit/72a1cf3)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([40f2648](https://github.com/stacksjs/bun-router/commit/40f2648)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([6b54350](https://github.com/stacksjs/bun-router/commit/6b54350)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d8b2c4a](https://github.com/stacksjs/bun-router/commit/d8b2c4a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([65ff156](https://github.com/stacksjs/bun-router/commit/65ff156)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0234c53](https://github.com/stacksjs/bun-router/commit/0234c53)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([bd4dbf5](https://github.com/stacksjs/bun-router/commit/bd4dbf5)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b6f1c84](https://github.com/stacksjs/bun-router/commit/b6f1c84)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update dependency @types/bun to ^1.2.11 (#6) ([837bd89](https://github.com/stacksjs/bun-router/commit/837bd89)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#6](https://github.com/stacksjs/bun-router/issues/6), [#6](https://github.com/stacksjs/bun-router/issues/6))
- wip ([339c871](https://github.com/stacksjs/bun-router/commit/339c871)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([924c9c3](https://github.com/stacksjs/bun-router/commit/924c9c3)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([6c77d7f](https://github.com/stacksjs/bun-router/commit/6c77d7f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([81ee1ad](https://github.com/stacksjs/bun-router/commit/81ee1ad)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([23c218d](https://github.com/stacksjs/bun-router/commit/23c218d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0cea467](https://github.com/stacksjs/bun-router/commit/0cea467)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([7d82d91](https://github.com/stacksjs/bun-router/commit/7d82d91)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b866020](https://github.com/stacksjs/bun-router/commit/b866020)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8b54672](https://github.com/stacksjs/bun-router/commit/8b54672)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ba06728](https://github.com/stacksjs/bun-router/commit/ba06728)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([aac60e4](https://github.com/stacksjs/bun-router/commit/aac60e4)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([cb576c9](https://github.com/stacksjs/bun-router/commit/cb576c9)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([aac43ed](https://github.com/stacksjs/bun-router/commit/aac43ed)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([15cb2b4](https://github.com/stacksjs/bun-router/commit/15cb2b4)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([371d4be](https://github.com/stacksjs/bun-router/commit/371d4be)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0a874bf](https://github.com/stacksjs/bun-router/commit/0a874bf)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5b57f13](https://github.com/stacksjs/bun-router/commit/5b57f13)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a4ccae9](https://github.com/stacksjs/bun-router/commit/a4ccae9)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([142f030](https://github.com/stacksjs/bun-router/commit/142f030)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d46f9bc](https://github.com/stacksjs/bun-router/commit/d46f9bc)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5f748ae](https://github.com/stacksjs/bun-router/commit/5f748ae)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([372468d](https://github.com/stacksjs/bun-router/commit/372468d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([859cb68](https://github.com/stacksjs/bun-router/commit/859cb68)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([eae23fa](https://github.com/stacksjs/bun-router/commit/eae23fa)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update all non-major dependencies (#5) ([0f3a66b](https://github.com/stacksjs/bun-router/commit/0f3a66b)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#5](https://github.com/stacksjs/bun-router/issues/5), [#5](https://github.com/stacksjs/bun-router/issues/5))
- wip ([44794c6](https://github.com/stacksjs/bun-router/commit/44794c6)) _(by Chris <chrisbreuer93@gmail.com>)_
- initial commit ([6899dd3](https://github.com/stacksjs/bun-router/commit/6899dd3)) _(by Chris <chrisbreuer93@gmail.com>)_

### 📄 Miscellaneous

- Merge pull request #25 from stacksjs/buddy-bot/update-major-update---actions/checkout-1760992831306 ([7f69c0d](https://github.com/stacksjs/bun-router/commit/7f69c0d)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#25](https://github.com/stacksjs/bun-router/issues/25), [#25](https://github.com/stacksjs/bun-router/issues/25))

### Contributors

- _Adelino Ngomacha <adelinob335@gmail.com>_
- _Chris <chrisbreuer93@gmail.com>_
- _[renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot])_
- _glennmichael123 <gtorregosa@gmail.com>_
