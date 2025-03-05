"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, UserPlus, UserCheck, Search, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

type User = {
  id: string
  email: string
  isFollowing: boolean
}

export default function ExplorePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({})
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return;
    
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/explore')
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error('Error fetching users:', error)
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      initialized.current = true;
      fetchUsers()
    } else if (status !== "loading") {
      router.push('/login')
    }
  }, [session, status, router, toast])

  const handleFollowToggle = async (user: User) => {
    if (!session?.user) {
      router.push('/login')
      return
    }

    setFollowLoading(prev => ({ ...prev, [user.id]: true }))
    
    try {
      const method = user.isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${user.id}/follow`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to update follow status')
      }

      // Update the user in the state
      setUsers(users.map(u => {
        if (u.id === user.id) {
          return { ...u, isFollowing: !u.isFollowing }
        }
        return u
      }))
      
      toast({
        title: user.isFollowing ? "Unfollowed" : "Followed",
        description: user.isFollowing 
          ? `You unfollowed ${user.email}` 
          : `You are now following ${user.email}`,
      })
    } catch (error) {
      console.error('Error updating follow status:', error)
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      })
    } finally {
      setFollowLoading(prev => ({ ...prev, [user.id]: false }))
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null // Router will redirect in useEffect
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Explore Users</h1>
          <p className="text-muted-foreground">
            Discover other users and follow them to see their posts in your feed.
          </p>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{user.email}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4" />
                    <span>User ID: {user.id.slice(0, 8)}...</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                  >
                    <Link href={`/users/${user.id}`}>
                      View Profile
                    </Link>
                  </Button>
                  <Button 
                    onClick={() => handleFollowToggle(user)}
                    disabled={followLoading[user.id]}
                    variant={user.isFollowing ? "outline" : "default"}
                    size="sm"
                  >
                    {followLoading[user.id] ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : user.isFollowing ? (
                      <UserCheck className="h-4 w-4 mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {user.isFollowing ? "Following" : "Follow"}
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users found matching your search.' : 'No users available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 