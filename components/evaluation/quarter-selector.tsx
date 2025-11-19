'use client'

import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/select'

interface QuarterSelectorProps {
  quarters: Array<{
    year: number
    quarter: number
    label: string
  }>
  currentQuarter?: string // 'YYYY-Q' format
}

export function QuarterSelector({ quarters, currentQuarter }: QuarterSelectorProps) {
  const router = useRouter()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const quarterValue = event.target.value
    router.push(`/my-evaluation?quarter=${quarterValue}`)
  }

  return (
    <Select
      value={currentQuarter || ''}
      onChange={handleChange}
      className="w-[180px]"
    >
      {quarters.map((quarter) => (
        <option key={`${quarter.year}-${quarter.quarter}`} value={`${quarter.year}-${quarter.quarter}`}>
          {quarter.label}
        </option>
      ))}
    </Select>
  )
}
