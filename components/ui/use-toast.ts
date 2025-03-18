// Adapted from shadcn/ui: https://ui.shadcn.com/docs/components/toast
import { useToast as useToastOriginal, type ToastActionElement } from "@/components/ui/toast"

export interface ToastProps {
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
}

export const useToast = () => {
  const { toast } = useToastOriginal()
  
  return {
    toast: (props: ToastProps) => {
      toast(props)
    }
  }
} 