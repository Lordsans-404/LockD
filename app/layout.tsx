import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import Wagmi setup
import { headers } from "next/headers"; // Untuk baca cookie
import { cookieToInitialState } from "wagmi";
import { config } from "@/config/wagmi";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LockD",
  description: "~",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Logic untuk persist session wallet (PENTING untuk Next.js)
  const initialState = cookieToInitialState(config, (await headers()).get("cookie"));
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers initialState={initialState}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
