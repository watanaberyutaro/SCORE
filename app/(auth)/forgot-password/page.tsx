'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { KeyRound, CheckCircle, Mail } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [companyCode, setCompanyCode] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { requestPasswordReset } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // バリデーション
    if (!companyCode.trim()) {
      setError('企業コードを入力してください')
      return
    }

    if (!email.trim()) {
      setError('メールアドレスを入力してください')
      return
    }

    setLoading(true)

    try {
      const result = await requestPasswordReset(companyCode.trim().toUpperCase(), email.trim())

      if (!result.success) {
        setError(result.error || 'パスワードリセットメールの送信に失敗しました')
        setLoading(false)
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch (err) {
      setError('処理中にエラーが発生しました')
      setLoading(false)
    }
  }

  // 成功画面
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              メールを送信しました
            </CardTitle>
            <CardDescription className="text-gray-600 pt-2">
              パスワードリセット用のリンクをメールアドレスに送信しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="font-medium">メールをご確認ください</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• リンクの有効期限は1時間です</li>
                    <li>• メールが届かない場合は、迷惑メールフォルダもご確認ください</li>
                  </ul>
                </div>
              </div>
            </div>

            <Link href="/login" className="block">
              <Button className="w-full h-11 text-base font-medium">
                ログインページに戻る
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // フォーム画面
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            パスワードをお忘れの方
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            企業コードとメールアドレスを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyCode" className="text-gray-700">企業コード</Label>
              <Input
                id="companyCode"
                type="text"
                placeholder="ABC123"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
                className="h-11 uppercase tracking-widest font-mono placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 placeholder:text-gray-400"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? '送信中...' : 'パスワードリセットメールを送信'}
            </Button>

            <div className="text-center pt-4 border-t border-gray-200">
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                ログインページに戻る
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
