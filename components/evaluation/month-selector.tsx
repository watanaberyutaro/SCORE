'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/select'

interface MonthSelectorProps {
  evaluations: Array<{
    id: string
    evaluation_year: number
    evaluation_month: number
  }>
  currentEvaluationId?: string
  currentQuarter: string // 'YYYY-Q' format
}

export function MonthSelector({ evaluations, currentEvaluationId, currentQuarter }: MonthSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const evaluationId = event.target.value
    const quarter = searchParams.get('quarter') || currentQuarter
    router.push(`/my-evaluation?quarter=${quarter}&id=${evaluationId}`)
  }

  return (
    <Select
      value={currentEvaluationId || ''}
      onChange={handleChange}
      className="w-[200px]"
    >
      {evaluations.map((evaluation, index) => {
        let displayText: string

        // evaluation_month が 0 の場合は総合
        if (evaluation.evaluation_month === 0) {
          displayText = '総合'
        } else {
          // 通常の月次評価
          displayText = `${evaluation.evaluation_month}月`
        }

        return (
          <option key={evaluation.id} value={evaluation.id}>
            {displayText}
          </option>
        )
      })}
    </Select>
  )
}
