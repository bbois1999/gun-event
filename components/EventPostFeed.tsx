"use client"

import { type Post, type ImagePost } from '@/src/types/models'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar, Heart } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'

type Like = {
  id: string
  userId: string
}

type CombinedPost = Post & {
  author: {
    id: string
    email: string
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

  // initialize image loading states at the beginning
  useEffect(() => {
    const initialImageLoadingStates: Record<string, boolean> = {};
    
    posts.forEach(post => {
      if (post.imageUrl) {
        initialImageLoadingStates[post.id] = true;
      }
    });
    
    setImageLoadingStates(initialImageLoadingStates);
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
    
    // Dump the post structure to console for debugging
    console.log('Post structure:', JSON.stringify(post, null, 2));
    
    // All posts now use the unified model
    let endpoint = `/api/posts/${postId}/like`;
    
    console.log('Like request:', { 
      postId,
      endpoint,
      hasImage: !!post.imageUrl
    });

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
        console.log(`Like endpoint failed with ${response.status}`);
        
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
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(`Failed to update like status: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error toggling like:', error)
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
    <div className="space-y-6">
      {sortedPosts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {post.author.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Link href={`/posts/${post.id}`} className="hover:underline">
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                </Link>
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
            {/* Check if there's an image in either Post or ImagePost */}
            {post.imageUrl && (
              <div className="mt-3 relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                {imageLoadingStates[post.id] && !imageErrorStates[post.id] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-pulse">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                )}
                {imageErrorStates[post.id] && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Failed to load image</p>
                  </div>
                )}
                <Image
                  src={post.imageUrl}
                  alt="Post image"
                  fill
                  className={`object-cover transition-opacity duration-300 ${
                    imageLoadingStates[post.id] ? "opacity-0" : "opacity-100"
                  }`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onLoad={() => handleImageLoad(post.id)}
                  onError={() => handleImageError(post.id)}
                />
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