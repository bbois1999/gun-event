"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      setIsLoading(false)
    }
  }, [status, router])

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  // Ensure we display only when user is authenticated
  if (!session?.user) {
    return null
  }

  const { user } = session

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">Your Profile</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 justify-items-center">
        <div className="lg:col-span-2 w-full">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                  <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user.name || "User"}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Account Information</h3>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between py-1 border-b">
                      <span className="font-medium">Email</span>
                      <span>{user.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="font-medium">User ID</span>
                      <span className="text-muted-foreground">{user.id || "temp-user-id"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
              <Button asChild>
                <Link href="/events">My Events</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Account Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href="/events">
                  Manage Events
                </Link>
              </Button>
              <Button 
                className="w-full" 
                variant="destructive" 
                onClick={() => {
                  const confirmed = window.confirm("Are you sure you want to sign out?")
                  if (confirmed) {
                    router.push("/api/auth/signout")
                  }
                }}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 