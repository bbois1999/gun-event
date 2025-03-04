import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";

interface PostProps {
  username: string;
  userAvatar: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
}

export function Post({
  username,
  userAvatar,
  timestamp,
  content,
  imageUrl,
  likes,
  comments,
}: PostProps) {
  return (
    <Card className="w-full max-w-2xl mb-4">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={userAvatar} alt={username} />
          <AvatarFallback>{username[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="font-semibold">{username}</p>
          <p className="text-sm text-muted-foreground">{timestamp}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{content}</p>
        {imageUrl && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt="Post image"
              fill
              className="object-cover"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-4">
        <Button variant="ghost" size="sm" className="flex gap-2">
          <Heart className="w-5 h-5" />
          <span>{likes}</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex gap-2">
          <MessageCircle className="w-5 h-5" />
          <span>{comments}</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex gap-2">
          <Share2 className="w-5 h-5" />
        </Button>
      </CardFooter>
    </Card>
  );
} 