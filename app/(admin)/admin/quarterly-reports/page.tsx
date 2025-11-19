import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'

async function getQuarterlyReports(year: number, quarter: number) {
  const supabase = await createSupabaseServerClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // 現在のユーザーのcompany_idを取得
  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    throw new Error('User not found')
  }

  // 全スタッフの情報を取得（同じ企業のみ）
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, department, position, email')
    .eq('role', 'staff')
    .eq('company_id', currentUser.company_id)
    .order('full_name')

  // 指定された年・四半期の四半期レポートを取得（同じ企業のみ）
  const { data: quarterlyReports } = await supabase
    .from('quarterly_reports')
    .select(`
      *,
      staff:users!quarterly_reports_staff_id_fkey(id, full_name, department, position, email, company_id)
    `)
    .eq('year', year)
    .eq('quarter', quarter)

  // 同じ企業のレポートのみフィルタ
  const filteredReports = quarterlyReports?.filter(r => r.staff?.company_id === currentUser.company_id)

  // 四半期に含まれる月を計算
  const quarterMonths = [
    (quarter - 1) * 3 + 1,
    (quarter - 1) * 3 + 2,
    (quarter - 1) * 3 + 3,
  ]

  // 四半期に含まれる月の評価を取得（同じ企業のみ）
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      staff:users!evaluations_staff_id_fkey(id, full_name, company_id)
    `)
    .eq('evaluation_year', year)
    .in('evaluation_month', quarterMonths)
    .eq('status', 'completed')

  // 同じ企業の評価のみフィルタ
  const filteredEvaluations = evaluations?.filter(e => e.staff?.company_id === currentUser.company_id)

  // スタッフごとに四半期レポートをマッピング
  const staffReports = (allStaff || []).map(staff => {
    const report = filteredReports?.find(r => r.staff_id === staff.id)
    const staffEvaluations = filteredEvaluations?.filter(e => e.staff_id === staff.id) || []

    return {
      staff,
      report,
      evaluations: staffEvaluations,
      hasAllMonths: staffEvaluations.length === 3,
    }
  })

  return {
    year,
    quarter,
    quarterMonths,
    staffReports,
    totalStaff: allStaff?.length || 0,
    completedReports: filteredReports?.length || 0,
  }
}

export default async function QuarterlyReportsPage({
  searchParams
}: {
  searchParams: { year?: string; quarter?: string }
}) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1

  const year = searchParams.year ? parseInt(searchParams.year) : currentYear
  const quarter = searchParams.quarter ? parseInt(searchParams.quarter) : currentQuarter

  const data = await getQuarterlyReports(year, quarter)

  // 前四半期・次四半期の計算
  const prevQuarter = quarter === 1 ? 4 : quarter - 1
  const prevYear = quarter === 1 ? year - 1 : year
  const nextQuarter = quarter === 4 ? 1 : quarter + 1
  const nextYear = quarter === 4 ? year + 1 : year

  const progressPercentage = data.totalStaff > 0
    ? Math.round((data.completedReports / data.totalStaff) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">四半期レポート</h1>
        <p className="mt-2 text-sm text-gray-600">
          3ヶ月ごとの評価平均を確認します
        </p>
      </div>

      {/* 年・四半期選択 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Link href={`/admin/quarterly-reports?year=${prevYear}&quarter=${prevQuarter}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                前四半期
              </Button>
            </Link>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {year}年 第{quarter}四半期
              </div>
              <div className="mt-1 text-sm text-gray-600">
                ({data.quarterMonths[0]}月 - {data.quarterMonths[2]}月)
              </div>
              <div className="mt-2 text-sm text-gray-600">
                レポート生成: {data.completedReports} / {data.totalStaff} ({progressPercentage}%)
              </div>
            </div>

            <Link href={`/admin/quarterly-reports?year=${nextYear}&quarter=${nextQuarter}`}>
              <Button variant="outline" size="sm">
                次四半期
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* スタッフ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフ四半期レポート</CardTitle>
          <CardDescription>
            {year}年第{quarter}四半期の評価状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.staffReports.map(({ staff, report, evaluations, hasAllMonths }) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{staff.full_name}</p>
                    {report ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        レポート生成済み
                      </Badge>
                    ) : hasAllMonths ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        生成準備完了
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        評価不足 ({evaluations.length}/3ヶ月)
                      </Badge>
                    )}
                    {report && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        平均: {report.average_score?.toFixed(2)}点
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {staff.department} - {staff.position}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {data.quarterMonths.map(month => {
                      const hasEvaluation = evaluations.some(e => e.evaluation_month === month)
                      return (
                        <Badge
                          key={month}
                          variant="outline"
                          className={hasEvaluation
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-400 border-gray-200"
                          }
                        >
                          {month}月 {hasEvaluation ? '✓' : '✗'}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  {report && (
                    <Link href={`/admin/quarterly-reports/${staff.id}?year=${year}&quarter=${quarter}`}>
                      <Button size="sm" variant="outline">
                        詳細を見る
                      </Button>
                    </Link>
                  )}
                  <Link href={`/admin/monthly-evaluations?year=${year}&month=${data.quarterMonths[0]}`}>
                    <Button size="sm" variant="ghost">
                      月次評価へ
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
