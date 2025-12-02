"use client";

import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Search } from "lucide-react";
import Image from "next/image";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32 animate-wiggle">
            <Image
              src="/Logos/logoblue.png"
              alt="MEGG Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* 404 Content */}
        <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-8 md:p-12">
          <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-150 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 font-medium"
            >
              <Home className="w-5 h-5" />
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-gray-500 text-sm">
          <p>Need help? Try searching or go back to the homepage.</p>
        </div>
      </div>
    </div>
  );
}

