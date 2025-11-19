import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Target, Plus, CheckCircle, Clock, FileText, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'
import { DeleteGoalButton } from '@/components/goals/DeleteGoalButton'

async function getGoalsData(userId: string) {
  const supabase = await createSupabaseServerClient()

  // 目標を取得（月次フィードバック付き）
  const { data: goals } = await supabase
    .from('staff_goals')
    .select(`
      *,
      approved_by_user:users!staff_goals_approved_by_fkey(full_name),
      monthly_feedbacks:goal_monthly_feedbacks(
        *,
        admin:users!goal_monthly_feedbacks_admin_id_fkey(full_name)
      )
    `)
    .eq('staff_id', userId)
    .order('created_at', { ascending: false })

  // 現在の期を計算
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  return {
    goals: goals || [],
    currentYear,
    currentQuarter,
  }
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

function getGoalTypeBadge(goalType: string) {
  return goalType === 'achievement'
    ? { label: '成果目標', className: 'bg-[#05a7be] text-white' }
    : { label: '行動目標', className: 'bg-[#18c4b8] text-white' }
}

export default async function MyGoalsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const data = await getGoalsData(user.id)

  // ステータスごとに目標を分類
  const draftGoals = data.goals.filter(g => g.status === 'draft')
  const submittedGoals = data.goals.filter(g => g.status === 'submitted' || g.status === 'under_review')
  const approvedGoals = data.goals.filter(g => g.status === 'approved')
  const activeGoals = data.goals.filter(g => g.status === 'active')
  const completedGoals = data.goals.filter(g => g.status === 'completed')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">目標管理</h1>
          <p className="mt-2 text-sm text-black">
            成果目標と行動目標を設定し、管理者からのフィードバックを受けましょう
          </p>
        </div>
        <Link href="/my-goals/new">
          <Button className="bg-[#05a7be] hover:bg-[#087ea2] text-white">
            <Plus className="mr-2 h-4 w-4" />
            新しい目標を作成
          </Button>
        </Link>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">進行中の目標</CardTitle>
            <Target className="h-5 w-5" style={{ color: '#05a7be' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{activeGoals.length}</div>
            <p className="text-xs text-black mt-1">現在取り組んでいる目標</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#18c4b8' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">承認待ち</CardTitle>
            <Clock className="h-5 w-5" style={{ color: '#18c4b8' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{submittedGoals.length}</div>
            <p className="text-xs text-black mt-1">管理者の確認待ち</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#1ed7cd' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">完了した目標</CardTitle>
            <CheckCircle className="h-5 w-5" style={{ color: '#1ed7cd' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{completedGoals.length}</div>
            <p className="text-xs text-black mt-1">達成した目標</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#087ea2' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">下書き</CardTitle>
            <FileText className="h-5 w-5" style={{ color: '#087ea2' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{draftGoals.length}</div>
            <p className="text-xs text-black mt-1">作成中の目標</p>
          </CardContent>
        </Card>
      </div>

      {/* 進行中の目標 */}
      {activeGoals.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Target className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
              進行中の目標
            </CardTitle>
            <CardDescription className="text-black">現在取り組んでいる目標と進捗状況</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeGoals.map((goal: any) => {
                const latestFeedback = goal.monthly_feedbacks?.[0]
                const progressRate = goal.achievement_rate || latestFeedback?.progress_rate || 0

                return (
                  <div key={goal.id} className="border-2 rounded-lg p-4" style={{ borderColor: '#05a7be' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold text-black">目標</h3>
                          <div className="flex items-center gap-4 text-xs text-black">
                            <span>期間: {goal.period_year}年 Q{goal.period_quarter}</span>
                            {goal.target_date && <span>目標日: {formatDate(goal.target_date)}</span>}
                          </div>
                        </div>

                        {/* 成果目標 */}
                        {goal.achievement_title && (
                          <div className="mb-3 p-3 bg-[#05a7be]/10 rounded-lg border border-[#05a7be]">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-[#05a7be] text-white">成果目標</Badge>
                              <span className="font-bold text-black">{goal.achievement_title}</span>
                            </div>
                            <p className="text-sm text-black">{goal.achievement_description}</p>
                          </div>
                        )}

                        {/* 行動目標 */}
                        {goal.behavior_title && (
                          <div className="p-3 bg-[#18c4b8]/10 rounded-lg border border-[#18c4b8]">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-[#18c4b8] text-white">行動目標</Badge>
                              <span className="font-bold text-black">{goal.behavior_title}</span>
                            </div>
                            <p className="text-sm text-black">{goal.behavior_description}</p>
                          </div>
                        )}
                      </div>
                      <Link href={`/my-goals/${goal.id}`}>
                        <Button variant="outline" size="sm" className="text-black border-[#05a7be]">
                          詳細
                        </Button>
                      </Link>
                    </div>

                    {latestFeedback && (
                      <div className="bg-[#05a7be]/10 rounded-lg p-3 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4" style={{ color: '#05a7be' }} />
                          <span className="text-sm font-medium text-black">
                            最新フィードバック ({latestFeedback.feedback_year}/{latestFeedback.feedback_month})
                          </span>
                        </div>
                        <p className="text-sm text-black">{latestFeedback.feedback_comment}</p>
                        {latestFeedback.suggestions && (
                          <p className="text-sm text-black mt-2">
                            <strong>提案:</strong> {latestFeedback.suggestions}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 承認待ちの目標 */}
      {submittedGoals.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Clock className="mr-2 h-5 w-5" style={{ color: '#18c4b8' }} />
              承認待ちの目標
            </CardTitle>
            <CardDescription className="text-black">管理者の確認・承認待ち</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submittedGoals.map((goal: any) => (
                <div key={goal.id} className="p-4 border-2 rounded-lg" style={{ borderColor: '#18c4b8' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-black">目標</h4>
                      <Badge className={getStatusBadge(goal.status || 'submitted').className}>
                        {getStatusBadge(goal.status || 'submitted').label}
                      </Badge>
                    </div>
                    <Link href={`/my-goals/${goal.id}`}>
                      <Button variant="outline" size="sm" className="text-black border-[#18c4b8]">
                        詳細
                      </Button>
                    </Link>
                  </div>

                  {/* 成果目標 */}
                  {goal.achievement_title && (
                    <div className="mb-2 p-2 bg-[#05a7be]/10 rounded border border-[#05a7be]">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#05a7be] text-white text-xs">成果</Badge>
                        <span className="font-medium text-sm text-black">{goal.achievement_title}</span>
                      </div>
                    </div>
                  )}

                  {/* 行動目標 */}
                  {goal.behavior_title && (
                    <div className="mb-2 p-2 bg-[#18c4b8]/10 rounded border border-[#18c4b8]">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#18c4b8] text-white text-xs">行動</Badge>
                        <span className="font-medium text-sm text-black">{goal.behavior_title}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 mt-2">提出日: {formatDate(goal.submitted_at || goal.created_at)}</p>

                  {goal.admin_comment && (
                    <div className="mt-2 bg-[#18c4b8]/10 rounded p-2">
                      <p className="text-sm text-black"><strong>管理者コメント:</strong> {goal.admin_comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* すべての目標 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">すべての目標</CardTitle>
          <CardDescription className="text-black">過去に作成したすべての目標</CardDescription>
        </CardHeader>
        <CardContent>
          {/* PC: テーブル表示 */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black">目標セット</TableHead>
                  <TableHead className="text-black">-</TableHead>
                  <TableHead className="text-black">期間</TableHead>
                  <TableHead className="text-black">ステータス</TableHead>
                  <TableHead className="text-black">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.goals.length > 0 ? (
                  data.goals.map((goal: any) => {
                    const progressRate = goal.achievement_rate || 0
                    return (
                      <TableRow key={goal.id}>
                        <TableCell className="font-medium text-black">
                          <div className="space-y-2">
                            {goal.achievement_title && (
                              <div className="flex items-start gap-2">
                                <Badge className="bg-[#05a7be] text-white text-xs mt-0.5">成果</Badge>
                                <div>
                                  <div className="font-bold">{goal.achievement_title}</div>
                                  <div className="text-xs text-gray-600 line-clamp-1">{goal.achievement_description}</div>
                                </div>
                              </div>
                            )}
                            {goal.behavior_title && (
                              <div className="flex items-start gap-2">
                                <Badge className="bg-[#18c4b8] text-white text-xs mt-0.5">行動</Badge>
                                <div>
                                  <div className="font-bold">{goal.behavior_title}</div>
                                  <div className="text-xs text-gray-600 line-clamp-1">{goal.behavior_description}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">目標セット</div>
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
                          <div className="flex items-center gap-2">
                            <Link href={`/my-goals/${goal.id}`}>
                              <Button variant="outline" size="sm" className="text-black">
                                詳細
                              </Button>
                            </Link>
                            <DeleteGoalButton goalId={goal.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-black py-8">
                      目標がまだ登録されていません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* スマホ: カード表示 */}
          <div className="lg:hidden space-y-3">
            {data.goals.length > 0 ? (
              data.goals.map((goal: any) => (
                <div
                  key={goal.id}
                  className="border rounded-lg p-3 space-y-3"
                  style={{ borderColor: '#e0f2f1', backgroundColor: 'rgba(5, 167, 190, 0.02)' }}
                >
                  {/* ヘッダー: 期間とステータス */}
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: '#e0f2f1' }}>
                    <div className="text-sm font-medium text-black">
                      {goal.period_year}年 Q{goal.period_quarter}
                    </div>
                    <Badge className={getStatusBadge(goal.status || 'draft').className}>
                      {getStatusBadge(goal.status || 'draft').label}
                    </Badge>
                  </div>

                  {/* 目標 */}
                  <div className="space-y-2">
                    {goal.achievement_title && (
                      <div className="p-2 rounded" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[#05a7be] text-white text-xs">成果</Badge>
                          <span className="font-bold text-sm text-black">{goal.achievement_title}</span>
                        </div>
                        {goal.achievement_description && (
                          <p className="text-xs text-gray-600 line-clamp-2 ml-1">
                            {goal.achievement_description}
                          </p>
                        )}
                      </div>
                    )}
                    {goal.behavior_title && (
                      <div className="p-2 rounded" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[#18c4b8] text-white text-xs">行動</Badge>
                          <span className="font-bold text-sm text-black">{goal.behavior_title}</span>
                        </div>
                        {goal.behavior_description && (
                          <p className="text-xs text-gray-600 line-clamp-2 ml-1">
                            {goal.behavior_description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* アクション */}
                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#e0f2f1' }}>
                    <Link href={`/my-goals/${goal.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-black border-2" style={{ borderColor: '#05a7be' }}>
                        詳細を見る
                      </Button>
                    </Link>
                    <DeleteGoalButton goalId={goal.id} />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-black py-8 border rounded-lg" style={{ borderColor: '#e0f2f1' }}>
                目標がまだ登録されていません
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
