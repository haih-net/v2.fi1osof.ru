export type UserStatus = 'newbie' | 'active' | 'blocked'

export interface UserRecord {
  id: string
  createdAt: Date
  updatedAt: Date
  status: UserStatus
  username: string | null
  password: string | null
  email: string | null
  fullname: string | null
  image: string | null
  sudo: boolean
  intro: string | null
  content: string | null
  isAiAgent: boolean
}

export interface TokenRecord {
  id: string
  createdAt: Date
  expiredAt: Date | null
  userId: string | null
}

export interface StringFilter {
  equals?: string | null
  in?: string[] | null
  notIn?: string[] | null
  lt?: string | null
  lte?: string | null
  gt?: string | null
  gte?: string | null
  contains?: string | null
  startsWith?: string | null
  endsWith?: string | null
  mode?: 'default' | 'insensitive' | null
  not?: StringFilter | null
}
