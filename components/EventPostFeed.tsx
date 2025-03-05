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

type Like = {
  id: string
  userId: string
}

type CombinedPost = (Post | ImagePost) & {
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
    
    // Determine post type by looking for discriminating properties
    let isImagePost = false;
    let postType = 'post'; // default to regular post
    
    // ImagePost must have an image property that is a non-empty string
    if ('image' in post && 
        typeof (post as any).image === 'string' && 
        (post as any).image.length > 0) {
      isImagePost = true;
      postType = 'imagePost';
    }
    
    // Choose the appropriate endpoint based on post type
    let endpoint = `/api/${isImagePost ? 'image-posts' : 'posts'}/${postId}/like`;
    
    console.log('Like request:', { 
      postId, 
      postType,
      endpoint,
      isImagePost,
      image: isImagePost ? (post as any).image : 'N/A'
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
        console.log(`Standard endpoint ${endpoint} failed with ${response.status}`);
        
        // Try to get error details
        let errorMessage = 'Unknown error';
        let errorData = {};
        
        try {
          // Some responses might return empty bodies, handle that gracefully
          const text = await response.text();
          if (text && text.trim() !== '') {
            errorData = JSON.parse(text);
            console.log('Endpoint error details:', errorData);
            errorMessage = errorData && typeof errorData === 'object' && 'error' in errorData 
              ? String(errorData.error) 
              : response.statusText;
          } else {
            console.log('Empty response body from endpoint');
            // Use the status text as fallback error message
            errorMessage = response.statusText || 'Unknown error';
          }
          
          // If the error suggests trying the other endpoint type, try that first
          if (errorMessage.includes('regular post') || errorMessage.includes('image post')) {
            console.log('Trying alternative endpoint based on error message');
            const alternativeType = isImagePost ? 'posts' : 'image-posts';
            const alternativeEndpoint = `/api/${alternativeType}/${postId}/like`;
            
            console.log(`Attempting alternative endpoint: ${alternativeEndpoint}`);
            const alternativeResponse = await fetch(alternativeEndpoint, {
              method: isCurrentlyLiked ? 'DELETE' : 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (alternativeResponse.ok) {
              console.log('Alternative endpoint succeeded');
              return;
            }
          }
        } catch (parseError) {
          console.log('Could not parse error response:', parseError);
          // Continue with the generic fallback
        }
        
        // If specific endpoint failed, try the generic fallback
        console.log('Trying generic fallback endpoint');
        const fallbackResponse = await fetch('/api/like', {
          method: isCurrentlyLiked ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            postId,
            postType // Pass the detected type
          })
        });
        
        if (fallbackResponse.ok) {
          console.log('Fallback to generic endpoint succeeded');
          return;
        }
        
        // If still failed, try with the opposite post type
        const oppositeType = postType === 'post' ? 'imagePost' : 'post';
        console.log(`Trying generic endpoint with opposite type: ${oppositeType}`);
        const lastAttemptResponse = await fetch('/api/like', {
          method: isCurrentlyLiked ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            postId,
            postType: oppositeType
          })
        });
        
        if (lastAttemptResponse.ok) {
          console.log('Last attempt with opposite type succeeded');
          return;
        }
        
        // If still failed, revert optimistic update
        setLikedPosts({ ...likedPosts, [postId]: isCurrentlyLiked })
        setLikeCount({ 
          ...likeCount, 
          [postId]: isCurrentlyLiked 
            ? (likeCount[postId] || 0) 
            : (likeCount[postId] || 0) - 1 
        })
        
        // Try to get error details from the last response
        try {
          const errorData = await lastAttemptResponse.json();
          console.error('Final error details:', errorData);
          errorMessage = errorData.error || lastAttemptResponse.statusText;
        } catch (parseError) {
          console.error('Could not parse final error response:', parseError);
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
            {(('image' in post && post.image) || (post as any).image) && (
              <div className="mt-4 relative aspect-video rounded-md overflow-hidden">
                {/* Get the image from either type of post */}
                {(() => {
                  const imageUrl = ('image' in post) ? post.image : (post as any).image;
                  if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image')) {
                    // Display base64 image
                    return (
                      <img 
                        src={imageUrl} 
                        alt={post.title}
                        className="object-cover w-full h-full"
                      />
                    );
                  } else if (typeof imageUrl === 'string') {
                    // Fallback for non-base64 images
                    return (
                      <Image
                        src={imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    );
                  }
                  return null;
                })()}
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