import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WoW Oracle",
  description: "The all-knowing World of Warcraft oracle.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WoW Oracle",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Wowhead Tooltips Configuration */}
        <Script id="wowhead-config" strategy="beforeInteractive">
          {`
            const whTooltips = {
              colorLinks: true,
              iconizeLinks: true,
              renameLinks: true,
              iconSize: 'small'
            };
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-void text-foreground select-none`}
      >
        {children}
        {/* Wowhead Tooltips Script */}
        <Script
          src="https://wow.zamimg.com/js/tooltips.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
