import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
