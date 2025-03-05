"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus, UserCheck } from "lucide-react"
import { EventPostFeed } from "@/components/EventPostFeed"
import { type Post, type ImagePost } from "@/src/types/models"
import { useToast } from "@/components/ui/use-toast"

type CombinedPost = (Post | ImagePost) & {
  author: {
    id: string
    email: string
  }
}

interface UserPageProps {
  params: {
    id: string
  }
}

export default function UserProfilePage({ params }: UserPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<{ id: string, email: string } | null>(null)
  const [posts, setPosts] = useState<CombinedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  
  const isOwnProfile = session?.user?.id === params.id
  
  // Redirect to profile page if viewing own profile
  useEffect(() => {
    if (isOwnProfile) {
      router.push('/profile')
    }
  }, [isOwnProfile, router])

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!params.id) return
      try {
        const response = await fetch(`/api/users/${params.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/404')
            return
          }
          throw new Error('Failed to fetch user')
        }
        const userData = await response.json()
        setUser(userData)
      } catch (error) {
        console.error('Error fetching user:', error)
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive"
        })
      }
    }

    fetchUser()
  }, [params.id, router, toast])

  // Fetch user posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!params.id) return
      try {
        const response = await fetch(`/api/users/${params.id}/posts/public`)
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
  }, [params.id])

  // Check if current user is following this user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!session?.user || !params.id) return
      
      try {
        const response = await fetch(`/api/users/${params.id}/followers`)
        if (!response.ok) throw new Error('Failed to fetch followers')
        const data = await response.json()
        
        setFollowerCount(data.count)
        setIsFollowing(data.isFollowing)
      } catch (error) {
        console.error('Error checking follow status:', error)
      }
    }

    checkFollowStatus()
  }, [session?.user, params.id])

  const handleFollowToggle = async () => {
    if (!session?.user) {
      router.push('/login')
      return
    }

    setFollowLoading(true)
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${params.id}/follow`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to update follow status')
      }

      // Update UI state
      setIsFollowing(!isFollowing)
      setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1)
      
      toast({
        title: isFollowing ? "Unfollowed" : "Followed",
        description: isFollowing 
          ? `You unfollowed ${user?.email}` 
          : `You are now following ${user?.email}`,
      })
    } catch (error) {
      console.error('Error updating follow status:', error)
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      })
    } finally {
      setFollowLoading(false)
    }
  }

  if (status === "loading" || (!user && loading)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">User not found</h1>
          <p className="mt-2 text-muted-foreground">
            The user you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>User Profile</CardTitle>
            {!isOwnProfile && session?.user && (
              <Button 
                onClick={handleFollowToggle}
                disabled={followLoading}
                variant={isFollowing ? "outline" : "default"}
                size="sm"
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-semibold">Followers:</span> {followerCount}
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-semibold mb-6">Posts</h2>
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