import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "./NavBar";
import { ThemeProvider } from "./ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlogHub - Full-Stack Blog",
  description: "A modern blog application built with Next.js, React, and Drizzle ORM",
  keywords: ["blog", "next.js", "react", "drizzle"],
};

/**
 * Runs in <head> BEFORE React hydrates. Reads the user's saved theme from
 * localStorage and sets `class="dark"` on <html> so dark-mode users don't see
 * a flash of the light theme. Defaults to light when nothing is stored.
 */
const themeBootstrap = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'){var u=localStorage.getItem('user');if(u){var p=JSON.parse(u);if(p&&p.theme==='dark')t='dark';}}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider />
        <header className="border-b border-gray-200 dark:border-gray-800">
          <NavBar />
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
          {children}
        </main>
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2026 BlogHub. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

