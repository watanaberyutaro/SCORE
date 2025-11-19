'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function RegisterCompanyPage() {
  const [companyName, setCompanyName] = useState('')
  const [establishmentDate, setEstablishmentDate] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [companyCode, setCompanyCode] = useState('')
  const { registerCompany } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // バリデーション
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setLoading(true)

    const result = await registerCompany(
      companyName,
      adminName,
      email,
      password,
      establishmentDate || undefined
    )

    if (!result.success) {
      setError(result.error || '企業登録に失敗しました')
      setLoading(false)
    } else {
      setCompanyCode(result.companyCode || '')
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
              企業登録が完了しました！
            </CardTitle>
            <CardDescription className="text-black">
              管理者アカウントが作成されました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-black mb-2">
                企業コード（大切に保管してください）
              </p>
              <div className="flex items-center justify-center">
                <p className="text-3xl font-bold text-blue-600 tracking-widest">
                  {companyCode}
                </p>
              </div>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-sm text-black">
                この企業コードはスタッフがアカウント登録する際に必要です。
                必ずメモを取るか、スクリーンショットを保存してください。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-black">
                <strong>企業名:</strong> {companyName}
              </p>
              <p className="text-sm text-black">
                <strong>管理者名:</strong> {adminName}
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
            <Building2 className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-black">企業登録</CardTitle>
          </div>
          <CardDescription className="text-center text-black">
            新しい企業アカウントを作成します
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
              <Label htmlFor="companyName">企業名 *</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="株式会社○○"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="establishmentDate">設立年月（任意）</Label>
              <Input
                id="establishmentDate"
                type="month"
                value={establishmentDate}
                onChange={(e) => setEstablishmentDate(e.target.value + '-01')}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                評価期の計算に使用されます
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-black mb-3">
                管理者アカウント情報
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="adminName">管理者名 *</Label>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="山田 太郎"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
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
              {loading ? '登録中...' : '企業を登録'}
            </Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-blue-600 hover:underline">
                ログインページに戻る
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
