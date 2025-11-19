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

  const { data: goals } = await supabase
    .from('staff_goals')
    .select(`
      *,
      staff:users!staff_goals_staff_id_fkey(id, full_name, email),
      approved_by_user:users!staff_goals_approved_by_fkey(full_name),
      monthly_feedbacks:goal_monthly_feedbacks(count)
    `)
    .order('created_at', { ascending: false })

  return { goals: goals || [] }
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: '下書き', className: 'bg-gray-200 text-black border-2 border-gray-300' },
    submitted: { label: '提出済み', className: 'bg-[#1ed7cd] text-black border-2 border-[#1ed7cd] font-bold' },
    under_review: { label: '確認中', className: 'bg-[#18c4b8] text-black border-2 border-[#18c4b8] font-bold' },
    approved: { label: '承認済み', className: 'bg-[#05a7be] text-black border-2 border-[#05a7be] font-bold' },
    active: { label: '進行中', className: 'bg-[#087ea2] text-black border-2 border-[#087ea2] font-bold' },
    completed: { label: '完了', className: 'bg-[#017598] text-white border-2 border-[#017598] font-bold' },
    cancelled: { label: 'キャンセル', className: 'bg-gray-400 text-white border-2 border-gray-400' },
    before_interview: { label: '面談前', className: 'bg-[#1ed7cd] text-black border-2 border-[#1ed7cd] font-bold' },
    after_interview: { label: '面談済み', className: 'bg-[#05a7be] text-white border-2 border-[#05a7be] font-bold' },
  }
  return statusConfig[status] || statusConfig.draft
}

export default async function AdminGoalsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  const data = await getAdminGoalsData()

  // ステータスごとに目標を分類
  const submittedGoals = data.goals.filter(g => g.status === 'submitted' || g.status === 'under_review')
  const activeGoals = data.goals.filter(g => g.status === 'active')
  const approvedGoals = data.goals.filter(g => g.status === 'approved')
  const completedGoals = data.goals.filter(g => g.status === 'completed')
  const beforeInterviewGoals = data.goals.filter(g => g.status === 'before_interview')
  const afterInterviewGoals = data.goals.filter(g => g.status === 'after_interview')

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
        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#087ea2' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">進行中</CardTitle>
            <Target className="h-5 w-5" style={{ color: '#087ea2' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{activeGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">進行中の目標</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#017598' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">完了</CardTitle>
            <FileText className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#017598' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{completedGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">達成された目標</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#1ed7cd' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">面談前</CardTitle>
            <CalendarCheck className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#1ed7cd' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{beforeInterviewGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">面談前の目標</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: '#18c4b8' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium text-black leading-tight">面談済み</CardTitle>
            <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#18c4b8' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{afterInterviewGoals.length}</div>
            <p className="text-[10px] lg:text-xs text-black mt-0.5 lg:mt-1">面談済みの目標</p>
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
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">
                進行中 ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="before_interview">
                面談前 ({beforeInterviewGoals.length})
              </TabsTrigger>
              <TabsTrigger value="after_interview">
                面談済み ({afterInterviewGoals.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                すべて ({data.goals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              <GoalsTable goals={activeGoals} />
            </TabsContent>

            <TabsContent value="before_interview" className="mt-6">
              <GoalsTable goals={beforeInterviewGoals} />
            </TabsContent>

            <TabsContent value="after_interview" className="mt-6">
              <GoalsTable goals={afterInterviewGoals} />
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
              <TableHead className="text-black">期間</TableHead>
              <TableHead className="text-black">ステータス</TableHead>
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
                  <div className="space-y-2">
                    {goal.achievement_title && (
                      <div>
                        <Badge className="bg-[#05a7be] text-white text-xs mr-2">成果</Badge>
                        <span className="font-bold">{goal.achievement_title}</span>
                      </div>
                    )}
                    {goal.behavior_title && (
                      <div>
                        <Badge className="bg-[#18c4b8] text-white text-xs mr-2">行動</Badge>
                        <span className="font-bold">{goal.behavior_title}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {formatDate(goal.created_at)}
                  </div>
                </TableCell>
                <TableCell className="text-black">
                  {goal.period_year}年 Q{goal.period_quarter}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(goal.status || 'draft').className}>
                    {getStatusBadge(goal.status || 'draft').label}
                  </Badge>
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
              <Badge className={getStatusBadge(goal.status || 'draft').className}>
                {getStatusBadge(goal.status || 'draft').label}
              </Badge>
            </div>

            {/* 目標 */}
            <div className="space-y-2">
              {goal.achievement_title && (
                <div className="flex items-start gap-2">
                  <Badge className="bg-[#05a7be] text-white text-xs mt-0.5">成果</Badge>
                  <span className="font-bold text-sm text-black flex-1">{goal.achievement_title}</span>
                </div>
              )}
              {goal.behavior_title && (
                <div className="flex items-start gap-2">
                  <Badge className="bg-[#18c4b8] text-white text-xs mt-0.5">行動</Badge>
                  <span className="font-bold text-sm text-black flex-1">{goal.behavior_title}</span>
                </div>
              )}
            </div>

            {/* 期間と作成日 */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: '#e0f2f1' }}>
              <div>
                <div className="text-xs text-gray-600">期間</div>
                <div className="text-sm font-medium text-black">
                  {goal.period_year}年 Q{goal.period_quarter}
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
