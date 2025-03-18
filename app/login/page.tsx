"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Utility function to format phone numbers
const formatPhoneNumber = (value: string) => {
  // Strip all non-numeric characters
  const phoneNumber = value.replace(/\D/g, '')
  
  // Format based on length of the input
  if (phoneNumber.length < 4) {
    return phoneNumber
  } else if (phoneNumber.length < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }
}

// Utility function to normalize phone numbers for storage/querying
const normalizePhoneNumber = (value: string) => {
  // Remove all non-numeric characters
  return value.replace(/\D/g, '')
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [verificationMethod, setVerificationMethod] = useState<"email" | "phone">("email")
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"login" | "signup">("login")
  const router = useRouter()

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!identifier) {
      setError("Email or phone number is required")
      return
    }
    
    try {
      setLoading(true)
      
      // Determine if identifier is email or phone
      const method = identifier.includes('@') ? "email" : "phone"
      setVerificationMethod(method)
      
      // Prepare identifier
      let formattedIdentifier = identifier
      if (method === "phone") {
        // Strip formatting and ensure E.164 format for phone numbers
        const normalized = normalizePhoneNumber(identifier)
        formattedIdentifier = normalized.startsWith('+') ? normalized : `+1${normalized}`
      }
      
      console.log("Sending OTP to:", formattedIdentifier, "via", method)
      
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: formattedIdentifier, 
          method 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Failed to send verification code")
        return
      }
      
      setIsOtpSent(true)
      
    } catch (error) {
      console.error("OTP request error:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!identifier || !otpCode) {
      setError("Email/phone and verification code are required")
      return
    }
    
    try {
      setLoading(true)
      
      // Determine if identifier is email or phone and format accordingly
      const isEmail = identifier.includes('@')
      let formattedIdentifier = identifier
      
      if (!isEmail) {
        // Format phone number consistently for verification
        const normalized = normalizePhoneNumber(identifier)
        formattedIdentifier = normalized.startsWith('+') ? normalized : `+1${normalized}`
      }
      
      console.log("Attempting sign in with:", { identifier: formattedIdentifier, otp: otpCode })
      
      const result = await signIn("otp", {
        identifier: formattedIdentifier,
        otp: otpCode,
        redirect: false,
        callbackUrl: "/"
      })
      
      console.log("Sign in result:", result)
      
      if (result?.error) {
        console.error("Sign in error:", result.error)
        setError("Invalid verification code or verification failed")
        return
      }
      
      if (result?.url) {
        // Success - redirect to the returned URL
        router.push(result.url)
      } else {
        // Fallback to home page
        router.push("/")
      }
      
      // Force a page refresh to update auth state
      router.refresh()
    } catch (error) {
      console.error("OTP login error:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      if (!email || !username || !phoneNumber) {
        setError("All fields are required")
        setLoading(false)
        return
      }
      
      // Normalize phone number before sending to the server
      const normalizedPhone = normalizePhoneNumber(phoneNumber)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          phoneNumber: normalizedPhone,
          verificationMethod,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Handle specific errors
        if (response.status === 409) {
          setError(data.error || "An account with this information already exists")
        } else if (response.status === 500 && data.error?.includes("verification code")) {
          setError("Registration failed: " + data.error + ". Please try again or contact support.")
        } else {
          setError(data.error || "Registration failed. Please try again.")
        }
        setLoading(false)
        return
      }
      
      // Account created and verification code sent successfully
      const params = new URLSearchParams({
        email: data.email,
        phone: data.phoneNumber,
        method: data.method,
        identifier: data.identifier
      });
      router.push(`/verify?${params.toString()}`);
    } catch (error) {
      console.error("Signup error:", error)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }
  
  // Phone number input handler to format as user types
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value)
    setPhoneNumber(formattedNumber)
  }

  // Handler for identifier input in login
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    // If it looks like a phone number, format it
    if (!value.includes('@')) {
      const formattedNumber = formatPhoneNumber(value)
      setIdentifier(formattedNumber)
      
      // Always set phone method when entering a phone number
      if (formattedNumber && !formattedNumber.includes('@')) {
        setVerificationMethod("phone")
      }
    } else {
      setIdentifier(value)
      // Set email method when entering an email
      setVerificationMethod("email")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {mode === "login" ? "Login with Code" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Sign in with a verification code" 
              : "Sign up to create a new account"}
          </CardDescription>
        </CardHeader>
        
        <Tabs value={mode} onValueChange={(value) => setMode(value as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={isOtpSent ? handleOtpLogin : handleRequestOtp}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {!isOtpSent ? (
                  // Initial login screen - enter identifier
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="login-method">Login Method</Label>
                      <div className="flex space-x-4 mb-4">
                        <Label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="loginMethod"
                            checked={verificationMethod === "email"}
                            onChange={() => {
                              setVerificationMethod("email")
                              setIdentifier("")
                            }}
                          />
                          <span>Email</span>
                        </Label>
                        <Label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="loginMethod"
                            checked={verificationMethod === "phone"}
                            onChange={() => {
                              setVerificationMethod("phone")
                              setIdentifier("")
                            }}
                          />
                          <span>Phone</span>
                        </Label>
                      </div>
                      
                      <Label htmlFor="identifier">
                        {verificationMethod === "email" ? "Email" : "Phone Number"}
                      </Label>
                      <Input 
                        id="identifier" 
                        type={verificationMethod === "email" ? "email" : "tel"}
                        placeholder={verificationMethod === "email" ? "email@example.com" : "(123) 456-7890"}
                        value={identifier}
                        onChange={handleIdentifierChange}
                        required
                      />
                    </div>
                  </>
                ) : (
                  // Verification code screen
                  <>
                    <div className="text-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        A verification code has been sent to your {verificationMethod === "email" ? "email" : "phone"}
                      </p>
                      <p className="font-medium mt-2">
                        {verificationMethod === "email" ? identifier : identifier}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="otp-code">Enter Verification Code</Label>
                      <Input 
                        id="otp-code" 
                        type="text" 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        required
                        autoFocus
                      />
                    </div>
                  </>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading 
                    ? isOtpSent ? "Verifying..." : "Sending Code..." 
                    : isOtpSent ? "Verify and Login" : "Send Verification Code"
                  }
                </Button>
                
                {isOtpSent && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsOtpSent(false)}
                  >
                    Use Different {verificationMethod === "email" ? "Email" : "Phone"}
                  </Button>
                )}
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input 
                    id="signup-email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder="+1234567890"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verification Method</Label>
                  <div className="flex space-x-4">
                    <Label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="verificationMethod"
                        checked={verificationMethod === "email"}
                        onChange={() => setVerificationMethod("email")}
                      />
                      <span>Email</span>
                    </Label>
                    <Label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="verificationMethod"
                        checked={verificationMethod === "phone"}
                        onChange={() => setVerificationMethod("phone")}
                      />
                      <span>Phone</span>
                    </Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
} 