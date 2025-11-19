'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, HelpCircle, CheckCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

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
  }
  admin: {
    full_name: string
  } | null
  evaluation: {
    evaluation_period: string
  }
}

export default function MyQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchQuestions()
  }, [])

  async function fetchQuestions() {
    try {
      const response = await fetch('/api/questions')
      const data = await response.json()
      setQuestions(data.data || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      // 最新の評価IDを取得する（簡略化のため、実際にはもっと適切な方法で取得）
      const evaluationId = questions[0]?.evaluation_id || ''

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationId,
          question: newQuestion,
        }),
      })

      if (!response.ok) throw new Error('Failed to create question')

      await fetchQuestions()
      setNewQuestion('')
      setShowForm(false)
    } catch (error) {
      console.error('Error creating question:', error)
      alert('質問の投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const answeredQuestions = questions.filter((q) => q.answer)
  const unansweredQuestions = questions.filter((q) => !q.answer)

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">質問・回答</h1>
          <p className="mt-2 text-sm text-gray-600">
            評価について質問し、管理者からの回答を確認できます
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            質問する
          </Button>
        )}
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総質問数</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions.length}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">回答済み</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{answeredQuestions.length}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未回答</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unansweredQuestions.length}件</div>
          </CardContent>
        </Card>
      </div>

      {/* 質問投稿フォーム */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>新しい質問</CardTitle>
            <CardDescription>
              評価について疑問に思うことを質問してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="質問内容を入力してください..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={4}
                required
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setNewQuestion('')
                  }}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? '投稿中...' : '質問を投稿'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 未回答の質問 */}
      {unansweredQuestions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-500" />
              未回答の質問
            </CardTitle>
            <CardDescription>管理者からの回答を待っています</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unansweredQuestions.map((q) => (
                <div key={q.id} className="border-l-4 border-orange-500 bg-orange-50 rounded-r-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline">{q.evaluation.evaluation_period}</Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 mt-2">{q.question}</p>
                  <div className="mt-3 flex items-center text-sm text-orange-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>回答待ち</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 回答済みの質問 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            回答済みの質問
          </CardTitle>
          <CardDescription>管理者からの回答一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {answeredQuestions.length > 0 ? (
            <div className="space-y-4">
              {answeredQuestions.map((q) => (
                <div key={q.id} className="border-l-4 border-green-500 bg-green-50 rounded-r-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline">{q.evaluation.evaluation_period}</Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-500">質問:</p>
                    <p className="text-gray-700">{q.question}</p>
                  </div>
                  <div className="bg-white border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-green-700">
                        {q.admin?.full_name}からの回答:
                      </p>
                      <span className="text-xs text-gray-500">
                        {q.answered_at && formatDate(q.answered_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{q.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">
              まだ回答済みの質問がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
