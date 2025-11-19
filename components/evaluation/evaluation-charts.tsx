'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts'
import { BarChart3, Activity, TrendingUp, Award, Target } from 'lucide-react'

interface EvaluationChartsProps {
  evaluation: any
  itemCategories: {
    performance: Array<{ key: string; label: string; max: number }>
    behavior: Array<{ key: string; label: string; max: number }>
    growth: Array<{ key: string; label: string; max: number }>
  }
}

export function EvaluationCharts({ evaluation, itemCategories }: EvaluationChartsProps) {
  // カテゴリ別スコアの計算
  const calculateCategoryScores = () => {
    const categories = ['performance', 'behavior', 'growth'] as const
    const result: { category: string; avgScore: number; maxScore: number; percentage: number }[] = []

    categories.forEach((category) => {
      const items = itemCategories[category]
      let totalScore = 0
      let totalMax = 0
      let count = 0

      items.forEach((item) => {
        const scores: number[] = []
        evaluation.responses?.forEach((response: any) => {
          // 同じitem_nameの項目がある場合、最新のものを使用
          const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
          if (matchingItems.length > 0) {
            const latestItem = matchingItems.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            scores.push(latestItem.score)
          }
        })

        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length
          totalScore += avgScore
          totalMax += item.max
          count++
        }
      })

      const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0

      result.push({
        category: category === 'performance' ? '成果評価' : category === 'behavior' ? '行動評価' : '成長評価',
        avgScore: parseFloat(totalScore.toFixed(1)),
        maxScore: totalMax,
        percentage: parseFloat(percentage.toFixed(1)),
      })
    })

    return result
  }

  // レーダーチャート用のデータを作成
  const createRadarData = () => {
    const allItems = [
      ...itemCategories.performance,
      ...itemCategories.behavior,
      ...itemCategories.growth,
    ]

    return allItems.map((item) => {
      const scores: number[] = []
      evaluation.responses?.forEach((response: any) => {
        // 同じitem_nameの項目がある場合、最新のものを使用
        const matchingItems = response.items?.filter((i: any) => i.item_name === item.key) || []
        if (matchingItems.length > 0) {
          const latestItem = matchingItems.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          scores.push(latestItem.score)
        }
      })

      const avgScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0

      return {
        subject: item.label,
        score: parseFloat(avgScore.toFixed(1)),
        fullMark: item.max,
      }
    })
  }

  const categoryData = calculateCategoryScores()
  const radarData = createRadarData()

  // カテゴリごとの色を定義（指定された青緑系パレット）
  const categoryColors = [
    { from: '#017598', to: '#087ea2', icon: TrendingUp }, // 成果評価: ダークティール
    { from: '#05a7be', to: '#18c4b8', icon: Award },      // 行動評価: ミディアムティール
    { from: '#18c4b8', to: '#1ed7cd', icon: Target },     // 成長評価: ライトシアン
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* カテゴリ別スコア（棒グラフ） */}
      <Card className="overflow-hidden border-0 shadow-xl bg-white">
        <CardHeader className="bg-gradient-to-r from-[#1ed7cd]/10 to-[#18c4b8]/10 border-b border-[#18c4b8]/20">
          <CardTitle className="flex items-center gap-2" style={{ color: '#000' }}>
            <div className="p-2 bg-gradient-to-br from-[#017598] to-[#087ea2] rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            カテゴリ別評価
          </CardTitle>
          <CardDescription style={{ color: '#000' }}>成果・行動・成長の3つの観点からの評価</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                {categoryColors.map((color, idx) => (
                  <linearGradient key={idx} id={`colorGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color.from} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color.to} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18c4b8" strokeOpacity={0.3} />
              <XAxis
                dataKey="category"
                tick={{ fill: '#000', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#18c4b8' }}
              />
              <YAxis
                tick={{ fill: '#000', fontSize: 12 }}
                axisLine={{ stroke: '#18c4b8' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(24, 196, 184, 0.1)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const idx = categoryData.findIndex(c => c.category === data.category)
                    const color = categoryColors[idx]
                    return (
                      <div className="bg-white/95 backdrop-blur-sm p-4 border-2 rounded-xl shadow-2xl" style={{ borderColor: color.from }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg" style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
                            {/* @ts-ignore */}
                            <color.icon className="h-4 w-4 text-white" />
                          </div>
                          <p className="font-bold" style={{ color: '#000' }}>{data.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm flex justify-between" style={{ color: '#000' }}>
                            <span>得点:</span>
                            <span className="font-semibold">{data.avgScore} / {data.maxScore}点</span>
                          </p>
                          <p className="text-sm flex justify-between" style={{ color: '#000' }}>
                            <span>達成率:</span>
                            <span className="font-bold">{data.percentage}%</span>
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="avgScore"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                animationBegin={0}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#colorGradient${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {categoryData.map((cat, idx) => {
              const color = categoryColors[idx]
              const Icon = color.icon
              return (
                <div
                  key={cat.category}
                  className="relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                  style={{
                    borderColor: color.from,
                    background: `linear-gradient(135deg, ${color.from}15, ${color.to}10)`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: '#000' }}>{cat.category}</p>
                    <Icon className="h-4 w-4" style={{ color: color.from }} />
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: '#000' }}>
                    {cat.percentage}%
                  </p>
                  <p className="text-xs font-medium" style={{ color: '#000' }}>
                    {cat.avgScore} / {cat.maxScore}点
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
                    style={{
                      background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
                      width: `${cat.percentage}%`
                    }}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 全項目のバランス（レーダーチャート） */}
      <Card className="overflow-hidden border-0 shadow-xl bg-white">
        <CardHeader className="bg-gradient-to-r from-[#1ed7cd]/10 to-[#05a7be]/10 border-b border-[#05a7be]/20">
          <CardTitle className="flex items-center gap-2" style={{ color: '#000' }}>
            <div className="p-2 bg-gradient-to-br from-[#05a7be] to-[#18c4b8] rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            評価バランス
          </CardTitle>
          <CardDescription style={{ color: '#000' }}>各評価項目のバランスを視覚化</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#05a7be" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#1ed7cd" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <PolarGrid
                stroke="#18c4b8"
                strokeWidth={1.5}
              />
              <PolarAngleAxis
                dataKey="subject"
                tick={{
                  fill: '#000',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 'dataMax']}
                tick={{ fill: '#000', fontSize: 10 }}
                stroke="#18c4b8"
              />
              <Radar
                name="あなたの評価"
                dataKey="score"
                stroke="#05a7be"
                strokeWidth={3}
                fill="url(#radarGradient)"
                fillOpacity={0.6}
                animationDuration={1000}
                animationBegin={0}
                dot={{
                  fill: '#05a7be',
                  stroke: '#fff',
                  strokeWidth: 2,
                  r: 5,
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white/95 backdrop-blur-sm p-4 border-2 rounded-xl shadow-2xl" style={{ borderColor: '#05a7be' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-gradient-to-br from-[#05a7be] to-[#18c4b8] rounded-lg">
                            <Target className="h-4 w-4 text-white" />
                          </div>
                          <p className="font-bold" style={{ color: '#000' }}>{data.subject}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm flex justify-between gap-4" style={{ color: '#000' }}>
                            <span>得点:</span>
                            <span className="font-semibold">{data.score} / {data.fullMark}点</span>
                          </p>
                          <div className="mt-2 w-full rounded-full h-2" style={{ backgroundColor: '#1ed7cd33' }}>
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                background: 'linear-gradient(to right, #05a7be, #1ed7cd)',
                                width: `${(data.score / data.fullMark) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-6 p-4 rounded-xl border-2" style={{
            background: 'linear-gradient(to right, #1ed7cd15, #18c4b815)',
            borderColor: '#18c4b8'
          }}>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="p-1 bg-white rounded-full">
                <Activity className="h-4 w-4" style={{ color: '#05a7be' }} />
              </div>
              <p className="font-medium" style={{ color: '#000' }}>
                外側に近いほど高評価を示しています
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
