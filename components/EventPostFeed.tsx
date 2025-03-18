"use client"

import { type Post, type ImagePost, type PostImage } from '@/src/types/models'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar, Heart, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { ImageGallery, GalleryImage } from '@/components/ui/image-gallery'

type Like = {
  id: string
  userId: string
}

type CombinedPost = Post & {
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
  likes?: Like[]
  _count?: {
    likes: number
  }
  imageUrl?: string
  imageKey?: string
  images?: PostImage[]
}

interface EventPostFeedProps {
  posts: CombinedPost[]
}

export function EventPostFeed({ posts }: EventPostFeedProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({})
  const [likeCount, setLikeCount] = useState<Record<string, number>>({})
  const [isLiking, setIsLiking] = useState<Record<string, boolean>>({})
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({})
  const [imageErrorStates, setImageErrorStates] = useState<Record<string, boolean>>({})
  
  // Initialize like states from posts data
  useEffect(() => {
    const initialLikedState: Record<string, boolean> = {}
    const initialLikeCount: Record<string, number> = {}
    
    posts.forEach(post => {
      // Check if the current user has liked this post
      const userHasLiked = post.likes?.some(like => 
        like.userId === session?.user?.id
      ) || false
      
      initialLikedState[post.id] = userHasLiked
      
      // Set like count
      initialLikeCount[post.id] = post._count?.likes || post.likes?.length || 0
    })
    
    setLikedPosts(initialLikedState)
    setLikeCount(initialLikeCount)
  }, [posts, session])

  // Update the image loading initialization to make it more robust
  useEffect(() => {
    const initialImageLoadingStates: Record<string, boolean> = {};
    const initialImageErrorStates: Record<string, boolean> = {};
    
    posts.forEach(post => {
      if (post.imageUrl || (post.images && post.images.length > 0)) {
        // Start with images not in loading state to prevent flashing
        initialImageLoadingStates[post.id] = false;
        initialImageErrorStates[post.id] = false;
      }
    });
    
    setImageLoadingStates(initialImageLoadingStates);
    setImageErrorStates(initialImageErrorStates);
  }, [posts]);

  const handleLikeToggle = async (post: CombinedPost) => {
    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive"
      })
      return
    }

    const postId = post.id
    const isCurrentlyLiked = likedPosts[postId] || false
    
    // All posts now use the unified model
    let endpoint = `/api/posts/${postId}/like`;

    // Optimistic update
    setIsLiking({ ...isLiking, [postId]: true })
    setLikedPosts({ ...likedPosts, [postId]: !isCurrentlyLiked })
    setLikeCount({ 
      ...likeCount, 
      [postId]: isCurrentlyLiked 
        ? (likeCount[postId] || 0) - 1 
        : (likeCount[postId] || 0) + 1 
    })

    try {
      const response = await fetch(endpoint, {
        method: isCurrentlyLiked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // If failed, revert optimistic update
        setLikedPosts({ ...likedPosts, [postId]: isCurrentlyLiked })
        setLikeCount({ 
          ...likeCount, 
          [postId]: isCurrentlyLiked 
            ? (likeCount[postId] || 0) 
            : (likeCount[postId] || 0) - 1 
        })
        
        let errorMessage = response.statusText || "Failed to update like status";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Error parsing response
        }
        
        throw new Error(`Failed to update like status: ${errorMessage}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update like status",
        variant: "destructive"
      })
    } finally {
      setIsLiking({ ...isLiking, [postId]: false })
    }
  }

  const handleImageLoad = (postId: string) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [postId]: false
    }));
  };

  const handleImageError = (postId: string) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [postId]: false
    }));
    setImageErrorStates(prev => ({
      ...prev,
      [postId]: true
    }));
  };

  // Helper function to get all images for a post
  const getPostImages = (post: CombinedPost): GalleryImage[] => {
    const images: GalleryImage[] = [];
    
    // Add main image if exists
    if (post.imageUrl) {
      images.push({ 
        url: post.imageUrl, 
        key: post.imageKey || '',
        id: 'main-image'
      });
    }
    
    // Add additional images if they exist
    if (post.images && post.images.length > 0) {
      // Sort by position
      const sortedImages = [...post.images].sort((a, b) => a.position - b.position);
      
      // Add to the array
      images.push(...sortedImages.map(img => ({
        url: img.url,
        key: img.key,
        id: img.id
      })));
    }
    
    return images;
  };

  // Gallery image handlers
  const handleGalleryImageLoad = (postId: string, imageIndex: number) => {
    // Update loading state for the post
    handleImageLoad(postId);
  };

  const handleGalleryImageError = (postId: string, imageIndex: number) => {
    // Update error state for the post
    handleImageError(postId);
  };

  if (!posts.length) {
    return (
      <div className="text-center text-muted-foreground">
        No posts yet. Be the first to post in this event!
      </div>
    )
  }

  // Sort posts by creation date, newest first
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {sortedPosts.map((post, index) => (
        <Card key={post.id} className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 space-y-1.5">
            <div className="flex items-center space-x-2">
              <Link href={`/users/${post.author.id}`} className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  {post.author.profileImageUrl ? (
                    <AvatarImage src={post.author.profileImageUrl} alt={post.author.username || post.author.email} />
                  ) : (
                    <AvatarFallback>
                      {post.author.username 
                        ? post.author.username.charAt(0).toUpperCase() 
                        : post.author.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="font-medium text-sm">
                  {post.author.username || post.author.email}
                </span>
              </Link>
            </div>
          </CardHeader>

          {post.event && (
            <div className="px-4 py-1.5 bg-muted/40 border-y">
              <Link href={`/events/${post.event.id}`} className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">Event: </span>
                <span className="ml-1 text-primary hover:underline">{post.event.title}</span>
              </Link>
            </div>
          )}

          <CardContent className="p-0">
            {/* Post Text Content */}
            {post.content && (
              <div className="px-4 py-2 text-sm">
                {post.content}
              </div>
            )}

            {/* Check for images and use the gallery component if available */}
            {(post.imageUrl || (post.images && post.images.length > 0)) && (
              <div className="mt-4">
                <ImageGallery
                  images={getPostImages(post)}
                  containerClassName="rounded-lg overflow-hidden bg-muted"
                  onImageLoad={(index) => handleGalleryImageLoad(post.id, index)}
                  onImageError={(index) => handleGalleryImageError(post.id, index)}
                />
                
                {/* Add indicator for multiple images */}
                {getPostImages(post).length > 1 && (
                  <div className="mt-2 text-xs text-center text-muted-foreground">
                    <p>Click the image to view all {getPostImages(post).length} photos in fullscreen</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  likedPosts[post.id] ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleLikeToggle(post)}
                disabled={isLiking[post.id]}
              >
                <Heart className={cn(
                  "h-4 w-4",
                  likedPosts[post.id] ? "fill-current" : "fill-none"
                )} />
                <span>{likeCount[post.id] || 0}</span>
              </Button>
            </div>
            
            {post.event && (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href={`/events/${post.event.id}`}>
                  <Calendar className="h-4 w-4" />
                  <span>{post.event.title}</span>
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}