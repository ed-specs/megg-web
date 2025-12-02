"use client";

import Image from "next/image";

/**
 * LoadingLogo - Reusable loading component with wiggling MEGG logo
 * 
 * @param {Object} props
 * @param {string} props.message - Optional loading message (default: "Loading...")
 * @param {string} props.size - Logo size: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.className - Additional CSS classes
 */
export default function LoadingLogo({ 
  message = "Loading...", 
  size = 'md',
  className = "" 
}) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const logoSize = {
    sm: 48,
    md: 64,
    lg: 96
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className={`${sizeClasses[size]} mx-auto mb-2 animate-wiggle`}>
          <Image 
            src="/Logos/logoblue.png" 
            alt="MEGG Logo" 
            width={logoSize[size]}
            height={logoSize[size]}
            className="w-full h-full object-contain"
          />
        </div>
        {message && (
          <p className="text-gray-500 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}

