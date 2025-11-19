'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, UserCog, Search, Mail, Calendar, Eye } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'staff'
  is_admin: boolean
  company_id: string
  department: string | null
  position: string | null
  hire_date: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

interface UserStats {
  total: number
  admins: number
  staff: number
  byDepartment: Record<string, number>
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'admin' | 'staff'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    admins: 0,
    staff: 0,
    byDepartment: {}
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, filter, searchQuery])

  async function fetchUsers() {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('ユーザーが見つかりません')

      // Get current user's company_id
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (userError) throw userError

      // Fetch all users from the same company
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
      calculateStats(data || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(userData: User[]) {
    const byDepartment: Record<string, number> = {}

    userData.forEach(user => {
      if (user.department) {
        byDepartment[user.department] = (byDepartment[user.department] || 0) + 1
      }
    })

    setStats({
      total: userData.length,
      admins: userData.filter(u => u.is_admin).length,
      staff: userData.filter(u => !u.is_admin).length,
      byDepartment
    })
  }

  function applyFilters() {
    let filtered = [...users]

    // Apply role filter
    if (filter === 'admin') {
      filtered = filtered.filter(u => u.is_admin)
    } else if (filter === 'staff') {
      filtered = filtered.filter(u => !u.is_admin)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filtered)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="text-gray-500 mt-2">企業内のユーザーを管理します</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">総ユーザー数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">管理者</p>
                <p className="text-2xl font-bold text-blue-600">{stats.admins}</p>
              </div>
              <UserCog className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">スタッフ</p>
                <p className="text-2xl font-bold text-green-600">{stats.staff}</p>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            すべて
          </Button>
          <Button
            variant={filter === 'admin' ? 'default' : 'outline'}
            onClick={() => setFilter('admin')}
          >
            管理者
          </Button>
          <Button
            variant={filter === 'staff' ? 'default' : 'outline'}
            onClick={() => setFilter('staff')}
          >
            スタッフ
          </Button>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="名前、メールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                {searchQuery ? '検索結果が見つかりませんでした' : 'ユーザーがいません'}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{user.full_name}</h3>
                      {user.is_admin ? (
                        <Badge className="bg-blue-100 text-blue-800">管理者</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">スタッフ</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/admin/evaluations?staff_id=${user.id}`)}
                    className="ml-4"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    評価一覧
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  )
}
