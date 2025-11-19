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
  Award
} from 'lucide-react'

export function Sidebar() {
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
    <div className="flex h-screen w-64 flex-col" style={{ backgroundColor: '#333', color: '#fff' }}>
      {/* ロゴ */}
      <div className="flex h-16 items-center justify-center border-b px-6" style={{ borderColor: '#555' }}>
        <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="text-xl font-bold" style={{ color: '#fff' }}>
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
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
                )}
                style={isActive ? { backgroundColor: '#555', color: '#fff' } : { color: '#fff' }}
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
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ユーザー情報 */}
      <div className="border-t p-4" style={{ borderColor: '#555' }}>
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
          className="w-full justify-start"
          style={{ color: '#fff' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#555'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </div>
  )
}
