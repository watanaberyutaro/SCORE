import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

async function getMonthlyEvaluations(year: number, month: number) {
  const supabase = await createSupabaseServerClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // 全スタッフの情報を取得
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, department, position, email')
    .eq('role', 'staff')
    .order('full_name')

  // 指定された年月の評価データを取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      staff:users!evaluations_staff_id_fkey(id, full_name, department, position, email),
      responses:evaluation_responses(*)
    `)
    .eq('evaluation_year', year)
    .eq('evaluation_month', month)

  // スタッフごとの評価状況をマッピング
  const staffEvaluations = (allStaff || []).map(staff => {
    const evaluation = evaluations?.find(e => e.staff_id === staff.id)

    // 現在のユーザーの回答を探す
    const myResponse = evaluation?.responses?.find((r: any) => r.admin_id === user.id)
    const mySubmitted = myResponse?.submitted_at !== null && myResponse?.submitted_at !== undefined

    // 3人の提出状況を集計
    const responses = evaluation?.responses || []
    const submittedCount = responses.filter((r: any) => r.submitted_at !== null).length

    return {
      staff,
      evaluation,
      mySubmitted,
      submittedCount,
      totalRequired: 3,
      status: evaluation?.status || 'not_started'
    }
  })

  return {
    year,
    month,
    staffEvaluations,
    totalStaff: allStaff?.length || 0,
    completedCount: evaluations?.filter(e => e.status === 'completed').length || 0,
    mySubmittedCount: staffEvaluations.filter(s => s.mySubmitted).length,
  }
}

export default async function MonthlyEvaluationsPage({
  searchParams
}: {
  searchParams: { year?: string; month?: string }
}) {
  const now = new Date()
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear()
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1

  const data = await getMonthlyEvaluations(year, month)

  // 前月・次月の計算
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const progressPercentage = data.totalStaff > 0
    ? Math.round((data.completedCount / data.totalStaff) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">月次評価管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          各月のスタッフ評価を管理します
        </p>
      </div>

      {/* 年月選択 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Link href={`/admin/monthly-evaluations?year=${prevYear}&month=${prevMonth}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                前月
              </Button>
            </Link>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {year}年{month}月
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-sm text-gray-600">
                  あなたの提出: {data.mySubmittedCount} / {data.totalStaff}
                </div>
                <div className="text-sm text-gray-600">
                  全体の完了: {data.completedCount} / {data.totalStaff} ({progressPercentage}%)
                </div>
              </div>
            </div>

            <Link href={`/admin/monthly-evaluations?year=${nextYear}&month=${nextMonth}`}>
              <Button variant="outline" size="sm">
                次月
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* スタッフ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフ評価一覧</CardTitle>
          <CardDescription>
            {year}年{month}月の評価状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.staffEvaluations.map(({ staff, evaluation, mySubmitted, submittedCount, totalRequired, status }) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{staff.full_name}</p>
                    {/* 自分の提出状況 */}
                    {mySubmitted ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✓ 提出済み
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        未提出
                      </Badge>
                    )}
                    {/* 全体の提出状況 */}
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {submittedCount}/{totalRequired}人提出
                    </Badge>
                    {/* 完了ステータス */}
                    {status === 'completed' && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        評価完了
                      </Badge>
                    )}
                    {/* 最終スコア */}
                    {evaluation?.total_score && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        {evaluation.total_score.toFixed(1)}点
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {staff.department} - {staff.position}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/evaluations/${staff.id}?year=${year}&month=${month}`}>
                    <Button size="sm" variant={mySubmitted ? "outline" : "default"}>
                      {mySubmitted ? '評価を編集' : '評価を入力'}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
