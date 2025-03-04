import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with tailwind classes
 * This is a utility function used by UI components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
