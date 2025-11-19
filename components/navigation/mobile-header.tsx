'use client'

import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileHeaderProps {
  isOpen: boolean
  onToggle: () => void
  title?: string
}

export function MobileHeader({ isOpen, onToggle, title = 'SHARESCORE' }: MobileHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-12 w-12"
          aria-label={isOpen ? 'メニューを閉じる' : 'メニューを開く'}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>
    </header>
  )
}
