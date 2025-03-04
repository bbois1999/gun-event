"use client"

import { SessionProvider } from "next-auth/react"
import { ToastContextProvider } from '@/components/ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastContextProvider>
        {children}
      </ToastContextProvider>
    </SessionProvider>
  )
} 