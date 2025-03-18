"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Image from 'next/image'
import { User, Calendar, Heart, MessageCircle, ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

type Author = {
  id: string
  email: string
}

type Like = {
  id: string
  userId: string
}

type Post = {
  id: string
  title: string
  content: string
  image?: string
  createdAt: string
  updatedAt: string
  published: boolean
  authorId: string
  eventId?: string
  author: Author
  event?: {
    id: string
    title: string
  }
  likes?: Like[]
  _count?: {
    likes: number
  }
}

export default function PostPage() {
  const params = useParams()
  const postId = params?.id as string
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const initialized = useRef(false)

  // Fetch post data once on component mount
  const fetchPostData = useCallback(async () => {
    if (!postId) return;
    
    try {
      console.log('Fetching post with ID:', postId);
      // Try regular post first
      let response = await fetch(`/api/posts/${postId}`);
      
      // If not found, try image post
      if (!response.ok) {
        response = await fetch(`/api/image-posts/${postId}`);
        
        if (!response.ok) {
          console.error('Post not found:', postId);
          toast({
            title: "Error",
            description: "Post not found",
            variant: "destructive"
          });
          router.push('/');
          return;
        }
      }
      
      const data = await response.json();
      console.log('Post data received:', data);
      setPost(data);
      
      // Set like count
      const count = data._count?.likes || data.likes?.length || 0;
      setLikeCount(count);
      
      // Set like status if user is logged in
      if (session?.user?.id && data.likes) {
        const userLiked = data.likes.some((like: Like) => like.userId === session.user.id);
        setLiked(userLiked);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [postId, router, toast, session]);

  // Initial data fetch
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchPostData();
    }
  }, [fetchPostData]);

  // Update like status when session changes
  useEffect(() => {
    if (session?.user?.id && post?.likes) {
      const userLiked = post.likes.some((like: Like) => like.userId === session.user.id);
      setLiked(userLiked);
    }
  }, [session, post]);

  const handleLikeToggle = async () => {
    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive"
      });
      return;
    }

    if (!post) return;
    
    setIsLiking(true);
    
    // Determine post type
    const isImagePost = post && 'image' in post && typeof post.image === 'string' && post.image.length > 0;
    
    // Optimistic update
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    
    try {
      // Choose appropriate endpoint
      const endpoint = `/api/${isImagePost ? 'image-posts' : 'posts'}/${postId}/like`;
      
      const response = await fetch(endpoint, {
        method: liked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Try fallback endpoint
        const fallbackResponse = await fetch('/api/like', {
          method: liked ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            postId,
            postType: isImagePost ? 'imagePost' : 'post'
          })
        });
        
        if (!fallbackResponse.ok) {
          // Revert optimistic update
          setLiked(prev => !prev);
          setLikeCount(prev => liked ? prev + 1 : prev - 1);
          throw new Error('Failed to update like status');
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      });
    } finally {
      setIsLiking(false);
    }
  };

  // Handle post deletion
  const handleDeletePost = async () => {
    if (!session?.user || !post) return;
    
    // Confirm before deletion
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // Determine post type
      const isImagePost = post && 'image' in post && typeof post.image === 'string' && post.image.length > 0;
      const endpoint = `/api/${isImagePost ? 'image-posts' : 'posts'}/${postId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="container max-w-2xl py-8 mx-auto">
        <div className="mb-6 w-full">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-32 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (!post) {
    return (
      <div className="container max-w-2xl py-8 mx-auto">
        <div className="mb-6 w-full">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="text-center py-8 w-full">
          <CardContent>
            <p className="text-lg text-muted-foreground">Post not found</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if current user is post owner
  const isPostOwner = session?.user?.id === post.authorId;

  // Format date
  const formattedDate = format(new Date(post.createdAt), 'PPP');

  // Render post
  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <div className="mb-6 w-full">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{post.title}</CardTitle>
          <div className="flex items-center text-sm text-muted-foreground space-x-2 mt-2">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Author info */}
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
              <AvatarImage src={`https://avatar.vercel.sh/${post.author.email}`} />
            </Avatar>
            <div>
              <p className="text-sm font-medium">{post.author.email.split('@')[0]}</p>
            </div>
          </div>
          
          {/* Post content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p>{post.content}</p>
          </div>
          
          {/* Post image */}
          {post.image && (
            <div className="mt-4 relative rounded-md overflow-hidden">
              <Image 
                src={post.image} 
                alt={post.title}
                width={800} 
                height={500}
                className="object-cover"
              />
            </div>
          )}
          
          {/* Event link */}
          {post.event && (
            <div className="mt-4 px-4 py-3 bg-muted rounded-md">
              <p className="text-sm font-medium">From event:</p>
              <Link href={`/events/${post.event.id}`} className="text-primary hover:underline">
                {post.event.title}
              </Link>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLiking || !session}
            className={`flex items-center space-x-1 ${liked ? 'text-red-500' : ''}`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </Button>
          
          {isPostOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              Delete Post
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 