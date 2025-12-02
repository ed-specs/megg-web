import "./globals.css";

// const poppins = Poppins({
//   variable: "--font-poppins",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700"], // Customize weights as needed
// });

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
