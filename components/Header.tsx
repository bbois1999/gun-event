"use client"

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
import { User } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-4 mr-12 pl-4">
          <Image
            src="/FunnyCalLogo.png"
            alt="Gun Show Website Logo"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="font-semibold text-xl">Gun Show Website</span>
        </Link>
        <nav className="flex items-center space-x-8 text-base font-medium px-4">
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
          
          {isAuthenticated && (
            <div className="flex items-center ml-auto">
              <NotificationsDropdown />
            </div>
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
          
          <Link href="/faqs" className="transition-colors hover:text-foreground/80">
            FAQs
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground/80">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
} 