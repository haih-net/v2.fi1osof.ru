import type { RecordBase } from '../../helpers/records'

export interface TaskRecord extends RecordBase {
  title: string
  description: string | null
  content: string | null
  status: string
  projectId: string | null
  assigneeId: string | null
}
