import { Inter } from 'next/font/google'
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: "MEGG TECH",
  description:
    "An AI-Enabled IoT Platform with Microcontroller Mechanisms for Smart Egg Defect Detection and Sorting",
  applicationName: "MEGG TECH",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "MEGG TECH",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
