import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Fonts from Next.js template.
 * Keep these – they set CSS variables used by Tailwind classes.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ComTech Lite",
  description: "Ports & Installs tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /**
     * suppressHydrationWarning here avoids warnings when extensions
     * add attributes to <html> before hydration.
     */
    <html lang="en" suppressHydrationWarning>
      {/**
       * We ALSO suppress on <body> because Grammarly (and some others)
       * inject attributes like data-gr-ext-installed onto <body>.
       * This prevents the hydration warning in dev.
       */}
      <body
        suppressHydrationWarning
        className={`${geistSans?.variable ?? ""} ${geistMono?.variable ?? ""} antialiased text-gray-900 text-[17px]`}
      >
        {children}
      </body>
    </html>
  );
}
