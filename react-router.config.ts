import type { Config } from '@react-router/dev/config'
export default {
  ssr: true,
  prerender: [
    '/',
    '/solutions',
    '/solutions/ai-seller',
    '/solutions/incremental-sales',
    '/solutions/business-operations',
    '/solutions/ai-visibility',
    '/clients',
    '/clients/kilfor',
    '/clients/happybaby2000',
    '/clients/balldecor',
    '/prices',
    '/terms',
    '/terms/polza.ai',
  ],
  routeDiscovery: { mode: 'initial' },
} satisfies Config
