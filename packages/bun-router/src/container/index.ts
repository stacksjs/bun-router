/**
 * Dependency-injection container — public entry point.
 *
 * ```ts
 * import { Container, createContainer, Inject, Injectable } from '@stacksjs/bun-router/container'
 * ```
 *
 * The core `Container` (and a few companions) are also re-exported from the
 * package root; the decorators live only here because their names (`Get`,
 * `Post`, `Controller`, …) would collide with the router's exports.
 */

export * from './container'

// Decorators. The duplicate `InjectableMetadata`/`InjectMetadata` interface
// declarations stay out of the barrel — the canonical ones come from
// `./container` above.
export {
  Body,
  Controller,
  CONTROLLER_METADATA_KEY,
  Cookie,
  decoratorContainer,
  DecoratorContainer,
  Delete,
  Get,
  Head,
  Header,
  Inject,
  Injectable,
  InjectParam,
  MetadataReader,
  MIDDLEWARE_METADATA_KEY,
  Optional,
  Options,
  Param,
  PARAM_METADATA_KEY,
  Patch,
  Post,
  Put,
  Query,
  ROUTE_METADATA_KEY,
  Tagged,
  UseMiddleware,
} from './decorators'
export type { ControllerMetadata, ParamMetadata, RouteMetadata } from './decorators'

export * from './contextual-binding'
export * from './service-provider'
