'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DynamicEvaluationForm } from '@/components/forms/dynamic-evaluation-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [params.staffId])

  async function fetchStaff() {
    try {
      const response = await fetch(`/api/admin/evaluations`)
      const data = await response.json()
      const foundStaff = data.data?.find((s: any) => s.id === params.staffId)
      setStaff(foundStaff)
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(scores: Record<string, number>, comments: Record<string, string>, isDraft: boolean) {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/evaluations/${params.staffId}/dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationYear: year,
          evaluationMonth: month,
          scores,
          comments,
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

      <DynamicEvaluationForm
        staffId={params.staffId}
        staffName={staff.full_name}
        evaluationPeriod={`${year}年${month}月`}
        evaluationYear={year}
        evaluationMonth={month}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  )
}
