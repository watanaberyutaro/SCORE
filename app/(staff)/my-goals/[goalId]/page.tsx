import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, ArrowLeft, Calendar, User, MessageSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'

async function getGoalData(goalId: string, userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: goal } = await supabase
    .from('staff_goals')
    .select(`
      *,
      reviewed_by_user:users!staff_goals_reviewed_by_fkey(full_name)
    `)
    .eq('id', goalId)
    .eq('staff_id', userId)
    .single()

  if (!goal) {
    redirect('/my-goals')
  }

  return goal
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: '進行中', className: 'bg-[#087ea2] text-white border-2 border-[#087ea2]' },
    completed: { label: '完了', className: 'bg-[#017598] text-white border-2 border-[#017598]' },
    abandoned: { label: '中止', className: 'bg-gray-400 text-white border-2 border-gray-400' },
  }
  return statusConfig[status] || statusConfig.active
}

function getInterviewStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: '面談前', className: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' },
    scheduled: { label: '面談予定', className: 'bg-blue-100 text-blue-800 border-2 border-blue-300' },
    completed: { label: '面談済み', className: 'bg-green-100 text-green-800 border-2 border-green-300' },
  }
  return statusConfig[status] || statusConfig.pending
}

export default async function GoalDetailPage({
  params,
}: {
  params: { goalId: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const goal = await getGoalData(params.goalId, user.id)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link href="/my-goals">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            目標一覧に戻る
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-black">目標詳細</h1>
          <Badge className={getStatusBadge(goal.status).className}>
            {getStatusBadge(goal.status).label}
          </Badge>
          <Badge className={getInterviewStatusBadge(goal.interview_status).className}>
            {getInterviewStatusBadge(goal.interview_status).label}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本情報 */}
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Target className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
              目標情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">目標タイトル</h3>
              <p className="text-lg font-bold text-black">{goal.goal_title}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">目標の説明</h3>
              <p className="text-black whitespace-pre-wrap">{goal.goal_description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  目標達成日
                </h3>
                <p className="text-black">{formatDate(goal.target_date)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  達成率
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(goal.achievement_rate || 0, 100)}%`,
                        backgroundColor: '#05a7be'
                      }}
                    />
                  </div>
                  <span className="text-lg font-bold text-black">{goal.achievement_rate || 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 面談情報 */}
        {goal.interview_status === 'completed' && (
          <Card className="border-2 border-green-300">
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <MessageSquare className="mr-2 h-5 w-5 text-green-600" />
                面談記録
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goal.interviewed_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">面談日時</h3>
                  <p className="text-black">
                    {new Date(goal.interviewed_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              {goal.reviewed_by_user && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    面談者
                  </h3>
                  <p className="text-black">{goal.reviewed_by_user.full_name}</p>
                </div>
              )}
              {goal.admin_comments && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">管理者コメント</h3>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-black whitespace-pre-wrap">{goal.admin_comments}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* タイムライン */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black">タイムライン</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                  <Calendar className="h-5 w-5" style={{ color: '#05a7be' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">目標作成</p>
                  <p className="text-xs text-gray-600">
                    {new Date(goal.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              {goal.updated_at !== goal.created_at && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                    <Target className="h-5 w-5" style={{ color: '#18c4b8' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">最終更新</p>
                    <p className="text-xs text-gray-600">
                      {new Date(goal.updated_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
