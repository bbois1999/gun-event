"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PostButton } from "@/components/PostButton"
import { EventPostFeed } from "@/components/EventPostFeed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { type Post, type ImagePost } from "@/src/types/models"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type CombinedPost = (Post | ImagePost) & {
  author: {
    id: string
    email: string
  }
  event?: {
    id: string
    title: string
  }
}

export default function Home() {
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<CombinedPost[]>([])
  const [followingPosts, setFollowingPosts] = useState<CombinedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Fetch all posts
        const response = await fetch('/api/posts/feed')
        if (!response.ok) throw new Error('Failed to fetch posts')
        const data = await response.json()
        setPosts(data)

        // If user is logged in, fetch posts from followed users
        if (session?.user) {
          const followingResponse = await fetch('/api/posts/following')
          if (followingResponse.ok) {
            const followingData = await followingResponse.json()
            setFollowingPosts(followingData)
          }
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [session])

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="container max-w-4xl mx-auto py-8">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gun Event Feed</h1>
          <PostButton />
        </div>

        {session?.user ? (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Posts</TabsTrigger>
              <TabsTrigger value="following">Following</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              {posts.length > 0 ? (
                <EventPostFeed posts={posts} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No posts available. Be the first to create a post!
                </div>
              )}
            </TabsContent>
            <TabsContent value="following" className="mt-6">
              {followingPosts.length > 0 ? (
                <EventPostFeed posts={followingPosts} />
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-4">
                  <p>You're not following anyone yet, or the people you follow haven't posted anything.</p>
                  <p>Explore users and their posts to find people to follow!</p>
                  <Button asChild>
                    <Link href="/explore">Explore Users</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            {posts.length > 0 ? (
              <EventPostFeed posts={posts} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No posts available. Sign in to create a post!
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
