import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Calendar, TrendingUp, Award, Eye, BarChart3 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'

async function getStaffAnnualEvaluationDetail(staffId: string, cycleId: string, companyId: string) {
  const supabase = await createSupabaseServerClient()

  // スタッフ情報を取得
  const { data: staff } = await supabase
    .from('users')
    .select('*')
    .eq('id', staffId)
    .eq('company_id', companyId)
    .single()

  if (!staff) {
    return null
  }

  // サイクル情報を取得
  const { data: cycle } = await supabase
    .from('evaluation_cycles')
    .select('*')
    .eq('id', cycleId)
    .eq('company_id', companyId)
    .single()

  if (!cycle) {
    return null
  }

  // サイクル期間内の月を生成
  const startDate = new Date(cycle.start_date)
  const endDate = new Date(cycle.end_date)

  const months: { year: number; month: number; label: string }[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    months.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      label: `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    })
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  // 各月の評価を取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name)
      )
    `)
    .eq('staff_id', staffId)
    .eq('status', 'completed')

  // 月ごとの評価をマッピング
  const monthlyEvaluations = months.map(({ year, month, label }) => {
    const evaluation = evaluations?.find(
      e => e.evaluation_year === year && e.evaluation_month === month
    )

    return {
      year,
      month,
      label,
      evaluation,
      hasEvaluation: !!evaluation,
      totalScore: evaluation?.total_score || null,
      rank: evaluation?.rank || null,
      responseCount: evaluation?.responses?.length || 0
    }
  })

  // 統計情報を計算
  const completedMonths = monthlyEvaluations.filter(m => m.hasEvaluation).length
  const validScores = monthlyEvaluations
    .filter(m => m.totalScore !== null)
    .map(m => m.totalScore!)

  const averageScore = validScores.length > 0
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    : null

  // 最新の評価のランクを取得
  const latestEvaluation = monthlyEvaluations.reverse().find(m => m.hasEvaluation)
  const currentRank = latestEvaluation?.rank || null
  monthlyEvaluations.reverse() // 元の順序に戻す

  // カテゴリ別の平均スコアを計算
  let performanceScores: number[] = []
  let behaviorScores: number[] = []
  let growthScores: number[] = []

  evaluations?.forEach(e => {
    if (e.performance_score !== null) performanceScores.push(e.performance_score)
    if (e.behavior_score !== null) behaviorScores.push(e.behavior_score)
    if (e.growth_score !== null) growthScores.push(e.growth_score)
  })

  const avgPerformance = performanceScores.length > 0
    ? performanceScores.reduce((sum, s) => sum + s, 0) / performanceScores.length
    : null
  const avgBehavior = behaviorScores.length > 0
    ? behaviorScores.reduce((sum, s) => sum + s, 0) / behaviorScores.length
    : null
  const avgGrowth = growthScores.length > 0
    ? growthScores.reduce((sum, s) => sum + s, 0) / growthScores.length
    : null

  // 四半期ごとにグループ化
  const quarters = [
    { number: 1, name: '第1四半期', months: monthlyEvaluations.slice(0, 3) },
    { number: 2, name: '第2四半期', months: monthlyEvaluations.slice(3, 6) },
    { number: 3, name: '第3四半期', months: monthlyEvaluations.slice(6, 9) },
    { number: 4, name: '第4四半期', months: monthlyEvaluations.slice(9, 12) },
  ]

  const quarterlyData = quarters.map(quarter => {
    const completed = quarter.months.filter(m => m.hasEvaluation).length
    const scores = quarter.months
      .filter(m => m.totalScore !== null)
      .map(m => m.totalScore!)

    const average = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null

    return {
      ...quarter,
      completedCount: completed,
      totalCount: quarter.months.length,
      averageScore: average,
      completionRate: Math.round((completed / quarter.months.length) * 100)
    }
  })

  return {
    staff,
    cycle,
    months,
    monthlyEvaluations,
    quarterlyData,
    completedMonths,
    totalMonths: months.length,
    averageScore,
    currentRank,
    categoryAverages: {
      performance: avgPerformance,
      behavior: avgBehavior,
      growth: avgGrowth
    }
  }
}

export default async function StaffAnnualEvaluationDetailPage({
  params,
  searchParams
}: {
  params: { staffId: string }
  searchParams: { cycle_id?: string }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const cycleId = searchParams.cycle_id
  if (!cycleId) {
    redirect('/admin/annual-evaluations')
  }

  const data = await getStaffAnnualEvaluationDetail(params.staffId, cycleId, user.company_id)

  if (!data) {
    redirect('/admin/annual-evaluations')
  }

  const progressPercentage = Math.round((data.completedMonths / data.totalMonths) * 100)

  const rankColors: Record<string, string> = {
    'SS': 'bg-purple-50 text-purple-700 border-purple-200',
    'S': 'bg-blue-50 text-blue-700 border-blue-200',
    'A+': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'A': 'bg-green-50 text-green-700 border-green-200',
    'A-': 'bg-lime-50 text-lime-700 border-lime-200',
    'B': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'C': 'bg-orange-50 text-orange-700 border-orange-200',
    'D': 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link href={`/admin/annual-evaluations?cycle_id=${cycleId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            年次評価一覧に戻る
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.staff.full_name} の年次評価</h1>
            <p className="text-sm text-gray-600 mt-2">
              {data.staff.department} · {data.staff.position}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {data.cycle.cycle_name} ({new Date(data.cycle.start_date).toLocaleDateString('ja-JP')} 〜 {new Date(data.cycle.end_date).toLocaleDateString('ja-JP')})
            </p>
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">評価完了</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {data.completedMonths}/{data.totalMonths}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              完了率: {progressPercentage}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">平均スコア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {data.averageScore !== null ? data.averageScore.toFixed(2) : '-'}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {data.completedMonths}ヶ月分の平均
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">現在のランク</CardTitle>
          </CardHeader>
          <CardContent>
            {data.currentRank ? (
              <>
                <Badge className={`text-2xl ${rankColors[data.currentRank]}`}>
                  {data.currentRank}
                </Badge>
                <div className="mt-1 text-xs text-gray-500">
                  最新評価時点
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">未評価</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">進捗状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all flex items-center justify-center text-xs font-medium text-white"
                style={{ width: `${progressPercentage}%` }}
              >
                {progressPercentage}%
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {data.completedMonths}ヶ月完了
            </div>
          </CardContent>
        </Card>
      </div>

      {/* カテゴリ別平均スコア */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            カテゴリ別平均スコア
          </CardTitle>
          <CardDescription>期間全体のカテゴリ別評価平均</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50/30 rounded-r-lg">
              <p className="text-sm text-gray-600 mb-1">成果評価</p>
              <p className="text-2xl font-bold text-green-700">
                {data.categoryAverages.performance !== null
                  ? data.categoryAverages.performance.toFixed(2)
                  : '-'}
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50/30 rounded-r-lg">
              <p className="text-sm text-gray-600 mb-1">行動評価</p>
              <p className="text-2xl font-bold text-purple-700">
                {data.categoryAverages.behavior !== null
                  ? data.categoryAverages.behavior.toFixed(2)
                  : '-'}
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50/30 rounded-r-lg">
              <p className="text-sm text-gray-600 mb-1">成長評価</p>
              <p className="text-2xl font-bold text-orange-700">
                {data.categoryAverages.growth !== null
                  ? data.categoryAverages.growth.toFixed(2)
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 四半期ごとの中間発表 */}
      <Card className="mb-6 border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <TrendingUp className="h-5 w-5" />
            四半期ごとの中間発表
          </CardTitle>
          <CardDescription className="text-black">
            3ヶ月ごとの評価サマリー
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.quarterlyData.map((quarter) => (
              <div
                key={quarter.number}
                className="border-2 rounded-lg p-4 transition-all hover:shadow-md"
                style={{
                  borderColor: quarter.completedCount === quarter.totalCount ? '#10b981' : '#d1d5db',
                  backgroundColor: quarter.completedCount === quarter.totalCount ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-black">{quarter.name}</h3>
                  <Badge
                    className={
                      quarter.completedCount === quarter.totalCount
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {quarter.completedCount}/{quarter.totalCount}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">完了率</span>
                    <span className="font-semibold text-black">{quarter.completionRate}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${quarter.completionRate}%`,
                        backgroundColor: quarter.completionRate === 100 ? '#10b981' : '#6b7280'
                      }}
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">平均スコア</span>
                      <span className="text-xl font-bold text-blue-600">
                        {quarter.averageScore !== null
                          ? quarter.averageScore.toFixed(2)
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    {quarter.months.map(m => m.label.split('年')[1]).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 月別評価一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            月別評価詳細
          </CardTitle>
          <CardDescription>各月の評価状況と詳細ページへのリンク</CardDescription>
        </CardHeader>
        <CardContent>
          {/* PC: テーブル形式 */}
          <div className="hidden md:block">
            <div className="grid grid-cols-1 gap-3">
              {data.monthlyEvaluations.map((monthData) => (
                <div
                  key={`${monthData.year}-${monthData.month}`}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
                    monthData.hasEvaluation
                      ? 'border-green-200 bg-green-50/30 hover:bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{monthData.label}</span>
                      {monthData.hasEvaluation ? (
                        <>
                          <Badge className="bg-green-100 text-green-800">
                            評価完了
                          </Badge>
                          <span className="text-sm text-gray-600">
                            回答数: {monthData.responseCount}/3
                          </span>
                        </>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          未評価
                        </Badge>
                      )}
                    </div>
                    {monthData.hasEvaluation && (
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600">スコア:</span>
                          <span className="font-medium text-blue-600">
                            {monthData.totalScore?.toFixed(2)}点
                          </span>
                        </div>
                        {monthData.rank && (
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-purple-600" />
                            <span className="text-gray-600">ランク:</span>
                            <Badge variant="outline" className={rankColors[monthData.rank]}>
                              {monthData.rank}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {monthData.hasEvaluation ? (
                      <Link href={`/admin/staff-evaluations/${params.staffId}?id=${monthData.evaluation.id}`}>
                        <Button variant="outline" size="sm" className="border-2" style={{ borderColor: '#6366f1', color: '#6366f1' }}>
                          <Eye className="h-4 w-4 mr-1" />
                          詳細を見る
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        未評価
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* スマホ: カード形式 */}
          <div className="md:hidden space-y-3">
            {data.monthlyEvaluations.map((monthData) => (
              <div
                key={`${monthData.year}-${monthData.month}`}
                className={`p-3 border-2 rounded-lg ${
                  monthData.hasEvaluation
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{monthData.label}</span>
                  </div>
                  {monthData.hasEvaluation ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      完了
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800 text-xs">
                      未評価
                    </Badge>
                  )}
                </div>

                {monthData.hasEvaluation && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">スコア</span>
                      <span className="font-medium text-blue-600">
                        {monthData.totalScore?.toFixed(2)}点
                      </span>
                    </div>
                    {monthData.rank && (
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">ランク</span>
                        <Badge variant="outline" className={rankColors[monthData.rank]}>
                          {monthData.rank}
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">回答数</span>
                      <span className="font-medium text-gray-900">
                        {monthData.responseCount}/3
                      </span>
                    </div>
                  </div>
                )}

                {monthData.hasEvaluation && (
                  <Link href={`/admin/staff-evaluations/${params.staffId}?id=${monthData.evaluation.id}`}>
                    <Button variant="outline" size="sm" className="w-full border-2" style={{ borderColor: '#6366f1', color: '#6366f1' }}>
                      <Eye className="h-4 w-4 mr-1" />
                      詳細を見る
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
