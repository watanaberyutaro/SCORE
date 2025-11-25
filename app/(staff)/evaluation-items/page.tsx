import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_NAMES, CATEGORY_DESCRIPTIONS } from '@/lib/constants/evaluation-items'
import { RANK_DEFINITIONS } from '@/lib/constants/ranks'
import { BookOpen, Award, TrendingUp, Users, Activity } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { getCategoryName, getCategoryColor, type CategoryMaster } from '@/lib/utils/category-mapper'

async function getEvaluationItems(companyId: string) {
  const supabase = await createSupabaseServerClient()

  // 企業のカスタム評価項目を取得
  const { data: items, error } = await supabase
    .from('evaluation_items_master')
    .select('*')
    .eq('company_id', companyId)
    .order('category', { ascending: true })
    .order('item_name', { ascending: true })

  if (error) {
    console.error('評価項目取得エラー:', error)
    return { items: [], error: error.message }
  }

  return { items: items || [], error: null }
}

async function getCategoryMasters(companyId: string): Promise<CategoryMaster[]> {
  const supabase = await createSupabaseServerClient()

  const { data: categories, error } = await supabase
    .from('evaluation_categories')
    .select('id, category_key, category_label, description')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('category_key', { ascending: true })

  if (error) {
    console.error('カテゴリマスター取得エラー:', error)
  }

  return categories || []
}

async function getRankSettings(companyId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: rankSettings, error } = await supabase
    .from('rank_settings')
    .select('rank_name, min_score, amount')
    .eq('company_id', companyId)
    .order('min_score', { ascending: false })

  if (error) {
    console.error('ランク設定取得エラー:', error)
    return { rankSettings: [], error: error.message }
  }

  return { rankSettings: rankSettings || [], error: null }
}

export default async function EvaluationItemsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const itemsResult = await getEvaluationItems(user.company_id)
  const items = itemsResult.items
  const itemsError = itemsResult.error

  const categoryMasters = await getCategoryMasters(user.company_id)

  const rankResult = await getRankSettings(user.company_id)
  const rankSettings = rankResult.rankSettings
  const rankError = rankResult.error

  // カテゴリごとに項目をグループ化
  const itemsByCategory: Record<string, any[]> = {}

  // すべての項目をカテゴリごとにグループ化
  items.forEach(item => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = []
    }
    itemsByCategory[item.category].push(item)
  })

  // デフォルト項目（データが取得できない場合のフォールバック）
  if (items.length === 0) {
    itemsByCategory.performance = [
      { id: '1', item_name: '実績評価', item_label: '実績評価', min_score: 0, max_score: 25, description: '業務の成果や目標達成度を評価します' },
      { id: '2', item_name: '勤怠評価', item_label: '勤怠評価', min_score: 0, max_score: 5, description: '出勤状況や時間管理を評価します' },
      { id: '3', item_name: 'コンプライアンス評価', item_label: 'コンプライアンス', min_score: 0, max_score: 3, description: '規則やルールの遵守状況を評価します' },
      { id: '4', item_name: 'クライアント評価', item_label: 'クライアント評価', min_score: 0, max_score: 15, description: 'クライアント対応や満足度を評価します' },
    ]
    itemsByCategory.behavior = [
      { id: '5', item_name: '主体性評価', item_label: '主体性', min_score: 0, max_score: 10, description: '自ら考え行動する姿勢を評価します' },
      { id: '6', item_name: '責任感', item_label: '責任感', min_score: 0, max_score: 7, description: '任された仕事への責任感を評価します' },
      { id: '7', item_name: '協調性評価', item_label: '協調性', min_score: 0, max_score: 10, description: 'チームワークや協力姿勢を評価します' },
      { id: '8', item_name: 'アピアランス評価', item_label: 'アピアランス', min_score: 0, max_score: 3, description: '身だしなみや第一印象を評価します' },
    ]
    itemsByCategory.growth = [
      { id: '9', item_name: '自己研鑽評価', item_label: '自己研鑽', min_score: 0, max_score: 7, description: '自己学習や成長への取り組みを評価します' },
      { id: '10', item_name: 'レスポンス評価', item_label: 'レスポンス', min_score: 0, max_score: 5, description: '報告・連絡・相談の迅速性を評価します' },
      { id: '11', item_name: '自己目標達成評価', item_label: '自己目標達成', min_score: 0, max_score: 10, description: '個人目標の達成状況を評価します' },
    ]
  }

  // カテゴリ別の色とアイコンのマッピング
  const getCategoryStyle = (categoryKey: string) => {
    const styleMap: Record<string, { borderClass: string; iconColor: string; icon: any }> = {
      performance: {
        borderClass: 'border-green-500',
        iconColor: 'text-green-500',
        icon: TrendingUp,
      },
      behavior: {
        borderClass: 'border-purple-500',
        iconColor: 'text-purple-500',
        icon: Users,
      },
      growth: {
        borderClass: 'border-orange-500',
        iconColor: 'text-orange-500',
        icon: BookOpen,
      },
    }

    return styleMap[categoryKey] || {
      borderClass: 'border-blue-500',
      iconColor: 'text-blue-500',
      icon: Activity,
    }
  }

  // カテゴリリストを準備（カスタムまたはデフォルト）
  const displayCategories = categoryMasters.length > 0
    ? categoryMasters
    : [
        { category_key: 'performance', category_label: CATEGORY_NAMES.performance, description: CATEGORY_DESCRIPTIONS.performance },
        { category_key: 'behavior', category_label: CATEGORY_NAMES.behavior, description: CATEGORY_DESCRIPTIONS.behavior },
        { category_key: 'growth', category_label: CATEGORY_NAMES.growth, description: CATEGORY_DESCRIPTIONS.growth },
      ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">評価項目</h1>
        <p className="mt-2 text-sm text-gray-600">
          評価基準と各項目の詳細説明
        </p>

        {/* デバッグ情報 */}
        <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
          <p className="font-bold mb-2">デバッグ情報:</p>
          <p>現在のユーザーID: {user.id}</p>
          <p>現在の会社ID: {user.company_id}</p>
          <p>カテゴリマスター数: {categoryMasters.length}</p>
          <p>評価項目数: {items.length}</p>
          <p>ランク設定数: {rankSettings.length}</p>
          <p>カテゴリキー: {Object.keys(itemsByCategory).join(', ')}</p>
          {categoryMasters.length > 0 && (
            <p>カテゴリマスター: {categoryMasters.map(c => c.category_key).join(', ')}</p>
          )}
          {itemsError && (
            <p className="text-red-600 mt-2">評価項目エラー: {itemsError}</p>
          )}
          {rankError && (
            <p className="text-red-600 mt-2">ランク設定エラー: {rankError}</p>
          )}
        </div>
      </div>

      {/* 動的カテゴリカード */}
      {displayCategories.map((category) => {
        const categoryItems = itemsByCategory[category.category_key] || []
        const style = getCategoryStyle(category.category_key)
        const Icon = style.icon

        return (
          <Card key={category.category_key} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon className={`mr-2 h-5 w-5 ${style.iconColor}`} />
                {category.category_label}
              </CardTitle>
              <CardDescription>{category.description || ''}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryItems.length > 0 ? (
                  categoryItems.map((item) => (
                    <div key={item.id} className={`border-l-4 ${style.borderClass} pl-4 py-2`}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{item.item_name}</h3>
                        <Badge variant="outline">
                          {item.min_score}〜{item.max_score}点
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{item.description || ''}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">このカテゴリには評価項目が登録されていません</p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* ランク判定基準 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-yellow-500" />
            ランク判定基準と報酬
          </CardTitle>
          <CardDescription>
            総合スコアに基づくランクと報酬額
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(rankSettings.length > 0 ? rankSettings : RANK_DEFINITIONS).map((rankDef: any, index: number) => {
              // カスタム設定の場合はrank_name、デフォルトの場合はrank
              const rankName = rankDef.rank_name || rankDef.rank
              const minScore = rankDef.min_score || rankDef.minScore
              const amount = rankDef.amount !== undefined ? rankDef.amount : rankDef.reward
              const description = rankDef.description || ''

              // 次のランクの最低点を取得（最大点として使用）
              const nextRank: any = rankSettings.length > 0
                ? rankSettings[index + 1]
                : (RANK_DEFINITIONS[index + 1] || null)
              const maxScore = nextRank
                ? (nextRank.min_score || nextRank.minScore) - 0.01
                : null

              return (
                <div
                  key={rankName}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Badge className="text-lg px-3 py-1 bg-blue-100 text-blue-800 border-blue-300">
                      {rankName}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {minScore}点{maxScore ? `〜${maxScore.toFixed(2)}点` : '以上'}
                      </p>
                      {description && <p className="text-sm text-gray-500">{description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      amount > 0 ? 'text-green-600' :
                      amount < 0 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {amount > 0 ? '+' : ''}
                      {amount.toLocaleString()}円
                    </p>
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
