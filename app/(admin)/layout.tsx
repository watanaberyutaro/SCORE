'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/navigation/sidebar'
import { MobileHeader } from '@/components/navigation/mobile-header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <MobileHeader
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">{children}</main>
    </div>
  )
}
