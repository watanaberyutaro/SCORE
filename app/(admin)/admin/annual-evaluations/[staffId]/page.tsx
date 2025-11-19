import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Award, TrendingUp, Calendar, BarChart3 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { EvaluationRank } from '@/types'

async function getAnnualEvaluationDetail(staffId: string, year: number) {
  const supabase = await createSupabaseServerClient()

  // スタッフ情報を取得
  const { data: staff } = await supabase
    .from('users')
    .select('*')
    .eq('id', staffId)
    .single()

  if (!staff) return null

  // 年次評価を取得
  const { data: annualEvaluation } = await supabase
    .from('annual_evaluations')
    .select('*')
    .eq('staff_id', staffId)
    .eq('year', year)
    .single()

  // 四半期レポートを取得
  const { data: quarterlyReports } = await supabase
    .from('quarterly_reports')
    .select('*')
    .eq('staff_id', staffId)
    .eq('year', year)
    .order('quarter', { ascending: true })

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
    .eq('status', 'completed')
    .order('evaluation_month', { ascending: true })

  return {
    staff,
    annualEvaluation,
    quarterlyReports: quarterlyReports || [],
    evaluations: evaluations || [],
    year,
  }
}

export default async function AnnualEvaluationDetailPage({
  params,
  searchParams
}: {
  params: { staffId: string }
  searchParams: { year?: string }
}) {
  const now = new Date()
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear()

  const data = await getAnnualEvaluationDetail(params.staffId, year)

  if (!data) {
    notFound()
  }

  const { staff, annualEvaluation, quarterlyReports, evaluations } = data

  // ランクの色を定義
  const rankColors: Record<EvaluationRank, string> = {
    'SS': 'bg-purple-100 text-purple-900 border-purple-300',
    'S': 'bg-blue-100 text-blue-900 border-blue-300',
    'A+': 'bg-cyan-100 text-cyan-900 border-cyan-300',
    'A': 'bg-green-100 text-green-900 border-green-300',
    'A-': 'bg-lime-100 text-lime-900 border-lime-300',
    'B': 'bg-yellow-100 text-yellow-900 border-yellow-300',
    'C': 'bg-orange-100 text-orange-900 border-orange-300',
    'D': 'bg-red-100 text-red-900 border-red-300',
  }

  // ランクの報酬額を定義
  const rankRewards: Record<EvaluationRank, number> = {
    'SS': 150000,
    'S': 100000,
    'A+': 75000,
    'A': 50000,
    'A-': 30000,
    'B': 0,
    'C': -30000,
    'D': -50000,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href={`/admin/annual-evaluations?year=${year}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            年次評価一覧に戻る
          </Button>
        </Link>
      </div>

      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{staff.full_name}さんの年次評価</h1>
        <p className="mt-2 text-sm text-gray-600">
          {year}年度 (1月 - 12月)
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

      {/* 年次サマリー */}
      {annualEvaluation && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              年次サマリー
            </CardTitle>
            <CardDescription>12ヶ月の総合評価</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">最終ランク</p>
                <Badge
                  variant="outline"
                  className={`text-2xl px-4 py-2 ${rankColors[annualEvaluation.rank as EvaluationRank] || 'bg-gray-100 text-gray-900 border-gray-300'}`}
                >
                  {annualEvaluation.rank}
                </Badge>
                <p className="text-sm text-gray-600 mt-3">報酬額</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {rankRewards[annualEvaluation.rank as EvaluationRank]?.toLocaleString() || '0'}円
                </p>
              </div>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">年間平均スコア</p>
                <p className="text-4xl font-bold text-blue-900">
                  {annualEvaluation.average_score?.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">点 (12ヶ月平均)</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">評価回数</p>
                <p className="text-4xl font-bold text-green-900">
                  {annualEvaluation.evaluation_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">回 (完了した月数)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 四半期別推移 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            四半期別推移
          </CardTitle>
          <CardDescription>3ヶ月ごとの評価推移</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(quarter => {
              const report = quarterlyReports.find(r => r.quarter === quarter)
              const quarterMonths = [
                (quarter - 1) * 3 + 1,
                (quarter - 1) * 3 + 2,
                (quarter - 1) * 3 + 3,
              ]

              return (
                <div key={quarter} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">第{quarter}四半期</p>
                    {report && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        完了
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {quarterMonths[0]}月 - {quarterMonths[2]}月
                  </p>
                  {report ? (
                    <>
                      <p className="text-2xl font-bold text-gray-900">
                        {report.average_score?.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        平均スコア ({report.evaluation_count}ヶ月)
                      </p>
                      <Link href={`/admin/quarterly-reports/${params.staffId}?year=${year}&quarter=${quarter}`}>
                        <Button size="sm" variant="outline" className="w-full mt-3">
                          詳細を見る
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">未完了</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
              const evaluation = evaluations.find(e => e.evaluation_month === month)

              if (!evaluation) {
                return (
                  <div key={month} className="p-4 border border-dashed rounded-lg bg-gray-50">
                    <div className="text-center">
                      <p className="font-medium text-gray-400">{month}月</p>
                      <p className="text-sm text-gray-400 mt-2">評価未完了</p>
                      <Link href={`/admin/evaluations/${params.staffId}?year=${year}&month=${month}`}>
                        <Button size="sm" variant="outline" className="mt-3">
                          評価を入力
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              }

              return (
                <div key={month} className="p-4 border rounded-lg hover:bg-green-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{month}月</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      完了
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {evaluation.total_score?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">総合得点</p>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center p-1 bg-green-50 rounded">
                      <p className="text-gray-600">成果</p>
                      <p className="font-semibold">{evaluation.performance_score?.toFixed(1)}</p>
                    </div>
                    <div className="text-center p-1 bg-purple-50 rounded">
                      <p className="text-gray-600">行動</p>
                      <p className="font-semibold">{evaluation.behavior_score?.toFixed(1)}</p>
                    </div>
                    <div className="text-center p-1 bg-orange-50 rounded">
                      <p className="text-gray-600">成長</p>
                      <p className="font-semibold">{evaluation.growth_score?.toFixed(1)}</p>
                    </div>
                  </div>
                  <Link href={`/admin/evaluations/${params.staffId}?year=${year}&month=${month}`}>
                    <Button size="sm" variant="outline" className="w-full mt-3">
                      詳細を見る
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
