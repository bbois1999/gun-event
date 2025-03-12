export interface Event {
  id: string
  createdAt: Date
  updatedAt: Date
  title: string
  description: string
  date: Date
  location: string
  organizer: string
  authorId: string
  posts?: Post[]
  imagePosts?: ImagePost[]
}

export interface Post {
  id: string
  createdAt: Date
  updatedAt: Date
  title: string
  content: string
  published: boolean
  authorId: string
  eventId?: string
  imageUrl?: string
  imageKey?: string
}

export interface ImagePost {
  id: string
  createdAt: Date
  updatedAt: Date
  title: string
  content: string
  published: boolean
  authorId: string
  image: string
  eventId?: string
} 