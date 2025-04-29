import type { HeadConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { withPwa } from '@vite-pwa/vitepress'
import { defineConfig } from 'vitepress'
import viteConfig from './vite.config'

// https://vitepress.dev/reference/site-config

const analyticsHead: HeadConfig[] = [
  [
    'script',
    {
      'src': 'https://cdn.usefathom.com/script.js',
      'data-site': 'PNPZXDQL',
      'defer': '',
    },
  ],
]

const nav = [
  { text: 'News', link: 'https://stacksjs.org/news' },
  {
    text: 'Changelog',
    link: 'https://github.com/stacksjs/bun-router/blob/main/CHANGELOG.md',
  },
  // { text: 'Blog', link: 'https://updates.ow3.org' },
  {
    text: 'Resources',
    items: [
      { text: 'Team', link: '/team' },
      { text: 'Sponsors', link: '/sponsors' },
      { text: 'Partners', link: '/partners' },
      { text: 'Postcardware', link: '/postcardware' },
      { text: 'Stargazers', link: '/stargazers' },
      { text: 'License', link: '/license' },
      {
        items: [
          {
            text: 'Awesome Stacks',
            link: 'https://github.com/stacksjs/awesome-stacks',
          },
          {
            text: 'Contributing',
            link: 'https://github.com/stacksjs/stacks/blob/main/.github/CONTRIBUTING.md',
          },
        ],
      },
    ],
  },
]

const sidebar = [
  {
    text: 'Get Started',
    items: [
      { text: 'Introduction', link: '/intro' },
      { text: 'Installation', link: '/install' },
      { text: 'Quick Start', link: '/quick-start' },
      { text: 'Configuration', link: '/config' },
    ],
  },
  {
    text: 'Features',
    items: [
      { text: 'Routing Basics', link: '/features/routing-basics' },
      { text: 'Route Parameters', link: '/features/route-parameters' },
      { text: 'Route Groups', link: '/features/route-groups' },
      { text: 'Named Routes', link: '/features/named-routes' },
      { text: 'Resource Routes', link: '/features/resource-routes' },
      { text: 'Action Handlers', link: '/features/action-handlers' },
      { text: 'View Rendering', link: '/features/view-rendering' },
      { text: 'Middleware', link: '/features/middleware' },
      { text: 'WebSockets', link: '/features/websockets' },
      { text: 'Cookie Handling', link: '/features/cookie-handling' },
      { text: 'File Streaming', link: '/features/file-streaming' },
      { text: 'CSRF Protection', link: '/features/csrf-protection' },
      { text: 'Domain Routing', link: '/features/domain-routing' },
    ],
  },
  {
    text: 'Advanced',
    items: [
      { text: 'Custom Middleware', link: '/advanced/custom-middleware' },
      { text: 'Error Handling', link: '/advanced/error-handling' },
      { text: 'Extending Router', link: '/advanced/extending-router' },
      { text: 'Hot Reloading', link: '/advanced/hot-reloading' },
      { text: 'Performance Optimization', link: '/advanced/performance-optimization' },
      { text: 'WebSocket Patterns', link: '/advanced/websocket-patterns' },
      { text: 'Type Safety', link: '/advanced/type-safety' },
    ],
  },
  { text: 'API Reference', link: '/api-reference' },
  { text: 'Showcase', link: '/showcase' },
]
const description = 'A TypeScript Starter Kit. For a better Development Experience.'
const title = 'bun-router | A TypeScript Starter Kit. For a better Development Experience.'

export default withPwa(
  defineConfig({
    lang: 'en-US',
    title: 'bun-router',
    description,
    metaChunk: true,
    cleanUrls: true,
    lastUpdated: true,

    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: './images/logo-mini.svg' }],
      ['link', { rel: 'icon', type: 'image/png', href: './images/logo.png' }],
      ['meta', { name: 'theme-color', content: '#0A0ABC' }],
      ['meta', { name: 'title', content: title }],
      ['meta', { name: 'description', content: description }],
      ['meta', { name: 'author', content: 'Stacks.js, Inc.' }],
      ['meta', {
        name: 'tags',
        content: 'bun-router, stacksjs, reverse proxy, modern, lightweight, zero-config, local development',
      }],

      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'en' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],

      ['meta', { property: 'og:site_name', content: 'bun-router' }],
      ['meta', { property: 'og:image', content: './images/og-image.jpg' }],
      ['meta', { property: 'og:url', content: 'https://reverse-proxy.sh/' }],
      // ['script', { 'src': 'https://cdn.usefathom.com/script.js', 'data-site': '', 'data-spa': 'auto', 'defer': '' }],
      ...analyticsHead,
    ],

    themeConfig: {
      search: {
        provider: 'local',
      },
      logo: {
        light: './images/logo-transparent.svg',
        dark: './images/logo-white-transparent.svg',
      },

      nav,
      sidebar,

      editLink: {
        pattern: 'https://github.com/stacksjs/stacks/edit/main/docs/docs/:path',
        text: 'Edit this page on GitHub',
      },

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025-present Stacks.js, Inc.',
      },

      socialLinks: [
        { icon: 'twitter', link: 'https://twitter.com/stacksjs' },
        { icon: 'bluesky', link: 'https://bsky.app/profile/chrisbreuer.dev' },
        { icon: 'github', link: 'https://github.com/stacksjs/bun-router' },
        { icon: 'discord', link: 'https://discord.gg/stacksjs' },
      ],

      // algolia: services.algolia,

      // carbonAds: {
      //   code: '',
      //   placement: '',
      // },
    },

    pwa: {
      manifest: {
        theme_color: '#0A0ABC',
      },
    },

    markdown: {
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },

      codeTransformers: [
        transformerTwoslash(),
      ],
    },

    vite: viteConfig,
  }),
)
