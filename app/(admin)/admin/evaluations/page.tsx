'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { ClipboardList, CheckCircle, Clock, Eye } from 'lucide-react'

interface StaffWithEvaluation {
  id: string
  full_name: string
  department: string
  position: string
  latest_evaluation: {
    id: string
    evaluation_year: number
    evaluation_month: number
    status: string
    total_score: number | null
    rank: string | null
    responses: Array<{
      id: string
      admin_id: string
      submitted_at: string | null
      admin: {
        full_name: string
      }
    }>
  } | null
}

export default function AdminEvaluationsPage() {
  const [staff, setStaff] = useState<StaffWithEvaluation[]>([])
  const [loading, setLoading] = useState(true)

  // 現在の年月を取得
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // 現在の期を計算（7月以降は新しい期）
  const defaultPeriod = currentMonth >= 7 ? currentYear - 2016 : currentYear - 2017

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(defaultPeriod)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<string>('all') // 期内の月選択（'all'または'YYYY-MM'形式）

  useEffect(() => {
    fetchStaff()
  }, [selectedPeriod, selectedYear, selectedMonth, selectedPeriodMonth])

  async function fetchStaff() {
    try {
      let url = '/api/admin/evaluations?'
      if (selectedPeriod) {
        if (selectedPeriodMonth === 'all') {
          url += `period=${selectedPeriod}`
        } else {
          // 期内の特定月が選択された場合
          const [year, month] = selectedPeriodMonth.split('-')
          url += `year=${year}&month=${parseInt(month)}`
        }
      } else {
        url += `year=${selectedYear}&month=${selectedMonth}`
      }

      const response = await fetch(url)
      const data = await response.json()
      setStaff(data.data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  // 期に含まれる月のリストを生成
  const getPeriodMonths = (period: number) => {
    const startYear = 2016 + period
    const endYear = 2017 + period
    const months = []

    // 7月〜12月（開始年）
    for (let month = 7; month <= 12; month++) {
      months.push({
        value: `${startYear}-${String(month).padStart(2, '0')}`,
        label: `${startYear}年${month}月`
      })
    }

    // 1月〜6月（終了年）
    for (let month = 1; month <= 6; month++) {
      months.push({
        value: `${endYear}-${String(month).padStart(2, '0')}`,
        label: `${endYear}年${month}月`
      })
    }

    return months
  }

  // 年の選択肢を生成（過去5年〜来年まで）
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
      years.push(year)
    }
    return years
  }

  // 月の選択肢
  const months = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ]

  const getEvaluationStatus = (evaluation: StaffWithEvaluation['latest_evaluation']) => {
    if (!evaluation) {
      return { label: '未着手', color: 'bg-gray-100 text-gray-800', count: '0/3' }
    }

    const submittedCount = evaluation.responses?.filter((r) => r.submitted_at).length || 0

    if (submittedCount === 3) {
      return { label: '完了', color: 'bg-green-100 text-green-800', count: '3/3' }
    } else if (submittedCount > 0) {
      return { label: '進行中', color: 'bg-blue-100 text-blue-800', count: `${submittedCount}/3` }
    } else {
      return { label: '下書き', color: 'bg-yellow-100 text-yellow-800', count: '0/3' }
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">評価管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          スタッフの評価を入力・管理します
        </p>
      </div>

      {/* 評価期間選択 */}
      <Card className="mb-6 border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader>
          <CardTitle className="text-black">評価期間の選択</CardTitle>
          <CardDescription className="text-black">
            期で選択するか、年月で選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 期の選択 */}
            <div>
              <label htmlFor="period" className="text-black font-semibold block mb-2">
                期で選択
              </label>
              <select
                id="period"
                value={selectedPeriod || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedPeriod(value ? parseInt(value) : null)
                  setSelectedPeriodMonth('all') // 期を変更したら月選択をリセット
                }}
                className="w-full rounded-md border-2 px-4 py-3 text-black focus:border-[#05a7be] focus:ring-2 focus:ring-[#05a7be]/20"
                style={{ borderColor: selectedPeriod ? '#05a7be' : '#d1d5db' }}
              >
                <option value="">期を選択しない</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p}>
                    第{p}期 ({2016 + p}年7月〜{2017 + p}年6月)
                  </option>
                ))}
              </select>
            </div>

            {/* 期内の月選択 or 年月選択 */}
            {selectedPeriod ? (
              <div>
                <label htmlFor="periodMonth" className="text-black font-semibold block mb-2">
                  期内の月を選択（オプション）
                </label>
                <select
                  id="periodMonth"
                  value={selectedPeriodMonth}
                  onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                  className="w-full rounded-md border-2 px-4 py-3 text-black focus:border-[#05a7be] focus:ring-2 focus:ring-[#05a7be]/20"
                  style={{ borderColor: '#18c4b8' }}
                >
                  <option value="all">全ての月</option>
                  {getPeriodMonths(selectedPeriod).map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* 年の選択 */}
                <div>
                  <label htmlFor="year" className="text-black font-semibold block mb-2">
                    評価年
                  </label>
                  <select
                    id="year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full rounded-md border-2 border-gray-300 px-4 py-3 text-black focus:border-[#05a7be] focus:ring-2 focus:ring-[#05a7be]/20"
                  >
                    {getYearOptions().map(year => (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    ))}
                  </select>
                </div>

                {/* 月の選択 */}
                <div>
                  <label htmlFor="month" className="text-black font-semibold block mb-2">
                    評価月
                  </label>
                  <select
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full rounded-md border-2 border-gray-300 px-4 py-3 text-black focus:border-[#05a7be] focus:ring-2 focus:ring-[#05a7be]/20"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 選択中の期間表示 */}
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
            <p className="text-sm text-black">
              <strong>選択中の評価期間:</strong>{' '}
              {selectedPeriod ? (
                selectedPeriodMonth === 'all' ? (
                  <>第{selectedPeriod}期 全ての月 ({2016 + selectedPeriod}年7月〜{2017 + selectedPeriod}年6月)</>
                ) : (
                  <>
                    第{selectedPeriod}期 - {getPeriodMonths(selectedPeriod).find(m => m.value === selectedPeriodMonth)?.label}
                  </>
                )
              ) : (
                <>{selectedYear}年{selectedMonth}月</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 統計 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総スタッフ数</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}名</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">評価完了</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => getEvaluationStatus(s.latest_evaluation).label === '完了').length}名
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未完了</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => getEvaluationStatus(s.latest_evaluation).label !== '完了').length}名
            </div>
          </CardContent>
        </Card>
      </div>

      {/* スタッフ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフ一覧</CardTitle>
          <CardDescription>
            各スタッフの評価状況を確認し、評価を入力できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* PC: テーブル表示 */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>部署</TableHead>
                  <TableHead>役職</TableHead>
                  <TableHead>評価状況</TableHead>
                  <TableHead>スコア</TableHead>
                  <TableHead>ランク</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => {
                  const status = getEvaluationStatus(s.latest_evaluation)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.department}</TableCell>
                      <TableCell>{s.position}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={status.color}>{status.label}</Badge>
                          <span className="text-sm text-gray-500">{status.count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.latest_evaluation?.total_score
                          ? `${s.latest_evaluation.total_score.toFixed(1)}点`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {s.latest_evaluation?.rank ? (
                          <Badge>{s.latest_evaluation.rank}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link
                            href={
                              selectedPeriod && selectedPeriodMonth !== 'all'
                                ? `/admin/evaluation-detail/${s.id}?${selectedPeriodMonth.split('-').map((v, i) => i === 0 ? `year=${v}` : `month=${parseInt(v)}`).join('&')}`
                                : `/admin/evaluation-detail/${s.id}?year=${selectedYear}&month=${selectedMonth}`
                            }
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2"
                              style={{ borderColor: '#6366f1', color: '#6366f1' }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              詳細
                            </Button>
                          </Link>
                          <Link
                            href={
                              selectedPeriod
                                ? `/admin/evaluations/${s.id}?period=${selectedPeriod}`
                                : `/admin/evaluations/${s.id}?year=${selectedYear}&month=${selectedMonth}`
                            }
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2"
                              style={{ borderColor: '#05a7be', color: '#05a7be' }}
                            >
                              評価する
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* スマホ: カード表示 */}
          <div className="lg:hidden space-y-3">
            {staff.map((s) => {
              const status = getEvaluationStatus(s.latest_evaluation)
              return (
                <div
                  key={s.id}
                  className="border rounded-lg p-3 space-y-3"
                  style={{ borderColor: '#e0f2f1', backgroundColor: 'rgba(5, 167, 190, 0.02)' }}
                >
                  {/* ヘッダー: 名前とランク */}
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: '#e0f2f1' }}>
                    <div>
                      <div className="font-bold text-base text-black">{s.full_name}</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {s.department} · {s.position}
                      </div>
                    </div>
                    {s.latest_evaluation?.rank ? (
                      <Badge>{s.latest_evaluation.rank}</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>

                  {/* 評価状況とスコア */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>{status.label}</Badge>
                      <span className="text-xs text-gray-500">{status.count}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">スコア</div>
                      <div className="text-lg font-bold text-black">
                        {s.latest_evaluation?.total_score
                          ? `${s.latest_evaluation.total_score.toFixed(1)}点`
                          : '-'}
                      </div>
                    </div>
                  </div>

                  {/* アクション */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={
                        selectedPeriod && selectedPeriodMonth !== 'all'
                          ? `/admin/evaluation-detail/${s.id}?${selectedPeriodMonth.split('-').map((v, i) => i === 0 ? `year=${v}` : `month=${parseInt(v)}`).join('&')}`
                          : `/admin/evaluation-detail/${s.id}?year=${selectedYear}&month=${selectedMonth}`
                      }
                      className="block"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-2"
                        style={{ borderColor: '#6366f1', color: '#6366f1' }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        詳細
                      </Button>
                    </Link>
                    <Link
                      href={
                        selectedPeriod
                          ? `/admin/evaluations/${s.id}?period=${selectedPeriod}`
                          : `/admin/evaluations/${s.id}?year=${selectedYear}&month=${selectedMonth}`
                      }
                      className="block"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-2"
                        style={{ borderColor: '#05a7be', color: '#05a7be' }}
                      >
                        評価する
                      </Button>
                    </Link>
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
