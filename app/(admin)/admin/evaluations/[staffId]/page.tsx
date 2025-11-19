'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EvaluationForm } from '@/components/forms/evaluation-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EvaluationFormData } from '@/types'

interface StaffEvaluationPageProps {
  params: {
    staffId: string
  }
}

export default function StaffEvaluationPage({ params }: StaffEvaluationPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 年月をURLパラメータから取得、デフォルトは現在の年月
  const now = new Date()
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1

  const [staff, setStaff] = useState<any>(null)
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null)
  const [initialData, setInitialData] = useState<EvaluationFormData | undefined>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEvaluation()
  }, [params.staffId, year, month])

  async function fetchEvaluation() {
    try {
      const response = await fetch(`/api/admin/evaluations/${params.staffId}?year=${year}&month=${month}`)
      const data = await response.json()

      if (data.data) {
        setExistingEvaluation(data.data)
        setStaff(data.data.staff)

        // 既存の評価データがあれば、フォームに設定
        if (data.data.responses && data.data.responses.length > 0) {
          // APIから現在のユーザーの回答だけが返される
          const myResponse = data.data.responses[0]

          if (myResponse?.items) {
            const formData: EvaluationFormData = {
              performance: {
                achievement: myResponse.items.find((i: any) => i.item_name === '実績評価')?.score || 0,
                attendance: myResponse.items.find((i: any) => i.item_name === '勤怠評価')?.score || 0,
                compliance: myResponse.items.find((i: any) => i.item_name === 'コンプライアンス評価')?.score || 0,
                client: myResponse.items.find((i: any) => i.item_name === 'クライアント評価')?.score || 0,
              },
              behavior: {
                initiative: myResponse.items.find((i: any) => i.item_name === '主体性評価')?.score || 0,
                responsibility: myResponse.items.find((i: any) => i.item_name === '責任感')?.score || 0,
                cooperation: myResponse.items.find((i: any) => i.item_name === '協調性評価')?.score || 0,
                appearance: myResponse.items.find((i: any) => i.item_name === 'アピアランス評価')?.score || 0,
              },
              growth: {
                selfImprovement: myResponse.items.find((i: any) => i.item_name === '自己研鑽評価')?.score || 0,
                response: myResponse.items.find((i: any) => i.item_name === 'レスポンス評価')?.score || 0,
                goalAchievement: myResponse.items.find((i: any) => i.item_name === '自己目標達成評価')?.score || 0,
              },
              comments: myResponse.items.reduce((acc: any, item: any) => {
                if (item.comment) {
                  const fieldMap: any = {
                    '実績評価': 'achievement',
                    '勤怠評価': 'attendance',
                    'コンプライアンス評価': 'compliance',
                    'クライアント評価': 'client',
                    '主体性評価': 'initiative',
                    '責任感': 'responsibility',
                    '協調性評価': 'cooperation',
                    'アピアランス評価': 'appearance',
                    '自己研鑽評価': 'selfImprovement',
                    'レスポンス評価': 'response',
                    '自己目標達成評価': 'goalAchievement',
                  }
                  const field = fieldMap[item.item_name]
                  if (field) {
                    acc[field] = item.comment
                  }
                }
                return acc
              }, {}),
            }
            setInitialData(formData)
          }
        }
      } else {
        // スタッフ情報のみ取得
        const staffResponse = await fetch(`/api/admin/evaluations`)
        const staffData = await staffResponse.json()
        const foundStaff = staffData.data?.find((s: any) => s.id === params.staffId)
        setStaff(foundStaff)
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(formData: EvaluationFormData, isDraft: boolean) {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/evaluations/${params.staffId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationYear: year,
          evaluationMonth: month,
          formData,
          isDraft,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save evaluation')
      }

      alert(isDraft ? '下書きを保存しました' : '評価を提出しました')
      router.push(`/admin/monthly-evaluations?year=${year}&month=${month}`)
    } catch (error) {
      console.error('Error saving evaluation:', error)
      alert('評価の保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>スタッフが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/admin/monthly-evaluations?year=${year}&month=${month}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            月次評価に戻る
          </Button>
        </Link>
        <div className="text-lg font-semibold text-gray-900">
          {year}年{month}月の評価
        </div>
      </div>

      <EvaluationForm
        staffId={params.staffId}
        staffName={staff.full_name}
        evaluationPeriod={`${year}年${month}月`}
        initialData={initialData}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  )
}
