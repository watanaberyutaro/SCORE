import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Target, TrendingUp, MessageSquare, CheckCircle, User } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'
import { GoalStatusChanger } from '@/components/goals/GoalStatusChanger'

async function getGoalDetail(goalId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: goal, error } = await supabase
    .from('staff_goals')
    .select(`
      *,
      staff:users!staff_goals_staff_id_fkey(id, full_name, email),
      approved_by_user:users!staff_goals_approved_by_fkey(full_name),
      monthly_feedbacks:goal_monthly_feedbacks(
        *,
        admin:users!goal_monthly_feedbacks_admin_id_fkey(full_name)
      )
    `)
    .eq('id', goalId)
    .single()

  if (error || !goal) {
    return null
  }

  return goal
}

function getGoalStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: '進行中', className: 'bg-[#087ea2] text-white border-2 border-[#087ea2]' },
    completed: { label: '完了', className: 'bg-[#017598] text-white border-2 border-[#017598]' },
    abandoned: { label: '中止', className: 'bg-gray-400 text-white border-2 border-gray-400' },
  }
  return statusConfig[status] || statusConfig.active
}

export default async function AdminGoalDetailPage({
  params,
}: {
  params: { goalId: string }
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  const goal = await getGoalDetail(params.goalId)

  if (!goal) {
    redirect('/admin/goals')
  }

  const sortedFeedbacks = goal.monthly_feedbacks?.sort((a: any, b: any) => {
    const dateA = new Date(a.feedback_year, a.feedback_month - 1)
    const dateB = new Date(b.feedback_year, b.feedback_month - 1)
    return dateB.getTime() - dateA.getTime()
  }) || []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/admin/goals">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            目標一覧に戻る
          </Button>
        </Link>
      </div>

      {/* スタッフ情報 */}
      <Card className="mb-6 border-2 border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <User className="mr-2 h-5 w-5 text-gray-600" />
            スタッフ情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">氏名</p>
              <p className="text-base font-medium text-black">{goal.staff?.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">メールアドレス</p>
              <p className="text-base font-medium text-black">{goal.staff?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 面談ステータス変更 */}
      <Card className="mb-6 border-2" style={{ borderColor: '#18c4b8' }}>
        <CardHeader>
          <CardTitle className="text-black">面談ステータス管理</CardTitle>
          <CardDescription className="text-black">
            目標の面談ステータスを変更できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoalStatusChanger goalId={goal.id} currentStatus={goal.interview_status || 'pending'} />
        </CardContent>
      </Card>

      {/* 目標概要 */}
      <Card className="mb-6 border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <CardTitle className="text-2xl text-black">目標セット</CardTitle>
                <Badge className={getGoalStatusBadge(goal.status || 'active').className}>
                  {getGoalStatusBadge(goal.status || 'active').label}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 成果目標 */}
          {goal.achievement_title && (
            <div className="p-4 bg-[#05a7be]/10 rounded-lg border-2 border-[#05a7be]">
              <div className="mb-3">
                <Badge className="bg-[#05a7be] text-white">成果目標</Badge>
              </div>
              <h3 className="font-bold text-lg text-black mb-2">{goal.achievement_title}</h3>
              <p className="text-sm text-black">{goal.achievement_description}</p>
            </div>
          )}

          {/* 行動目標 */}
          {goal.behavior_title && (
            <div className="p-4 bg-[#18c4b8]/10 rounded-lg border-2 border-[#18c4b8]">
              <div className="mb-3">
                <Badge className="bg-[#18c4b8] text-white">行動目標</Badge>
              </div>
              <h3 className="font-bold text-lg text-black mb-2">{goal.behavior_title}</h3>
              <p className="text-sm text-black">{goal.behavior_description}</p>
            </div>
          )}

          {/* 目標情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#05a7be]" />
              <div>
                <p className="text-xs text-gray-600">目標期限</p>
                <p className="text-sm font-medium text-black">
                  {goal.target_date ? formatDate(goal.target_date) : '未設定'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-[#05a7be]" />
              <div>
                <p className="text-xs text-gray-600">期間</p>
                <p className="text-sm font-medium text-black">
                  {goal.period_year ? `${goal.period_year}年` : '未設定'}
                  {goal.period_quarter ? ` Q${goal.period_quarter}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-[#05a7be]" />
              <div>
                <p className="text-xs text-gray-600">作成日</p>
                <p className="text-sm font-medium text-black">
                  {formatDate(goal.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* 承認情報 */}
          {goal.approved_by_user && (
            <div className="p-3 bg-[#05a7be]/10 rounded-lg border-t-2 border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-[#05a7be]" />
                <span className="text-sm font-medium text-black">承認情報</span>
              </div>
              <p className="text-sm text-black">
                承認者: {goal.approved_by_user.full_name} ({formatDate(goal.approved_at)})
              </p>
              {goal.admin_comment && (
                <p className="text-sm text-black mt-2">
                  <strong>コメント:</strong> {goal.admin_comment}
                </p>
              )}
            </div>
          )}

          {/* 最終結果 */}
          {goal.final_result && (
            <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
              <h4 className="text-sm font-medium text-green-800 mb-2">最終結果</h4>
              <p className="text-sm text-black">{goal.final_result}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 月次フィードバック */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <MessageSquare className="mr-2 h-5 w-5 text-[#05a7be]" />
            月次フィードバック
          </CardTitle>
          <CardDescription className="text-black">
            管理者からの月次進捗フィードバック
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedFeedbacks.length > 0 ? (
            <div className="space-y-4">
              {sortedFeedbacks.map((feedback: any) => (
                <div
                  key={feedback.id}
                  className="border-2 border-[#05a7be] rounded-lg p-4 bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-black">
                        {feedback.feedback_year}年{feedback.feedback_month}月のフィードバック
                      </h4>
                      <p className="text-sm text-gray-600">
                        {feedback.admin?.full_name} - {formatDate(feedback.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#05a7be]">
                        {feedback.progress_rate}%
                      </div>
                      <p className="text-xs text-gray-600">進捗率</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-black mb-1">フィードバック</h5>
                      <p className="text-sm text-black bg-gray-50 p-3 rounded">
                        {feedback.feedback_comment}
                      </p>
                    </div>

                    {feedback.suggestions && (
                      <div>
                        <h5 className="text-sm font-medium text-black mb-1">改善提案</h5>
                        <p className="text-sm text-black bg-blue-50 p-3 rounded border-l-4 border-[#05a7be]">
                          {feedback.suggestions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              まだフィードバックがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
