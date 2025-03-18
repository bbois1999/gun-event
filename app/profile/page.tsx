"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PencilIcon, UserIcon } from "lucide-react"
import { EventPostFeed } from "@/components/EventPostFeed"
import { useEffect, useState } from "react"
import { type Post, type ImagePost } from "@/src/types/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImageUpload, type ImageFile } from "@/components/ui/image-upload"
import { useToast } from "@/components/ui/use-toast"

type CombinedPost = (Post | ImagePost) & {
  author: {
    id: string
    email: string
  }
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const [posts, setPosts] = useState<CombinedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [openImageUpload, setOpenImageUpload] = useState(false)
  const [profileImage, setProfileImage] = useState<ImageFile[] | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!session?.user?.id) return
      try {
        const response = await fetch(`/api/users/${session.user.id}/posts`)
        if (!response.ok) throw new Error('Failed to fetch posts')
        const data = await response.json()
        setPosts(data)
      } catch (error) {
        // Failed to fetch posts
      } finally {
        setLoading(false)
      }
    }

    fetchUserPosts()
  }, [session?.user?.id])

  // Initialize profile image when session loads
  useEffect(() => {
    if (session?.user?.profileImageUrl) {
      setProfileImage([{
        url: session.user.profileImageUrl,
        key: session.user.profileImageKey || ''
      }])
    }
  }, [session?.user?.profileImageUrl, session?.user?.profileImageKey])

  const updateProfileImage = async () => {
    if (!session?.user?.id || !profileImage?.[0]) return
    
    setUploadingImage(true)
    
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileImageUrl: profileImage[0].url,
          profileImageKey: profileImage[0].key
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update profile image')
      }
      
      // Update session with new profile image
      await updateSession({
        ...session,
        user: {
          ...session.user,
          profileImageUrl: profileImage[0].url,
          profileImageKey: profileImage[0].key
        }
      })
      
      // Force a reload of the page to ensure the session is updated
      window.location.reload();
      
      toast({
        title: "Profile updated",
        description: "Your profile picture has been updated successfully.",
      })
      
      setOpenImageUpload(false)
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update your profile picture. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadingImage(false)
    }
  }

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
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
      <div className="space-y-6 sm:space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative group mx-auto sm:mx-0">
                <Avatar className="h-20 w-20">
                  {session.user.profileImageUrl ? (
                    <AvatarImage src={session.user.profileImageUrl || ''} alt={session.user.username || session.user.email || ''} />
                  ) : (
                    <AvatarFallback>
                      <UserIcon className="h-10 w-10" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button 
                  size="icon"
                  variant="ghost" 
                  className="absolute bottom-0 right-0 rounded-full bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setOpenImageUpload(true)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2 text-center sm:text-left">
                <div>
                  <span className="font-semibold text-lg">{session.user.username}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{session.user.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Your Posts</h2>
          {loading ? (
            <div className="flex justify-center py-6 sm:py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="px-2 sm:px-0">
              <EventPostFeed posts={posts} />
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={openImageUpload} onOpenChange={setOpenImageUpload}>
        <DialogContent className="sm:max-w-md max-w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Update profile picture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ImageUpload
              onChange={setProfileImage}
              value={profileImage}
              disabled={uploadingImage}
              maxImages={1}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpenImageUpload(false)} disabled={uploadingImage}>
                Cancel
              </Button>
              <Button onClick={updateProfileImage} disabled={!profileImage || uploadingImage}>
                {uploadingImage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 