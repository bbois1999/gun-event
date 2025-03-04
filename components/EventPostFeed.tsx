import { Post, User } from "@prisma/client"
import { format } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface PostWithAuthor extends Post {
  author: User
}

interface EventPostFeedProps {
  posts: PostWithAuthor[]
}

export function EventPostFeed({ posts }: EventPostFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No posts yet. Be the first to post about this event!
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar>
              <AvatarFallback>
                {post.author.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold">{post.author.email}</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(post.createdAt), "PPP 'at' p")}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">{post.title}</h3>
            <p className="whitespace-pre-wrap text-sm">{post.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 