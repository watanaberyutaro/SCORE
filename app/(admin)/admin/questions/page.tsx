'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpCircle, CheckCircle, Clock, Send, User, Calendar, MessageSquare } from 'lucide-react'

interface Question {
  id: string
  evaluation_id: string
  staff_id: string
  question: string
  answer: string | null
  admin_id: string | null
  created_at: string
  answered_at: string | null
  staff: {
    full_name: string
    email: string
  }
  admin: {
    full_name: string
  } | null
  evaluation: {
    evaluation_period: string
  }
}

export default function QuestionsManagementPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('pending')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchQuestions()
  }, [])

  async function fetchQuestions() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('evaluation_questions')
        .select(`
          *,
          staff:users!evaluation_questions_staff_id_fkey(full_name, email),
          admin:users!evaluation_questions_admin_id_fkey(full_name),
          evaluation:evaluations(evaluation_period)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllQuestions(data || [])
    } catch (err: any) {
      console.error('Error fetching questions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAnswer(questionId: string) {
    if (!answerText.trim()) {
      setError('回答を入力してください')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('ユーザーが見つかりません')

      const { error } = await supabase
        .from('evaluation_questions')
        .update({
          answer: answerText,
          admin_id: userData.user.id,
          answered_at: new Date().toISOString()
        })
        .eq('id', questionId)

      if (error) throw error

      setAnswerText('')
      setAnsweringId(null)
      fetchQuestions()
    } catch (err: any) {
      console.error('Error answering question:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const pendingQuestions = allQuestions.filter(q => !q.answer)
  const answeredQuestions = allQuestions.filter(q => q.answer)

  const stats = [
    {
      title: '総質問数',
      value: allQuestions.length,
      icon: HelpCircle,
      color: '#05a7be',
      bgColor: 'rgba(5, 167, 190, 0.1)',
    },
    {
      title: '未回答',
      value: pendingQuestions.length,
      icon: Clock,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    {
      title: '回答済み',
      value: answeredQuestions.length,
      icon: CheckCircle,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
  ]

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  const currentQuestions = filter === 'all' ? allQuestions : filter === 'pending' ? pendingQuestions : answeredQuestions

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-black">質問管理</h1>
        <p className="text-sm lg:text-base text-black mt-2">
          スタッフからの質問を管理・回答します
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
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
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">質問一覧</CardTitle>
          <CardDescription className="text-black">
            ステータスごとに質問を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                未回答 ({pendingQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="answered">
                回答済み ({answeredQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                すべて ({allQuestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              <div className="space-y-4">
                {currentQuestions.length === 0 ? (
                  <div className="text-center py-12 text-black">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium mb-2">質問がありません</p>
                    <p className="text-sm text-gray-600">
                      {filter === 'pending' ? '現在、未回答の質問はありません' :
                       filter === 'answered' ? '回答済みの質問はまだありません' :
                       '質問がまだありません'}
                    </p>
                  </div>
                ) : (
                  currentQuestions.map((question) => (
                    <Card
                      key={question.id}
                      className="border-2 transition-all hover:shadow-md"
                      style={{
                        borderColor: question.answer ? '#10b981' : '#f59e0b',
                        backgroundColor: question.answer ? 'rgba(16, 185, 129, 0.02)' : 'rgba(245, 158, 11, 0.02)'
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                className={question.answer
                                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                  : 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                                }
                              >
                                {question.answer ? '回答済み' : '未回答'}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                <span className="font-medium text-black">{question.staff.full_name}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                              <span>{question.staff.email}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(question.created_at).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span>•</span>
                              <span className="font-medium">{question.evaluation.evaluation_period}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Question */}
                        <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#05a7be' }}>
                          <div className="flex items-start gap-2 mb-2">
                            <HelpCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#05a7be' }} />
                            <p className="text-sm font-semibold text-black">質問</p>
                          </div>
                          <p className="text-black pl-7">{question.question}</p>
                        </div>

                        {/* Answer */}
                        {question.answer ? (
                          <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                            <div className="flex items-start gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-green-900">
                                  回答者: {question.admin?.full_name || '不明'}
                                </p>
                                {question.answered_at && (
                                  <p className="text-xs text-green-700">
                                    {new Date(question.answered_at).toLocaleDateString('ja-JP', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-black pl-7">{question.answer}</p>
                          </div>
                        ) : answeringId === question.id ? (
                          <div className="space-y-3 bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                            <p className="text-sm font-semibold text-black mb-2">回答を入力</p>
                            <Textarea
                              placeholder="スタッフへの回答を入力してください..."
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              rows={4}
                              disabled={submitting}
                              className="border-2"
                              style={{ borderColor: '#05a7be' }}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAnswer(question.id)}
                                disabled={submitting}
                                className="bg-[#05a7be] hover:bg-[#048a9d]"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {submitting ? '送信中...' : '回答を送信'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setAnsweringId(null)
                                  setAnswerText('')
                                }}
                                disabled={submitting}
                              >
                                キャンセル
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setAnsweringId(question.id)}
                            className="w-full sm:w-auto bg-[#05a7be] hover:bg-[#048a9d]"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            回答する
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
