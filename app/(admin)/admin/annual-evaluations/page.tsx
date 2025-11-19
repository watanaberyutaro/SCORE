import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Award, TrendingUp, Eye } from 'lucide-react'
import { EvaluationRank, EvaluationCycle } from '@/types'
import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { CycleSelector } from '@/components/annual-evaluations/CycleSelector'

async function getAnnualEvaluationsByCycle(cycleId: string, companyId: string) {
  const supabase = await createSupabaseServerClient()

  // 選択されたサイクル情報を取得
  const { data: cycle } = await supabase
    .from('evaluation_cycles')
    .select('*')
    .eq('id', cycleId)
    .eq('company_id', companyId)
    .single()

  if (!cycle) {
    return null
  }

  // 全スタッフの情報を取得
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, department, position, email')
    .eq('role', 'staff')
    .eq('company_id', companyId)
    .order('full_name')

  // サイクル期間内の評価を取得（開始日から終了日までの12ヶ月）
  const startDate = new Date(cycle.start_date)
  const endDate = new Date(cycle.end_date)

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('*')
    .eq('status', 'completed')
    .gte('evaluation_year', startDate.getFullYear())
    .lte('evaluation_year', endDate.getFullYear())

  // スタッフごとに評価をグループ化
  const staffEvaluations = (allStaff || []).map(staff => {
    const staffEvals = evaluations?.filter(e => {
      if (e.staff_id !== staff.id) return false

      // 評価の年月がサイクル期間内かチェック
      const evalDate = new Date(e.evaluation_year, e.evaluation_month - 1)
      return evalDate >= startDate && evalDate <= endDate
    }) || []

    // 平均スコアを計算
    const validScores = staffEvals
      .filter(e => e.total_score !== null)
      .map(e => e.total_score!)

    const averageScore = validScores.length > 0
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : null

    // ランクを決定（最新の評価のランクを使用、または平均から計算）
    const latestRank = staffEvals.length > 0 ? staffEvals[staffEvals.length - 1].rank : null

    return {
      staff,
      monthlyCount: staffEvals.length,
      hasAllMonths: staffEvals.length === 12,
      averageScore,
      rank: latestRank,
      evaluations: staffEvals
    }
  })

  // ランク別の集計
  const rankDistribution = staffEvaluations.reduce((acc, se) => {
    if (se.rank) {
      acc[se.rank as EvaluationRank] = (acc[se.rank as EvaluationRank] || 0) + 1
    }
    return acc
  }, {} as Record<EvaluationRank, number>)

  return {
    cycle,
    staffEvaluations,
    totalStaff: allStaff?.length || 0,
    completedEvaluations: staffEvaluations.filter(se => se.hasAllMonths).length,
    rankDistribution,
  }
}

async function getAllCycles(companyId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: cycles } = await supabase
    .from('evaluation_cycles')
    .select('*')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false })

  return cycles || []
}

export default async function AnnualEvaluationsPage({
  searchParams
}: {
  searchParams: { cycle_id?: string }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const cycles = await getAllCycles(user.company_id)

  // デフォルトでアクティブなサイクル、またはなければ最新のサイクルを選択
  const defaultCycle = cycles.find(c => c.status === 'active') || cycles[0]
  const selectedCycleId = searchParams.cycle_id || defaultCycle?.id

  if (!selectedCycleId || cycles.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">年次評価</h1>
          <p className="mt-2 text-sm text-gray-600">
            期ごとの評価を管理します
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">評価サイクルが設定されていません</p>
            <Link href="/admin/settings">
              <Button className="mt-4">設定ページへ</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = await getAnnualEvaluationsByCycle(selectedCycleId, user.company_id)

  if (!data) {
    redirect('/admin/annual-evaluations')
  }

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
          期ごとの12ヶ月評価を管理します
        </p>
      </div>

      {/* サイクル選択 */}
      <CycleSelector
        cycles={cycles}
        selectedCycle={data.cycle}
        completedEvaluations={data.completedEvaluations}
        totalStaff={data.totalStaff}
      />

      {/* ランク分布 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            ランク分布
          </CardTitle>
          <CardDescription>{data.cycle.cycle_name}の評価ランク分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {(['SS', 'S', 'A+', 'A', 'A-', 'B', 'C', 'D'] as EvaluationRank[]).map(rank => (
              <div key={rank} className="text-center p-3 border border-gray-200 rounded-lg">
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
            {data.cycle.cycle_name}の評価状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* PC: テーブル表示 */}
          <div className="hidden lg:block space-y-3">
            {data.staffEvaluations.map(({ staff, monthlyCount, hasAllMonths, averageScore, rank }) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{staff.full_name}</p>
                    {hasAllMonths ? (
                      <>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          年次評価完了
                        </Badge>
                        {rank && (
                          <Badge variant="outline" className={rankColors[rank as EvaluationRank] || 'bg-gray-50 text-gray-700 border-gray-200'}>
                            <Award className="h-3 w-3 mr-1" />
                            ランク: {rank}
                          </Badge>
                        )}
                        {averageScore !== null && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            平均: {averageScore.toFixed(2)}点
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        評価不足 ({monthlyCount}/12ヶ月)
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {staff.department} - {staff.position}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/annual-evaluations/${staff.id}?cycle_id=${selectedCycleId}`}>
                    <Button size="sm" variant="outline" className="border-2" style={{ borderColor: '#6366f1', color: '#6366f1' }}>
                      <Eye className="h-4 w-4 mr-1" />
                      詳細を見る
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* スマホ: カード表示 */}
          <div className="lg:hidden space-y-3">
            {data.staffEvaluations.map(({ staff, monthlyCount, hasAllMonths, averageScore, rank }) => (
              <div
                key={staff.id}
                className="border border-gray-200 rounded-lg p-3 space-y-3"
              >
                {/* ヘッダー: 名前とランク */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div>
                    <div className="font-bold text-base text-black">{staff.full_name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {staff.department} · {staff.position}
                    </div>
                  </div>
                  {rank && (
                    <Badge variant="outline" className={rankColors[rank as EvaluationRank]}>
                      {rank}
                    </Badge>
                  )}
                </div>

                {/* 評価状況 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    {hasAllMonths ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-fit">
                        年次評価完了
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 w-fit">
                        評価不足 ({monthlyCount}/12ヶ月)
                      </Badge>
                    )}
                  </div>
                  {averageScore !== null && (
                    <div className="text-right">
                      <div className="text-xs text-gray-600">平均スコア</div>
                      <div className="text-lg font-bold text-black">
                        {averageScore.toFixed(2)}点
                      </div>
                    </div>
                  )}
                </div>

                {/* アクション */}
                <Link
                  href={`/admin/annual-evaluations/${staff.id}?cycle_id=${selectedCycleId}`}
                  className="block"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-2"
                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    詳細を見る
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
