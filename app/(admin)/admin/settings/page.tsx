import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/format'
import { Calendar, Settings } from 'lucide-react'

async function getSettings() {
  const supabase = await createSupabaseServerClient()

  // 評価サイクル一覧
  const { data: cycles } = await supabase
    .from('evaluation_cycles')
    .select('*')
    .order('start_date', { ascending: false })

  // 評価項目マスター
  const { data: items } = await supabase
    .from('evaluation_items_master')
    .select('*')
    .order('category')

  return {
    cycles: cycles || [],
    items: items || [],
  }
}

export default async function AdminSettingsPage() {
  const data = await getSettings()

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      planning: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      planning: '計画中',
      active: '実施中',
      completed: '完了',
    }
    return (
      <Badge className={variants[status] || ''}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      performance: '成果評価',
      behavior: '行動評価',
      growth: '成長評価',
    }
    return labels[category] || category
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          評価サイクルと評価項目の管理
        </p>
      </div>

      {/* 評価サイクル */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                評価サイクル
              </CardTitle>
              <CardDescription>評価期間の管理</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>サイクル名</TableHead>
                <TableHead>開始日</TableHead>
                <TableHead>終了日</TableHead>
                <TableHead>試用日</TableHead>
                <TableHead>実施日</TableHead>
                <TableHead>最終日</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">{cycle.cycle_name}</TableCell>
                  <TableCell>{formatDate(cycle.start_date)}</TableCell>
                  <TableCell>{formatDate(cycle.end_date)}</TableCell>
                  <TableCell>
                    {cycle.trial_date ? formatDate(cycle.trial_date) : '-'}
                  </TableCell>
                  <TableCell>
                    {cycle.implementation_date ? formatDate(cycle.implementation_date) : '-'}
                  </TableCell>
                  <TableCell>
                    {cycle.final_date ? formatDate(cycle.final_date) : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(cycle.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 評価項目マスター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            評価項目マスター
          </CardTitle>
          <CardDescription>評価項目の定義</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>カテゴリ</TableHead>
                <TableHead>項目名</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>最小スコア</TableHead>
                <TableHead>最大スコア</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="max-w-md">{item.description}</TableCell>
                  <TableCell>{item.min_score}</TableCell>
                  <TableCell>{item.max_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
