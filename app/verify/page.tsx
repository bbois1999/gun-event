"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update: updateSession } = useSession()
  
  const [identifier, setIdentifier] = useState("")
  const [method, setMethod] = useState<"email" | "phone">("email")
  const [otpCode, setOtpCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  
  useEffect(() => {
    // Get parameters from URL
    const email = searchParams.get("email")
    const phone = searchParams.get("phone")
    const methodParam = searchParams.get("method")
    const identifierParam = searchParams.get("identifier")
    
    // Use the explicit identifier if provided, otherwise determine based on method
    if (identifierParam) {
      setIdentifier(identifierParam)
    } else if (methodParam === "phone" && phone) {
      setIdentifier(phone)
    } else if (email) {
      setIdentifier(email)
    } else {
      // No identifier provided, redirect to login
      router.push('/login')
    }
    
    if (methodParam === "email" || methodParam === "phone") {
      setMethod(methodParam)
    }
  }, [searchParams, router])
  
  // Function to handle redirect after successful login
  const handleSuccessfulLogin = async () => {
    setSuccessMessage("Verification successful! Preparing to redirect...");
    
    // Update the session state with the new cookie data
    await updateSession();
    
    // Wait a moment for everything to sync
    setTimeout(() => {
      setSuccessMessage("Logged in successfully! Redirecting...");
      
      // Hard redirect to force a full page refresh
      window.location.href = "/";
    }, 1000);
  };
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)
    
    try {
      if (!otpCode) {
        setError("Please enter the verification code")
        setIsLoading(false)
        return
      }
      
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          code: otpCode,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Verification failed")
        setIsLoading(false)
        return
      }
      
      setSuccessMessage("Verification successful! Signing you in...")
      
      try {
        // Try NextAuth sign-in first
        const signInResult = await signIn('otp', {
          redirect: false,
          identifier: data.user.email || data.user.phoneNumber,
          otp: otpCode,
          callbackUrl: '/'
        })
        
        if (signInResult?.error) {
          console.error("NextAuth sign-in error:", signInResult.error)
          
          // If NextAuth sign-in fails, try direct login
          console.log("Attempting direct login for user ID:", data.user.id);
          
          const directLoginResponse = await fetch('/api/auth/direct-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          });
          
          if (directLoginResponse.ok) {
            console.log("Direct login successful");
            await handleSuccessfulLogin();
          } else {
            setError("Failed to sign in after verification");
            setIsLoading(false);
          }
          return;
        }
        
        // NextAuth login was successful
        setSuccessMessage("Verification successful! Redirecting to home page...");
        await handleSuccessfulLogin();
      } catch (error) {
        console.error("Sign in attempt failed:", error)
        setError("An unexpected error occurred during sign in")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Verification error:", error)
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }
  
  const handleResendCode = async () => {
    setError("")
    setSuccessMessage("")
    setResendLoading(true)
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          method
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Failed to resend verification code")
        setResendLoading(false)
        return
      }
      
      setSuccessMessage(`Verification code resent to your ${method}`)
      setResendLoading(false)
    } catch (error) {
      console.error("Resend code error:", error)
      setError("An unexpected error occurred")
      setResendLoading(false)
    }
  }
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Verify Your Account</CardTitle>
          <CardDescription className="text-center">
            Enter the verification code sent to your {method}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleVerify}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter the code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {successMessage && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              
              <div className="text-center">
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={handleResendCode}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Sending..." : "Resend verification code"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/login')}
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 