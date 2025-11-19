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
    goal_title: '',
    goal_description: '',
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
      if (!isDraft && !formData.goal_title) {
        setError('目標タイトルを入力してください')
        return
      }

      if (!formData.target_date) {
        setError('目標達成日を入力してください')
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('ユーザーが見つかりません')

      const goalData = {
        staff_id: userData.user.id,
        goal_title: formData.goal_title,
        goal_description: formData.goal_description,
        target_date: formData.target_date,
        status: 'active',
        interview_status: 'pending',
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
        {/* 現在の期情報 */}
        {currentPeriod && (
          <Card className="border-2" style={{ borderColor: '#05a7be' }}>
            <CardContent className="pt-6">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                <p className="text-sm text-black">
                  <strong>現在の期:</strong> {currentPeriod.periodName} {currentPeriod.quarterName}
                </p>
                <p className="text-xs text-gray-600">
                  {currentPeriod.startDate.toLocaleDateString('ja-JP')} 〜 {currentPeriod.endDate.toLocaleDateString('ja-JP')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 目標設定 */}
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Target className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
              目標設定
            </CardTitle>
            <CardDescription className="text-black">
              達成すべき目標を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="goal_title" className="text-black">目標タイトル *</Label>
              <Input
                id="goal_title"
                value={formData.goal_title}
                onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
                placeholder="例：売上目標1000万円の達成"
                className="border-2"
                style={{ borderColor: '#05a7be' }}
                required
              />
            </div>
            <div>
              <Label htmlFor="goal_description" className="text-black">目標の説明 *</Label>
              <Textarea
                id="goal_description"
                value={formData.goal_description}
                onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                placeholder="目標の詳細な説明を入力してください"
                rows={6}
                className="border-2"
                style={{ borderColor: '#05a7be' }}
                required
              />
            </div>
            <div>
              <Label htmlFor="target_date" className="text-black">目標達成日 *</Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="border-2"
                style={{ borderColor: '#05a7be' }}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex-1 bg-[#05a7be] hover:bg-[#048a9d]"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? '作成中...' : '目標を作成'}
          </Button>
        </div>
      </div>
    </div>
  )
}
