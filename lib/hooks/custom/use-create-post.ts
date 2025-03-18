import { useMutation } from '@tanstack/react-query'

interface CreatePostData {
  title: string
  content: string
  published: boolean
  eventId?: string
  author?: {
    connect: {
      id: string
    }
  }
  event?: {
    connect: {
      id: string
    }
  }
}

export function useCreatePost() {
  return useMutation({
    mutationFn: async (data: { data: CreatePostData }) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.data),
      })

      if (!response.ok) {
        throw new Error('Failed to create post')
      }

      return response.json()
    },
  })
} 