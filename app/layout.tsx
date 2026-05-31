import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "What's Next?",
  description: "The video prediction party game — watch the clip, predict what happens, win the glory!",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "1024x1024" }],
    apple: [{ url: "/icon.png", sizes: "1024x1024" }],
    shortcut: "/icon.png",
  },
  openGraph: {
    title: "What's Next?",
    description: "The video prediction party game — watch the clip, predict what happens, win the glory!",
    images: [{ url: "/icon.png", width: 1024, height: 1024, alt: "What's Next?" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "What's Next?",
    description: "The video prediction party game!",
    images: ["/icon.png"],
  },
  applicationName: "What's Next?",
  keywords: ["party game", "video game", "trivia", "prediction", "multiplayer", "family game"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
