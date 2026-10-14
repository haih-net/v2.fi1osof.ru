import type { Config } from '@react-router/dev/config'
export default {
  ssr: true,
  prerender: false,
  routeDiscovery: { mode: 'initial' },
} satisfies Config
