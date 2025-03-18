"use client"

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, User, X } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to close the mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-4 pl-4">
          <Image
            src="/FunnyCalLogo.png"
            alt="Gun Show Website Logo"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="font-semibold text-xl">Gun Show Website</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-base font-medium">
          <Link href="/" className="transition-colors hover:text-foreground/80">
            Home
          </Link>
          <Link href="/events" className="transition-colors hover:text-foreground/80">
            Events
          </Link>
          
          {isAuthenticated && (
            <Link href="/explore" className="transition-colors hover:text-foreground/80">
              Explore
            </Link>
          )}
          
          <Link href="/faqs" className="transition-colors hover:text-foreground/80">
            FAQs
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground/80">
            Contact
          </Link>
        </nav>

        {/* User Actions (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated && (
            <NotificationsDropdown />
          )}
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{session?.user?.name || "User"}</p>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.email || ""}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    signOut({ callbackUrl: "/" });
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="transition-colors hover:text-foreground/80">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="md:hidden flex items-center">
          {isAuthenticated && (
            <NotificationsDropdown />
          )}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
              <div className="flex flex-col h-full">
                <div className="py-6 flex flex-col space-y-4">
                  <Link 
                    href="/"
                    className="text-lg font-medium px-2 py-2 hover:bg-muted rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Home
                  </Link>
                  <Link 
                    href="/events"
                    className="text-lg font-medium px-2 py-2 hover:bg-muted rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Events
                  </Link>
                  
                  {isAuthenticated && (
                    <Link 
                      href="/explore"
                      className="text-lg font-medium px-2 py-2 hover:bg-muted rounded-md"
                      onClick={closeMobileMenu}
                    >
                      Explore
                    </Link>
                  )}
                  
                  <Link 
                    href="/faqs"
                    className="text-lg font-medium px-2 py-2 hover:bg-muted rounded-md"
                    onClick={closeMobileMenu}
                  >
                    FAQs
                  </Link>
                  <Link 
                    href="/contact"
                    className="text-lg font-medium px-2 py-2 hover:bg-muted rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Contact
                  </Link>
                </div>
                
                <div className="mt-auto border-t pt-4">
                  {isAuthenticated ? (
                    <>
                      <Link 
                        href="/profile"
                        className="flex items-center px-2 py-2 text-lg font-medium hover:bg-muted rounded-md"
                        onClick={closeMobileMenu}
                      >
                        <User className="h-5 w-5 mr-2" />
                        Profile
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-2 py-2 mt-2 text-lg font-medium hover:bg-muted rounded-md"
                        onClick={() => {
                          closeMobileMenu();
                          signOut({ callbackUrl: "/" });
                        }}
                      >
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <Link 
                      href="/login"
                      className="px-2 py-2 text-lg font-medium hover:bg-muted rounded-md block"
                      onClick={closeMobileMenu}
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 