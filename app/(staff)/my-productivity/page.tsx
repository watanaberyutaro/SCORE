import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, FileText, Calendar } from 'lucide-react'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils/format'
import { redirect } from 'next/navigation'

async function getProductivityData(userId: string) {
  const supabase = await createSupabaseServerClient()

  // 過去30日間のデータを取得
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: productivityData } = await supabase
    .from('productivity_data')
    .select('*')
    .eq('staff_id', userId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  return productivityData || []
}

export default async function MyProductivityPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const productivityData = await getProductivityData(user.id)

  // 統計を計算
  const totalSales = productivityData.reduce((sum, d) => sum + (d.sales_amount || 0), 0)
  const totalContracts = productivityData.reduce((sum, d) => sum + (d.contracts_count || 0), 0)
  const totalTasks = productivityData.reduce((sum, d) => sum + (d.tasks_completed || 0), 0)
  const avgAttendance =
    productivityData.length > 0
      ? productivityData.reduce((sum, d) => sum + (d.attendance_rate || 0), 0) / productivityData.length
      : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">生産性データ</h1>
        <p className="mt-2 text-sm text-gray-600">
          あなたの業績と活動データ（過去30日間）
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">過去30日間</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">契約数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalContracts)}件</div>
            <p className="text-xs text-muted-foreground">過去30日間</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了タスク</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalTasks)}件</div>
            <p className="text-xs text-muted-foreground">過去30日間</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">出勤率</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAttendance.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">平均出勤率</p>
          </CardContent>
        </Card>
      </div>

      {/* データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>日別データ</CardTitle>
          <CardDescription>過去30日間の詳細データ</CardDescription>
        </CardHeader>
        <CardContent>
          {productivityData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-2">日付</th>
                    <th className="text-right p-2">売上</th>
                    <th className="text-right p-2">契約数</th>
                    <th className="text-right p-2">タスク</th>
                    <th className="text-right p-2">出勤率</th>
                  </tr>
                </thead>
                <tbody>
                  {productivityData.map((data) => (
                    <tr key={data.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{formatDate(data.date)}</td>
                      <td className="text-right p-2">
                        {data.sales_amount ? formatCurrency(data.sales_amount) : '-'}
                      </td>
                      <td className="text-right p-2">
                        {data.contracts_count ? `${data.contracts_count}件` : '-'}
                      </td>
                      <td className="text-right p-2">
                        {data.tasks_completed ? `${data.tasks_completed}件` : '-'}
                      </td>
                      <td className="text-right p-2">
                        {data.attendance_rate ? `${data.attendance_rate}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">
              まだ生産性データがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
