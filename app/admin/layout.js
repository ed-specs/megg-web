"use client"

import RouteGuard from "../components/RouteGuard"

export default function AdminLayout({ children }) {
  return (
    <RouteGuard requiredRole="admin" redirectTo="/login">
      {children}
    </RouteGuard>
  )
}
