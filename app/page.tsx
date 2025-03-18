"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { PostButton } from "@/components/PostButton"
import { EventPostFeed } from "@/components/EventPostFeed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { type Post, type ImagePost, type PostImage } from "@/src/types/models"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type CombinedPost = (Post | ImagePost) & {
  author: {
    id: string
    email: string
    username?: string
    profileImageUrl?: string
  }
  event?: {
    id: string
    title: string
  }
  likes?: {
    id: string
    userId: string
  }[]
  _count?: {
    likes: number
  }
  images?: PostImage[]
}

export default function Home() {
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<CombinedPost[]>([])
  const [followingPosts, setFollowingPosts] = useState<CombinedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  // Function to refresh posts
  const refreshPosts = async () => {
    setLoading(true)
    try {
      // Fetch all posts - use the main posts API for unauthenticated users
      const endpoint = session?.user ? '/api/posts/feed' : '/api/posts'
      const response = await fetch(endpoint)
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

  useEffect(() => {
    refreshPosts()
  }, [session])

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Gun Event Feed</h1>
          <PostButton onSuccess={refreshPosts} />
        </div>

        {session?.user ? (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="all" className="text-sm sm:text-base">All Posts</TabsTrigger>
              <TabsTrigger value="following" className="text-sm sm:text-base">Following</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4 sm:mt-6">
              {posts.length > 0 ? (
                <EventPostFeed posts={posts} />
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  No posts available. Be the first to create a post!
                </div>
              )}
            </TabsContent>
            <TabsContent value="following" className="mt-4 sm:mt-6">
              {followingPosts.length > 0 ? (
                <EventPostFeed posts={followingPosts} />
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground space-y-4">
                  <p>You're not following anyone yet, or the people you follow haven't posted anything.</p>
                  <p>Explore users and their posts to find people to follow!</p>
                  <Button asChild size="sm" className="sm:size-md">
                    <Link href="/explore">Explore Users</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            {posts.length > 0 ? (
              <>
                <div className="bg-muted p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
                  <p className="text-xs sm:text-sm text-center">Sign in to like posts and follow users!</p>
                </div>
                <EventPostFeed posts={posts} />
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                No posts available. Sign in to create a post!
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
