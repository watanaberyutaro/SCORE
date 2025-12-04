import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Target, TrendingUp, CheckCircle, User } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'
import { GoalStatusChanger } from '@/components/goals/GoalStatusChanger'

async function getGoalDetail(goalId: string) {
  const supabase = await createSupabaseServerClient()

  // 現在のユーザーのcompany_idを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!currentUser) return null

  // 同じ企業の目標のみ取得
  const { data: goal, error } = await supabase
    .from('staff_goals')
    .select(`
      *,
      staff:users!staff_goals_staff_id_fkey(id, full_name, email),
      reviewed_by_user:users!staff_goals_reviewed_by_fkey(full_name)
    `)
    .eq('id', goalId)
    .eq('company_id', currentUser.company_id)
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

      {/* 目標詳細 */}
      <Card className="mb-6 border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <CardTitle className="flex items-center text-2xl text-black">
                  <Target className="mr-2 h-6 w-6" style={{ color: '#05a7be' }} />
                  目標情報
                </CardTitle>
                <Badge className={getGoalStatusBadge(goal.status || 'active').className}>
                  {getGoalStatusBadge(goal.status || 'active').label}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 目標タイトル */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">目標タイトル</h3>
            <p className="text-xl font-bold text-black">{goal.goal_title}</p>
          </div>

          {/* 目標の説明 */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">目標の説明</h3>
            <div className="p-4 bg-[#05a7be]/10 rounded-lg border-2 border-[#05a7be]">
              <p className="text-black whitespace-pre-wrap">{goal.goal_description}</p>
            </div>
          </div>

          {/* 目標情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#05a7be]" />
              <div>
                <p className="text-xs text-gray-600">目標達成日</p>
                <p className="text-sm font-medium text-black">
                  {goal.target_date ? formatDate(goal.target_date) : '未設定'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-[#05a7be]" />
              <div>
                <p className="text-xs text-gray-600">達成率</p>
                <p className="text-sm font-medium text-black">{goal.achievement_rate || 0}%</p>
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

          {/* 面談情報 */}
          {goal.interview_status === 'completed' && (
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="text-sm font-medium text-green-800">面談完了</h4>
              </div>
              {goal.interviewed_at && (
                <p className="text-sm text-black mb-2">
                  <strong>面談日時:</strong> {formatDate(goal.interviewed_at)}
                </p>
              )}
              {goal.reviewed_by_user && (
                <p className="text-sm text-black mb-2">
                  <strong>面談者:</strong> {goal.reviewed_by_user.full_name}
                </p>
              )}
              {goal.admin_comments && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-black mb-1">管理者コメント:</p>
                  <p className="text-sm text-black whitespace-pre-wrap">{goal.admin_comments}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
