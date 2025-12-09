import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { getRankColor } from '@/lib/utils/evaluation-calculator'
import { getRewardDisplay } from '@/lib/utils/evaluation-calculator'
import { Award, TrendingUp, Users, MessageSquare, ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { calculateReward } from '@/lib/utils/evaluation-calculator'
import { EvaluationCharts } from '@/components/evaluation/evaluation-charts'
import { MonthSelector } from '@/components/evaluation/month-selector'
import { QuarterSelector } from '@/components/evaluation/quarter-selector'
import Link from 'next/link'
import { getCategoryName, type CategoryMaster } from '@/lib/utils/category-mapper'

// カテゴリ別の色を定義するヘルパー関数
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
  // カスタムカテゴリの場合はデフォルトの青色を返す
  return colorMap[categoryKey] || {
    border: 'border-blue-500',
    bg: 'bg-blue-50/30',
    text: 'text-blue-700',
    progressBg: 'bg-blue-500',
  }
}

async function getStaffEvaluations(staffId: string) {
  const supabase = await createSupabaseServerClient()

  // Get staff info
  const { data: staff } = await supabase
    .from('users')
    .select('*')
    .eq('id', staffId)
    .single()

  if (!staff) {
    return null
  }

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
    .eq('staff_id', staffId)
    .order('evaluation_year', { ascending: false })
    .order('evaluation_month', { ascending: false })

  // カテゴリマスターを取得
  const { data: categoryMasters } = await supabase
    .from('evaluation_categories')
    .select('id, category_key, category_label, display_order, description')
    .eq('company_id', staff.company_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // 評価項目マスターを取得
  const { data: itemMasters } = await supabase
    .from('evaluation_items_master')
    .select('*')
    .eq('company_id', staff.company_id)
    .order('display_order', { ascending: true })

  return {
    staff,
    evaluations: evaluations || [],
    categoryMasters: (categoryMasters || []) as CategoryMaster[],
    itemMasters: itemMasters || [],
  }
}

export default async function AdminStaffEvaluationDetailPage({
  params,
  searchParams,
}: {
  params: { staffId: string }
  searchParams: { id?: string; quarter?: string }
}) {
  const data = await getStaffEvaluations(params.staffId)

  if (!data) {
    redirect('/admin/evaluations')
  }

  const { staff, evaluations, categoryMasters, itemMasters } = data

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
        const categoryScoreTotals: Record<string, { total: number; count: number }> = {}

        // カテゴリごとの合計とカウントを初期化
        categoryMasters.forEach((category) => {
          categoryScoreTotals[category.category_key] = { total: 0, count: 0 }
        })

        // 各評価からカテゴリスコアを集計
        quarterEvaluations.forEach((e) => {
          categoryMasters.forEach((category) => {
            const scoreKey = `${category.category_key}_score` as keyof typeof e
            const score = e[scoreKey]
            if (score !== null && score !== undefined && typeof score === 'number') {
              categoryScoreTotals[category.category_key].total += score
              categoryScoreTotals[category.category_key].count++
            }
          })
        })

        // 各カテゴリの平均を計算
        const categoryAverages: Record<string, number | null> = {}
        Object.keys(categoryScoreTotals).forEach((categoryKey) => {
          const { total, count } = categoryScoreTotals[categoryKey]
          categoryAverages[categoryKey] = count > 0 ? total / count : null
        })

        // 全ての月の評価データを統合
      const allResponses: any[] = []
      quarterEvaluations.forEach((evaluation) => {
        if (evaluation.responses && evaluation.responses.length > 0) {
          allResponses.push(...evaluation.responses)
        }
      })

      // 仮想的な「総合」評価オブジェクトを作成（動的カテゴリスコアを含む）
      const summaryScores: Record<string, number | null> = {}
      categoryMasters.forEach((category) => {
        const scoreKey = `${category.category_key}_score`
        summaryScores[scoreKey] = categoryAverages[category.category_key]
      })

      quarterlySummary = {
        id: 'quarter-summary',
        staff_id: staff.id,
        evaluation_year: selectedYear,
        evaluation_month: 0, // 0は総合を表す
        total_score: averageTotalScore,
        ...summaryScores, // 動的カテゴリスコアを展開
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

  // 評価項目を動的に構築（データベースから取得した項目マスターを使用）
  const itemCategories: Record<string, Array<{ key: string; label: string; max: number }>> = {}

  // itemMasters から動的に構築
  if (itemMasters && itemMasters.length > 0) {
    itemMasters.forEach((item: any) => {
      if (!itemCategories[item.category]) {
        itemCategories[item.category] = []
      }
      itemCategories[item.category].push({
        key: item.item_name,
        label: item.item_label || item.item_name,
        max: item.max_score,
      })
    })
  } else {
    // デフォルト値（データベースに設定がない場合）
    itemCategories.performance = [
      { key: '実績評価', label: '実績評価', max: 25 },
      { key: '勤怠評価', label: '勤怠評価', max: 5 },
      { key: 'コンプライアンス評価', label: 'コンプライアンス', max: 3 },
      { key: 'クライアント評価', label: 'クライアント評価', max: 15 },
    ]
    itemCategories.behavior = [
      { key: '主体性評価', label: '主体性', max: 10 },
      { key: '責任感', label: '責任感', max: 7 },
      { key: '協調性評価', label: '協調性', max: 10 },
      { key: 'アピアランス評価', label: 'アピアランス', max: 3 },
    ]
    itemCategories.growth = [
      { key: '自己研鑽評価', label: '自己研鑽', max: 7 },
      { key: 'レスポンス評価', label: 'レスポンス', max: 5 },
      { key: '自己目標達成評価', label: '自己目標達成', max: 10 },
    ]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/evaluations">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                評価管理に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{staff.full_name} の評価詳細</h1>
              <p className="text-sm text-gray-600 mt-1">
                {staff.department} · {staff.position}
              </p>
            </div>
          </div>
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
            categories={categoryMasters}
          />

          {/* 詳細タブ */}
          <Tabs defaultValue="items" className="space-y-4 mt-8">
            <TabsList>
              <TabsTrigger value="items">評価項目別詳細</TabsTrigger>
              <TabsTrigger value="comments">管理者コメント</TabsTrigger>
            </TabsList>

            {/* 評価項目別詳細タブ - 動的カテゴリ対応 */}
            <TabsContent value="items">
              <div className="grid grid-cols-1 gap-6">
                {categoryMasters.map((category) => {
                  const items = itemCategories[category.category_key] || []
                  if (items.length === 0) return null

                  const colors = getCategoryColor(category.category_key)

                  return (
                    <Card key={category.category_key}>
                      <CardHeader>
                        <CardTitle className="text-lg">{category.category_label}</CardTitle>
                        <CardDescription>{category.description || `${category.category_label}に関する評価`}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {items.map((item) => {
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
                                    <div key={idx} className={`bg-white rounded px-2 py-1 text-center border ${colors.border}`}>
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
                                        <div key={idx} className={`bg-white rounded-lg p-3 border-l-4 ${colors.border} shadow-sm`}>
                                          <p className={`text-xs font-semibold ${colors.text} mb-1`}>
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
                })}
              </div>
            </TabsContent>

            {/* 管理者コメントタブ - 動的カテゴリ対応 */}
            <TabsContent value="comments">
              {(() => {
                // 全管理者のコメントを動的に統合して分析
                const allCommentsData: Record<string, string[]> = {}
                const categoryScores: Record<string, number[]> = {}

                // カテゴリごとの配列を初期化
                categoryMasters.forEach((category) => {
                  allCommentsData[category.category_key] = []
                  categoryScores[category.category_key] = []
                })

                let totalCommentCount = 0

                latestEvaluation.responses?.forEach((response: any) => {
                  response.items?.forEach((item: any) => {
                    const categoryKey = item.category

                    // スコアを収集
                    if (categoryScores[categoryKey]) {
                      categoryScores[categoryKey].push(item.score)
                    }

                    // コメントを収集
                    if (item.comment) {
                      totalCommentCount++
                      if (allCommentsData[categoryKey]) {
                        allCommentsData[categoryKey].push(item.comment)
                      }
                    }
                  })
                })

                // 各カテゴリの平均スコアを動的に計算
                const categoryAverages: Record<string, number> = {}
                categoryMasters.forEach((category) => {
                  const scores = categoryScores[category.category_key]
                  categoryAverages[category.category_key] = scores.length > 0
                    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                    : 0
                })

                // 全体の平均スコアを計算
                const allScores = Object.values(categoryScores).flat()
                const overallAvg = allScores.length > 0
                  ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
                  : 0

                // 簡易的な要約生成（動的カテゴリ対応）
                const generateSummary = () => {
                  const summary: string[] = []

                  categoryMasters.forEach((category) => {
                    const commentCount = allCommentsData[category.category_key].length
                    if (commentCount > 0) {
                      summary.push(`${category.category_label}では、${commentCount}件のフィードバックがありました。`)
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

                        <div className={`grid grid-cols-${Math.min(categoryMasters.length, 3)} gap-4 mt-4`}>
                          {categoryMasters.map((category) => {
                            const colors = getCategoryColor(category.category_key)
                            // ボーダー色からテキスト色を取得（border-*-200 -> text-*-600）
                            const borderColorClass = colors.border.replace('border-', 'border-')
                            const textColorClass = colors.text.replace('text-', 'text-').replace('-700', '-600')

                            return (
                              <div key={category.category_key} className={`bg-white rounded-lg p-3 text-center border ${borderColorClass}`}>
                                <p className="text-xs text-gray-600 mb-1">{category.category_label}</p>
                                <p className={`text-2xl font-bold ${textColorClass}`}>
                                  {categoryAverages[category.category_key].toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-500">平均点</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {allCommentsData[category.category_key].length}件のコメント
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
                        categoryMasters.forEach((category) => {
                          groupedComments[category.category_key] = allComments.filter(c => c.category === category.category_key)
                        })

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

                            {/* カテゴリごとのコメント - 動的カテゴリ対応 */}
                            <div className="space-y-4">
                              {categoryMasters.map((category) => {
                                const categoryComments = groupedComments[category.category_key]
                                if (!categoryComments || categoryComments.length === 0) return null

                                const colors = getCategoryColor(category.category_key)
                                // text-*-700 -> text-*-800, bg-*-500 に変換
                                const textColorClass = colors.text.replace('-700', '-800')
                                const bgColorClass = colors.progressBg

                                return (
                                  <div key={category.category_key}>
                                    <h4 className={`text-sm font-semibold ${textColorClass} mb-2 flex items-center gap-1`}>
                                      <span className={`inline-block w-3 h-3 ${bgColorClass} rounded-full`}></span>
                                      {category.category_label}に関するコメント
                                    </h4>
                                    <div className="space-y-2 pl-4">
                                      {categoryComments.map((c, idx) => (
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
