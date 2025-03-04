import { useMutation } from '@tanstack/react-query'

interface CreateImagePostData {
  title: string
  content: string
  published: boolean
  image: string
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

export function useCreateImagePost() {
  return useMutation({
    mutationFn: async (data: { data: CreateImagePostData }) => {
      const response = await fetch('/api/posts/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.data),
      })

      if (!response.ok) {
        throw new Error('Failed to create image post')
      }

      return response.json()
    },
  })
} 