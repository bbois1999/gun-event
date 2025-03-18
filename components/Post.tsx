"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Heart, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'
import { Post as PostType, PostImage } from '@/src/types/models'
import { ImageGallery, GalleryImage } from '@/components/ui/image-gallery'

type CombinedPost = PostType & {
  author: {
    id: string
    email: string
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

interface PostProps {
  post: CombinedPost
  onPostUpdated?: () => void
}

export function Post({ post, onPostUpdated }: PostProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (post) {
      // Check if current user has liked the post
      const userHasLiked = post.likes?.some(like => 
        like.userId === session?.user?.id
      ) || false
      
      setLiked(userHasLiked)
      setLikeCount(post._count?.likes || post.likes?.length || 0)
      
      // Reset image loading state
      setImageLoading(false)
      setImageError(false)
    }
  }, [post, session])

  const handleLikeToggle = async () => {
    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive"
      })
      return
    }

    // Optimistic update
    setIsLiking(true)
    setLiked(!liked)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)

    try {
      const endpoint = `/api/posts/${post.id}/like`
      
      const response = await fetch(endpoint, {
        method: liked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Revert optimistic update
        setLiked(liked)
        setLikeCount(prev => liked ? prev + 1 : prev - 1)
        
        throw new Error("Failed to update like status")
      }
      
      // Notify parent component of the update
      if (onPostUpdated) {
        onPostUpdated()
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update like status",
        variant: "destructive"
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

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
    
    console.log(`Post ${post.id} has ${images.length} images`, images);
    return images;
  };

  if (!post) return null

  const postImages = getPostImages(post);
  const hasMultipleImages = postImages.length > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>
              {post.author.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{post.title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {post.author.email} • {format(new Date(post.createdAt), 'PPp')}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {post.event && (
          <div className="px-4 py-2 mb-4 bg-muted rounded-md flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-medium">Found at: </span>
            <Link href={`/events/${post.event.id}`} className="ml-1 text-primary hover:underline">
              {post.event.title}
            </Link>
          </div>
        )}
        <p className="whitespace-pre-wrap">{post.content}</p>
        
        {/* Display images using the gallery component */}
        {postImages.length > 0 && (
          <div className="mt-4">
            <ImageGallery
              images={postImages}
              containerClassName="rounded-lg overflow-hidden bg-muted"
              onImageLoad={() => handleImageLoad()}
              onImageError={() => handleImageError()}
            />
            
            {hasMultipleImages && (
              <div className="mt-2 text-sm text-center text-muted-foreground">
                <p>Click the image to view all {postImages.length} photos in fullscreen</p>
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
              liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleLikeToggle}
            disabled={isLiking}
          >
            <Heart className={cn(
              "h-4 w-4",
              liked ? "fill-current" : "fill-none"
            )} />
            <span>{likeCount}</span>
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
  )
} 