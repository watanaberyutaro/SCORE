import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getRankColor, type RankSetting } from '@/lib/utils/evaluation-calculator'
import { getRewardDisplay } from '@/lib/utils/evaluation-calculator'
import { Award, TrendingUp, Users, MessageSquare } from 'lucide-react'
import { redirect } from 'next/navigation'
import { calculateReward } from '@/lib/utils/evaluation-calculator'
import { EvaluationCharts } from '@/components/evaluation/evaluation-charts'
import { MonthSelector } from '@/components/evaluation/month-selector'
import { QuarterSelector } from '@/components/evaluation/quarter-selector'
import { getCategoryName, type CategoryMaster } from '@/lib/utils/category-mapper'

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

async function getEvaluationItems(companyId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: items } = await supabase
    .from('evaluation_items_master')
    .select('*')
    .eq('company_id', companyId)
    .order('category', { ascending: true })
    .order('item_name', { ascending: true })

  if (!items || items.length === 0) {
    return null
  }

  // カテゴリごとに動的にグループ化
  const groupedItems: Record<string, Array<{ key: string; label: string; max: number }>> = {}

  items.forEach((item) => {
    const itemData = {
      key: item.item_name,
      label: item.item_name,
      max: item.max_score,
    }

    // カテゴリが存在しなければ初期化
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = []
    }

    groupedItems[item.category].push(itemData)
  })

  return groupedItems
}

async function getRankSettings(companyId: string): Promise<RankSetting[]> {
  const supabase = await createSupabaseServerClient()

  const { data: rankSettings } = await supabase
    .from('rank_settings')
    .select('rank_name, min_score, amount')
    .eq('company_id', companyId)
    .order('min_score', { ascending: false })

  return rankSettings || []
}

async function getCategoryMasters(companyId: string): Promise<CategoryMaster[]> {
  const supabase = await createSupabaseServerClient()

  const { data: categories } = await supabase
    .from('evaluation_categories')
    .select('id, category_key, category_label, description')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('category_key', { ascending: true })

  return categories || []
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

  // 企業のカスタム評価項目を取得
  const customItemCategories = await getEvaluationItems(user.company_id)

  // 企業のランク設定を取得
  const rankSettings = await getRankSettings(user.company_id)

  // 企業のカテゴリマスターを取得
  const categoryMasters = await getCategoryMasters(user.company_id)

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

        // カテゴリ別スコアの平均を動的に計算
        const categoryScores: Record<string, { total: number; count: number }> = {}

        quarterEvaluations.forEach((e) => {
          // performance_score, behavior_score, growth_scoreなどの固定フィールドを処理
          if (e.performance_score !== null && e.performance_score !== undefined) {
            if (!categoryScores['performance']) {
              categoryScores['performance'] = { total: 0, count: 0 }
            }
            categoryScores['performance'].total += e.performance_score
            categoryScores['performance'].count++
          }
          if (e.behavior_score !== null && e.behavior_score !== undefined) {
            if (!categoryScores['behavior']) {
              categoryScores['behavior'] = { total: 0, count: 0 }
            }
            categoryScores['behavior'].total += e.behavior_score
            categoryScores['behavior'].count++
          }
          if (e.growth_score !== null && e.growth_score !== undefined) {
            if (!categoryScores['growth']) {
              categoryScores['growth'] = { total: 0, count: 0 }
            }
            categoryScores['growth'].total += e.growth_score
            categoryScores['growth'].count++
          }
        })

        // カテゴリ別の平均を計算
        const categoryAverages: Record<string, number | null> = {}
        Object.keys(categoryScores).forEach((categoryKey) => {
          const { total, count } = categoryScores[categoryKey]
          categoryAverages[categoryKey] = count > 0 ? total / count : null
        })

        // 後方互換性のために個別の変数も保持
        const avgPerformance = categoryAverages['performance'] ?? null
        const avgBehavior = categoryAverages['behavior'] ?? null
        const avgGrowth = categoryAverages['growth'] ?? null

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

  // カテゴリごとの色を決定するヘルパー関数
  const getCategoryColor = (categoryKey: string) => {
    const colorMap: Record<string, { border: string; bg: string; text: string; progressBg: string }> = {
      performance: {
        border: 'border-green-500',
        bg: 'bg-green-50/30',
        text: 'text-green-700',
        progressBg: 'bg-green-500',
      },
      behavior: {
        border: 'border-purple-500',
        bg: 'bg-purple-50/30',
        text: 'text-purple-700',
        progressBg: 'bg-purple-500',
      },
      growth: {
        border: 'border-orange-500',
        bg: 'bg-orange-50/30',
        text: 'text-orange-700',
        progressBg: 'bg-orange-500',
      },
    }

    // カスタムカテゴリにはデフォルトの色を使用
    return colorMap[categoryKey] || {
      border: 'border-blue-500',
      bg: 'bg-blue-50/30',
      text: 'text-blue-700',
      progressBg: 'bg-blue-500',
    }
  }

  // 実際の評価データから評価項目を動的に構築
  const buildItemCategoriesFromEvaluation = (evaluation: any) => {
    const categories: Record<string, Array<{ key: string; label: string; max: number }>> = {}

    // 評価データから全ての項目を収集
    const itemsMap = new Map<string, { category: string; max_score: number }>()

    evaluation?.responses?.forEach((response: any) => {
      response.items?.forEach((item: any) => {
        const key = `${item.category}-${item.item_name}`
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            category: item.category,
            max_score: item.max_score || 100,
          })
        }
      })
    })

    // カテゴリ別に動的にグループ化
    itemsMap.forEach((value, key) => {
      const itemName = key.replace(`${value.category}-`, '')
      const itemData = {
        key: itemName,
        label: itemName,
        max: value.max_score,
      }

      // カテゴリが存在しなければ初期化
      if (!categories[value.category]) {
        categories[value.category] = []
      }

      categories[value.category].push(itemData)
    })

    return categories
  }

  // カスタム項目を優先、なければ評価データから構築、それもなければデフォルト
  const itemCategories = customItemCategories || (
    latestEvaluation
      ? buildItemCategoriesFromEvaluation(latestEvaluation)
      : {
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
  )

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
                    : '管理者評価の平均'}
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
                    <Badge className={`text-2xl ${getRankColor(latestEvaluation.rank, rankSettings)}`}>
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
                      {getRewardDisplay(calculateReward(latestEvaluation.rank, rankSettings))}
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
            categories={categoryMasters}
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
                {/* 動的にカテゴリを表示 */}
                {categoryMasters.length > 0 ? (
                  categoryMasters.map((categoryMaster) => {
                    const categoryKey = categoryMaster.category_key
                    const categoryItems = itemCategories[categoryKey] || []
                    const colors = getCategoryColor(categoryKey)

                    if (categoryItems.length === 0) return null

                    return (
                      <Card key={categoryKey}>
                        <CardHeader>
                          <CardTitle className="text-lg">{categoryMaster.category_label}</CardTitle>
                          <CardDescription>{categoryMaster.description || ''}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {categoryItems.map((item) => {
                        const allAdminScores: { admin: string; score: number; comment: string | null }[] = []

                        latestEvaluation.responses?.forEach((response: any, responseIdx: number) => {
                          // 同じitem_nameの項目がある場合、最新のものを使用（created_atでソート）
                          const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
                          if (matchingItems.length > 0) {
                            // 最新のitemを取得（created_atで降順ソート）
                            const latestItem = matchingItems.sort((a: any, b: any) =>
                              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )[0]

                            allAdminScores.push({
                              admin: `管理者${responseIdx + 1}`,
                              score: latestItem.score,
                              comment: latestItem.comment,
                            })
                          }
                        })

                        const avgScore = allAdminScores.length > 0
                          ? allAdminScores.reduce((sum, s) => sum + s.score, 0) / allAdminScores.length
                          : 0

                        return (
                          <div key={item.key} className={`border-l-4 ${colors.border} pl-4 py-3 ${colors.bg} rounded-r-lg`}>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-gray-900">{item.label}</h4>
                              <div className="text-right">
                                <span className={`text-xl font-bold ${colors.text}`}>
                                  {avgScore.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500 ml-1">
                                  / {item.max}点
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                              <div
                                className={`${colors.progressBg} h-2 rounded-full transition-all`}
                                style={{ width: `${(avgScore / item.max) * 100}%` }}
                              />
                            </div>

                            {/* 各管理者のスコア表示 */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {allAdminScores.map((adminScore, idx) => (
                                <div key={idx} className={`bg-white rounded px-2 py-1 text-center border ${colors.border.replace('border-', 'border-').replace('-500', '-200')}`}>
                                  <p className="text-[10px] text-gray-600">{adminScore.admin}</p>
                                  <p className={`text-sm font-bold ${colors.text}`}>{adminScore.score}点</p>
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
                                    <div key={idx} className={`bg-white rounded-lg p-3 border-l-4 ${colors.border.replace('-500', '-400')} shadow-sm`}>
                                      <p className={`text-xs font-semibold ${colors.text.replace('-700', '-800')} mb-1`}>
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
                    )
                  })
                ) : (
                  // カテゴリマスターがない場合は全てのカテゴリを表示
                  Object.keys(itemCategories).map((categoryKey) => {
                    const categoryItems = itemCategories[categoryKey] || []
                    const colors = getCategoryColor(categoryKey)

                    if (categoryItems.length === 0) return null

                    return (
                      <Card key={categoryKey}>
                        <CardHeader>
                          <CardTitle className="text-lg">{getCategoryName(categoryKey, categoryMasters)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {categoryItems.map((item) => {
                              const allAdminScores: { admin: string; score: number; comment: string | null }[] = []

                              latestEvaluation.responses?.forEach((response: any) => {
                                const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
                                if (matchingItems.length > 0) {
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
                                <div key={item.key} className={`border-l-4 ${colors.border} pl-4 py-3 ${colors.bg} rounded-r-lg`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-900">{item.label}</h4>
                                    <div className="text-right">
                                      <span className={`text-xl font-bold ${colors.text}`}>
                                        {avgScore.toFixed(1)}
                                      </span>
                                      <span className="text-sm text-gray-500 ml-1">
                                        / {item.max}点
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                    <div
                                      className={`${colors.progressBg} h-2 rounded-full transition-all`}
                                      style={{ width: `${(avgScore / item.max) * 100}%` }}
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 mb-3">
                                    {allAdminScores.map((adminScore, idx) => (
                                      <div key={idx} className={`bg-white rounded px-2 py-1 text-center border ${colors.border.replace('border-', 'border-').replace('-500', '-200')}`}>
                                        <p className="text-[10px] text-gray-600">{adminScore.admin}</p>
                                        <p className={`text-sm font-bold ${colors.text}`}>{adminScore.score}点</p>
                                      </div>
                                    ))}
                                  </div>

                                  {allAdminScores.some(s => s.comment) && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        管理者からのコメント ({allAdminScores.filter(s => s.comment).length}件)
                                      </p>
                                      {allAdminScores.map((adminScore, idx) => (
                                        adminScore.comment && (
                                          <div key={idx} className={`bg-white rounded-lg p-3 border-l-4 ${colors.border.replace('-500', '-400')} shadow-sm`}>
                                            <p className={`text-xs font-semibold ${colors.text.replace('-700', '-800')} mb-1`}>
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
                    )
                  })
                )}
              </div>
            </TabsContent>

            {/* 管理者コメントタブ */}
            <TabsContent value="comments">
              {(() => {
                // 全管理者のコメントを統合して分析（動的に）
                const allCommentsData: Record<string, string[]> = {}
                const categoryScores: Record<string, number[]> = {}

                let totalCommentCount = 0

                latestEvaluation.responses?.forEach((response: any) => {
                  response.items?.forEach((item: any) => {
                    const category = item.category

                    // カテゴリが存在しなければ初期化
                    if (!categoryScores[category]) {
                      categoryScores[category] = []
                      allCommentsData[category] = []
                    }

                    // スコアを収集
                    categoryScores[category].push(item.score)

                    // コメントを収集
                    if (item.comment) {
                      totalCommentCount++
                      allCommentsData[category].push(item.comment)
                    }
                  })
                })

                // 各カテゴリの平均スコアを計算
                const categoryAverages: Record<string, number> = {}
                Object.keys(categoryScores).forEach((category) => {
                  const scores = categoryScores[category]
                  categoryAverages[category] = scores.length > 0
                    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                    : 0
                })

                // 全体の平均スコアを計算
                const allScores = Object.values(categoryScores).flat()
                const overallAvg = allScores.length > 0
                  ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
                  : 0

                // 簡易的な要約生成
                const generateSummary = () => {
                  const summary: string[] = []

                  Object.keys(allCommentsData).forEach((categoryKey) => {
                    const commentCount = allCommentsData[categoryKey].length
                    if (commentCount > 0) {
                      const categoryName = getCategoryName(categoryKey, categoryMasters)
                      summary.push(`${categoryName}では、${commentCount}件のフィードバックがありました。`)
                    }
                  })

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
                          {Object.keys(categoryScores).map((categoryKey) => {
                            const colors = getCategoryColor(categoryKey)
                            const categoryName = getCategoryName(categoryKey, categoryMasters)
                            const avgScore = categoryAverages[categoryKey]
                            const commentCount = allCommentsData[categoryKey]?.length || 0

                            return (
                              <div key={categoryKey} className={`bg-white rounded-lg p-3 text-center border ${colors.border.replace('-500', '-200')}`}>
                                <p className="text-xs text-gray-600 mb-1">{categoryName}</p>
                                <p className={`text-2xl font-bold ${colors.text.replace('-700', '-600')}`}>
                                  {avgScore.toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-500">平均点</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {commentCount}件のコメント
                                </p>
                              </div>
                            )
                          })}
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

                        // カテゴリごとに動的にグループ化
                        const groupedComments: Record<string, Array<{ category: string; itemName: string; comment: string }>> = {}

                        allComments.forEach(c => {
                          if (!groupedComments[c.category]) {
                            groupedComments[c.category] = []
                          }
                          groupedComments[c.category].push(c)
                        })

                        return (
                          <div key={responseIdx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                            {/* 管理者ヘッダー */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                              <MessageSquare className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-bold text-gray-900">管理者{responseIdx + 1}</h3>
                              <Badge variant="outline" className="ml-auto">
                                {allComments.length}件のコメント
                              </Badge>
                            </div>

                            {/* カテゴリごとのコメント */}
                            <div className="space-y-4">
                              {Object.keys(groupedComments).map((categoryKey) => {
                                const colors = getCategoryColor(categoryKey)
                                const categoryName = getCategoryName(categoryKey, categoryMasters)
                                const comments = groupedComments[categoryKey]

                                if (comments.length === 0) return null

                                return (
                                  <div key={categoryKey}>
                                    <h4 className={`text-sm font-semibold ${colors.text.replace('-700', '-800')} mb-2 flex items-center gap-1`}>
                                      <span className={`inline-block w-3 h-3 ${colors.progressBg} rounded-full`}></span>
                                      {categoryName}に関するコメント
                                    </h4>
                                    <div className="space-y-2 pl-4">
                                      {comments.map((c, idx) => (
                                        <div key={idx} className="text-sm">
                                          <span className="font-medium text-gray-700">{c.itemName}:</span>
                                          <span className="text-gray-600 ml-2">{c.comment}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
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
