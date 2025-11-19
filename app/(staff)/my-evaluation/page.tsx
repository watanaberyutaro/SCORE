import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getRankColor } from '@/lib/utils/evaluation-calculator'
import { getRewardDisplay } from '@/lib/utils/evaluation-calculator'
import { Award, TrendingUp, Users, MessageSquare } from 'lucide-react'
import { redirect } from 'next/navigation'
import { calculateReward } from '@/lib/utils/evaluation-calculator'
import { EvaluationCharts } from '@/components/evaluation/evaluation-charts'
import { MonthSelector } from '@/components/evaluation/month-selector'
import { QuarterSelector } from '@/components/evaluation/quarter-selector'

async function getMyEvaluations(userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(
      `
      *,
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name),
        items:evaluation_items(*)
      ),
      comments:admin_comments(
        *,
        admin:users!admin_comments_admin_id_fkey(full_name)
      )
    `
    )
    .eq('staff_id', userId)
    .order('evaluation_year', { ascending: false })
    .order('evaluation_month', { ascending: false })

  return evaluations || []
}

export default async function MyEvaluationPage({
  searchParams,
}: {
  searchParams: { id?: string; quarter?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const evaluations = await getMyEvaluations(user.id)

  // クオーター計算関数
  const getQuarter = (month: number) => Math.ceil(month / 3)

  // 年月が設定されている評価のみを対象にする（古い総合レコードを除外）
  const validEvaluations = evaluations.filter((e) => e.evaluation_year && e.evaluation_month)

  // 利用可能なクオーターのリストを生成
  const availableQuarters: Array<{ year: number; quarter: number; label: string }> = []
  const quarterSet = new Set<string>()

  validEvaluations.forEach((e) => {
    const quarter = getQuarter(e.evaluation_month!)
    const key = `${e.evaluation_year}-${quarter}`
    if (!quarterSet.has(key)) {
      quarterSet.add(key)
      availableQuarters.push({
        year: e.evaluation_year!,
        quarter,
        label: `${e.evaluation_year}年${quarter}Q`,
      })
    }
  })

  // クオーターを年・クオーターの降順でソート
  availableQuarters.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.quarter - a.quarter
  })

  // 選択されたクオーターを取得（URLパラメータまたはデフォルトで最新）
  const selectedQuarter = searchParams.quarter || (availableQuarters.length > 0 ? `${availableQuarters[0].year}-${availableQuarters[0].quarter}` : '')
  const [selectedYear, selectedQuarterNum] = selectedQuarter ? selectedQuarter.split('-').map(Number) : [null, null]

  // 選択されたクオーターに属する評価をフィルタリング
  const quarterEvaluations = selectedYear && selectedQuarterNum
    ? validEvaluations.filter((e) => {
        return e.evaluation_year === selectedYear && getQuarter(e.evaluation_month!) === selectedQuarterNum
      })
    : []

  // クオーターの総合評価を計算
  let quarterlySummary: any = null
  let evaluationsWithSummary: any[] = []

  if (quarterEvaluations.length > 0) {
    // total_scoreの平均を計算
    const validScores = quarterEvaluations
      .filter((e) => e.total_score !== null && e.total_score !== undefined)
      .map((e) => e.total_score!)

    if (validScores.length > 0) {
        const averageTotalScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length

        // カテゴリ別スコアの平均を計算
        let totalPerformance = 0
        let totalBehavior = 0
        let totalGrowth = 0
        let performanceCount = 0
        let behaviorCount = 0
        let growthCount = 0

        quarterEvaluations.forEach((e) => {
          if (e.performance_score !== null && e.performance_score !== undefined) {
            totalPerformance += e.performance_score
            performanceCount++
          }
          if (e.behavior_score !== null && e.behavior_score !== undefined) {
            totalBehavior += e.behavior_score
            behaviorCount++
          }
          if (e.growth_score !== null && e.growth_score !== undefined) {
            totalGrowth += e.growth_score
            growthCount++
          }
        })

        const avgPerformance = performanceCount > 0 ? totalPerformance / performanceCount : null
        const avgBehavior = behaviorCount > 0 ? totalBehavior / behaviorCount : null
        const avgGrowth = growthCount > 0 ? totalGrowth / growthCount : null

        // 全ての月の評価データを統合
      const allResponses: any[] = []
      quarterEvaluations.forEach((evaluation) => {
        if (evaluation.responses && evaluation.responses.length > 0) {
          allResponses.push(...evaluation.responses)
        }
      })

      // 仮想的な「総合」評価オブジェクトを作成
      quarterlySummary = {
        id: 'quarter-summary',
        staff_id: user.id,
        evaluation_year: selectedYear,
        evaluation_month: 0, // 0は総合を表す
        total_score: averageTotalScore,
        performance_score: avgPerformance,
        behavior_score: avgBehavior,
        growth_score: avgGrowth,
        rank: quarterEvaluations[0].rank, // 最新の評価のランクを使用
        status: 'completed',
        responses: allResponses, // 全月のresponsesを含める
        comments: [],
        created_at: quarterEvaluations[0].created_at,
        updated_at: quarterEvaluations[0].updated_at,
      }

      // 総合を配列の先頭に追加
      evaluationsWithSummary = [quarterlySummary, ...quarterEvaluations]
    }
  } else {
    // クオーターに評価がない場合は空配列
    evaluationsWithSummary = []
  }

  // 選択された評価IDがあれば、それを使用。なければクオーターの総合（またはクオーターの最初）を使用
  let selectedEvaluation
  if (searchParams.id) {
    selectedEvaluation = evaluationsWithSummary.find((e) => e.id === searchParams.id)
  } else {
    selectedEvaluation = evaluationsWithSummary[0] // デフォルトは総合（配列の先頭）
  }

  const latestEvaluation = selectedEvaluation || evaluationsWithSummary[0]

  // 評価項目の定義（DBのitem_nameと一致させる）
  const itemCategories = {
    performance: [
      { key: '実績評価', label: '実績評価', max: 25 },
      { key: '勤怠評価', label: '勤怠評価', max: 5 },
      { key: 'コンプライアンス評価', label: 'コンプライアンス', max: 3 },
      { key: 'クライアント評価', label: 'クライアント評価', max: 15 },
    ],
    behavior: [
      { key: '主体性評価', label: '主体性', max: 10 },
      { key: '責任感', label: '責任感', max: 7 },
      { key: '協調性評価', label: '協調性', max: 10 },
      { key: 'アピアランス評価', label: 'アピアランス', max: 3 },
    ],
    growth: [
      { key: '自己研鑽評価', label: '自己研鑽', max: 7 },
      { key: 'レスポンス評価', label: 'レスポンス', max: 5 },
      { key: '自己目標達成評価', label: '自己目標達成', max: 10 },
    ],
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">評価結果</h1>
          <div className="flex gap-3">
            {availableQuarters.length > 0 && (
              <>
                <QuarterSelector
                  quarters={availableQuarters}
                  currentQuarter={selectedQuarter}
                />
                {evaluationsWithSummary.length > 0 && (
                  <MonthSelector
                    evaluations={evaluationsWithSummary.map((e) => ({
                      id: e.id,
                      evaluation_year: e.evaluation_year,
                      evaluation_month: e.evaluation_month,
                    }))}
                    currentEvaluationId={searchParams.id || evaluationsWithSummary[0]?.id}
                    currentQuarter={selectedQuarter}
                  />
                )}
              </>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          管理者からの評価を確認できます
        </p>
      </div>

      {latestEvaluation ? (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総合スコア</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestEvaluation.total_score?.toFixed(1) || '-'}点
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestEvaluation.evaluation_month === 0
                    ? 'クオーター内各月の平均'
                    : '3名の管理者の平均'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ランク</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {latestEvaluation.rank ? (
                  <>
                    <Badge className={`text-2xl ${getRankColor(latestEvaluation.rank)}`}>
                      {latestEvaluation.rank}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {latestEvaluation.evaluation_year && latestEvaluation.evaluation_month
                        ? `${latestEvaluation.evaluation_year}年${latestEvaluation.evaluation_month}月`
                        : '評価期間未設定'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">評価中</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">報酬</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {latestEvaluation.rank ? (
                  <>
                    <div className="text-2xl font-bold">
                      {getRewardDisplay(calculateReward(latestEvaluation.rank))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      今期の評価報酬
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">評価中</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* チャートセクション */}
          <EvaluationCharts
            evaluation={latestEvaluation}
            itemCategories={itemCategories}
          />

          {/* 詳細タブ */}
          <Tabs defaultValue="items" className="space-y-4 mt-8">
            <TabsList>
              <TabsTrigger value="items">評価項目別詳細</TabsTrigger>
              <TabsTrigger value="comments">管理者コメント</TabsTrigger>
            </TabsList>

            {/* 評価項目別詳細タブ */}
            <TabsContent value="items">
              <div className="grid grid-cols-1 gap-6">
                {/* 成果評価 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">成果評価</CardTitle>
                    <CardDescription>業務実績と成果に関する評価</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {itemCategories.performance.map((item) => {
                        const allAdminScores: { admin: string; score: number; comment: string | null }[] = []

                        latestEvaluation.responses?.forEach((response: any) => {
                          // 同じitem_nameの項目がある場合、最新のものを使用（created_atでソート）
                          const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
                          if (matchingItems.length > 0) {
                            // 最新のitemを取得（created_atで降順ソート）
                            const latestItem = matchingItems.sort((a: any, b: any) =>
                              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )[0]

                            allAdminScores.push({
                              admin: response.admin.full_name,
                              score: latestItem.score,
                              comment: latestItem.comment,
                            })
                          }
                        })

                        const avgScore = allAdminScores.length > 0
                          ? allAdminScores.reduce((sum, s) => sum + s.score, 0) / allAdminScores.length
                          : 0

                        return (
                          <div key={item.key} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50/30 rounded-r-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-gray-900">{item.label}</h4>
                              <div className="text-right">
                                <span className="text-xl font-bold text-green-700">
                                  {avgScore.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500 ml-1">
                                  / {item.max}点
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${(avgScore / item.max) * 100}%` }}
                              />
                            </div>

                            {/* 各管理者のスコア表示 */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {allAdminScores.map((adminScore, idx) => (
                                <div key={idx} className="bg-white rounded px-2 py-1 text-center border border-green-200">
                                  <p className="text-[10px] text-gray-600">{adminScore.admin}</p>
                                  <p className="text-sm font-bold text-green-700">{adminScore.score}点</p>
                                </div>
                              ))}
                            </div>

                            {/* コメント表示 */}
                            {allAdminScores.some(s => s.comment) && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  管理者からのコメント ({allAdminScores.filter(s => s.comment).length}件)
                                </p>
                                {allAdminScores.map((adminScore, idx) => (
                                  adminScore.comment && (
                                    <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-green-400 shadow-sm">
                                      <p className="text-xs font-semibold text-green-800 mb-1">
                                        {adminScore.admin} （{adminScore.score}点）
                                      </p>
                                      <p className="text-sm text-gray-700 leading-relaxed">{adminScore.comment}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 行動評価 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">行動評価</CardTitle>
                    <CardDescription>勤務態度と行動特性に関する評価</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {itemCategories.behavior.map((item) => {
                        const allAdminScores: { admin: string; score: number; comment: string | null }[] = []

                        latestEvaluation.responses?.forEach((response: any) => {
                          // 同じitem_nameの項目がある場合、最新のものを使用（created_atでソート）
                          const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
                          if (matchingItems.length > 0) {
                            // 最新のitemを取得（created_atで降順ソート）
                            const latestItem = matchingItems.sort((a: any, b: any) =>
                              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )[0]

                            allAdminScores.push({
                              admin: response.admin.full_name,
                              score: latestItem.score,
                              comment: latestItem.comment,
                            })
                          }
                        })

                        const avgScore = allAdminScores.length > 0
                          ? allAdminScores.reduce((sum, s) => sum + s.score, 0) / allAdminScores.length
                          : 0

                        return (
                          <div key={item.key} className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50/30 rounded-r-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-gray-900">{item.label}</h4>
                              <div className="text-right">
                                <span className="text-xl font-bold text-purple-700">
                                  {avgScore.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500 ml-1">
                                  / {item.max}点
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${(avgScore / item.max) * 100}%` }}
                              />
                            </div>

                            {/* 各管理者のスコア表示 */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {allAdminScores.map((adminScore, idx) => (
                                <div key={idx} className="bg-white rounded px-2 py-1 text-center border border-purple-200">
                                  <p className="text-[10px] text-gray-600">{adminScore.admin}</p>
                                  <p className="text-sm font-bold text-purple-700">{adminScore.score}点</p>
                                </div>
                              ))}
                            </div>

                            {/* コメント表示 */}
                            {allAdminScores.some(s => s.comment) && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  管理者からのコメント ({allAdminScores.filter(s => s.comment).length}件)
                                </p>
                                {allAdminScores.map((adminScore, idx) => (
                                  adminScore.comment && (
                                    <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-purple-400 shadow-sm">
                                      <p className="text-xs font-semibold text-purple-800 mb-1">
                                        {adminScore.admin} （{adminScore.score}点）
                                      </p>
                                      <p className="text-sm text-gray-700 leading-relaxed">{adminScore.comment}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 成長評価 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">成長評価</CardTitle>
                    <CardDescription>スキル向上と自己研鑽に関する評価</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {itemCategories.growth.map((item) => {
                        const allAdminScores: { admin: string; score: number; comment: string | null }[] = []

                        latestEvaluation.responses?.forEach((response: any) => {
                          // 同じitem_nameの項目がある場合、最新のものを使用（created_atでソート）
                          const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
                          if (matchingItems.length > 0) {
                            // 最新のitemを取得（created_atで降順ソート）
                            const latestItem = matchingItems.sort((a: any, b: any) =>
                              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )[0]

                            allAdminScores.push({
                              admin: response.admin.full_name,
                              score: latestItem.score,
                              comment: latestItem.comment,
                            })
                          }
                        })

                        const avgScore = allAdminScores.length > 0
                          ? allAdminScores.reduce((sum, s) => sum + s.score, 0) / allAdminScores.length
                          : 0

                        return (
                          <div key={item.key} className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50/30 rounded-r-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-gray-900">{item.label}</h4>
                              <div className="text-right">
                                <span className="text-xl font-bold text-orange-700">
                                  {avgScore.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500 ml-1">
                                  / {item.max}点
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                              <div
                                className="bg-orange-500 h-2 rounded-full transition-all"
                                style={{ width: `${(avgScore / item.max) * 100}%` }}
                              />
                            </div>

                            {/* 各管理者のスコア表示 */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {allAdminScores.map((adminScore, idx) => (
                                <div key={idx} className="bg-white rounded px-2 py-1 text-center border border-orange-200">
                                  <p className="text-[10px] text-gray-600">{adminScore.admin}</p>
                                  <p className="text-sm font-bold text-orange-700">{adminScore.score}点</p>
                                </div>
                              ))}
                            </div>

                            {/* コメント表示 */}
                            {allAdminScores.some(s => s.comment) && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  管理者からのコメント ({allAdminScores.filter(s => s.comment).length}件)
                                </p>
                                {allAdminScores.map((adminScore, idx) => (
                                  adminScore.comment && (
                                    <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-orange-400 shadow-sm">
                                      <p className="text-xs font-semibold text-orange-800 mb-1">
                                        {adminScore.admin} （{adminScore.score}点）
                                      </p>
                                      <p className="text-sm text-gray-700 leading-relaxed">{adminScore.comment}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 管理者コメントタブ */}
            <TabsContent value="comments">
              {(() => {
                // 全管理者のコメントを統合して分析
                const allCommentsData: {
                  performance: string[]
                  behavior: string[]
                  growth: string[]
                } = {
                  performance: [],
                  behavior: [],
                  growth: [],
                }

                // カテゴリ別の平均スコアを計算
                const categoryScores: {
                  performance: number[]
                  behavior: number[]
                  growth: number[]
                } = {
                  performance: [],
                  behavior: [],
                  growth: [],
                }

                let totalCommentCount = 0

                latestEvaluation.responses?.forEach((response: any) => {
                  response.items?.forEach((item: any) => {
                    // スコアを収集
                    if (item.category === 'performance') {
                      categoryScores.performance.push(item.score)
                    } else if (item.category === 'behavior') {
                      categoryScores.behavior.push(item.score)
                    } else if (item.category === 'growth') {
                      categoryScores.growth.push(item.score)
                    }

                    // コメントを収集
                    if (item.comment) {
                      totalCommentCount++
                      if (item.category === 'performance') {
                        allCommentsData.performance.push(item.comment)
                      } else if (item.category === 'behavior') {
                        allCommentsData.behavior.push(item.comment)
                      } else if (item.category === 'growth') {
                        allCommentsData.growth.push(item.comment)
                      }
                    }
                  })
                })

                // 各カテゴリの平均スコアを計算
                const performanceAvg = categoryScores.performance.length > 0
                  ? categoryScores.performance.reduce((sum, s) => sum + s, 0) / categoryScores.performance.length
                  : 0

                const behaviorAvg = categoryScores.behavior.length > 0
                  ? categoryScores.behavior.reduce((sum, s) => sum + s, 0) / categoryScores.behavior.length
                  : 0

                const growthAvg = categoryScores.growth.length > 0
                  ? categoryScores.growth.reduce((sum, s) => sum + s, 0) / categoryScores.growth.length
                  : 0

                // 全体の平均スコアを計算
                const allScores = [
                  ...categoryScores.performance,
                  ...categoryScores.behavior,
                  ...categoryScores.growth,
                ]
                const overallAvg = allScores.length > 0
                  ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
                  : 0

                // 簡易的な要約生成
                const generateSummary = () => {
                  const summary: string[] = []

                  if (allCommentsData.performance.length > 0) {
                    summary.push(`成果評価では、${allCommentsData.performance.length}件のフィードバックがありました。`)
                  }
                  if (allCommentsData.behavior.length > 0) {
                    summary.push(`行動評価では、${allCommentsData.behavior.length}件のフィードバックがありました。`)
                  }
                  if (allCommentsData.growth.length > 0) {
                    summary.push(`成長評価では、${allCommentsData.growth.length}件のフィードバックがありました。`)
                  }

                  if (summary.length === 0) {
                    return '管理者からの具体的なコメントはまだありません。'
                  }

                  return summary.join(' ')
                }

                return (
                  <>
                    {/* 総評サマリー */}
                    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="h-5 w-5 text-blue-600" />
                          総合フィードバック
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* 全体の平均スコア表示 */}
                        <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-300 text-center">
                          <p className="text-sm text-gray-600 mb-2">総合平均スコア</p>
                          <p className="text-4xl font-bold text-blue-600">
                            {overallAvg.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">全評価項目の平均</p>
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed mb-4">
                          {generateSummary()}
                        </p>

                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                            <p className="text-xs text-gray-600 mb-1">成果評価</p>
                            <p className="text-2xl font-bold text-green-600">
                              {performanceAvg.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">平均点</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {allCommentsData.performance.length}件のコメント
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">行動評価</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {behaviorAvg.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">平均点</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {allCommentsData.behavior.length}件のコメント
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center border border-orange-200">
                            <p className="text-xs text-gray-600 mb-1">成長評価</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {growthAvg.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">平均点</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {allCommentsData.growth.length}件のコメント
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 管理者別の詳細コメント */}
                    <Card>
                      <CardHeader>
                        <CardTitle>管理者別の詳細フィードバック</CardTitle>
                        <CardDescription>
                          各評価項目に対するフィードバックを管理者ごとに表示
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {latestEvaluation.responses && latestEvaluation.responses.length > 0 ? (
                          <div className="space-y-6">
                      {latestEvaluation.responses.map((response: any, responseIdx: number) => {
                        // 各管理者のコメントを収集
                        const allComments: { category: string; itemName: string; comment: string }[] = []

                        response.items?.forEach((item: any) => {
                          if (item.comment) {
                            allComments.push({
                              category: item.category,
                              itemName: item.item_name,
                              comment: item.comment,
                            })
                          }
                        })

                        // コメントがない場合はスキップ
                        if (allComments.length === 0) return null

                        // カテゴリごとにグループ化
                        const groupedComments = {
                          performance: allComments.filter(c => c.category === 'performance'),
                          behavior: allComments.filter(c => c.category === 'behavior'),
                          growth: allComments.filter(c => c.category === 'growth'),
                        }

                        return (
                          <div key={responseIdx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                            {/* 管理者ヘッダー */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                              <MessageSquare className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-bold text-gray-900">{response.admin.full_name}</h3>
                              <Badge variant="outline" className="ml-auto">
                                {allComments.length}件のコメント
                              </Badge>
                            </div>

                            {/* カテゴリごとのコメント */}
                            <div className="space-y-4">
                              {groupedComments.performance.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                                    成果評価に関するコメント
                                  </h4>
                                  <div className="space-y-2 pl-4">
                                    {groupedComments.performance.map((c, idx) => (
                                      <div key={idx} className="text-sm">
                                        <span className="font-medium text-gray-700">{c.itemName}:</span>
                                        <span className="text-gray-600 ml-2">{c.comment}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {groupedComments.behavior.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-purple-500 rounded-full"></span>
                                    行動評価に関するコメント
                                  </h4>
                                  <div className="space-y-2 pl-4">
                                    {groupedComments.behavior.map((c, idx) => (
                                      <div key={idx} className="text-sm">
                                        <span className="font-medium text-gray-700">{c.itemName}:</span>
                                        <span className="text-gray-600 ml-2">{c.comment}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {groupedComments.growth.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-orange-500 rounded-full"></span>
                                    成長評価に関するコメント
                                  </h4>
                                  <div className="space-y-2 pl-4">
                                    {groupedComments.growth.map((c, idx) => (
                                      <div key={idx} className="text-sm">
                                        <span className="font-medium text-gray-700">{c.itemName}:</span>
                                        <span className="text-gray-600 ml-2">{c.comment}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-8">
                            まだコメントがありません
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )
              })()}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">まだ評価がありません</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
