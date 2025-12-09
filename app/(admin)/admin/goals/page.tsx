import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Clock, CheckCircle, FileText, AlertCircle, CalendarCheck, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'

async function getAdminGoalsData() {
  const supabase = await createSupabaseServerClient()

  // 現在のユーザーのcompany_idを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { goals: [] }
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    return { goals: [] }
  }

  // 同じ企業の目標のみ取得
  const { data: goals } = await supabase
    .from('staff_goals')
    .select(`
      *,
      staff:users!staff_goals_staff_id_fkey(id, full_name, email),
      reviewer:users!staff_goals_reviewed_by_fkey(full_name)
    `)
    .eq('company_id', currentUser.company_id)
    .order('created_at', { ascending: false })

  return { goals: goals || [] }
}

function getInterviewStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: '面談前', className: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' },
    scheduled: { label: '面談予定', className: 'bg-blue-100 text-blue-800 border-2 border-blue-300' },
    completed: { label: '面談済み', className: 'bg-green-100 text-green-800 border-2 border-green-300' },
  }
  return statusConfig[status] || statusConfig.pending
}

function getGoalStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: '進行中', className: 'bg-[#087ea2] text-white border-2 border-[#087ea2]' },
    completed: { label: '完了', className: 'bg-[#017598] text-white border-2 border-[#017598]' },
    abandoned: { label: '中止', className: 'bg-gray-400 text-white border-2 border-gray-400' },
  }
  return statusConfig[status] || { label: status, className: 'bg-gray-200 text-black border-2 border-gray-300' }
}

export default async function AdminGoalsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  const data = await getAdminGoalsData()

  // 面談ステータスごとに目標を分類
  const pendingInterviewGoals = data.goals.filter(g => g.interview_status === 'pending')
  const scheduledInterviewGoals = data.goals.filter(g => g.interview_status === 'scheduled')
  const completedInterviewGoals = data.goals.filter(g => g.interview_status === 'completed')

  // 目標の進捗ステータスごとに分類
  const activeGoals = data.goals.filter(g => g.status === 'active')
  const completedGoals = data.goals.filter(g => g.status === 'completed')

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
      <div className="mb-4 lg:mb-8">
        <h1 className="text-xl lg:text-3xl font-bold text-black">目標管理（管理者）</h1>
        <p className="mt-1 lg:mt-2 text-xs lg:text-sm text-black">
          スタッフの目標を確認・承認し、月次フィードバックを提供します
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-4 mb-6 lg:mb-8">
        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#f59e0b' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">面談前</CardTitle>
            <Clock className="h-5 w-5" style={{ color: '#f59e0b' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{pendingInterviewGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">レビュー待ち</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#1ed7cd' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">面談予定</CardTitle>
            <CalendarCheck className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#1ed7cd' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{scheduledInterviewGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">面談予定の目標</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#10b981' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">面談済み</CardTitle>
            <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#10b981' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{completedInterviewGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">面談完了した目標</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#087ea2' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">全目標</CardTitle>
            <Target className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#087ea2' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{data.goals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">全ての目標</p>
          </CardContent>
        </Card>
      </div>

      {/* タブで目標を表示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">目標一覧</CardTitle>
          <CardDescription className="text-black">
            ステータスごとに目標を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                面談前 ({pendingInterviewGoals.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                面談予定 ({scheduledInterviewGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                面談済み ({completedInterviewGoals.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                すべて ({data.goals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <GoalsTable goals={pendingInterviewGoals} />
            </TabsContent>

            <TabsContent value="scheduled" className="mt-6">
              <GoalsTable goals={scheduledInterviewGoals} />
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <GoalsTable goals={completedInterviewGoals} />
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <GoalsTable goals={data.goals} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalsTable({ goals }: { goals: any[] }) {
  if (goals.length === 0) {
    return (
      <div className="text-center text-black py-8">
        該当する目標がありません
      </div>
    )
  }

  return (
    <>
      {/* PC: テーブル表示 */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-black">スタッフ</TableHead>
              <TableHead className="text-black">目標</TableHead>
              <TableHead className="text-black">作成日</TableHead>
              <TableHead className="text-black">期限</TableHead>
              <TableHead className="text-black">面談ステータス</TableHead>
              <TableHead className="text-black">進捗</TableHead>
              <TableHead className="text-black">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((goal: any) => (
              <TableRow key={goal.id}>
                <TableCell className="font-medium text-black">
                  {goal.staff?.full_name}
                </TableCell>
                <TableCell className="text-black">
                  <div className="font-bold">{goal.goal_title}</div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{goal.goal_description}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {formatDate(goal.created_at)}
                  </div>
                </TableCell>
                <TableCell className="text-black">
                  {formatDate(goal.target_date)}
                </TableCell>
                <TableCell>
                  <Badge className={getInterviewStatusBadge(goal.interview_status || 'pending').className}>
                    {getInterviewStatusBadge(goal.interview_status || 'pending').label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={getGoalStatusBadge(goal.status || 'active').className}>
                      {getGoalStatusBadge(goal.status || 'active').label}
                    </Badge>
                    <span className="text-sm text-gray-600">{goal.achievement_rate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/goals/${goal.id}`}>
                    <Button variant="outline" size="sm" className="text-black">
                      詳細
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* スマホ: カード表示 */}
      <div className="lg:hidden space-y-3">
        {goals.map((goal: any) => (
          <div
            key={goal.id}
            className="border rounded-lg p-3 space-y-3"
            style={{ borderColor: '#e0f2f1', backgroundColor: 'rgba(5, 167, 190, 0.02)' }}
          >
            {/* ヘッダー: スタッフとステータス */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: '#e0f2f1' }}>
              <div className="font-bold text-base text-black">{goal.staff?.full_name}</div>
              <Badge className={getInterviewStatusBadge(goal.interview_status || 'pending').className}>
                {getInterviewStatusBadge(goal.interview_status || 'pending').label}
              </Badge>
            </div>

            {/* 目標 */}
            <div>
              <div className="font-bold text-sm text-black">{goal.goal_title}</div>
              <div className="text-xs text-gray-600 mt-1 line-clamp-3">{goal.goal_description}</div>
            </div>

            {/* ステータスと達成率 */}
            <div className="flex items-center gap-2">
              <Badge className={getGoalStatusBadge(goal.status || 'active').className}>
                {getGoalStatusBadge(goal.status || 'active').label}
              </Badge>
              <span className="text-sm font-medium text-black">{goal.achievement_rate}%達成</span>
            </div>

            {/* 期限と作成日 */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: '#e0f2f1' }}>
              <div>
                <div className="text-xs text-gray-600">期限</div>
                <div className="text-sm font-medium text-black">
                  {formatDate(goal.target_date)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">作成日</div>
                <div className="text-sm font-medium text-black">
                  {formatDate(goal.created_at)}
                </div>
              </div>
            </div>

            {/* アクション */}
            <Link href={`/admin/goals/${goal.id}`} className="block">
              <Button variant="outline" size="sm" className="w-full text-black border-2" style={{ borderColor: '#05a7be' }}>
                詳細を見る
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </>
  )
}
