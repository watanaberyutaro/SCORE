'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Key, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { resetPassword } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function checkSession() {
      try {
        // URLパラメータからエラーをチェック
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          setError(decodeURIComponent(errorDescription || 'リンクが無効です'))
          setTokenValid(false)
          setLoading(false)
          return
        }

        // セッションの確認
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError('リンクが無効または期限切れです。もう一度パスワードリセットをお試しください。')
          setTokenValid(false)
        } else {
          setTokenValid(true)
        }
      } catch (err) {
        setError('セッションの確認に失敗しました')
        setTokenValid(false)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [searchParams, supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // パスワード一致チェック
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    // パスワード長チェック
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setResetting(true)

    try {
      const result = await resetPassword(newPassword)

      if (!result.success) {
        setError(result.error || 'パスワードの変更に失敗しました')
        setResetting(false)
      } else {
        setSuccess(true)
        setResetting(false)

        // 2秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError('処理中にエラーが発生しました')
      setResetting(false)
    }
  }

  // ローディング画面
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-6 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="mt-4 text-gray-600">確認中...</p>
          </CardContent>
        </Card>
      </div>
    )
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
              パスワードを変更しました
            </CardTitle>
            <CardDescription className="text-gray-600 pt-2">
              新しいパスワードでログインできます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                まもなくログインページへ移動します...
              </p>
            </div>

            <Link href="/login" className="block">
              <Button className="w-full h-11 text-base font-medium">
                ログインページへ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // トークン無効画面
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              パスワードリセット
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Link href="/forgot-password" className="block">
                <Button className="w-full h-11 text-base font-medium">
                  パスワードリセットをやり直す
                </Button>
              </Link>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  ログインページに戻る
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // パスワード入力フォーム
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            新しいパスワードを設定
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            6文字以上のパスワードを入力してください
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
              <Label htmlFor="newPassword" className="text-gray-700">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={resetting}
                className="h-11 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">6文字以上で入力してください</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={resetting}
                className="h-11 placeholder:text-gray-400"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={resetting}
            >
              {resetting ? '変更中...' : 'パスワードを変更'}
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
