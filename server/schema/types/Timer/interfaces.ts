import type { RecordBase } from '../../helpers/records'

export interface TimerRecord extends RecordBase {
  taskId: string
  startedAt: Date
  stoppedAt: Date | null
}
