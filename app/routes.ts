// import { index, route, type RouteConfig } from '@react-router/dev/routes'

// export default [
//   index('routes/home.tsx'),
//   route('*', 'routes/site.tsx'),
// ] satisfies RouteConfig

import type { RouteConfig } from '@react-router/dev/routes'
import { flatRoutes } from '@react-router/fs-routes'

export default flatRoutes() satisfies RouteConfig
