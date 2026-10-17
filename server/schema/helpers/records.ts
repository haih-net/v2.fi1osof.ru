export interface RecordBase {
  id: string
  createdAt: Date
  updatedAt: Date
  createdById: string
  en?: Record<string, unknown> | null
  vi?: Record<string, unknown> | null
}
export interface ContentRecord extends RecordBase {
  name: string
  description: string | null
  intro: string | null
  content: string | null
  image: string | null
}
