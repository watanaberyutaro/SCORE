'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  Target,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  BookOpen,
  LogOut,
  User,
  Award
} from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const { user, signOut, isAdmin } = useAuth()

  const adminNavItems = [
    { href: '/admin/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/admin/monthly-evaluations', label: '月次評価', icon: ClipboardList },
    { href: '/admin/quarterly-reports', label: '四半期レポート', icon: TrendingUp },
    { href: '/admin/annual-evaluations', label: '年次評価', icon: Award },
    { href: '/admin/evaluations', label: '評価管理', icon: ClipboardList },
    { href: '/admin/analytics', label: '分析・レポート', icon: BarChart3 },
    { href: '/admin/settings', label: '設定', icon: Settings },
  ]

  const staffNavItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/my-evaluation', label: '評価結果', icon: ClipboardList },
    { href: '/my-goals', label: '目標管理', icon: Target },
    { href: '/my-comments', label: 'コメント', icon: MessageSquare },
    { href: '/my-questions', label: '質問・回答', icon: HelpCircle },
    { href: '/my-productivity', label: '生産性データ', icon: TrendingUp },
    { href: '/evaluation-items', label: '評価項目', icon: BookOpen },
  ]

  const navItems = isAdmin ? adminNavItems : staffNavItems

  if (!user) return null

  return (
    <nav className="bg-white border-b" style={{ borderColor: '#1ed7cd' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="text-xl font-bold text-black">
                SHARESCORE
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? ''
                        : 'hover:bg-opacity-10'
                    )}
                    style={isActive
                      ? { backgroundColor: '#1ed7cd', color: '#000' }
                      : { color: '#000' }
                    }
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-black">
              <User className="mr-2 h-4 w-4" />
              <span>{user.full_name}</span>
              {isAdmin && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full text-white" style={{ backgroundColor: '#18c4b8' }}>
                  管理者
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hover:bg-opacity-10 text-black"
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
