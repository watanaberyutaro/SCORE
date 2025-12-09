'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function LoginPage() {
  const [companyCode, setCompanyCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password, companyCode)

      if (!result.success) {
        setError(result.error || 'ログインに失敗しました')
        setLoading(false)
      }
      // 成功時はリダイレクトされるのでloadingをfalseにしない
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-3xl font-bold text-center text-gray-900">SHARESCORE</CardTitle>
          <CardDescription className="text-center text-gray-600">
            社員評価管理システム
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
                placeholder="企業コードを入力"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
                className="h-11 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="メールアドレスを入力"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                パスワードをお忘れの方
              </Link>
            </div>

            <div className="space-y-3 text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">アカウントをお持ちでない方</p>
              <div className="flex flex-col gap-2">
                <Link href="/register-user" className="w-full">
                  <Button variant="outline" className="w-full h-10 text-gray-700 hover:bg-gray-50">
                    スタッフとして登録
                  </Button>
                </Link>
                <Link href="/register-company" className="w-full">
                  <Button variant="outline" className="w-full h-10 text-gray-700 hover:bg-gray-50">
                    新しい企業を登録
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
