import { createPageLoader } from '../Custom/pages/Site/loader.server'

export { SitePage as default } from '../Custom/pages/Site'
export { meta, headers } from './site'

export const loader = createPageLoader('/worklogs')
