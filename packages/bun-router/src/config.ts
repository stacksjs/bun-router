import type { RouterConfig } from './types'
import { loadConfig } from 'bunfig'

export const defaultConfig: RouterConfig = {
  verbose: true,
}

// eslint-disable-next-line antfu/no-top-level-await
export const config: RouterConfig = await loadConfig({
  name: 'router',
  defaultConfig,
})
