"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugPostTypes() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts/feed')
        if (!response.ok) throw new Error('Failed to fetch posts')
        const data = await response.json()
        setPosts(data)
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  const analyzePostType = (post: any) => {
    const hasTitle = post.hasOwnProperty('title')
    const hasContent = post.hasOwnProperty('content')
    const hasImage = post.hasOwnProperty('image')
    const imageType = typeof post.image
    const imageLength = post.image ? post.image.length : 0
    const hasEventId = post.hasOwnProperty('eventId')
    const hasAuthorId = post.hasOwnProperty('authorId')
    
    let postType = "Unknown"
    
    if (hasTitle && hasContent) {
      if ('title' in post && 'content' in post && 'published' in post) {
        if (hasImage && imageType === 'string' && imageLength > 0) {
          // Both post types can have this structure
          // Check for specific properties or structure that differs
          postType = "Could be either Post or ImagePost"
        } else {
          postType = "Regular Post"
        }
      }
    }
    
    return {
      postType,
      properties: {
        hasTitle,
        hasContent,
        hasImage,
        imageType,
        imageLength,
        hasEventId,
        hasAuthorId
      }
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Post Types</h1>
      
      {posts.length === 0 ? (
        <p>No posts found</p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => {
            const analysis = analyzePostType(post)
            
            return (
              <div key={post.id} className="border p-4 rounded-md">
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <div className="mb-2">
                  <span className="font-medium">Post ID:</span> {post.id}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Detected Type:</span> {analysis.postType}
                </div>
                
                <div className="mb-4">
                  <span className="font-medium">Properties:</span>
                  <ul className="list-disc pl-5 mt-1">
                    {Object.entries(analysis.properties).map(([key, value]) => (
                      <li key={key}>
                        {key}: <code>{JSON.stringify(value)}</code>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">View Post JSON</summary>
                  <pre className="bg-gray-100 p-2 mt-2 overflow-auto text-xs">
                    {JSON.stringify(post, null, 2)}
                  </pre>
                </details>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 