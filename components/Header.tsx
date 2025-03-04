import Image from "next/image";
import Link from "next/link";

export function Header() {
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
          <Link href="/profile" className="transition-colors hover:text-foreground/80">
            Profile
          </Link>
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