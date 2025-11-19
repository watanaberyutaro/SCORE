import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getRankColor } from '@/lib/utils/evaluation-calculator'
import { BarChart3, Users, TrendingUp, Award, Target, PieChart, Activity, TrendingDown, Trophy } from 'lucide-react'
import type { EvaluationRank } from '@/types'

async function getAnalyticsData() {
  const supabase = await createSupabaseServerClient()

  // 現在の期を計算（7月始まり）
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const fiscalYearStart = currentMonth >= 7 ? currentYear : currentYear - 1
  const fiscalYearEnd = fiscalYearStart + 1

  // 現在の期の全評価を取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(
      `
      *,
      staff:users!evaluations_staff_id_fkey(full_name, department, position)
    `
    )
    .or(
      `and(evaluation_year.eq.${fiscalYearStart},evaluation_month.gte.7),` +
      `and(evaluation_year.eq.${fiscalYearEnd},evaluation_month.lte.6)`
    )
    .eq('status', 'completed')
    .order('evaluation_year', { ascending: true })
    .order('evaluation_month', { ascending: true })

  // 部門別の統計
  const departmentStats = (evaluations || []).reduce((acc: any, evaluation: any) => {
    const dept = evaluation.staff.department || '未分類'
    if (!acc[dept]) {
      acc[dept] = {
        department: dept,
        count: 0,
        totalScore: 0,
        performanceScore: 0,
        behaviorScore: 0,
        growthScore: 0,
        scores: [],
        rankCount: {} as Record<string, number>,
      }
    }
    acc[dept].count++
    acc[dept].totalScore += evaluation.total_score || 0
    acc[dept].performanceScore += evaluation.performance_score || 0
    acc[dept].behaviorScore += evaluation.behavior_score || 0
    acc[dept].growthScore += evaluation.growth_score || 0
    acc[dept].scores.push(evaluation.total_score || 0)

    const rank = evaluation.rank || '未評価'
    acc[dept].rankCount[rank] = (acc[dept].rankCount[rank] || 0) + 1

    return acc
  }, {})

  // ランク別の分布
  const rankDistribution = (evaluations || []).reduce((acc: any, evaluation: any) => {
    const rank = evaluation.rank || '未評価'
    acc[rank] = (acc[rank] || 0) + 1
    return acc
  }, {})

  // スコア分布（範囲別）
  const scoreRanges = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '60未満': 0,
  }

  ;(evaluations || []).forEach((e: any) => {
    const score = e.total_score || 0
    if (score >= 90) scoreRanges['90-100']++
    else if (score >= 80) scoreRanges['80-89']++
    else if (score >= 70) scoreRanges['70-79']++
    else if (score >= 60) scoreRanges['60-69']++
    else scoreRanges['60未満']++
  })

  // 月次推移データ
  const monthlyTrend = (evaluations || []).reduce((acc: any, evaluation: any) => {
    const key = `${evaluation.evaluation_year}-${String(evaluation.evaluation_month).padStart(2, '0')}`
    if (!acc[key]) {
      acc[key] = {
        year: evaluation.evaluation_year,
        month: evaluation.evaluation_month,
        count: 0,
        totalScore: 0,
        performanceScore: 0,
        behaviorScore: 0,
        growthScore: 0,
      }
    }
    acc[key].count++
    acc[key].totalScore += evaluation.total_score || 0
    acc[key].performanceScore += evaluation.performance_score || 0
    acc[key].behaviorScore += evaluation.behavior_score || 0
    acc[key].growthScore += evaluation.growth_score || 0
    return acc
  }, {})

  const monthlyTrendArray = Object.values(monthlyTrend).map((m: any) => ({
    ...m,
    avgTotal: m.count > 0 ? m.totalScore / m.count : 0,
    avgPerformance: m.count > 0 ? m.performanceScore / m.count : 0,
    avgBehavior: m.count > 0 ? m.behaviorScore / m.count : 0,
    avgGrowth: m.count > 0 ? m.growthScore / m.count : 0,
  }))

  // スコア統計
  const scores = (evaluations || []).map((e: any) => e.total_score || 0)
  const averageScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0
  const minScore = scores.length > 0 ? Math.min(...scores) : 0

  // 標準偏差の計算
  const variance = scores.length > 0
    ? scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length
    : 0
  const standardDeviation = Math.sqrt(variance)

  // カテゴリ別平均スコア
  const performanceScores = (evaluations || []).map((e: any) => e.performance_score || 0).filter(s => s > 0)
  const behaviorScores = (evaluations || []).map((e: any) => e.behavior_score || 0).filter(s => s > 0)
  const growthScores = (evaluations || []).map((e: any) => e.growth_score || 0).filter(s => s > 0)

  const avgPerformance = performanceScores.length > 0
    ? performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length
    : 0
  const avgBehavior = behaviorScores.length > 0
    ? behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length
    : 0
  const avgGrowth = growthScores.length > 0
    ? growthScores.reduce((a, b) => a + b, 0) / growthScores.length
    : 0

  return {
    fiscalYearStart,
    fiscalYearEnd,
    totalEvaluations: evaluations?.length || 0,
    averageScore,
    maxScore,
    minScore,
    standardDeviation,
    departmentStats: Object.values(departmentStats),
    rankDistribution,
    scoreRanges,
    monthlyTrend: monthlyTrendArray,
    categoryAverages: {
      performance: avgPerformance,
      behavior: avgBehavior,
      growth: avgGrowth,
    },
    topPerformers: (evaluations || [])
      .sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 10),
  }
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData()

  const rankOrder: EvaluationRank[] = ['SS', 'S', 'A+', 'A', 'A-', 'B', 'C', 'D']

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
      <div className="mb-4 lg:mb-8">
        <h1 className="text-xl lg:text-3xl font-bold text-gray-900">分析・レポート</h1>
        <p className="mt-1 lg:mt-2 text-xs lg:text-sm text-gray-600">
          評価期間: {data.fiscalYearStart}年7月〜{data.fiscalYearEnd}年6月
        </p>
      </div>

      {/* サマリーカード - 拡張版 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-5 mb-4 lg:mb-8">
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium leading-tight text-black">完了評価数</CardTitle>
            <Users className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#05a7be' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{data.totalEvaluations}</div>
            <p className="text-[10px] lg:text-xs text-gray-600 mt-0.5 lg:mt-1">件</p>
          </CardContent>
        </Card>
        <Card className="border-2" style={{ borderColor: '#18c4b8' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium leading-tight text-black">平均スコア</CardTitle>
            <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#18c4b8' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{data.averageScore.toFixed(1)}</div>
            <p className="text-[10px] lg:text-xs text-gray-600 mt-0.5 lg:mt-1">点</p>
          </CardContent>
        </Card>
        <Card className="border-2" style={{ borderColor: '#1ed7cd' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium leading-tight text-black">最高スコア</CardTitle>
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#1ed7cd' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{data.maxScore.toFixed(1)}</div>
            <p className="text-[10px] lg:text-xs text-gray-600 mt-0.5 lg:mt-1">点</p>
          </CardContent>
        </Card>
        <Card className="border-2" style={{ borderColor: '#087ea2' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium leading-tight text-black">最低スコア</CardTitle>
            <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#087ea2' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{data.minScore.toFixed(1)}</div>
            <p className="text-[10px] lg:text-xs text-gray-600 mt-0.5 lg:mt-1">点</p>
          </CardContent>
        </Card>
        <Card className="border-2" style={{ borderColor: '#017598' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium leading-tight text-black">標準偏差</CardTitle>
            <Activity className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: '#017598' }} />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-black">{data.standardDeviation.toFixed(2)}</div>
            <p className="text-[10px] lg:text-xs text-gray-600 mt-0.5 lg:mt-1">±</p>
          </CardContent>
        </Card>
      </div>

      {/* カテゴリ別平均スコア */}
      <Card className="mb-4 lg:mb-6 border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader className="p-3 lg:p-6">
          <CardTitle className="text-base lg:text-xl text-black flex items-center gap-2">
            <Target className="h-5 w-5" style={{ color: '#05a7be' }} />
            カテゴリ別平均スコア
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm text-black">成果・行動・成長の各カテゴリ分析</CardDescription>
        </CardHeader>
        <CardContent className="p-3 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            <div className="p-3 lg:p-4 rounded-lg border-2" style={{ borderColor: '#05a7be', backgroundColor: 'rgba(5, 167, 190, 0.05)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs lg:text-sm font-semibold text-black">成果評価</h4>
                <Badge className="bg-[#05a7be] text-white text-xs">48点満点</Badge>
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-black">
                {data.categoryAverages.performance.toFixed(1)}点
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(data.categoryAverages.performance / 48) * 100}%`,
                    background: 'linear-gradient(to right, #05a7be, #18c4b8)',
                  }}
                />
              </div>
              <p className="text-[10px] lg:text-xs text-gray-600 mt-1">
                達成率: {((data.categoryAverages.performance / 48) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-3 lg:p-4 rounded-lg border-2" style={{ borderColor: '#18c4b8', backgroundColor: 'rgba(24, 196, 184, 0.05)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs lg:text-sm font-semibold text-black">行動評価</h4>
                <Badge className="bg-[#18c4b8] text-white text-xs">30点満点</Badge>
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-black">
                {data.categoryAverages.behavior.toFixed(1)}点
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(data.categoryAverages.behavior / 30) * 100}%`,
                    background: 'linear-gradient(to right, #18c4b8, #1ed7cd)',
                  }}
                />
              </div>
              <p className="text-[10px] lg:text-xs text-gray-600 mt-1">
                達成率: {((data.categoryAverages.behavior / 30) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-3 lg:p-4 rounded-lg border-2" style={{ borderColor: '#1ed7cd', backgroundColor: 'rgba(30, 215, 205, 0.05)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs lg:text-sm font-semibold text-black">成長評価</h4>
                <Badge className="bg-[#1ed7cd] text-black text-xs">22点満点</Badge>
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-black">
                {data.categoryAverages.growth.toFixed(1)}点
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(data.categoryAverages.growth / 22) * 100}%`,
                    background: 'linear-gradient(to right, #1ed7cd, #05a7be)',
                  }}
                />
              </div>
              <p className="text-[10px] lg:text-xs text-gray-600 mt-1">
                達成率: {((data.categoryAverages.growth / 22) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* スコア分布 */}
      <Card className="mb-4 lg:mb-6 border-2" style={{ borderColor: '#18c4b8' }}>
        <CardHeader className="p-3 lg:p-6">
          <CardTitle className="text-base lg:text-xl text-black flex items-center gap-2">
            <PieChart className="h-5 w-5" style={{ color: '#18c4b8' }} />
            スコア分布
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm text-black">点数帯別の人数分布</CardDescription>
        </CardHeader>
        <CardContent className="p-3 lg:p-6">
          <div className="space-y-2 lg:space-y-3">
            {Object.entries(data.scoreRanges).map(([range, count], idx) => {
              const colors = ['#087ea2', '#05a7be', '#18c4b8', '#1ed7cd', '#e0e0e0']
              const percentage = data.totalEvaluations > 0 ? (count / data.totalEvaluations) * 100 : 0

              return (
                <div key={range} className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 w-24 lg:w-32">
                    <Badge className="text-xs" style={{ backgroundColor: colors[idx], color: '#fff' }}>
                      {range}点
                    </Badge>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-6 lg:h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full flex items-center justify-center text-xs lg:text-sm font-bold text-white"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colors[idx],
                          minWidth: count > 0 ? '30px' : '0',
                        }}
                      >
                        {count > 0 && count}
                      </div>
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-black w-14 lg:w-16 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 月次推移グラフ */}
      {data.monthlyTrend.length > 0 && (
        <Card className="mb-4 lg:mb-6 border-2" style={{ borderColor: '#1ed7cd' }}>
          <CardHeader className="p-3 lg:p-6">
            <CardTitle className="text-base lg:text-xl text-black flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: '#1ed7cd' }} />
              月次推移
            </CardTitle>
            <CardDescription className="text-xs lg:text-sm text-black">期間内の月別平均スコア推移</CardDescription>
          </CardHeader>
          <CardContent className="p-3 lg:p-6">
            <div className="space-y-3">
              {data.monthlyTrend.map((month: any) => {
                const maxScore = 100
                return (
                  <div key={`${month.year}-${month.month}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs lg:text-sm font-medium text-black">
                        {month.year}年{month.month}月
                      </span>
                      <div className="flex items-center gap-2 lg:gap-3">
                        <Badge variant="outline" className="bg-[#05a7be] text-white border-0 text-xs">
                          成果: {month.avgPerformance.toFixed(1)}
                        </Badge>
                        <Badge variant="outline" className="bg-[#18c4b8] text-white border-0 text-xs">
                          行動: {month.avgBehavior.toFixed(1)}
                        </Badge>
                        <Badge variant="outline" className="bg-[#1ed7cd] text-black border-0 text-xs">
                          成長: {month.avgGrowth.toFixed(1)}
                        </Badge>
                        <span className="text-sm lg:text-base font-bold text-black w-12 lg:w-16 text-right">
                          {month.avgTotal.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-6 lg:h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                      <div
                        className="flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          width: `${(month.avgPerformance / 48) * 48}%`,
                          backgroundColor: '#05a7be',
                        }}
                        title={`成果: ${month.avgPerformance.toFixed(1)}点`}
                      />
                      <div
                        className="flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          width: `${(month.avgBehavior / 30) * 30}%`,
                          backgroundColor: '#18c4b8',
                        }}
                        title={`行動: ${month.avgBehavior.toFixed(1)}点`}
                      />
                      <div
                        className="flex items-center justify-center text-xs font-bold text-black"
                        style={{
                          width: `${(month.avgGrowth / 22) * 22}%`,
                          backgroundColor: '#1ed7cd',
                        }}
                        title={`成長: ${month.avgGrowth.toFixed(1)}点`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{month.count}件の評価</span>
                      <span>達成率: {((month.avgTotal / maxScore) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-4 lg:mb-6">
        {/* ランク分布 */}
        <Card className="border-2" style={{ borderColor: '#087ea2' }}>
          <CardHeader className="p-3 lg:p-6">
            <CardTitle className="text-base lg:text-xl text-black flex items-center gap-2">
              <Award className="h-5 w-5" style={{ color: '#087ea2' }} />
              ランク分布
            </CardTitle>
            <CardDescription className="text-xs lg:text-sm text-black">各ランクの人数分布</CardDescription>
          </CardHeader>
          <CardContent className="p-3 lg:p-6">
            <div className="space-y-2 lg:space-y-3">
              {rankOrder.map((rank) => {
                const count = data.rankDistribution[rank] || 0
                const percentage =
                  data.totalEvaluations > 0 ? (count / data.totalEvaluations) * 100 : 0

                return (
                  <div key={rank} className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 min-w-[80px]">
                      <Badge className={`${getRankColor(rank)} text-xs`}>{rank}</Badge>
                      <span className="text-xs lg:text-sm font-medium text-black">{count}名</span>
                    </div>
                    <div className="flex items-center space-x-1.5 lg:space-x-2 flex-1">
                      <div className="w-20 lg:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${percentage}%`,
                            background: 'linear-gradient(to right, #05a7be, #1ed7cd)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] lg:text-xs text-gray-500 w-10 lg:w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 部門別統計 - 拡張版 */}
        <Card className="border-2" style={{ borderColor: '#017598' }}>
          <CardHeader className="p-3 lg:p-6">
            <CardTitle className="text-base lg:text-xl text-black flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: '#017598' }} />
              部門別統計
            </CardTitle>
            <CardDescription className="text-xs lg:text-sm text-black">部門ごとの詳細分析</CardDescription>
          </CardHeader>
          <CardContent className="p-3 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              {(data.departmentStats as any[]).map((dept: any) => {
                const avgTotal = dept.count > 0 ? dept.totalScore / dept.count : 0
                const avgPerformance = dept.count > 0 ? dept.performanceScore / dept.count : 0
                const avgBehavior = dept.count > 0 ? dept.behaviorScore / dept.count : 0
                const avgGrowth = dept.count > 0 ? dept.growthScore / dept.count : 0

                return (
                  <div key={dept.department} className="p-3 rounded-lg border" style={{ backgroundColor: 'rgba(5, 167, 190, 0.03)', borderColor: '#e0f2f1' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm lg:text-base text-black">{dept.department}</p>
                        <p className="text-[10px] lg:text-xs text-gray-500">{dept.count}名</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl lg:text-2xl font-bold text-black">{avgTotal.toFixed(1)}</p>
                        <p className="text-[10px] lg:text-xs text-gray-500">平均点</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-1.5 lg:p-2 rounded" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                        <p className="text-[10px] lg:text-xs text-gray-600">成果</p>
                        <p className="text-xs lg:text-sm font-bold text-black">{avgPerformance.toFixed(1)}</p>
                      </div>
                      <div className="text-center p-1.5 lg:p-2 rounded" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                        <p className="text-[10px] lg:text-xs text-gray-600">行動</p>
                        <p className="text-xs lg:text-sm font-bold text-black">{avgBehavior.toFixed(1)}</p>
                      </div>
                      <div className="text-center p-1.5 lg:p-2 rounded" style={{ backgroundColor: 'rgba(30, 215, 205, 0.1)' }}>
                        <p className="text-[10px] lg:text-xs text-gray-600">成長</p>
                        <p className="text-xs lg:text-sm font-bold text-black">{avgGrowth.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* トップパフォーマー */}
      <Card className="border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader className="p-3 lg:p-6">
          <CardTitle className="text-base lg:text-xl text-black flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: '#05a7be' }} />
            トップパフォーマー
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm text-black">スコア上位10名</CardDescription>
        </CardHeader>
        <CardContent className="p-3 lg:p-6">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>順位</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>部署</TableHead>
                  <TableHead>役職</TableHead>
                  <TableHead>スコア</TableHead>
                  <TableHead>ランク</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.topPerformers as any[]).map((evaluation: any, index: number) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{evaluation.staff.full_name}</TableCell>
                    <TableCell>{evaluation.staff.department}</TableCell>
                    <TableCell>{evaluation.staff.position}</TableCell>
                    <TableCell className="font-bold">
                      {evaluation.total_score?.toFixed(1)}点
                    </TableCell>
                    <TableCell>
                      <Badge className={getRankColor(evaluation.rank)}>
                        {evaluation.rank}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-2">
            {(data.topPerformers as any[]).map((evaluation: any, index: number) => (
              <div key={evaluation.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                    <span className="font-medium text-sm">{evaluation.staff.full_name}</span>
                  </div>
                  <Badge className={`${getRankColor(evaluation.rank)} text-xs`}>
                    {evaluation.rank}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{evaluation.staff.department} - {evaluation.staff.position}</span>
                  <span className="font-bold text-base text-black">
                    {evaluation.total_score?.toFixed(1)}点
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
