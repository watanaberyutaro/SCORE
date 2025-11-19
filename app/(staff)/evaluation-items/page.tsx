import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_NAMES, CATEGORY_DESCRIPTIONS } from '@/lib/constants/evaluation-items'
import { RANK_DEFINITIONS } from '@/lib/constants/ranks'
import { BookOpen, Award, TrendingUp, Users } from 'lucide-react'

async function getEvaluationItems() {
  const supabase = await createSupabaseServerClient()

  const { data: items } = await supabase
    .from('evaluation_items_master')
    .select('*')
    .order('category')

  return items || []
}

export default async function EvaluationItemsPage() {
  const items = await getEvaluationItems()

  const performanceItems = items.filter((i) => i.category === 'performance')
  const behaviorItems = items.filter((i) => i.category === 'behavior')
  const growthItems = items.filter((i) => i.category === 'growth')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">評価項目</h1>
        <p className="mt-2 text-sm text-gray-600">
          評価基準と各項目の詳細説明
        </p>
      </div>

      {/* 成果評価 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
            {CATEGORY_NAMES.performance}
          </CardTitle>
          <CardDescription>{CATEGORY_DESCRIPTIONS.performance}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceItems.map((item) => (
              <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{item.item_name}</h3>
                  <Badge variant="outline">
                    {item.min_score}〜{item.max_score}点
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 行動評価 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-green-500" />
            {CATEGORY_NAMES.behavior}
          </CardTitle>
          <CardDescription>{CATEGORY_DESCRIPTIONS.behavior}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {behaviorItems.map((item) => (
              <div key={item.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{item.item_name}</h3>
                  <Badge variant="outline">
                    {item.min_score}〜{item.max_score}点
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 成長評価 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5 text-purple-500" />
            {CATEGORY_NAMES.growth}
          </CardTitle>
          <CardDescription>{CATEGORY_DESCRIPTIONS.growth}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {growthItems.map((item) => (
              <div key={item.id} className="border-l-4 border-purple-500 pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{item.item_name}</h3>
                  <Badge variant="outline">
                    {item.min_score}〜{item.max_score}点
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            {RANK_DEFINITIONS.map((rankDef) => (
              <div
                key={rankDef.rank}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Badge className={`text-lg px-3 py-1 ${
                    rankDef.color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                    rankDef.color === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
                    rankDef.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    rankDef.color === 'gray' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                    rankDef.color === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {rankDef.rank}
                  </Badge>
                  <div>
                    <p className="font-medium">
                      {rankDef.minScore}点{rankDef.maxScore ? `〜${rankDef.maxScore}点` : '以上'}
                    </p>
                    <p className="text-sm text-gray-500">{rankDef.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    rankDef.reward > 0 ? 'text-green-600' :
                    rankDef.reward < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {rankDef.reward > 0 ? '+' : ''}
                    {rankDef.reward.toLocaleString()}円
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
