import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { redirect } from 'next/navigation'

async function getMyComments(userId: string) {
  const supabase = await createSupabaseServerClient()

  // スタッフの評価を取得
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('id, evaluation_period')
    .eq('staff_id', userId)

  if (!evaluations || evaluations.length === 0) {
    return []
  }

  // コメントを取得
  const { data: comments } = await supabase
    .from('admin_comments')
    .select(
      `
      *,
      admin:users!admin_comments_admin_id_fkey(full_name),
      evaluation:evaluations!admin_comments_evaluation_id_fkey(evaluation_period)
    `
    )
    .in(
      'evaluation_id',
      evaluations.map((e) => e.id)
    )
    .order('created_at', { ascending: false })

  return comments || []
}

export default async function MyCommentsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const comments = await getMyComments(user.id)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理者からのコメント</h1>
        <p className="mt-2 text-sm text-gray-600">
          評価に対する詳細なフィードバック
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総コメント数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comments.length}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今期のコメント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter((c: any) => c.evaluation?.evaluation_period === '2025-Q1').length}件
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">最終更新</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {comments.length > 0 ? formatDate(comments[0].created_at) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            コメント一覧
          </CardTitle>
          <CardDescription>
            管理者からのフィードバックとアドバイス
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="border-l-4 border-blue-500 bg-blue-50 rounded-r-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {comment.admin.full_name}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge variant="outline">
                          {comment.evaluation.evaluation_period}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mt-3 whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">
              まだコメントがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
