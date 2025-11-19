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
  { value: 'pending', label: '面談前', color: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' },
  { value: 'scheduled', label: '面談予定', color: 'bg-blue-100 text-blue-800 border-2 border-blue-300' },
  { value: 'completed', label: '面談済み', color: 'bg-green-100 text-green-800 border-2 border-green-300' },
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
        body: JSON.stringify({ interview_status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('ステータス更新に失敗しました')
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating goal interview status:', error)
      alert('面談ステータスの更新に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-black mb-2">現在の面談ステータス</h3>
        <Badge className={currentStatusConfig.color}>
          {currentStatusConfig.label}
        </Badge>
      </div>

      <div>
        <h3 className="text-sm font-medium text-black mb-2">面談ステータスを変更</h3>
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
