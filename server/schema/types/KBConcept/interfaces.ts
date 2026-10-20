export interface ConceptRecord {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  type: string | null
  uri: string | null
  description: string | null
  intro: string | null
  content: string | null
  image: string | null
  createdById: string
  code: string | null
  parentId: string | null
  rootId: string | null
  path: string | null
  quality: number
  visibility: 'public' | 'hidden' | 'unpublished'
  data: unknown
  lat: number | null
  lng: number | null
}
