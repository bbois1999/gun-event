"use client"

import { type Post, type ImagePost } from '@/src/types/models'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

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

interface EventPostFeedProps {
  posts: CombinedPost[]
}

export function EventPostFeed({ posts }: EventPostFeedProps) {
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
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {post.author.email} • {format(new Date(post.createdAt), 'PPp')}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>
            {'image' in post && post.image && (
              <div className="mt-4 relative aspect-video">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover rounded-md"
                />
              </div>
            )}
          </CardContent>
          {post.event && (
            <CardFooter>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href={`/events/${post.event.id}`}>
                  <Calendar className="h-4 w-4" />
                  <span>Posted in: {post.event.title}</span>
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  )
} 