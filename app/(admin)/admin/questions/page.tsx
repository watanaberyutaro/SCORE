'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HelpCircle, CheckCircle, Clock, Send } from 'lucide-react'

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
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchQuestions()
  }, [filter])

  async function fetchQuestions() {
    try {
      setLoading(true)
      let query = supabase
        .from('evaluation_questions')
        .select(`
          *,
          staff:users!evaluation_questions_staff_id_fkey(full_name, email),
          admin:users!evaluation_questions_admin_id_fkey(full_name),
          evaluation:evaluations(evaluation_period)
        `)
        .order('created_at', { ascending: false })

      if (filter === 'pending') {
        query = query.is('answer', null)
      } else if (filter === 'answered') {
        query = query.not('answer', 'is', null)
      }

      const { data, error } = await query

      if (error) throw error
      setQuestions(data || [])
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

  const filteredStats = {
    total: questions.length,
    pending: questions.filter(q => !q.answer).length,
    answered: questions.filter(q => q.answer).length
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">質問管理</h1>
        <p className="text-gray-500 mt-2">スタッフからの質問を管理・回答します</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">総質問数</p>
                <p className="text-2xl font-bold">{filteredStats.total}</p>
              </div>
              <HelpCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">未回答</p>
                <p className="text-2xl font-bold text-orange-600">{filteredStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">回答済み</p>
                <p className="text-2xl font-bold text-green-600">{filteredStats.answered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          すべて
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          未回答
        </Button>
        <Button
          variant={filter === 'answered' ? 'default' : 'outline'}
          onClick={() => setFilter('answered')}
        >
          回答済み
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                質問がありません
              </div>
            </CardContent>
          </Card>
        ) : (
          questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{question.staff.full_name}</CardTitle>
                      {question.answer ? (
                        <Badge className="bg-green-100 text-green-800">回答済み</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800">未回答</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {question.staff.email} • {question.evaluation.evaluation_period} • {new Date(question.created_at).toLocaleDateString('ja-JP')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">質問:</p>
                  <p className="text-gray-900">{question.question}</p>
                </div>

                {/* Answer */}
                {question.answer ? (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      回答: {question.admin?.full_name || '不明'} • {question.answered_at ? new Date(question.answered_at).toLocaleDateString('ja-JP') : ''}
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900">{question.answer}</p>
                    </div>
                  </div>
                ) : answeringId === question.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="回答を入力してください..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={4}
                      disabled={submitting}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAnswer(question.id)}
                        disabled={submitting}
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
                    variant="outline"
                  >
                    回答する
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
