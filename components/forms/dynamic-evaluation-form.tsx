'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { EvaluationItemMaster, EvaluationCategoryMaster } from '@/types'

interface DynamicEvaluationFormProps {
  staffId: string
  staffName: string
  evaluationPeriod: string
  evaluationYear: number
  evaluationMonth: number
  onSubmit: (scores: Record<string, number>, comments: Record<string, string>, isDraft: boolean) => Promise<void>
  submitting?: boolean
}

interface ItemScore {
  itemId: string
  score: number
  comment: string
}

export function DynamicEvaluationForm({
  staffId,
  staffName,
  evaluationPeriod,
  evaluationYear,
  evaluationMonth,
  onSubmit,
  submitting = false,
}: DynamicEvaluationFormProps) {
  const supabase = createClient()

  const [categories, setCategories] = useState<EvaluationCategoryMaster[]>([])
  const [items, setItems] = useState<EvaluationItemMaster[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null)
  const [previousMonthEvaluation, setPreviousMonthEvaluation] = useState<any>(null)
  const [staffGoals, setStaffGoals] = useState<any[]>([])
  const [loadingPreviousData, setLoadingPreviousData] = useState(true)

  useEffect(() => {
    fetchEvaluationData()
    fetchPreviousMonthEvaluation()
    fetchStaffGoals()
  }, [staffId, evaluationYear, evaluationMonth])

  async function fetchEvaluationData() {
    try {
      setLoading(true)

      // Get staff's company_id first
      const { data: staffData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', staffId)
        .single()

      if (!staffData) {
        throw new Error('スタッフ情報が見つかりません')
      }

      // Fetch categories and items filtered by company_id
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from('evaluation_categories')
          .select('*')
          .eq('company_id', staffData.company_id)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('evaluation_items_master')
          .select('*')
          .eq('company_id', staffData.company_id)
      ])

      if (categoriesRes.error) throw categoriesRes.error
      if (itemsRes.error) throw itemsRes.error

      setCategories(categoriesRes.data || [])
      setItems(itemsRes.data || [])

      // Initialize scores with 0 for all items
      const initialScores: Record<string, number> = {}
      itemsRes.data?.forEach(item => {
        initialScores[item.id] = 0
      })

      // Try to fetch existing evaluation
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const response = await fetch(
          `/api/admin/evaluations/${staffId}?year=${evaluationYear}&month=${evaluationMonth}`
        )
        const data = await response.json()

        if (data.data?.responses?.[0]?.items) {
          // Load existing scores
          data.data.responses[0].items.forEach((item: any) => {
            const masterItem = itemsRes.data?.find(i => i.item_name === item.item_name)
            if (masterItem) {
              initialScores[masterItem.id] = item.score || 0
              if (item.comment) {
                setComments(prev => ({ ...prev, [masterItem.id]: item.comment }))
              }
            }
          })
        }
        setExistingEvaluation(data.data)
      }

      setScores(initialScores)
    } catch (error) {
      console.error('Error fetching evaluation data:', error)
      setErrors(['評価データの読み込みに失敗しました'])
    } finally {
      setLoading(false)
    }
  }

  async function fetchPreviousMonthEvaluation() {
    try {
      setLoadingPreviousData(true)

      // Get current logged-in admin
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        return
      }

      // Calculate previous month
      let prevYear = evaluationYear
      let prevMonth = evaluationMonth - 1
      if (prevMonth === 0) {
        prevMonth = 12
        prevYear = evaluationYear - 1
      }

      // Fetch previous month's evaluation
      const { data: prevEvaluation } = await supabase
        .from('evaluations')
        .select('*')
        .eq('staff_id', staffId)
        .eq('evaluation_year', prevYear)
        .eq('evaluation_month', prevMonth)
        .single()

      if (prevEvaluation) {
        // Fetch only the current admin's response for the previous month
        const { data: myResponse } = await supabase
          .from('evaluation_responses')
          .select(`
            *,
            admin:users!evaluation_responses_admin_id_fkey(full_name),
            items:evaluation_items(*)
          `)
          .eq('evaluation_id', prevEvaluation.id)
          .eq('admin_id', userData.user.id)
          .not('submitted_at', 'is', null)
          .single()

        if (myResponse) {
          setPreviousMonthEvaluation({
            ...prevEvaluation,
            myResponse: myResponse
          })
        }
      }
    } catch (error) {
      console.error('Error fetching previous month evaluation:', error)
    } finally {
      setLoadingPreviousData(false)
    }
  }

  async function fetchStaffGoals() {
    try {
      const { data: goals } = await supabase
        .from('staff_goals')
        .select('*')
        .eq('staff_id', staffId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      setStaffGoals(goals || [])
    } catch (error) {
      console.error('Error fetching staff goals:', error)
    }
  }

  const handleScoreChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setScores(prev => ({ ...prev, [itemId]: numValue }))
  }

  const handleCommentChange = (itemId: string, value: string) => {
    setComments(prev => ({ ...prev, [itemId]: value }))
  }

  const calculateCategoryTotal = (categoryKey: string) => {
    const categoryItems = items.filter(item => item.category === categoryKey)
    return categoryItems.reduce((sum, item) => sum + (scores[item.id] || 0), 0)
  }

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0)
  }

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      // Validate all items have scores
      const newErrors: string[] = []
      items.forEach(item => {
        if (scores[item.id] === undefined || scores[item.id] === null) {
          newErrors.push(`${item.item_name}のスコアを入力してください`)
        }
      })

      if (newErrors.length > 0) {
        setErrors(newErrors)
        return
      }
    }

    setErrors([])
    await onSubmit(scores, comments, isDraft)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  const totalScore = calculateTotalScore()

  // Group items by category
  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category.category_key] = items.filter(item => item.category === category.category_key)
    return acc
  }, {} as Record<string, EvaluationItemMaster[]>)

  return (
    <div className="space-y-6">
      {/* スタッフの目標表示 */}
      {staffGoals.length > 0 && (
        <Card className="border-2" style={{ borderColor: '#f59e0b' }}>
          <CardHeader>
            <CardTitle className="text-lg text-black">📋 現在の目標</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffGoals.map((goal) => (
                <div key={goal.id} className="p-3 bg-amber-50 rounded-md">
                  <h4 className="font-semibold text-black">{goal.goal_title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{goal.goal_description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>目標期日: {new Date(goal.target_date).toLocaleDateString('ja-JP')}</span>
                    <span>達成率: {goal.achievement_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側: 評価フォーム (2/3の幅) */}
        <div className="lg:col-span-2 space-y-6">
      {/* ヘッダー */}
      <Card className="border-2" style={{ borderColor: '#05a7be' }}>
        <CardHeader>
          <CardTitle className="text-2xl text-black">{staffName}さんの評価</CardTitle>
          <CardDescription className="text-black">評価期間: {evaluationPeriod}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(category => (
              <div key={category.id}>
                <p className="text-sm text-gray-600">{category.category_label}</p>
                <p className="text-2xl font-bold text-black">
                  {calculateCategoryTotal(category.category_key).toFixed(1)}点
                </p>
              </div>
            ))}
            <div>
              <p className="text-sm text-gray-600">総合スコア</p>
              <p className="text-2xl font-bold" style={{ color: '#05a7be' }}>
                {totalScore.toFixed(1)}点
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 各カテゴリの評価項目 */}
      {categories.map(category => {
        const categoryItems = itemsByCategory[category.category_key] || []
        if (categoryItems.length === 0) return null

        return (
          <Card key={category.id} className="border-2" style={{ borderColor: '#05a7be' }}>
            <CardHeader>
              <CardTitle className="text-black">{category.category_label}</CardTitle>
              <CardDescription className="text-black">
                {category.description || ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoryItems.map(item => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`item-${item.id}`} className="text-black">
                      {item.item_name}
                      <span className="ml-2 text-xs text-gray-500">
                        ({item.min_score}〜{item.max_score}点)
                      </span>
                    </Label>
                    <Input
                      id={`item-${item.id}`}
                      type="number"
                      min={item.min_score}
                      max={item.max_score}
                      step="1"
                      value={scores[item.id] || 0}
                      onChange={(e) => handleScoreChange(item.id, e.target.value)}
                      className="w-24 border-2"
                      style={{ borderColor: '#05a7be' }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <Textarea
                    placeholder="コメント（任意）"
                    value={comments[item.id] || ''}
                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                    rows={2}
                    className="border-2"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {/* アクションボタン */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={submitting}
        >
          下書き保存
        </Button>
        <Button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="bg-[#05a7be] hover:bg-[#048a9d]"
        >
          {submitting ? '提出中...' : '評価を提出'}
        </Button>
      </div>
        </div>

        {/* 右側: 前月の評価 (1/3の幅) */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Card className="border-2" style={{ borderColor: '#9333ea' }}>
              <CardHeader>
                <CardTitle className="text-lg text-black">📊 前月の評価</CardTitle>
                <CardDescription className="text-black">
                  {evaluationMonth === 1 ? `${evaluationYear - 1}年12月` : `${evaluationYear}年${evaluationMonth - 1}月`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPreviousData ? (
                  <p className="text-sm text-gray-500">読み込み中...</p>
                ) : previousMonthEvaluation?.myResponse ? (
                  <div className="space-y-4">
                    {/* あなたの評価スコア */}
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">あなたが入力した評価</p>
                      <p className="text-sm text-gray-600">スコア</p>
                      <p className="text-3xl font-bold" style={{ color: '#9333ea' }}>
                        {previousMonthEvaluation.myResponse.total_score?.toFixed(1) || '0.0'}点
                      </p>
                    </div>

                    {/* カテゴリ別スコア */}
                    {previousMonthEvaluation.myResponse.items && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700">カテゴリ別スコア</h4>
                        {categories.map((category) => {
                          const categoryItems = previousMonthEvaluation.myResponse.items?.filter(
                            (item: any) => item.category === category.category_key
                          ) || []
                          const categoryTotal = categoryItems.reduce((sum: number, item: any) => sum + (item.score || 0), 0)

                          if (categoryItems.length === 0) return null

                          return (
                            <div key={category.id} className="p-3 bg-gray-50 rounded">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">{category.category_label}</span>
                                <span className="text-lg font-bold text-purple-600">{categoryTotal.toFixed(1)}点</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* 評価項目の詳細 */}
                    {previousMonthEvaluation.myResponse.items && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700">評価項目の詳細</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {previousMonthEvaluation.myResponse.items?.map((item: any, index: number) => (
                            <div key={index} className="p-2 bg-white border border-gray-200 rounded text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-gray-700">{item.item_name}</span>
                                <span className="font-bold text-purple-600">{item.score}点</span>
                              </div>
                              {item.comment && (
                                <p className="mt-1 text-gray-600 italic">💬 {item.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">前月のあなたの評価データがありません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
