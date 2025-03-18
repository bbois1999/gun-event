"use client"

import { Button } from "@/components/ui/button"
import type { Event } from "@prisma/client"
import { PostCreationDialog } from "@/components/PostCreationDialog"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface PostButtonProps {
  preselectedEvent?: Event
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  onSuccess?: () => void
}

export function PostButton({ 
  preselectedEvent, 
  variant = "default",
  size = "default",
  className,
  onSuccess
}: PostButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => router.push("/login")}
      >
        Sign in to Post
      </Button>
    )
  }

  return (
    <PostCreationDialog
      preselectedEvent={preselectedEvent}
      triggerButton={
        <Button variant={variant} size={size} className={className}>
          Create Post
        </Button>
      }
      onSuccess={() => {
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      }}
    />
  )
} 