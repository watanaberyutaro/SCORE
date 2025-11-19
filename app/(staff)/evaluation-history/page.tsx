import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getRankColor, determineRank } from '@/lib/utils/evaluation-calculator'
import { formatDate } from '@/lib/utils/format'
import { TrendingUp, TrendingDown, BarChart3, Calendar, Award, Minus } from 'lucide-react'
import { redirect } from 'next/navigation'

async function getEvaluationHistory(userId: string) {
  const supabase = await createSupabaseServerClient()

  // 全評価履歴を取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name),
        items:evaluation_items(*)
      )
    `)
    .eq('staff_id', userId)
    .order('evaluation_year', { ascending: false })
    .order('evaluation_month', { ascending: false })

  // 現在の期を計算（7月始まり）
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const fiscalYearStart = currentMonth >= 7 ? currentYear : currentYear - 1
  const fiscalYearEnd = fiscalYearStart + 1

  // 現在の期の評価を取得
  const { data: currentFiscalYearEvaluations } = await supabase
    .from('evaluations')
    .select('*')
    .eq('staff_id', userId)
    .or(
      `and(evaluation_year.eq.${fiscalYearStart},evaluation_month.gte.7),` +
      `and(evaluation_year.eq.${fiscalYearEnd},evaluation_month.lte.6)`
    )

  // 期別の統計計算
  const fiscalYearScores = (currentFiscalYearEvaluations || [])
    .filter(e => e.total_score !== null)
    .map(e => e.total_score!)

  const fiscalYearAverage = fiscalYearScores.length > 0
    ? fiscalYearScores.reduce((sum, score) => sum + score, 0) / fiscalYearScores.length
    : null

  // カテゴリ別平均
  const avgPerformance = (currentFiscalYearEvaluations || [])
    .filter(e => e.performance_score !== null)
    .reduce((sum, e, _, arr) => sum + (e.performance_score || 0) / arr.length, 0)

  const avgBehavior = (currentFiscalYearEvaluations || [])
    .filter(e => e.behavior_score !== null)
    .reduce((sum, e, _, arr) => sum + (e.behavior_score || 0) / arr.length, 0)

  const avgGrowth = (currentFiscalYearEvaluations || [])
    .filter(e => e.growth_score !== null)
    .reduce((sum, e, _, arr) => sum + (e.growth_score || 0) / arr.length, 0)

  // 過去12ヶ月のデータ（グラフ用）
  const recentEvaluations = (evaluations || []).slice(0, 12).reverse()

  return {
    evaluations: evaluations || [],
    recentEvaluations,
    fiscalYearStart,
    fiscalYearEnd,
    fiscalYearAverage,
    fiscalYearEvaluationCount: fiscalYearScores.length,
    avgPerformance,
    avgBehavior,
    avgGrowth,
  }
}

export default async function EvaluationHistoryPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const data = await getEvaluationHistory(user.id)

  // 最高スコアと最低スコアを計算
  const allScores = data.evaluations.filter(e => e.total_score !== null).map(e => e.total_score!)
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : null
  const minScore = allScores.length > 0 ? Math.min(...allScores) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">評価推移</h1>
        <p className="mt-2 text-sm text-black">
          あなたの評価履歴と推移を確認できます
        </p>
      </div>

      {/* 期の統計サマリー */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">期の平均スコア</CardTitle>
            <Award className="h-5 w-5" style={{ color: '#05a7be' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">
              {data.fiscalYearAverage !== null ? data.fiscalYearAverage.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-black mt-1">
              第{data.fiscalYearStart - 2016}期（{data.fiscalYearStart}/7〜{data.fiscalYearEnd}/6）
            </p>
            <p className="text-xs text-black">評価月数: {data.fiscalYearEvaluationCount}ヶ月</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#18c4b8' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">最高スコア</CardTitle>
            <TrendingUp className="h-5 w-5" style={{ color: '#18c4b8' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">
              {maxScore !== null ? maxScore.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-black mt-1">過去の最高評価</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#1ed7cd' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">最低スコア</CardTitle>
            <TrendingDown className="h-5 w-5" style={{ color: '#1ed7cd' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">
              {minScore !== null ? minScore.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-black mt-1">過去の最低評価</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#087ea2' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">評価回数</CardTitle>
            <Calendar className="h-5 w-5" style={{ color: '#087ea2' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">
              {data.evaluations.length}
            </div>
            <p className="text-xs text-black mt-1">累計評価回数</p>
          </CardContent>
        </Card>
      </div>

      {/* 評価推移グラフ */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <BarChart3 className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
            評価スコア推移（直近12ヶ月）
          </CardTitle>
          <CardDescription className="text-black">月次評価の推移を確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentEvaluations.length > 0 ? (
              <>
                {/* 簡易グラフ表示 */}
                <div className="space-y-3">
                  {data.recentEvaluations.map((evaluation, index) => {
                    const prevEvaluation = index > 0 ? data.recentEvaluations[index - 1] : null
                    const change = prevEvaluation && evaluation.total_score && prevEvaluation.total_score
                      ? evaluation.total_score - prevEvaluation.total_score
                      : null

                    return (
                      <div key={evaluation.id} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-black font-medium">
                          {evaluation.evaluation_year}/{evaluation.evaluation_month}月
                        </div>
                        <div className="flex-1">
                          <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="absolute h-full rounded-lg transition-all duration-500"
                              style={{
                                width: `${evaluation.total_score || 0}%`,
                                background: `linear-gradient(90deg, #05a7be, #18c4b8)`,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                              <span className="text-sm font-bold text-black z-10">
                                {evaluation.total_score?.toFixed(1) || '-'}
                              </span>
                              {evaluation.rank && (
                                <Badge className={`${getRankColor(evaluation.rank)} z-10`}>
                                  {evaluation.rank}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-20 text-right">
                          {change !== null && (
                            <div className="flex items-center justify-end gap-1">
                              {change > 0 ? (
                                <>
                                  <TrendingUp className="h-4 w-4" style={{ color: '#18c4b8' }} />
                                  <span className="text-sm font-medium" style={{ color: '#18c4b8' }}>
                                    +{change.toFixed(1)}
                                  </span>
                                </>
                              ) : change < 0 ? (
                                <>
                                  <TrendingDown className="h-4 w-4" style={{ color: '#087ea2' }} />
                                  <span className="text-sm font-medium" style={{ color: '#087ea2' }}>
                                    {change.toFixed(1)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Minus className="h-4 w-4 text-black" />
                                  <span className="text-sm text-black">±0</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-black text-center py-8">評価データがありません</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* カテゴリ別スコア（期の平均） */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-black">カテゴリ別スコア（期の平均）</CardTitle>
          <CardDescription className="text-black">
            第{data.fiscalYearStart - 2016}期の各カテゴリ平均スコア
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black">成果評価</span>
                <span className="text-sm font-bold text-black">{data.avgPerformance.toFixed(1)}/48</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(data.avgPerformance / 48) * 100}%`,
                    backgroundColor: '#05a7be',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black">行動評価</span>
                <span className="text-sm font-bold text-black">{data.avgBehavior.toFixed(1)}/30</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(data.avgBehavior / 30) * 100}%`,
                    backgroundColor: '#18c4b8',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black">成長評価</span>
                <span className="text-sm font-bold text-black">{data.avgGrowth.toFixed(1)}/22</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(data.avgGrowth / 22) * 100}%`,
                    backgroundColor: '#1ed7cd',
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 評価履歴テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">評価履歴</CardTitle>
          <CardDescription className="text-black">すべての評価履歴を確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          {/* PC: テーブル表示 */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black">評価月</TableHead>
                  <TableHead className="text-black">総合スコア</TableHead>
                  <TableHead className="text-black">ランク</TableHead>
                  <TableHead className="text-black">成果評価</TableHead>
                  <TableHead className="text-black">行動評価</TableHead>
                  <TableHead className="text-black">成長評価</TableHead>
                  <TableHead className="text-black">前月比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.evaluations.length > 0 ? (
                  data.evaluations.map((evaluation, index) => {
                    const prevEvaluation = index < data.evaluations.length - 1 ? data.evaluations[index + 1] : null
                    const change = prevEvaluation && evaluation.total_score && prevEvaluation.total_score
                      ? evaluation.total_score - prevEvaluation.total_score
                      : null

                    return (
                      <TableRow key={evaluation.id}>
                        <TableCell className="font-medium text-black">
                          {evaluation.evaluation_year}年{evaluation.evaluation_month}月
                        </TableCell>
                        <TableCell className="text-black font-bold">
                          {evaluation.total_score?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell>
                          {evaluation.rank ? (
                            <Badge className={getRankColor(evaluation.rank)}>
                              {evaluation.rank}
                            </Badge>
                          ) : (
                            <span className="text-black text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-black">
                          {evaluation.performance_score?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="text-black">
                          {evaluation.behavior_score?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="text-black">
                          {evaluation.growth_score?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell>
                          {change !== null ? (
                            <div className="flex items-center gap-1">
                              {change > 0 ? (
                                <>
                                  <TrendingUp className="h-4 w-4" style={{ color: '#18c4b8' }} />
                                  <span className="text-sm font-medium" style={{ color: '#18c4b8' }}>
                                    +{change.toFixed(1)}
                                  </span>
                                </>
                              ) : change < 0 ? (
                                <>
                                  <TrendingDown className="h-4 w-4" style={{ color: '#087ea2' }} />
                                  <span className="text-sm font-medium" style={{ color: '#087ea2' }}>
                                    {change.toFixed(1)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-black">±0</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-black">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-black py-8">
                      評価データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* スマホ: カード表示 */}
          <div className="lg:hidden space-y-3">
            {data.evaluations.length > 0 ? (
              data.evaluations.map((evaluation, index) => {
                const prevEvaluation = index < data.evaluations.length - 1 ? data.evaluations[index + 1] : null
                const change = prevEvaluation && evaluation.total_score && prevEvaluation.total_score
                  ? evaluation.total_score - prevEvaluation.total_score
                  : null

                return (
                  <div
                    key={evaluation.id}
                    className="border rounded-lg p-3 space-y-3"
                    style={{ borderColor: '#e0f2f1', backgroundColor: 'rgba(5, 167, 190, 0.02)' }}
                  >
                    {/* ヘッダー: 評価月とランク */}
                    <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: '#e0f2f1' }}>
                      <span className="font-bold text-base text-black">
                        {evaluation.evaluation_year}年{evaluation.evaluation_month}月
                      </span>
                      {evaluation.rank ? (
                        <Badge className={getRankColor(evaluation.rank)}>
                          {evaluation.rank}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </div>

                    {/* 総合スコアと前月比 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-600">総合スコア</span>
                        <div className="text-2xl font-bold text-black">
                          {evaluation.total_score?.toFixed(1) || '-'}
                        </div>
                      </div>
                      {change !== null ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                          {change > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4" style={{ color: '#18c4b8' }} />
                              <span className="text-sm font-medium" style={{ color: '#18c4b8' }}>
                                +{change.toFixed(1)}
                              </span>
                            </>
                          ) : change < 0 ? (
                            <>
                              <TrendingDown className="h-4 w-4" style={{ color: '#087ea2' }} />
                              <span className="text-sm font-medium" style={{ color: '#087ea2' }}>
                                {change.toFixed(1)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-black">±0</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">前月比: -</span>
                      )}
                    </div>

                    {/* カテゴリ別スコア */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: '#e0f2f1' }}>
                      <div className="text-center p-2 rounded" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                        <div className="text-xs text-gray-600 mb-1">成果</div>
                        <div className="text-sm font-bold text-black">
                          {evaluation.performance_score?.toFixed(1) || '-'}
                        </div>
                        <div className="text-[10px] text-gray-500">/ 48</div>
                      </div>
                      <div className="text-center p-2 rounded" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                        <div className="text-xs text-gray-600 mb-1">行動</div>
                        <div className="text-sm font-bold text-black">
                          {evaluation.behavior_score?.toFixed(1) || '-'}
                        </div>
                        <div className="text-[10px] text-gray-500">/ 30</div>
                      </div>
                      <div className="text-center p-2 rounded" style={{ backgroundColor: 'rgba(30, 215, 205, 0.1)' }}>
                        <div className="text-xs text-gray-600 mb-1">成長</div>
                        <div className="text-sm font-bold text-black">
                          {evaluation.growth_score?.toFixed(1) || '-'}
                        </div>
                        <div className="text-[10px] text-gray-500">/ 22</div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-black py-8 border rounded-lg" style={{ borderColor: '#e0f2f1' }}>
                評価データがありません
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
