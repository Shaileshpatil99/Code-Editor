export interface User {
    id: string
    name: string
    email: string
    image: string
    role: string
    createdAt: Date
    updatedAt: Date
  }
  
  export interface Project {
    id: string
    title?: string | null
    description?: string | null
    template: string
    createdAt?: Date | null
    updatedAt?: Date | null
    userId: string
    user?: User | null
    Starmark?: { isMarked: boolean }[]
  }