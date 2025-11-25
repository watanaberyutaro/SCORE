import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Award, TrendingUp, MessageSquare, ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { EvaluationCharts } from '@/components/evaluation/evaluation-charts'
import Link from 'next/link'
import { getRankColor, calculateReward, getRewardDisplay, type RankSetting } from '@/lib/utils/evaluation-calculator'
import { getCategoryName, type CategoryMaster } from '@/lib/utils/category-mapper'

async function getEvaluationDetail(staffId: string, year: number, month: number, adminCompanyId: string) {
  const supabase = await createSupabaseServerClient()

  // スタッフ情報を取得（同じ企業のみ）
  const { data: staff } = await supabase
    .from('users')
    .select('id, full_name, email, department, position, company_id')
    .eq('id', staffId)
    .eq('company_id', adminCompanyId)
    .single()

  if (!staff) {
    return null
  }

  // 評価データを取得
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select(`
      *,
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name),
        items:evaluation_items(*)
      )
    `)
    .eq('staff_id', staffId)
    .eq('evaluation_year', year)
    .eq('evaluation_month', month)
    .single()

  return {
    staff,
    evaluation,
  }
}

async function getRankSettings(companyId: string): Promise<RankSetting[]> {
  const supabase = await createSupabaseServerClient()

  const { data: rankSettings } = await supabase
    .from('rank_settings')
    .select('rank_name, min_score, amount, display_order')
    .eq('company_id', companyId)
    .order('display_order', { ascending: false })

  return rankSettings || []
}

async function getCategoryMasters(companyId: string): Promise<CategoryMaster[]> {
  const supabase = await createSupabaseServerClient()

  const { data: categories } = await supabase
    .from('evaluation_categories')
    .select('id, category_key, category_label, display_order, description')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return categories || []
}

export default async function AdminEvaluationDetailPage({
  params,
  searchParams,
}: {
  params: { staffId: string }
  searchParams: { year?: string; month?: string }
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear()
  const month = searchParams.month ? parseInt(searchParams.month) : new Date().getMonth() + 1

  const data = await getEvaluationDetail(params.staffId, year, month, user.company_id)

  if (!data) {
    redirect('/admin/monthly-evaluations')
  }

  const { staff, evaluation } = data

  // 企業のランク設定を取得
  const rankSettings = await getRankSettings(user.company_id)

  // 企業のカテゴリマスターを取得
  const categoryMasters = await getCategoryMasters(user.company_id)

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

    if (!evaluation?.responses) return categories

    // 評価データから全ての項目を収集
    const itemsMap = new Map<string, { category: string; max_score: number }>()

    evaluation.responses.forEach((response: any) => {
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

      if (!categories[value.category]) {
        categories[value.category] = []
      }

      categories[value.category].push(itemData)
    })

    return categories
  }

  const itemCategories = evaluation ? buildItemCategoriesFromEvaluation(evaluation) : {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href={`/admin/monthly-evaluations?year=${year}&month=${month}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            月次評価一覧に戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">評価詳細</h1>
        <p className="mt-2 text-sm text-gray-600">
          {staff.full_name}さんの{year}年{month}月の評価
        </p>
      </div>

      {/* スタッフ情報 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>スタッフ情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">氏名</p>
              <p className="font-medium">{staff.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">メールアドレス</p>
              <p className="font-medium">{staff.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">部署</p>
              <p className="font-medium">{staff.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">役職</p>
              <p className="font-medium">{staff.position || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {evaluation ? (
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
                  {evaluation.total_score?.toFixed(1) || '-'}点
                </div>
                <p className="text-xs text-muted-foreground">
                  管理者評価の平均
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ランク</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {evaluation.rank ? (
                  <>
                    <Badge className="text-2xl">
                      {evaluation.rank}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {year}年{month}月
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">評価中</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">提出状況</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {evaluation.responses?.filter((r: any) => r.submitted_at).length || 0}人
                </div>
                <p className="text-xs text-muted-foreground">
                  管理者が提出済み
                </p>
              </CardContent>
            </Card>
          </div>

          {/* チャートセクション */}
          {Object.keys(itemCategories).length > 0 ? (
            <EvaluationCharts
              evaluation={evaluation}
              itemCategories={itemCategories}
              categories={categoryMasters}
            />
          ) : null}

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

                          evaluation.responses?.forEach((response: any) => {
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

                              {/* 各管理者のスコア表示 */}
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                {allAdminScores.map((adminScore, idx) => (
                                  <div key={idx} className={`bg-white rounded px-2 py-1 text-center border ${colors.border.replace('-500', '-200')}`}>
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

                              evaluation.responses?.forEach((response: any) => {
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
                                      <div key={idx} className={`bg-white rounded px-2 py-1 text-center border ${colors.border.replace('-500', '-200')}`}>
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
              <Card>
                <CardHeader>
                  <CardTitle>管理者別の詳細フィードバック</CardTitle>
                  <CardDescription>
                    各評価項目に対するフィードバックを管理者ごとに表示
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {evaluation.responses && evaluation.responses.length > 0 ? (
                    <div className="space-y-6">
                      {evaluation.responses.map((response: any, responseIdx: number) => {
                        const allComments: { category: string; itemName: string; comment: string; score: number }[] = []

                        response.items?.forEach((item: any) => {
                          if (item.comment) {
                            allComments.push({
                              category: item.category,
                              itemName: item.item_name,
                              comment: item.comment,
                              score: item.score,
                            })
                          }
                        })

                        if (allComments.length === 0) return null

                        // カテゴリごとに動的にグループ化
                        const groupedComments: Record<string, Array<{ category: string; itemName: string; comment: string; score: number }>> = {}

                        allComments.forEach(c => {
                          if (!groupedComments[c.category]) {
                            groupedComments[c.category] = []
                          }
                          groupedComments[c.category].push(c)
                        })

                        return (
                          <div key={responseIdx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                              <MessageSquare className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-bold text-gray-900">{response.admin.full_name}</h3>
                              <Badge variant="outline" className="ml-auto">
                                {allComments.length}件のコメント
                              </Badge>
                            </div>

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
                                          <span className="text-xs text-gray-500 ml-2">({c.score}点)</span>
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
