import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, ImageIcon } from "lucide-react";

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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
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
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
            {imageLoading && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-pulse">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load image</p>
              </div>
            )}
            <Image
              src={imageUrl}
              alt="Post image"
              fill
              className={`object-cover transition-opacity duration-300 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
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