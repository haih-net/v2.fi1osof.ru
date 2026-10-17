import type { ContentRecord } from '../../helpers/records'

export interface ProjectRecord extends ContentRecord {
  commercial: boolean
  status: string | null
}
