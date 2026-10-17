import type { RecordBase } from '../../helpers/records'

export interface WorkLogRecord extends RecordBase {
  content: string
  taskId: string
}
