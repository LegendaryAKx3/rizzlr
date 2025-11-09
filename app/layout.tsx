import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Rizzlr - Practice Your Dating Skills with AI",
  description: "Improve your conversation skills by chatting with AI matches in a fun, Tinder-style interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="antialiased bg-gray-200 text-gray-900" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
