'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Target, ArrowLeft, Save, Send } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculatePeriod, getAllPeriods } from '@/lib/utils/period-calculator'

export default function NewGoalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [establishmentDate, setEstablishmentDate] = useState<string | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<any>(null)
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([])

  const [formData, setFormData] = useState({
    period_number: 0,
    period_quarter: 1,
    achievement_title: '',
    achievement_description: '',
    achievement_kpi: '',
    achievement_target_value: '',
    behavior_title: '',
    behavior_description: '',
    behavior_kpi: '',
    behavior_target_value: '',
    target_date: '',
  })

  useEffect(() => {
    fetchCompanyInfo()
  }, [])

  async function fetchCompanyInfo() {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: userInfo } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!userInfo) return

      const { data: companyData } = await supabase
        .from('companies')
        .select('establishment_date')
        .eq('id', userInfo.company_id)
        .single()

      if (companyData?.establishment_date) {
        setEstablishmentDate(companyData.establishment_date)
        const period = calculatePeriod(companyData.establishment_date)
        setCurrentPeriod(period)

        const periods = getAllPeriods(companyData.establishment_date)
        setAvailablePeriods(periods)

        setFormData(prev => ({
          ...prev,
          period_number: period.periodNumber,
          period_quarter: period.quarterNumber
        }))
      }
    } catch (err) {
      console.error('Error fetching company info:', err)
    }
  }

  async function handleSubmit(isDraft: boolean) {
    try {
      setLoading(true)
      setError('')

      // バリデーション
      if (!isDraft && !formData.achievement_title && !formData.behavior_title) {
        setError('成果目標または行動目標のいずれかを入力してください')
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('ユーザーが見つかりません')

      // 期番号から年度を計算
      const selectedPeriod = availablePeriods.find(p => p.periodNumber === formData.period_number)
      const periodYear = selectedPeriod ? selectedPeriod.startDate.getFullYear() : new Date().getFullYear()

      const goalData = {
        staff_id: userData.user.id,
        period_year: periodYear,
        period_quarter: formData.period_quarter,
        achievement_title: formData.achievement_title || null,
        achievement_description: formData.achievement_description || null,
        achievement_kpi: formData.achievement_kpi || null,
        achievement_target_value: formData.achievement_target_value || null,
        behavior_title: formData.behavior_title || null,
        behavior_description: formData.behavior_description || null,
        behavior_kpi: formData.behavior_kpi || null,
        behavior_target_value: formData.behavior_target_value || null,
        target_date: formData.target_date || null,
        status: isDraft ? 'draft' : 'submitted',
        submitted_at: isDraft ? null : new Date().toISOString(),
      }

      const { error } = await supabase
        .from('staff_goals')
        .insert([goalData])

      if (error) throw error

      router.push('/my-goals')
    } catch (err: any) {
      console.error('Error saving goal:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link href="/my-goals">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            目標一覧に戻る
          </Button>
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-black">新しい目標を作成</h1>
        <p className="text-sm lg:text-base text-black mt-2">
          成果目標と行動目標を設定しましょう
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* 期間設定 */}
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader>
            <CardTitle className="text-black">期間設定</CardTitle>
            <CardDescription className="text-black">
              目標の対象期間を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPeriod && (
              <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                <p className="text-sm text-black">
                  <strong>現在の期:</strong> {currentPeriod.periodName} {currentPeriod.quarterName}
                </p>
                <p className="text-xs text-gray-600">
                  {currentPeriod.startDate.toLocaleDateString('ja-JP')} 〜 {currentPeriod.endDate.toLocaleDateString('ja-JP')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="period_number" className="text-black">期</Label>
                <select
                  id="period_number"
                  value={formData.period_number}
                  onChange={(e) => setFormData({ ...formData, period_number: parseInt(e.target.value) })}
                  className="w-full h-10 rounded-md border-2 px-3"
                  style={{ borderColor: '#05a7be' }}
                  disabled={availablePeriods.length === 0}
                >
                  {availablePeriods.length === 0 ? (
                    <option value={0}>読み込み中...</option>
                  ) : (
                    availablePeriods.map((period) => (
                      <option key={period.periodNumber} value={period.periodNumber}>
                        {period.periodName}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="period_quarter" className="text-black">四半期</Label>
                <select
                  id="period_quarter"
                  value={formData.period_quarter}
                  onChange={(e) => setFormData({ ...formData, period_quarter: parseInt(e.target.value) })}
                  className="w-full h-10 rounded-md border-2 px-3"
                  style={{ borderColor: '#05a7be' }}
                >
                  <option value={1}>第1四半期</option>
                  <option value={2}>第2四半期</option>
                  <option value={3}>第3四半期</option>
                  <option value={4}>第4四半期</option>
                </select>
              </div>
              <div>
                <Label htmlFor="target_date" className="text-black">目標達成日（任意）</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="border-2"
                  style={{ borderColor: '#05a7be' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 成果目標 */}
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Target className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
              成果目標
            </CardTitle>
            <CardDescription className="text-black">
              達成すべき具体的な成果を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="achievement_title" className="text-black">タイトル</Label>
              <Input
                id="achievement_title"
                value={formData.achievement_title}
                onChange={(e) => setFormData({ ...formData, achievement_title: e.target.value })}
                placeholder="例：売上目標の達成"
                className="border-2"
                style={{ borderColor: '#05a7be' }}
              />
            </div>
            <div>
              <Label htmlFor="achievement_description" className="text-black">説明</Label>
              <Textarea
                id="achievement_description"
                value={formData.achievement_description}
                onChange={(e) => setFormData({ ...formData, achievement_description: e.target.value })}
                placeholder="目標の詳細な説明を入力してください"
                rows={4}
                className="border-2"
                style={{ borderColor: '#05a7be' }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="achievement_kpi" className="text-black">KPI</Label>
                <Input
                  id="achievement_kpi"
                  value={formData.achievement_kpi}
                  onChange={(e) => setFormData({ ...formData, achievement_kpi: e.target.value })}
                  placeholder="例：売上高"
                  className="border-2"
                  style={{ borderColor: '#05a7be' }}
                />
              </div>
              <div>
                <Label htmlFor="achievement_target_value" className="text-black">目標値</Label>
                <Input
                  id="achievement_target_value"
                  value={formData.achievement_target_value}
                  onChange={(e) => setFormData({ ...formData, achievement_target_value: e.target.value })}
                  placeholder="例：1000万円"
                  className="border-2"
                  style={{ borderColor: '#05a7be' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 行動目標 */}
        <Card className="border-2" style={{ borderColor: '#18c4b8' }}>
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Target className="mr-2 h-5 w-5" style={{ color: '#18c4b8' }} />
              行動目標
            </CardTitle>
            <CardDescription className="text-black">
              目標達成のための具体的な行動を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="behavior_title" className="text-black">タイトル</Label>
              <Input
                id="behavior_title"
                value={formData.behavior_title}
                onChange={(e) => setFormData({ ...formData, behavior_title: e.target.value })}
                placeholder="例：新規顧客訪問の実施"
                className="border-2"
                style={{ borderColor: '#18c4b8' }}
              />
            </div>
            <div>
              <Label htmlFor="behavior_description" className="text-black">説明</Label>
              <Textarea
                id="behavior_description"
                value={formData.behavior_description}
                onChange={(e) => setFormData({ ...formData, behavior_description: e.target.value })}
                placeholder="行動目標の詳細な説明を入力してください"
                rows={4}
                className="border-2"
                style={{ borderColor: '#18c4b8' }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="behavior_kpi" className="text-black">KPI</Label>
                <Input
                  id="behavior_kpi"
                  value={formData.behavior_kpi}
                  onChange={(e) => setFormData({ ...formData, behavior_kpi: e.target.value })}
                  placeholder="例：訪問件数"
                  className="border-2"
                  style={{ borderColor: '#18c4b8' }}
                />
              </div>
              <div>
                <Label htmlFor="behavior_target_value" className="text-black">目標値</Label>
                <Input
                  id="behavior_target_value"
                  value={formData.behavior_target_value}
                  onChange={(e) => setFormData({ ...formData, behavior_target_value: e.target.value })}
                  placeholder="例：月10件"
                  className="border-2"
                  style={{ borderColor: '#18c4b8' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? '保存中...' : '下書き保存'}
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex-1 bg-[#05a7be] hover:bg-[#048a9d]"
          >
            <Send className="mr-2 h-4 w-4" />
            {loading ? '送信中...' : '提出する'}
          </Button>
        </div>
      </div>
    </div>
  )
}
