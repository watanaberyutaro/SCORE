'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface GoalStatusChangerProps {
  goalId: string
  currentStatus: string
}

const statusOptions = [
  { value: 'draft', label: '下書き', color: 'bg-gray-200 text-black border-2 border-gray-300' },
  { value: 'submitted', label: '提出済み', color: 'bg-[#1ed7cd] text-black border-2 border-[#1ed7cd] font-bold' },
  { value: 'under_review', label: '確認中', color: 'bg-[#18c4b8] text-black border-2 border-[#18c4b8] font-bold' },
  { value: 'approved', label: '承認済み', color: 'bg-[#05a7be] text-black border-2 border-[#05a7be] font-bold' },
  { value: 'active', label: '進行中', color: 'bg-[#087ea2] text-black border-2 border-[#087ea2] font-bold' },
  { value: 'completed', label: '完了', color: 'bg-[#017598] text-white border-2 border-[#017598] font-bold' },
  { value: 'cancelled', label: 'キャンセル', color: 'bg-gray-400 text-white border-2 border-gray-400' },
  { value: 'before_interview', label: '面談前', color: 'bg-[#1ed7cd] text-black border-2 border-[#1ed7cd] font-bold' },
  { value: 'after_interview', label: '面談済み', color: 'bg-[#05a7be] text-white border-2 border-[#05a7be] font-bold' },
]

export function GoalStatusChanger({ goalId, currentStatus }: GoalStatusChangerProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const currentStatusConfig = statusOptions.find(s => s.value === currentStatus) || statusOptions[0]

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('ステータス更新に失敗しました')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating goal status:', error)
      alert('ステータスの更新に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-black mb-2">現在のステータス</h3>
        <Badge className={currentStatusConfig.color}>
          {currentStatusConfig.label}
        </Badge>
      </div>

      <div>
        <h3 className="text-sm font-medium text-black mb-2">ステータスを変更</h3>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(option.value)}
              disabled={isUpdating || option.value === currentStatus}
              className={option.value === currentStatus ? 'opacity-50' : ''}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
