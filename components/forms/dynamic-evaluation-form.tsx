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

  useEffect(() => {
    fetchEvaluationData()
  }, [staffId, evaluationYear, evaluationMonth])

  async function fetchEvaluationData() {
    try {
      setLoading(true)

      // Fetch categories and items
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from('evaluation_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('evaluation_items_master')
          .select('*')
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
                      step="0.5"
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
  )
}
