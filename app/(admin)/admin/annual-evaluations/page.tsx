import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Award, TrendingUp } from 'lucide-react'
import { EvaluationRank } from '@/types'

async function getAnnualEvaluations(year: number) {
  const supabase = await createSupabaseServerClient()

  // 全スタッフの情報を取得
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, department, position, email')
    .eq('role', 'staff')
    .order('full_name')

  // 指定された年の年次評価を取得
  const { data: annualEvaluations } = await supabase
    .from('annual_evaluations')
    .select(`
      *,
      staff:users!annual_evaluations_staff_id_fkey(id, full_name, department, position, email)
    `)
    .eq('year', year)

  // その年の全評価を取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      staff:users!evaluations_staff_id_fkey(id, full_name)
    `)
    .eq('evaluation_year', year)
    .eq('status', 'completed')

  // スタッフごとに年次評価をマッピング
  const staffEvaluations = (allStaff || []).map(staff => {
    const annualEval = annualEvaluations?.find(e => e.staff_id === staff.id)
    const staffEvals = evaluations?.filter(e => e.staff_id === staff.id) || []

    return {
      staff,
      annualEvaluation: annualEval,
      monthlyCount: staffEvals.length,
      hasAllMonths: staffEvals.length === 12,
    }
  })

  // ランク別の集計
  const rankDistribution = annualEvaluations?.reduce((acc, evaluation) => {
    if (evaluation.rank) {
      acc[evaluation.rank] = (acc[evaluation.rank] || 0) + 1
    }
    return acc
  }, {} as Record<EvaluationRank, number>) || {}

  return {
    year,
    staffEvaluations,
    totalStaff: allStaff?.length || 0,
    completedEvaluations: annualEvaluations?.length || 0,
    rankDistribution,
  }
}

export default async function AnnualEvaluationsPage({
  searchParams
}: {
  searchParams: { year?: string }
}) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const year = searchParams.year ? parseInt(searchParams.year) : currentYear

  const data = await getAnnualEvaluations(year)

  const progressPercentage = data.totalStaff > 0
    ? Math.round((data.completedEvaluations / data.totalStaff) * 100)
    : 0

  // ランクの色を定義
  const rankColors: Record<EvaluationRank, string> = {
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">年次評価</h1>
        <p className="mt-2 text-sm text-gray-600">
          12ヶ月の評価平均とランクを確認します
        </p>
      </div>

      {/* 年選択 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Link href={`/admin/annual-evaluations?year=${year - 1}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                前年
              </Button>
            </Link>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {year}年度
              </div>
              <div className="mt-2 text-sm text-gray-600">
                年次評価完了: {data.completedEvaluations} / {data.totalStaff} ({progressPercentage}%)
              </div>
            </div>

            <Link href={`/admin/annual-evaluations?year=${year + 1}`}>
              <Button variant="outline" size="sm">
                次年
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ランク分布 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            ランク分布
          </CardTitle>
          <CardDescription>{year}年度の評価ランク分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {(['SS', 'S', 'A+', 'A', 'A-', 'B', 'C', 'D'] as EvaluationRank[]).map(rank => (
              <div key={rank} className="text-center p-3 border rounded-lg">
                <Badge variant="outline" className={`mb-2 ${rankColors[rank]}`}>
                  {rank}
                </Badge>
                <p className="text-2xl font-bold text-gray-900">
                  {data.rankDistribution[rank] || 0}
                </p>
                <p className="text-xs text-gray-500">人</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* スタッフ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフ年次評価一覧</CardTitle>
          <CardDescription>
            {year}年度の評価状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.staffEvaluations.map(({ staff, annualEvaluation, monthlyCount, hasAllMonths }) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{staff.full_name}</p>
                    {annualEvaluation ? (
                      <>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          年次評価完了
                        </Badge>
                        <Badge variant="outline" className={rankColors[annualEvaluation.rank as EvaluationRank] || 'bg-gray-50 text-gray-700 border-gray-200'}>
                          <Award className="h-3 w-3 mr-1" />
                          ランク: {annualEvaluation.rank}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          平均: {annualEvaluation.average_score?.toFixed(2)}点
                        </Badge>
                      </>
                    ) : hasAllMonths ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        評価完了・ランク未確定
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        評価不足 ({monthlyCount}/12ヶ月)
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {staff.department} - {staff.position}
                  </p>
                  {annualEvaluation && (
                    <p className="text-xs text-gray-400 mt-1">
                      評価回数: {annualEvaluation.evaluation_count}回
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {annualEvaluation && (
                    <Link href={`/admin/annual-evaluations/${staff.id}?year=${year}`}>
                      <Button size="sm" variant="outline">
                        詳細を見る
                      </Button>
                    </Link>
                  )}
                  <Link href={`/admin/monthly-evaluations?year=${year}&month=1`}>
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
