import { Post } from "@/components/Post";

// Example posts data - this would normally come from a database
const examplePosts = [
  {
    username: "JohnDoe",
    userAvatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John",
    timestamp: "2 hours ago",
    content: "Looking forward to the upcoming gun show in Dallas! Will be bringing my collection of vintage rifles. Anyone else planning to attend?",
    imageUrl: "https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=800&auto=format",
    likes: 42,
    comments: 12,
  },
  {
    username: "GunCollector",
    userAvatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Collector",
    timestamp: "5 hours ago",
    content: "Just restored this beautiful 1911. Can't wait to showcase it at next month's event!",
    imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format",
    likes: 89,
    comments: 24,
  },
  {
    username: "FirearmEnthusiast",
    userAvatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Enthusiast",
    timestamp: "1 day ago",
    content: "Great turnout at yesterday's show! Thanks to everyone who stopped by my booth. Here's a sneak peek of what I'll be bringing next time.",
    imageUrl: "https://images.unsplash.com/photo-1584727638094-80524dfc771e?w=800&auto=format",
    likes: 156,
    comments: 32,
  },
];

export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <div className="flex flex-col items-center gap-6">
        {examplePosts.map((post, index) => (
          <Post key={index} {...post} />
        ))}
      </div>
    </main>
  );
}
