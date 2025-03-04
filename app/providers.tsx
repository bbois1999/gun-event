"use client"

import { SessionProvider } from "next-auth/react"
import { ToastContextProvider } from '@/components/ui/toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastContextProvider>
          {children}
        </ToastContextProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
} 