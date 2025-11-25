import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

async function checkSystemConfiguration() {
  const supabase = await createSupabaseServerClient()
  const user = await getCurrentUser()

  const checks = {
    categories: { status: 'pending', data: null, message: '' },
    items: { status: 'pending', data: null, message: '' },
    rankSettings: { status: 'pending', data: null, message: '' },
  }

  // 評価カテゴリの確認
  try {
    const { data: categories, error } = await supabase
      .from('evaluation_categories')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('is_active', true)
      .order('display_order')

    if (error) throw error

    if (categories && categories.length > 0) {
      checks.categories.status = 'success'
      checks.categories.data = categories
      checks.categories.message = `${categories.length}件のカテゴリが登録されています`
    } else {
      checks.categories.status = 'warning'
      checks.categories.message = 'カテゴリが登録されていません（デフォルト値を使用）'
    }
  } catch (error: any) {
    checks.categories.status = 'error'
    checks.categories.message = `エラー: ${error.message}`
  }

  // 評価項目の確認
  try {
    const { data: items, error } = await supabase
      .from('evaluation_items_master')
      .select('*')
      .eq('company_id', user.company_id)

    if (error) throw error

    if (items && items.length > 0) {
      checks.items.status = 'success'
      checks.items.data = items
      checks.items.message = `${items.length}件の評価項目が登録されています`
    } else {
      checks.items.status = 'warning'
      checks.items.message = '評価項目が登録されていません（デフォルト値を使用）'
    }
  } catch (error: any) {
    checks.items.status = 'error'
    checks.items.message = `エラー: ${error.message}`
  }

  // ランク設定の確認
  try {
    const { data: rankSettings, error } = await supabase
      .from('rank_settings')
      .select('*')
      .eq('company_id', user.company_id)
      .order('min_score', { ascending: false })

    if (error) throw error

    if (rankSettings && rankSettings.length > 0) {
      checks.rankSettings.status = 'success'
      checks.rankSettings.data = rankSettings
      checks.rankSettings.message = `${rankSettings.length}件のランク設定が登録されています`
    } else {
      checks.rankSettings.status = 'warning'
      checks.rankSettings.message = 'ランク設定が登録されていません（デフォルト値を使用）'
    }
  } catch (error: any) {
    checks.rankSettings.status = 'error'
    checks.rankSettings.message = `エラー: ${error.message}`
  }

  return checks
}

export default async function SystemCheckPage() {
  const user = await getCurrentUser()
  const checks = await checkSystemConfiguration()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600">正常</Badge>
      case 'warning':
        return <Badge className="bg-yellow-600">警告</Badge>
      case 'error':
        return <Badge className="bg-red-600">エラー</Badge>
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">システム設定確認</h1>
        <p className="mt-2 text-sm text-gray-600">
          カスタム評価設定の状態を確認できます
        </p>
        <p className="mt-1 text-sm text-gray-600">
          会社ID: <code className="bg-gray-100 px-2 py-1 rounded">{user.company_id}</code>
        </p>
      </div>

      <div className="space-y-6">
        {/* 評価カテゴリの確認 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(checks.categories.status)}
                  評価カテゴリ (evaluation_categories)
                </CardTitle>
                <CardDescription>{checks.categories.message}</CardDescription>
              </div>
              {getStatusBadge(checks.categories.status)}
            </div>
          </CardHeader>
          <CardContent>
            {checks.categories.data && Array.isArray(checks.categories.data) && checks.categories.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        カテゴリキー
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        カテゴリ名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        表示順
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {checks.categories.data.map((category: any) => (
                      <tr key={category.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <code className="bg-gray-100 px-2 py-1 rounded">{category.category_key}</code>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{category.category_label}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{category.display_order}</td>
                        <td className="px-4 py-2 text-sm">
                          {category.is_active ? (
                            <Badge className="bg-green-600">有効</Badge>
                          ) : (
                            <Badge className="bg-gray-600">無効</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">データなし（デフォルト値を使用）</p>
            )}
          </CardContent>
        </Card>

        {/* 評価項目の確認 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(checks.items.status)}
                  評価項目 (evaluation_items_master)
                </CardTitle>
                <CardDescription>{checks.items.message}</CardDescription>
              </div>
              {getStatusBadge(checks.items.status)}
            </div>
          </CardHeader>
          <CardContent>
            {checks.items.data && Array.isArray(checks.items.data) && checks.items.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        カテゴリ
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        項目名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        最小点
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        最大点
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        説明
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {checks.items.data.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <code className="bg-gray-100 px-2 py-1 rounded">{item.category}</code>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.min_score}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.max_score}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">データなし（デフォルト値を使用）</p>
            )}
          </CardContent>
        </Card>

        {/* ランク設定の確認 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(checks.rankSettings.status)}
                  ランク設定 (rank_settings)
                </CardTitle>
                <CardDescription>{checks.rankSettings.message}</CardDescription>
              </div>
              {getStatusBadge(checks.rankSettings.status)}
            </div>
          </CardHeader>
          <CardContent>
            {checks.rankSettings.data && Array.isArray(checks.rankSettings.data) && checks.rankSettings.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        ランク名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        最低点
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        報酬額
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        表示順
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {checks.rankSettings.data.map((rank: any) => (
                      <tr key={rank.id}>
                        <td className="px-4 py-2 text-sm font-bold text-gray-900">{rank.rank_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{rank.min_score}点</td>
                        <td className="px-4 py-2 text-sm text-gray-900">¥{rank.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{rank.display_order}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">データなし（デフォルト値を使用）</p>
            )}
          </CardContent>
        </Card>

        {/* 使用方法の説明 */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">💡 確認方法</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900 space-y-2">
            <p>✅ <strong>正常</strong>: カスタム設定が登録されており、正しく機能します</p>
            <p>⚠️ <strong>警告</strong>: カスタム設定がありません。デフォルト値が使用されます</p>
            <p>❌ <strong>エラー</strong>: データ取得に失敗しました。設定を確認してください</p>
            <p className="mt-4 pt-4 border-t border-blue-200">
              <strong>カスタム設定の登録方法:</strong><br />
              管理者設定ページ (/admin/settings) から、評価カテゴリ・評価項目・ランク設定を登録できます
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
