'use client'

import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowRight, BarChart3, Bell, Shield, Zap, CheckCircle2, Users, Menu, X } from "lucide-react"
import { useState } from "react"
import LoadingLogo from "./(auth)/components/LoadingLogo"

export default function Home() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const features = [
    {
      icon: <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Real-Time Monitoring",
      description: "Track and monitor your machine operations with live data updates and comprehensive analytics."
    },
    {
      icon: <Bell className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Instant Notifications",
      description: "Receive immediate alerts for defects, machine issues, and critical events via push notifications."
    },
    {
      icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with role-based access control to protect your sensitive data."
    },
    {
      icon: <Zap className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Quick Response",
      description: "Fast detection and response system to minimize downtime and maximize productivity."
    }
  ]

  const benefits = [
    "Comprehensive defect tracking and management",
    "Customizable dashboard for your workflow",
    "Multi-device support with cloud sync",
    "Detailed reporting and analytics",
    "Email verification and secure authentication",
    "24/7 system monitoring and alerts"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 relative overflow-hidden">
      {/* Page Navigation Loading */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100] flex items-center justify-center">
          <LoadingLogo message="" size="lg" />
        </div>
      )}

      {/* Simple Clean Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,85,136,0.02),transparent_50%)]"></div>
      </div>


      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Professional Navigation with subtle 3D depth */}
      <nav className="relative z-50 px-4 py-4 sm:px-6 sm:py-6 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo with refined hover effect */}
          <div className="flex items-center space-x-2 sm:space-x-3 group cursor-pointer">
            <div className="relative transform transition-all duration-500 group-hover:scale-105">
              <Image 
                src="/Logos/logoblue.png" 
                alt="MEGG Logo" 
                width={40} 
                height={40}
                className="object-contain sm:w-[50px] sm:h-[50px]"
              />
              <div className="absolute inset-0 bg-[#105588]/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#105588] tracking-tight">MEGG</span>
          </div>
          
          {/* Professional Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-2 md:space-x-3">
            <button
              onClick={() => {
                setIsNavigating(true)
                router.push("/login")
              }}
              className="px-5 py-2 md:px-6 md:py-2.5 text-sm md:text-base text-[#105588] font-medium hover:text-[#0d4470] transition-all duration-300 hover:bg-[#105588]/5 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsNavigating(true)
                router.push("/register")
              }}
              className="group relative px-5 py-2 md:px-6 md:py-2.5 text-sm md:text-base bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] transition-all duration-300 font-medium shadow-lg hover:shadow-xl flex items-center space-x-2 transform hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="w-3 h-3 md:w-4 md:h-4 relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-[#105588] hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-xl z-50">
            <div className="px-4 py-4 space-y-3">
              <button
                onClick={() => {
                  setIsNavigating(true)
                  router.push("/login")
                  setMobileMenuOpen(false)
                }}
                className="w-full px-4 py-3 text-[#105588] font-medium hover:bg-gray-100 rounded-xl transition-colors duration-200 text-left"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsNavigating(true)
                  router.push("/register")
                  setMobileMenuOpen(false)
                }}
                className="w-full px-4 py-3 bg-[#105588] text-white rounded-xl hover:bg-[#0d4470] transition-all duration-200 font-medium shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Professional Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 md:pt-24 lg:pt-32 pb-16 sm:pb-20 md:pb-28 lg:pb-36">
        <div className="text-center relative">
          {/* Professional headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#105588] mb-6 sm:mb-8 leading-tight tracking-tight px-2">
            Monitor, Detect,
            <br />
            <span className="bg-gradient-to-r from-[#ff4a08] to-[#ff6a38] bg-clip-text text-transparent">
              Resolve Faster
            </span>
          </h1>
          
          {/* Clean description */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-10 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4 font-light">
            Real-time monitoring and defect detection system designed to keep your operations running smoothly with instant alerts and comprehensive analytics.
          </p>
          
          {/* Professional CTA buttons with subtle 3D */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 px-4 sm:px-0">
            <button
              onClick={() => {
                setIsNavigating(true)
                router.push("/register")
              }}
              className="group relative w-full sm:w-auto px-8 py-4 bg-[#ff4a08] text-white rounded-xl hover:bg-[#e63d00] active:scale-98 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-2xl flex items-center justify-center space-x-2 touch-manipulation overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <span className="relative z-10">Create Free Account</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
            </button>
            <button
              onClick={() => {
                setIsNavigating(true)
                router.push("/login")
              }}
              className="group relative w-full sm:w-auto px-8 py-4 bg-white text-[#105588] rounded-xl hover:bg-gray-50 active:scale-98 transition-all duration-300 font-semibold text-base sm:text-lg shadow-md border border-gray-200 touch-manipulation transform hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="relative z-10">Sign In to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Professional Features Section with 3D depth */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 md:pb-28 lg:pb-36">
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#105588] mb-4 px-4 tracking-tight">
            Powerful Features
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4 font-light">
            Everything you need to monitor and manage your operations effectively
          </p>
        </div>

        {/* Refined Features Grid with subtle 3D */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-500 active:scale-98 sm:hover:scale-102 hover:border-[#105588]/30 transform-gpu hover:-translate-y-2 relative"
            >
              {/* Subtle gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#105588]/0 to-[#ff4a08]/0 group-hover:from-[#105588]/5 group-hover:to-[#ff4a08]/5 rounded-2xl transition-all duration-500"></div>
              
              {/* Professional icon with refined 3D effect */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#105588] to-[#0d4470] rounded-xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:shadow-xl transition-all duration-500 transform group-hover:scale-105">
                <div className="absolute inset-0 bg-white/10 rounded-xl"></div>
                <div className="relative z-10">{feature.icon}</div>
              </div>
              
              <h3 className="text-xl font-bold text-[#105588] mb-3 transition-colors duration-300 relative z-10">
                {feature.title}
              </h3>
              <p className="text-base text-gray-600 leading-relaxed relative z-10">
                {feature.description}
              </p>
              
              {/* Subtle bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#105588] to-[#ff4a08] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Professional Benefits Section with refined 3D */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 md:pb-28 lg:pb-36">
        <div className="relative bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 sm:p-10 md:p-12 lg:p-16 shadow-xl overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `linear-gradient(#105588 1px, transparent 1px), linear-gradient(90deg, #105588 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Benefits List */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#105588] mb-6 tracking-tight">
                Why Choose MEGG?
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 font-light leading-relaxed">
                Built for efficiency, designed for scale. MEGG provides comprehensive monitoring solutions that grow with your business.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3 group">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ff4a08]/10 flex items-center justify-center mt-0.5 group-hover:bg-[#ff4a08]/20 transition-colors duration-300">
                      <CheckCircle2 className="w-4 h-4 text-[#ff4a08]" />
                    </div>
                    <span className="text-base sm:text-lg text-gray-700 leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional CTA Card with subtle 3D */}
            <div className="relative order-1 lg:order-2 group">
              {/* Refined 3D depth shadow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#105588] to-[#0d4470] rounded-2xl transform translate-x-1 translate-y-1 blur-2xl opacity-20"></div>
              
              <div className="relative bg-gradient-to-br from-[#105588] to-[#0d4470] rounded-2xl p-8 sm:p-10 text-white shadow-xl transform-gpu transition-all duration-500 hover:-translate-y-1 overflow-hidden">
                
                {/* Subtle shine on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1500"></div>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 mb-5 bg-white/15 rounded-xl backdrop-blur-sm p-2.5 inline-flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                    <Users className="w-full h-full" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-bold mb-4">
                    Ready to Get Started?
                  </h3>
                  <p className="text-lg mb-6 opacity-95 leading-relaxed font-light">
                    Join our platform today and experience seamless machine monitoring with powerful analytics and instant notifications.
                  </p>
                  <button
                    onClick={() => {
                      setIsNavigating(true)
                      router.push("/register")
                    }}
                    className="group/btn relative w-full px-8 py-4 bg-white text-[#105588] rounded-xl hover:bg-gray-50 active:scale-98 transition-all duration-300 font-semibold text-lg shadow-xl flex items-center justify-center space-x-2 touch-manipulation overflow-hidden transform hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#105588]/5 to-transparent transform translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
                    <span className="relative z-10">Create Your Account</span>
                    <ArrowRight className="w-5 h-5 relative z-10 group-hover/btn:translate-x-0.5 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Footer */}
      <footer className="relative z-10 border-t border-gray-200/50 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <Image 
                  src="/Logos/logoblue.png" 
                  alt="MEGG Logo" 
                  width={40} 
                  height={40}
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#105588]/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-xl font-bold text-[#105588] tracking-tight">MEGG</span>
            </div>
            
            <p className="text-base text-gray-600 text-center md:text-right font-light">
              © 2025 MEGG. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}