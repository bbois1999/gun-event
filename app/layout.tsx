import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gun Show Website",
  description: "Connect with gun show events and enthusiasts",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen bg-background`}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
