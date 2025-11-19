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
  Award,
  Users
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut, isAdmin } = useAuth()

  const adminNavItems = [
    { href: '/admin/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/admin/monthly-evaluations', label: '月次評価', icon: ClipboardList },
    { href: '/admin/annual-evaluations', label: '年次評価', icon: Award },
    { href: '/admin/questions', label: '質問管理', icon: HelpCircle },
    { href: '/admin/users', label: 'ユーザー管理', icon: Users },
    { href: '/admin/evaluations', label: '評価管理', icon: ClipboardList },
    { href: '/admin/quarterly-reports', label: '四半期レポート', icon: TrendingUp },
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

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* サイドバー */}
      <div
        className={cn(
          "flex h-screen w-64 flex-col fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
          !isOpen && "lg:translate-x-0 -translate-x-full"
        )}
        style={{ backgroundColor: '#333', color: '#fff' }}
      >
        {/* ロゴ */}
        <div className="flex h-16 items-center justify-center border-b border-gray-600 px-6">
          <Link
            href={isAdmin ? '/admin/dashboard' : '/dashboard'}
            className="text-xl font-bold"
            style={{ color: '#fff' }}
            onClick={handleLinkClick}
          >
            SHARESCORE
          </Link>
        </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 lg:py-2 text-base lg:text-sm font-medium transition-colors'
                )}
                style={isActive ? { backgroundColor: '#555', color: '#fff' } : { color: '#fff' }}
                onClick={handleLinkClick}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#555'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon className="h-6 w-6 lg:h-5 lg:w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ユーザー情報 */}
      <div className="border-t border-gray-600 p-4">
        <div className="mb-3">
          <p className="text-sm font-medium truncate" style={{ color: '#fff' }}>{user.full_name}</p>
          {isAdmin && (
            <span
              className="mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded"
              style={{ backgroundColor: '#05a7be', color: '#fff' }}
            >
              管理者
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-base lg:text-sm py-3 lg:py-2"
          style={{ color: '#fff' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#555'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <LogOut className="mr-2 h-5 w-5 lg:h-4 lg:w-4" />
          ログアウト
        </Button>
      </div>
      </div>
    </>
  )
}
