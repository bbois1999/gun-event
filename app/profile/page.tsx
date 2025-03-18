"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { EventPostFeed } from "@/components/EventPostFeed"
import { useEffect, useState } from "react"
import { type Post, type ImagePost } from "@/src/types/models"

type CombinedPost = (Post | ImagePost) & {
  author: {
    id: string
    email: string
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<CombinedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!session?.user?.id) return
      try {
        const response = await fetch(`/api/users/${session.user.id}/posts`)
        if (!response.ok) throw new Error('Failed to fetch posts')
        const data = await response.json()
        setPosts(data)
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserPosts()
  }, [session?.user?.id])

  if (status === "loading") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Email:</span> {session.user.email}
              </div>
              <div>
                <span className="font-semibold">User ID:</span> {session.user.id}
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-semibold mb-6">Your Posts</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <EventPostFeed posts={posts} />
          )}
        </div>
      </div>
    </div>
  )
} 