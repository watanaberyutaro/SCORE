'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { EvaluationFormData } from '@/types'
import { calculateScores, determineRank, getRankInfo, validateEvaluationForm } from '@/lib/utils/evaluation-calculator'
import { PERFORMANCE_ITEMS, BEHAVIOR_ITEMS, GROWTH_ITEMS, CATEGORY_NAMES } from '@/lib/constants/evaluation-items'
import { getRankColor } from '@/lib/utils/evaluation-calculator'

interface EvaluationFormProps {
  staffId: string
  staffName: string
  evaluationPeriod: string
  initialData?: EvaluationFormData
  onSubmit: (data: EvaluationFormData, isDraft: boolean) => Promise<void>
  submitting?: boolean
}

export function EvaluationForm({
  staffId,
  staffName,
  evaluationPeriod,
  initialData,
  onSubmit,
  submitting = false,
}: EvaluationFormProps) {
  const [formData, setFormData] = useState<EvaluationFormData>(
    initialData || {
      performance: {
        achievement: 0,
        attendance: 0,
        compliance: 0,
        client: 0,
      },
      behavior: {
        initiative: 0,
        responsibility: 0,
        cooperation: 0,
        appearance: 0,
      },
      growth: {
        selfImprovement: 0,
        response: 0,
        goalAchievement: 0,
      },
      comments: {},
    }
  )

  const [errors, setErrors] = useState<string[]>([])
  const [scores, setScores] = useState(calculateScores(formData))

  useEffect(() => {
    setScores(calculateScores(formData))
  }, [formData])

  const handleScoreChange = (category: keyof EvaluationFormData, field: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: numValue,
      },
    }))
  }

  const handleCommentChange = (itemId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      comments: {
        ...prev.comments,
        [itemId]: value,
      },
    }))
  }

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      const validation = validateEvaluationForm(formData)
      if (!validation.isValid) {
        setErrors(validation.errors)
        return
      }
    }

    setErrors([])
    await onSubmit(formData, isDraft)
  }

  const rank = determineRank(scores.totalScore)
  const rankInfo = getRankInfo(rank)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{staffName}さんの評価</CardTitle>
          <CardDescription>評価期間: {evaluationPeriod}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">成果評価</p>
              <p className="text-2xl font-bold">{scores.performanceScore.toFixed(1)}点</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">行動評価</p>
              <p className="text-2xl font-bold">{scores.behaviorScore.toFixed(1)}点</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">成長評価</p>
              <p className="text-2xl font-bold">{scores.growthScore.toFixed(1)}点</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">総合スコア</p>
              <p className="text-2xl font-bold">{scores.totalScore.toFixed(1)}点</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">予想ランク</p>
              <Badge className={`text-lg ${getRankColor(rank)}`}>{rank}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">報酬</p>
              <p className="text-lg font-semibold">
                {rankInfo.reward > 0 ? '+' : ''}
                {rankInfo.reward.toLocaleString()}円
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

      {/* 成果評価 */}
      <Card>
        <CardHeader>
          <CardTitle>{CATEGORY_NAMES.performance}</CardTitle>
          <CardDescription>売上や実績、勤怠など業務成果に関する評価</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {PERFORMANCE_ITEMS.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`performance-${item.id}`}>
                  {item.name}
                  <span className="ml-2 text-xs text-gray-500">
                    ({item.minScore}〜{item.maxScore}点)
                  </span>
                </Label>
                <Input
                  id={`performance-${item.id}`}
                  type="number"
                  min={item.minScore}
                  max={item.maxScore}
                  step="0.5"
                  value={formData.performance[item.id as keyof typeof formData.performance]}
                  onChange={(e) => handleScoreChange('performance', item.id, e.target.value)}
                  className="w-24"
                />
              </div>
              <p className="text-sm text-gray-500">{item.description}</p>
              <Textarea
                placeholder="コメント（任意）"
                value={formData.comments[item.id] || ''}
                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 行動評価 */}
      <Card>
        <CardHeader>
          <CardTitle>{CATEGORY_NAMES.behavior}</CardTitle>
          <CardDescription>主体性、責任感、協調性など行動面に関する評価</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {BEHAVIOR_ITEMS.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`behavior-${item.id}`}>
                  {item.name}
                  <span className="ml-2 text-xs text-gray-500">
                    ({item.minScore}〜{item.maxScore}点)
                  </span>
                </Label>
                <Input
                  id={`behavior-${item.id}`}
                  type="number"
                  min={item.minScore}
                  max={item.maxScore}
                  step="0.5"
                  value={formData.behavior[item.id as keyof typeof formData.behavior]}
                  onChange={(e) => handleScoreChange('behavior', item.id, e.target.value)}
                  className="w-24"
                />
              </div>
              <p className="text-sm text-gray-500">{item.description}</p>
              <Textarea
                placeholder="コメント（任意）"
                value={formData.comments[item.id] || ''}
                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 成長評価 */}
      <Card>
        <CardHeader>
          <CardTitle>{CATEGORY_NAMES.growth}</CardTitle>
          <CardDescription>自己研鑽、レスポンス、目標達成など成長面に関する評価</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {GROWTH_ITEMS.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`growth-${item.id}`}>
                  {item.name}
                  <span className="ml-2 text-xs text-gray-500">
                    ({item.minScore}〜{item.maxScore}点)
                  </span>
                </Label>
                <Input
                  id={`growth-${item.id}`}
                  type="number"
                  min={item.minScore}
                  max={item.maxScore}
                  step="0.5"
                  value={formData.growth[item.id as keyof typeof formData.growth]}
                  onChange={(e) => handleScoreChange('growth', item.id, e.target.value)}
                  className="w-24"
                />
              </div>
              <p className="text-sm text-gray-500">{item.description}</p>
              <Textarea
                placeholder="コメント（任意）"
                value={formData.comments[item.id] || ''}
                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
        >
          {submitting ? '提出中...' : '評価を提出'}
        </Button>
      </div>
    </div>
  )
}
