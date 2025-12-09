import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCategoryName, type CategoryMaster } from '@/lib/utils/category-mapper'

async function getQuarterlyReportDetail(staffId: string, year: number, quarter: number) {
  const supabase = await createSupabaseServerClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // 現在のユーザーのcompany_idを取得
  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!currentUser) return null

  // スタッフ情報を取得（同じ企業のみ）
  const { data: staff } = await supabase
    .from('users')
    .select('*')
    .eq('id', staffId)
    .eq('company_id', currentUser.company_id)
    .single()

  if (!staff) return null

  // 四半期レポートを取得
  const { data: report } = await supabase
    .from('quarterly_reports')
    .select('*')
    .eq('staff_id', staffId)
    .eq('year', year)
    .eq('quarter', quarter)
    .single()

  // 四半期に含まれる月を計算
  const quarterMonths = [
    (quarter - 1) * 3 + 1,
    (quarter - 1) * 3 + 2,
    (quarter - 1) * 3 + 3,
  ]

  // 月次評価を取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      staff:users!evaluations_staff_id_fkey(id, full_name),
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name),
        items:evaluation_items(*)
      )
    `)
    .eq('staff_id', staffId)
    .eq('evaluation_year', year)
    .in('evaluation_month', quarterMonths)
    .eq('status', 'completed')
    .order('evaluation_month', { ascending: true })

  // カテゴリマスターを取得
  const { data: categoryMasters } = await supabase
    .from('evaluation_categories')
    .select('id, category_key, category_label, display_order, description')
    .eq('company_id', currentUser.company_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return {
    staff,
    report,
    evaluations: evaluations || [],
    categoryMasters: (categoryMasters || []) as CategoryMaster[],
    year,
    quarter,
    quarterMonths,
  }
}

export default async function QuarterlyReportDetailPage({
  params,
  searchParams
}: {
  params: { staffId: string }
  searchParams: { year?: string; quarter?: string }
}) {
  const now = new Date()
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear()
  const quarter = searchParams.quarter ? parseInt(searchParams.quarter) : Math.floor(now.getMonth() / 3) + 1

  const data = await getQuarterlyReportDetail(params.staffId, year, quarter)

  if (!data) {
    notFound()
  }

  const { staff, report, evaluations, categoryMasters, quarterMonths } = data

  // カテゴリ別の平均を計算
  const categoryAverages = evaluations.reduce((acc, evaluation) => {
    if (evaluation.performance_score !== null) {
      acc.performance.total += evaluation.performance_score
      acc.performance.count++
    }
    if (evaluation.behavior_score !== null) {
      acc.behavior.total += evaluation.behavior_score
      acc.behavior.count++
    }
    if (evaluation.growth_score !== null) {
      acc.growth.total += evaluation.growth_score
      acc.growth.count++
    }
    return acc
  }, {
    performance: { total: 0, count: 0 },
    behavior: { total: 0, count: 0 },
    growth: { total: 0, count: 0 },
  })

  const performanceAvg = categoryAverages.performance.count > 0
    ? categoryAverages.performance.total / categoryAverages.performance.count
    : 0
  const behaviorAvg = categoryAverages.behavior.count > 0
    ? categoryAverages.behavior.total / categoryAverages.behavior.count
    : 0
  const growthAvg = categoryAverages.growth.count > 0
    ? categoryAverages.growth.total / categoryAverages.growth.count
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href={`/admin/quarterly-reports?year=${year}&quarter=${quarter}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            四半期レポート一覧に戻る
          </Button>
        </Link>
      </div>

      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{staff.full_name}さんの四半期レポート</h1>
        <p className="mt-2 text-sm text-gray-600">
          {year}年 第{quarter}四半期 ({quarterMonths[0]}月 - {quarterMonths[2]}月)
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {staff.department}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {staff.position}
          </Badge>
        </div>
      </div>

      {/* 四半期サマリー */}
      {report && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              四半期サマリー
            </CardTitle>
            <CardDescription>3ヶ月の評価平均</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">総合平均</p>
                <p className="text-3xl font-bold text-blue-900">{report.average_score?.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">点</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{getCategoryName('performance', categoryMasters)}平均</p>
                <p className="text-3xl font-bold text-green-900">{performanceAvg.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">点</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{getCategoryName('behavior', categoryMasters)}平均</p>
                <p className="text-3xl font-bold text-purple-900">{behaviorAvg.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">点</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{getCategoryName('growth', categoryMasters)}平均</p>
                <p className="text-3xl font-bold text-orange-900">{growthAvg.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">点</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              評価回数: {report.evaluation_count}回
            </div>
          </CardContent>
        </Card>
      )}

      {/* 月次評価一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            月次評価詳細
          </CardTitle>
          <CardDescription>各月の評価内容</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quarterMonths.map(month => {
              const evaluation = evaluations.find(e => e.evaluation_month === month)

              if (!evaluation) {
                return (
                  <div key={month} className="p-4 border border-dashed rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-400">{year}年{month}月</p>
                        <p className="text-sm text-gray-400 mt-1">評価未完了</p>
                      </div>
                      <Link href={`/admin/evaluations/${params.staffId}?year=${year}&month=${month}`}>
                        <Button size="sm" variant="outline">
                          評価を入力
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              }

              return (
                <div key={month} className="p-4 border rounded-lg hover:bg-green-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{year}年{month}月</p>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1">
                        評価完了
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{evaluation.total_score?.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">総合得点</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {categoryMasters.map((category) => {
                      const scoreKey = `${category.category_key}_score` as keyof typeof evaluation
                      const score = evaluation[scoreKey] as number | null | undefined

                      const colorMap: Record<string, { bg: string; text: string }> = {
                        performance: { bg: 'bg-green-50', text: 'text-green-900' },
                        behavior: { bg: 'bg-purple-50', text: 'text-purple-900' },
                        growth: { bg: 'bg-orange-50', text: 'text-orange-900' },
                      }
                      const colors = colorMap[category.category_key] || { bg: 'bg-blue-50', text: 'text-blue-900' }

                      return (
                        <div key={category.category_key} className={`text-center p-2 ${colors.bg} rounded`}>
                          <p className="text-xs text-gray-600">{category.category_label}</p>
                          <p className={`text-lg font-semibold ${colors.text}`}>
                            {score?.toFixed(2) || '-'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link href={`/admin/evaluations/${params.staffId}?year=${year}&month=${month}`}>
                      <Button size="sm" variant="outline">
                        詳細を見る
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
