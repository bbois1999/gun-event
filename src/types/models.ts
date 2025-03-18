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
  imageUrl?: string
  imageKey?: string
  ticketUrl?: string
  categoryId?: string
  published?: boolean
  startDateTime?: string
  endDateTime?: string
  address?: string
  lat?: number
  lng?: number
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
  images?: PostImage[]
}

export interface PostImage {
  id: string
  url: string
  key: string
  postId: string
  position: number
  createdAt?: Date
  updatedAt?: Date
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

// Add types for prisma models here to make it easier to use them in the app
export interface User {
  id: string
  name?: string
  email: string
  image?: string
}

export interface Tag {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
} 