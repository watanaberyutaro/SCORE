'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ClipboardCheck, TrendingUp, XCircle, Award, Target, AlertTriangle, BarChart3, Star, Trophy, TrendingDown, CheckCircle, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface DashboardClientProps {
  data: {
    totalStaff: number
    currentYear: number
    currentMonth: number
    completedEvaluations: number
    pendingEvaluations: number
    completedUsers: any[]
    pendingUsers: any[]
    pendingInterviews: number
    completedInterviews: number
    totalGoals: number
    unansweredQuestions: number
  }
}

export function DashboardClient({ data }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState('pending')

  // ランク分布の計算
  const rankDistribution = {
    S: data.completedUsers.filter(e => e.rank === 'S').length,
    A: data.completedUsers.filter(e => e.rank === 'A').length,
    B: data.completedUsers.filter(e => e.rank === 'B').length,
    C: data.completedUsers.filter(e => e.rank === 'C').length,
    D: data.completedUsers.filter(e => e.rank === 'D').length,
  }

  // 平均スコアの計算
  const averageScore = data.completedUsers.length > 0
    ? data.completedUsers.reduce((sum, e) => sum + (e.total_score || 0), 0) / data.completedUsers.length
    : 0

  // トップパフォーマー（上位3名）
  const topPerformers = [...data.completedUsers]
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
    .slice(0, 3)

  // 要注意スタッフ（スコア60点以下またはランクD）
  const lowPerformers = data.completedUsers.filter(e =>
    (e.total_score && e.total_score < 60) || e.rank === 'D'
  )

  const stats = [
    {
      title: 'スタッフ総数',
      value: data.totalStaff,
      icon: Users,
      description: '登録されているスタッフ',
      color: '#05a7be',
      bgColor: 'rgba(5, 167, 190, 0.1)',
    },
    {
      title: '完了した評価',
      value: data.completedEvaluations,
      icon: ClipboardCheck,
      description: `${data.currentYear}年${data.currentMonth}月`,
      color: '#18c4b8',
      bgColor: 'rgba(24, 196, 184, 0.1)',
    },
    {
      title: '未完了の評価',
      value: data.pendingEvaluations,
      icon: XCircle,
      description: '評価が必要なスタッフ',
      color: '#087ea2',
      bgColor: 'rgba(8, 126, 162, 0.1)',
    },
    {
      title: '評価進捗率',
      value: data.totalStaff > 0
        ? `${Math.round((data.completedEvaluations / data.totalStaff) * 100)}%`
        : '0%',
      icon: TrendingUp,
      description: '完了率',
      color: '#1ed7cd',
      bgColor: 'rgba(30, 215, 205, 0.1)',
    },
  ]

  const goalsStats = [
    {
      title: '面談前の目標',
      value: data.pendingInterviews,
      icon: Target,
      description: 'レビュー待ちの目標',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    {
      title: '面談済みの目標',
      value: data.completedInterviews,
      icon: CheckCircle,
      description: '面談完了した目標',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    {
      title: '目標総数',
      value: data.totalGoals,
      icon: Award,
      description: '全ての目標',
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.1)',
    },
    {
      title: '未回答の質問',
      value: data.unansweredQuestions,
      icon: HelpCircle,
      description: '回答待ちの質問',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
    },
  ]

  return (
    <>
      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: stat.color }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">{stat.title}</CardTitle>
                <div className="p-2 rounded-lg" style={{ backgroundColor: stat.bgColor }}>
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stat.value}</div>
                <p className="text-xs text-black mt-1">{stat.description}</p>
                {stat.title === '評価進捗率' && (
                  <div className="mt-3">
                    <Progress
                      value={data.totalStaff > 0 ? (data.completedEvaluations / data.totalStaff) * 100 : 0}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 目標管理統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {goalsStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-2 transition-shadow hover:shadow-lg" style={{ borderColor: stat.color }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">{stat.title}</CardTitle>
                <div className="p-2 rounded-lg" style={{ backgroundColor: stat.bgColor }}>
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stat.value}</div>
                <p className="text-xs text-black mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 追加統計 - 2カラム */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* 左カラム */}
        <div className="space-y-6">
          {/* ランク分布 */}
          <Card style={{ background: 'linear-gradient(135deg, #05a7be15, #1ed7cd15)' }}>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Trophy className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
                ランク分布
              </CardTitle>
              <CardDescription className="text-black">
                評価完了スタッフのランク別人数
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.completedEvaluations > 0 ? (
                <div className="space-y-3">
                  {[
                    { rank: 'S', color: '#017598', label: 'S評価' },
                    { rank: 'A', color: '#087ea2', label: 'A評価' },
                    { rank: 'B', color: '#05a7be', label: 'B評価' },
                    { rank: 'C', color: '#18c4b8', label: 'C評価' },
                    { rank: 'D', color: '#1ed7cd', label: 'D評価' },
                  ].map((item) => {
                    const count = rankDistribution[item.rank as keyof typeof rankDistribution]
                    const percentage = (count / data.completedEvaluations) * 100
                    return (
                      <div key={item.rank}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge style={{ backgroundColor: item.color, color: '#fff', borderColor: item.color }}>
                              {item.rank}
                            </Badge>
                            <span className="text-sm font-medium text-black">{item.label}</span>
                          </div>
                          <span className="text-sm font-bold text-black">
                            {count}名 ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ backgroundColor: '#1ed7cd33' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              backgroundColor: item.color,
                              width: `${percentage}%`
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-center py-8 text-black">
                  まだ完了した評価がありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 平均スコアと統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <BarChart3 className="mr-2 h-5 w-5" style={{ color: '#18c4b8' }} />
                平均スコア
              </CardTitle>
              <CardDescription className="text-black">
                全スタッフの評価統計
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.completedEvaluations > 0 ? (
                <div className="space-y-4">
                  <div className="text-center p-6 rounded-lg border-2" style={{
                    borderColor: '#05a7be',
                    background: 'linear-gradient(135deg, #05a7be15, #18c4b815)'
                  }}>
                    <p className="text-sm text-black mb-2">今月の平均スコア</p>
                    <p className="text-5xl font-bold text-black">
                      {averageScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-black mt-2">
                      {data.completedEvaluations}名のスタッフ
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                      <p className="text-xs text-black mb-1">最高スコア</p>
                      <p className="text-2xl font-bold" style={{ color: '#18c4b8' }}>
                        {Math.max(...data.completedUsers.map(e => e.total_score || 0)).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(8, 126, 162, 0.1)' }}>
                      <p className="text-xs text-black mb-1">最低スコア</p>
                      <p className="text-2xl font-bold" style={{ color: '#087ea2' }}>
                        {Math.min(...data.completedUsers.map(e => e.total_score || 0)).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center py-8 text-black">
                  まだ完了した評価がありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右カラム */}
        <div className="space-y-6">
          {/* トップパフォーマー */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Star className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
                トップパフォーマー
              </CardTitle>
              <CardDescription className="text-black">
                今月の高評価スタッフ（上位3名）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {topPerformers.map((staff, idx) => (
                    <div
                      key={staff.id}
                      className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover:shadow-md"
                      style={{
                        borderColor: idx === 0 ? '#017598' : idx === 1 ? '#05a7be' : '#18c4b8',
                        background: idx === 0 ? 'linear-gradient(135deg, #01759815, #087ea215)' : 'white'
                      }}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white"
                        style={{
                          backgroundColor: idx === 0 ? '#017598' : idx === 1 ? '#05a7be' : '#18c4b8'
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-black">{staff.staff.full_name}</p>
                          {staff.rank && (
                            <Badge style={{
                              backgroundColor: '#05a7be',
                              color: '#fff'
                            }}>
                              {staff.rank}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-black mt-1">
                          {staff.staff.department} - {staff.staff.position}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: '#05a7be' }}>
                          {staff.total_score?.toFixed(1)}
                        </p>
                        <p className="text-xs text-black">点</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-8 text-black">
                  まだ完了した評価がありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 要注意スタッフ */}
          {lowPerformers.length > 0 && (
            <Card style={{ background: 'linear-gradient(135deg, #087ea215, #1ed7cd15)' }}>
              <CardHeader>
                <CardTitle className="flex items-center text-black">
                  <AlertTriangle className="mr-2 h-5 w-5" style={{ color: '#087ea2' }} />
                  要フォロースタッフ
                </CardTitle>
                <CardDescription className="text-black">
                  低評価スタッフ（{lowPerformers.length}名）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowPerformers.slice(0, 3).map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border-2"
                      style={{ borderColor: '#087ea2' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-black">{staff.staff.full_name}</p>
                          {staff.rank && (
                            <Badge variant="outline" style={{
                              backgroundColor: 'rgba(8, 126, 162, 0.2)',
                              color: '#000',
                              borderColor: '#087ea2'
                            }}>
                              {staff.rank}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-black mt-1">
                          {staff.staff.department} - {staff.staff.position}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: '#087ea2' }}>
                          {staff.total_score?.toFixed(1)}
                        </p>
                        <p className="text-xs text-black">点</p>
                      </div>
                    </div>
                  ))}
                  {lowPerformers.length > 3 && (
                    <p className="text-xs text-center text-black pt-2">
                      他 {lowPerformers.length - 3}名
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 評価状況タブ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">評価状況</CardTitle>
          <CardDescription className="text-black">
            {data.currentYear}年{data.currentMonth}月 - スタッフの評価完了状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                未完了 ({data.pendingEvaluations})
              </TabsTrigger>
              <TabsTrigger value="completed">
                完了済み ({data.completedEvaluations})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {data.pendingUsers.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="mx-auto h-12 w-12 mb-4" style={{ color: '#18c4b8' }} />
                  <p className="text-lg font-medium text-black mb-2">
                    素晴らしい！
                  </p>
                  <p className="text-sm text-black">
                    全てのスタッフの評価が完了しています
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(8, 126, 162, 0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5" style={{ color: '#087ea2' }} />
                      <p className="font-medium text-black">
                        {data.pendingUsers.length}名のスタッフが未評価です
                      </p>
                    </div>
                    <p className="text-sm text-black">
                      評価期限までに全スタッフの評価を完了してください
                    </p>
                  </div>
                  <div className="space-y-3">
                    {data.pendingUsers.map((staff: any) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between p-4 border-2 rounded-lg transition-all hover:shadow-md"
                        style={{
                          borderColor: 'rgba(30, 215, 205, 0.5)'
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-black">{staff.full_name}</p>
                            <Badge variant="outline" style={{
                              backgroundColor: 'rgba(30, 215, 205, 0.2)',
                              color: '#000',
                              borderColor: '#1ed7cd'
                            }}>
                              未評価
                            </Badge>
                          </div>
                          <p className="text-sm mt-1 text-black">
                            {staff.department} - {staff.position}
                          </p>
                          <p className="text-xs mt-1 text-black">{staff.email}</p>
                        </div>
                        <Link href={`/admin/evaluations/${staff.id}`}>
                          <Button
                            size="sm"
                            style={{
                              background: 'linear-gradient(135deg, #05a7be, #18c4b8)',
                              color: '#fff'
                            }}
                          >
                            評価を入力
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {data.completedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="mx-auto h-12 w-12 mb-4" style={{ color: '#05a7be' }} />
                  <p className="text-sm text-black">
                    まだ完了した評価がありません
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardCheck className="h-5 w-5" style={{ color: '#18c4b8' }} />
                      <p className="font-medium text-black">
                        {data.completedUsers.length}名の評価が完了しました
                      </p>
                    </div>
                    <p className="text-sm text-black">
                      平均スコア: {averageScore.toFixed(1)}点
                    </p>
                  </div>
                  <div className="space-y-3">
                    {data.completedUsers.map((evaluation: any) => (
                      <div
                        key={evaluation.id}
                        className="flex items-center justify-between p-4 border-2 rounded-lg transition-all hover:shadow-md"
                        style={{ borderColor: '#1ed7cd' }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-black">{evaluation.staff.full_name}</p>
                            <Badge variant="outline" style={{
                              backgroundColor: 'rgba(24, 196, 184, 0.2)',
                              color: '#000',
                              borderColor: '#18c4b8'
                            }}>
                              完了
                            </Badge>
                            {evaluation.rank && (
                              <Badge style={{
                                backgroundColor: '#05a7be',
                                color: '#fff'
                              }}>
                                {evaluation.rank}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1 text-black">
                            {evaluation.staff.department} - {evaluation.staff.position}
                          </p>
                          <p className="text-xs mt-1 text-black">
                            {evaluation.staff.email}
                            {evaluation.total_score && (
                              <span className="ml-2 font-medium">・総合得点: {evaluation.total_score.toFixed(1)}点</span>
                            )}
                          </p>
                        </div>
                        <Link href={`/admin/evaluations/${evaluation.staff_id}`}>
                          <Button size="sm" variant="outline">
                            詳細を見る
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}
