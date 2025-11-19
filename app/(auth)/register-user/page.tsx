'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, CheckCircle, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterUserPage() {
  const [companyCode, setCompanyCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const { registerUser } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // バリデーション
    if (!companyCode.trim()) {
      setError('企業コードを入力してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setLoading(true)

    const result = await registerUser(
      companyCode.trim().toUpperCase(),
      fullName,
      email,
      password
    )

    if (!result.success) {
      setError(result.error || 'ユーザー登録に失敗しました')
      setLoading(false)
    } else {
      setCompanyName(result.companyName || '')
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-black">
              登録が完了しました！
            </CardTitle>
            <CardDescription className="text-black">
              アカウントが作成されました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-black">
                  所属企業
                </p>
              </div>
              <p className="text-xl font-bold text-blue-600 text-center">
                {companyName}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-black">
                <strong>氏名:</strong> {fullName}
              </p>
              <p className="text-sm text-black">
                <strong>メールアドレス:</strong> {email}
              </p>
            </div>

            <Link href="/login">
              <Button className="w-full">
                ログインページへ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-black">スタッフ登録</CardTitle>
          </div>
          <CardDescription className="text-center text-black">
            企業コードを使用してアカウントを作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyCode">企業コード *</Label>
              <Input
                id="companyCode"
                type="text"
                placeholder="ABC123"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
                maxLength={6}
                className="uppercase tracking-widest font-mono"
              />
              <p className="text-xs text-gray-500">
                管理者から提供された6桁の企業コードを入力してください
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-black mb-3">
                アカウント情報
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fullName">氏名 *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="山田 太郎"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">パスワード *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    6文字以上で入力してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">パスワード（確認） *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登録中...' : 'アカウントを作成'}
            </Button>

            <div className="space-y-2 text-center text-sm">
              <Link href="/login" className="text-blue-600 hover:underline block">
                ログインページに戻る
              </Link>
              <Link href="/register-company" className="text-gray-600 hover:underline block">
                企業アカウントを作成する場合はこちら
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
