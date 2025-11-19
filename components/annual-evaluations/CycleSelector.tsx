'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EvaluationCycle } from '@/types'
import { useRouter } from 'next/navigation'

interface CycleSelectorProps {
  cycles: EvaluationCycle[]
  selectedCycle: EvaluationCycle
  completedEvaluations: number
  totalStaff: number
}

const statusColors = {
  'planning': 'bg-yellow-100 text-yellow-800',
  'active': 'bg-green-100 text-green-800',
  'completed': 'bg-gray-100 text-gray-800',
}

const statusLabels = {
  'planning': '計画中',
  'active': '実施中',
  'completed': '完了',
}

export function CycleSelector({ cycles, selectedCycle, completedEvaluations, totalStaff }: CycleSelectorProps) {
  const router = useRouter()
  const progressPercentage = totalStaff > 0
    ? Math.round((completedEvaluations / totalStaff) * 100)
    : 0

  return (
    <Card className="mb-6 border-2" style={{ borderColor: '#05a7be' }}>
      <CardHeader>
        <CardTitle className="text-black">評価期の選択</CardTitle>
        <CardDescription className="text-black">
          評価サイクルを選択してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <select
          value={selectedCycle.id}
          onChange={(e) => {
            router.push(`/admin/annual-evaluations?cycle_id=${e.target.value}`)
          }}
          className="w-full rounded-md border-2 px-4 py-3 text-black focus:border-[#05a7be] focus:ring-2 focus:ring-[#05a7be]/20"
          style={{ borderColor: '#05a7be' }}
        >
          {cycles.map(cycle => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.cycle_name} ({new Date(cycle.start_date).toLocaleDateString('ja-JP')} 〜 {new Date(cycle.end_date).toLocaleDateString('ja-JP')})
            </option>
          ))}
        </select>

        {/* 選択中のサイクル情報 */}
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-lg font-bold text-black">{selectedCycle.cycle_name}</p>
            <Badge className={statusColors[selectedCycle.status]}>
              {statusLabels[selectedCycle.status]}
            </Badge>
          </div>
          <p className="text-sm text-black">
            <strong>期間:</strong> {new Date(selectedCycle.start_date).toLocaleDateString('ja-JP')} 〜 {new Date(selectedCycle.end_date).toLocaleDateString('ja-JP')}
          </p>
          <div className="mt-2 text-sm text-black">
            <strong>完了率:</strong> {completedEvaluations} / {totalStaff} ({progressPercentage}%)
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
