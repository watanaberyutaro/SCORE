'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Settings, Plus, Edit, Trash2, X, Building2, Copy, Check } from 'lucide-react'
import { EvaluationItemMaster, EvaluationCycle, EvaluationCategoryMaster } from '@/types'
import { calculatePeriod, getAllPeriods, getPeriodInfo } from '@/lib/utils/period-calculator'

type NewCycle = Omit<EvaluationCycle, 'id' | 'created_at'>
type NewItem = Omit<EvaluationItemMaster, 'id' | 'created_at'>
type NewCategory = Omit<EvaluationCategoryMaster, 'id' | 'created_at' | 'updated_at'>

export default function AdminSettingsPage() {
  const [cycles, setCycles] = useState<EvaluationCycle[]>([])
  const [items, setItems] = useState<EvaluationItemMaster[]>([])
  const [categories, setCategories] = useState<EvaluationCategoryMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'cycles' | 'items' | 'categories'>('cycles')

  // Company info state
  const [companyId, setCompanyId] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [companyCode, setCompanyCode] = useState<string>('')
  const [establishmentDate, setEstablishmentDate] = useState<string>('')
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState<any>(null)
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1)
  const [codeCopied, setCodeCopied] = useState(false)

  // Cycle form state
  const [showCycleForm, setShowCycleForm] = useState(false)
  const [editingCycle, setEditingCycle] = useState<EvaluationCycle | null>(null)
  const [cycleForm, setCycleForm] = useState<NewCycle>({
    cycle_name: '',
    start_date: '',
    end_date: '',
    trial_date: null,
    implementation_date: null,
    final_date: null,
    status: 'planning'
  })

  // Item form state
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<EvaluationItemMaster | null>(null)
  const [itemForm, setItemForm] = useState<NewItem>({
    category: 'performance',
    item_name: '',
    min_score: 0,
    max_score: 100,
    description: ''
  })

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EvaluationCategoryMaster | null>(null)
  const [categoryForm, setCategoryForm] = useState<NewCategory>({
    category_key: '',
    category_label: '',
    description: null,
    display_order: 0,
    is_default: false,
    is_active: true
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Get current user's company_id
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('ユーザーが見つかりません')

      const { data: currentUser } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!currentUser) throw new Error('ユーザー情報が見つかりません')

      const [companyRes, cyclesRes, itemsRes, categoriesRes] = await Promise.all([
        supabase
          .from('companies')
          .select('*')
          .eq('id', currentUser.company_id)
          .single(),
        supabase
          .from('evaluation_cycles')
          .select('*')
          .eq('company_id', currentUser.company_id)
          .order('start_date', { ascending: false }),
        supabase
          .from('evaluation_items_master')
          .select('*')
          .order('category'),
        supabase
          .from('evaluation_categories')
          .select('*')
          .order('display_order')
      ])

      if (companyRes.error) throw companyRes.error
      if (cyclesRes.error) throw cyclesRes.error
      if (itemsRes.error) throw itemsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      // Set company info
      setCompanyId(companyRes.data.id)
      setCompanyName(companyRes.data.company_name)
      setCompanyCode(companyRes.data.company_code || '')
      setEstablishmentDate(companyRes.data.establishment_date || '')

      // Calculate period info if establishment date exists
      if (companyRes.data.establishment_date) {
        const currentPeriod = calculatePeriod(companyRes.data.establishment_date)
        setCurrentPeriodInfo(currentPeriod)

        const periods = getAllPeriods(companyRes.data.establishment_date)
        setAvailablePeriods(periods)
        setSelectedPeriod(currentPeriod.periodNumber)
      }

      setCycles(cyclesRes.data || [])
      setItems(itemsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Company info operations
  function handleCopyCompanyCode() {
    if (companyCode) {
      navigator.clipboard.writeText(companyCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  async function handleSaveEstablishmentDate() {
    try {
      setError('')

      if (!establishmentDate) {
        throw new Error('設立年月を入力してください')
      }

      const { error } = await supabase
        .from('companies')
        .update({ establishment_date: establishmentDate })
        .eq('id', companyId)

      if (error) throw error

      // Recalculate period info
      const currentPeriod = calculatePeriod(establishmentDate)
      setCurrentPeriodInfo(currentPeriod)

      const periods = getAllPeriods(establishmentDate)
      setAvailablePeriods(periods)
      setSelectedPeriod(currentPeriod.periodNumber)

      alert('設立年月を保存しました')
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleGeneratePeriodCycle() {
    try {
      setError('')

      if (!establishmentDate) {
        throw new Error('設立年月を先に設定してください')
      }

      const periodInfo = getPeriodInfo(establishmentDate, selectedPeriod)

      // Check if cycle already exists
      const existingCycle = cycles.find(
        c => c.start_date === periodInfo.startDate.toISOString().split('T')[0]
      )

      if (existingCycle) {
        if (!confirm('この期のサイクルは既に存在します。上書きしますか？')) {
          return
        }
        await supabase
          .from('evaluation_cycles')
          .delete()
          .eq('id', existingCycle.id)
      }

      // Create new cycle
      const newCycle = {
        company_id: companyId,
        cycle_name: `${periodInfo.periodName}（${periodInfo.startDate.getFullYear()}年${periodInfo.startDate.getMonth() + 1}月〜${periodInfo.endDate.getFullYear()}年${periodInfo.endDate.getMonth() + 1}月）`,
        start_date: periodInfo.startDate.toISOString().split('T')[0],
        end_date: periodInfo.endDate.toISOString().split('T')[0],
        status: selectedPeriod === currentPeriodInfo?.periodNumber ? 'active' :
               selectedPeriod < currentPeriodInfo?.periodNumber ? 'completed' : 'planning',
        trial_date: null,
        implementation_date: null,
        final_date: null,
      }

      const { error } = await supabase
        .from('evaluation_cycles')
        .insert([newCycle])

      if (error) throw error

      await fetchData()
      alert(`${periodInfo.periodName}のサイクルを作成しました`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Cycle CRUD operations
  async function handleSaveCycle() {
    try {
      setError('')

      // Get current user's company_id
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('ユーザーが見つかりません')

      const { data: currentUser } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!currentUser) throw new Error('ユーザー情報が見つかりません')

      if (editingCycle) {
        const { error } = await supabase
          .from('evaluation_cycles')
          .update(cycleForm)
          .eq('id', editingCycle.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('evaluation_cycles')
          .insert([{ ...cycleForm, company_id: currentUser.company_id }])

        if (error) throw error
      }

      await fetchData()
      resetCycleForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDeleteCycle(id: string) {
    if (!confirm('このサイクルを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('evaluation_cycles')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function resetCycleForm() {
    setShowCycleForm(false)
    setEditingCycle(null)
    setCycleForm({
      cycle_name: '',
      start_date: '',
      end_date: '',
      trial_date: null,
      implementation_date: null,
      final_date: null,
      status: 'planning'
    })
  }

  // Item CRUD operations
  async function handleSaveItem() {
    try {
      setError('')

      if (editingItem) {
        const { error } = await supabase
          .from('evaluation_items_master')
          .update(itemForm)
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('evaluation_items_master')
          .insert([itemForm])

        if (error) throw error
      }

      await fetchData()
      resetItemForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('この評価項目を削除してもよろしいですか？')) return

    try {
      const { error} = await supabase
        .from('evaluation_items_master')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function resetItemForm() {
    setShowItemForm(false)
    setEditingItem(null)
    setItemForm({
      category: 'performance',
      item_name: '',
      min_score: 0,
      max_score: 100,
      description: ''
    })
  }

  // Category CRUD operations
  async function handleSaveCategory() {
    try {
      setError('')

      // Validate category_key format (alphanumeric and underscore only)
      if (!/^[a-z0-9_]+$/.test(categoryForm.category_key)) {
        throw new Error('カテゴリキーは小文字の英数字とアンダースコアのみ使用できます')
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('evaluation_categories')
          .update({
            category_label: categoryForm.category_label,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            is_active: categoryForm.is_active
          })
          .eq('id', editingCategory.id)

        if (error) throw error
      } else {
        // Check if category_key already exists
        const { data: existing } = await supabase
          .from('evaluation_categories')
          .select('id')
          .eq('category_key', categoryForm.category_key)
          .single()

        if (existing) {
          throw new Error('このカテゴリキーは既に存在します')
        }

        const { error } = await supabase
          .from('evaluation_categories')
          .insert([categoryForm])

        if (error) throw error
      }

      await fetchData()
      resetCategoryForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDeleteCategory(id: string, isDefault: boolean) {
    if (isDefault) {
      alert('デフォルトカテゴリは削除できません')
      return
    }

    if (!confirm('このカテゴリを削除してもよろしいですか？\n※ このカテゴリを使用している評価項目がある場合は削除できません。')) return

    try {
      // Check if any items use this category
      const category = categories.find(c => c.id === id)
      if (category) {
        const { data: itemsUsingCategory } = await supabase
          .from('evaluation_items_master')
          .select('id')
          .eq('category', category.category_key)

        if (itemsUsingCategory && itemsUsingCategory.length > 0) {
          throw new Error('このカテゴリを使用している評価項目があるため削除できません。先に評価項目を削除してください。')
        }
      }

      const { error } = await supabase
        .from('evaluation_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function resetCategoryForm() {
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryForm({
      category_key: '',
      category_label: '',
      description: null,
      display_order: 0,
      is_default: false,
      is_active: true
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      planning: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      planning: '計画中',
      active: '実施中',
      completed: '完了',
    }
    return (
      <Badge className={variants[status] || ''}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      performance: '成果評価',
      behavior: '行動評価',
      growth: '成長評価',
    }
    return labels[category] || category
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
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          評価サイクルと評価項目の管理
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'cycles'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('cycles')}
        >
          評価サイクル
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('categories')}
        >
          カテゴリ管理
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'items'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('items')}
        >
          評価項目マスター
        </button>
      </div>

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <>
          {/* Company Info Card */}
          <Card className="mb-6 border-2" style={{ borderColor: '#05a7be' }}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg lg:text-xl text-black">
                <Building2 className="mr-2 h-5 w-5" />
                会社情報
              </CardTitle>
              <CardDescription className="text-black">
                設立年月から自動で評価期を計算します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company Code Display */}
              {companyCode && (
                <div className="p-4 rounded-lg border-2" style={{
                  borderColor: '#05a7be',
                  backgroundColor: 'rgba(5, 167, 190, 0.05)'
                }}>
                  <Label className="text-black mb-2 block">企業コード（スタッフ登録用）</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white rounded-lg border-2 p-4" style={{ borderColor: '#05a7be' }}>
                      <p className="text-3xl font-bold tracking-widest text-center font-mono" style={{ color: '#05a7be' }}>
                        {companyCode}
                      </p>
                    </div>
                    <Button
                      onClick={handleCopyCompanyCode}
                      className="h-full px-6"
                      style={{
                        backgroundColor: codeCopied ? '#10b981' : '#05a7be',
                        color: 'white'
                      }}
                    >
                      {codeCopied ? (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          コピー完了
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5 mr-2" />
                          コピー
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    ※ このコードをスタッフに共有してアカウント登録してもらいます
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name" className="text-black">会社名</Label>
                  <Input
                    id="company_name"
                    value={companyName}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="establishment_date" className="text-black">設立年月 *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="establishment_date"
                      type="date"
                      value={establishmentDate}
                      onChange={(e) => setEstablishmentDate(e.target.value)}
                      className="border-2"
                      style={{ borderColor: '#05a7be' }}
                    />
                    <Button onClick={handleSaveEstablishmentDate} className="bg-[#05a7be] hover:bg-[#048a9d]">
                      保存
                    </Button>
                  </div>
                </div>
              </div>

              {currentPeriodInfo && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">現在の期</p>
                      <p className="text-xl font-bold text-black">{currentPeriodInfo.periodName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">期の期間</p>
                      <p className="text-sm font-semibold text-black">
                        {currentPeriodInfo.startDate.toLocaleDateString('ja-JP')} 〜 {currentPeriodInfo.endDate.toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">現在の四半期</p>
                      <p className="text-sm font-semibold text-black">{currentPeriodInfo.quarterName}（{currentPeriodInfo.currentMonth}/12ヶ月）</p>
                    </div>
                  </div>
                </div>
              )}

              {availablePeriods.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-black">期からサイクルを自動生成</Label>
                  <div className="flex gap-2">
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                      className="flex-1 rounded-md border-2 px-4 py-2 text-black"
                      style={{ borderColor: '#05a7be' }}
                    >
                      {availablePeriods.map((period) => (
                        <option key={period.periodNumber} value={period.periodNumber}>
                          {period.periodName}（{period.startDate.toLocaleDateString('ja-JP')} 〜 {period.endDate.toLocaleDateString('ja-JP')}）
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleGeneratePeriodCycle}
                      className="bg-[#6366f1] hover:bg-[#4f46e5]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      生成
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
                    ※ 選択した期の開始日・終了日で自動的にサイクルが作成されます
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-lg lg:text-xl">
                    <Calendar className="mr-2 h-5 w-5" />
                    評価サイクル
                  </CardTitle>
                  <CardDescription>評価期間の管理（手動作成）</CardDescription>
                </div>
                <Button onClick={() => setShowCycleForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
          <CardContent>
            {showCycleForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingCycle ? 'サイクル編集' : '新規サイクル'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={resetCycleForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cycle_name">サイクル名 *</Label>
                    <Input
                      id="cycle_name"
                      value={cycleForm.cycle_name}
                      onChange={(e) => setCycleForm({ ...cycleForm, cycle_name: e.target.value })}
                      placeholder="2024年度 第1期"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">ステータス *</Label>
                    <select
                      id="status"
                      value={cycleForm.status}
                      onChange={(e) => setCycleForm({ ...cycleForm, status: e.target.value as any })}
                      className="w-full h-10 rounded-md border border-gray-300 px-3"
                    >
                      <option value="planning">計画中</option>
                      <option value="active">実施中</option>
                      <option value="completed">完了</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="start_date">開始日 *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={cycleForm.start_date}
                      onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">終了日 *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={cycleForm.end_date}
                      onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trial_date">試用日</Label>
                    <Input
                      id="trial_date"
                      type="date"
                      value={cycleForm.trial_date || ''}
                      onChange={(e) => setCycleForm({ ...cycleForm, trial_date: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="implementation_date">実施日</Label>
                    <Input
                      id="implementation_date"
                      type="date"
                      value={cycleForm.implementation_date || ''}
                      onChange={(e) => setCycleForm({ ...cycleForm, implementation_date: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="final_date">最終日</Label>
                    <Input
                      id="final_date"
                      type="date"
                      value={cycleForm.final_date || ''}
                      onChange={(e) => setCycleForm({ ...cycleForm, final_date: e.target.value || null })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSaveCycle}>
                    {editingCycle ? '更新' : '作成'}
                  </Button>
                  <Button variant="outline" onClick={resetCycleForm}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{cycle.cycle_name}</h4>
                      {getStatusBadge(cycle.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(cycle.start_date).toLocaleDateString('ja-JP')} 〜 {new Date(cycle.end_date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCycle(cycle)
                        setCycleForm(cycle)
                        setShowCycleForm(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCycle(cycle.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-lg lg:text-xl">
                  <Settings className="mr-2 h-5 w-5" />
                  評価カテゴリ管理
                </CardTitle>
                <CardDescription>評価カテゴリの定義と管理</CardDescription>
              </div>
              <Button onClick={() => setShowCategoryForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCategoryForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingCategory ? 'カテゴリ編集' : '新規カテゴリ'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={resetCategoryForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category_key">カテゴリキー *</Label>
                    <Input
                      id="category_key"
                      value={categoryForm.category_key}
                      onChange={(e) => setCategoryForm({ ...categoryForm, category_key: e.target.value.toLowerCase() })}
                      placeholder="custom_category"
                      disabled={!!editingCategory}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      小文字の英数字とアンダースコアのみ（例: custom_category）
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="category_label">カテゴリ名 *</Label>
                    <Input
                      id="category_label"
                      value={categoryForm.category_label}
                      onChange={(e) => setCategoryForm({ ...categoryForm, category_label: e.target.value })}
                      placeholder="カスタム評価"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_order">表示順序 *</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="is_active">アクティブ</Label>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="category_description">説明</Label>
                    <Textarea
                      id="category_description"
                      value={categoryForm.description || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value || null })}
                      placeholder="このカテゴリの説明を入力してください"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSaveCategory}>
                    {editingCategory ? '更新' : '作成'}
                  </Button>
                  <Button variant="outline" onClick={resetCategoryForm}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {categories.map((category) => {
                const itemCount = items.filter(item => item.category === category.category_key).length
                return (
                  <div
                    key={category.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {category.is_default && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            デフォルト
                          </Badge>
                        )}
                        {!category.is_active && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            無効
                          </Badge>
                        )}
                        <h4 className="font-semibold">{category.category_label}</h4>
                        <span className="text-xs text-gray-500 font-mono">({category.category_key})</span>
                      </div>
                      <p className="text-sm text-gray-600">{category.description || '説明なし'}</p>
                      <p className="text-sm text-gray-500">
                        使用中の評価項目: {itemCount}件 | 表示順序: {category.display_order}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryForm(category)
                          setShowCategoryForm(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.is_default)}
                        disabled={category.is_default}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-lg lg:text-xl">
                  <Settings className="mr-2 h-5 w-5" />
                  評価項目マスター
                </CardTitle>
                <CardDescription>評価項目の定義</CardDescription>
              </div>
              <Button onClick={() => setShowItemForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showItemForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingItem ? '項目編集' : '新規項目'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={resetItemForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">カテゴリ *</Label>
                    <select
                      id="category"
                      value={itemForm.category}
                      onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as any })}
                      className="w-full h-10 rounded-md border border-gray-300 px-3"
                    >
                      <option value="performance">成果評価</option>
                      <option value="behavior">行動評価</option>
                      <option value="growth">成長評価</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="item_name">項目名 *</Label>
                    <Input
                      id="item_name"
                      value={itemForm.item_name}
                      onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                      placeholder="実績評価"
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_score">最小スコア *</Label>
                    <Input
                      id="min_score"
                      type="number"
                      value={itemForm.min_score}
                      onChange={(e) => setItemForm({ ...itemForm, min_score: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_score">最大スコア *</Label>
                    <Input
                      id="max_score"
                      type="number"
                      value={itemForm.max_score}
                      onChange={(e) => setItemForm({ ...itemForm, max_score: Number(e.target.value) })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description">説明 *</Label>
                    <Textarea
                      id="description"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      placeholder="この評価項目の説明を入力してください"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSaveItem}>
                    {editingItem ? '更新' : '作成'}
                  </Button>
                  <Button variant="outline" onClick={resetItemForm}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
                      <h4 className="font-semibold">{item.item_name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm text-gray-500">
                      スコア範囲: {item.min_score} 〜 {item.max_score}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingItem(item)
                        setItemForm(item)
                        setShowItemForm(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
