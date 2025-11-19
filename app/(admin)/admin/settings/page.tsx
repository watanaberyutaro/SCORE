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
import { Calendar, Settings, Plus, Edit, Trash2, X } from 'lucide-react'
import { EvaluationItemMaster, EvaluationCycle } from '@/types'

type NewCycle = Omit<EvaluationCycle, 'id' | 'created_at'>
type NewItem = Omit<EvaluationItemMaster, 'id' | 'created_at'>

export default function AdminSettingsPage() {
  const [cycles, setCycles] = useState<EvaluationCycle[]>([])
  const [items, setItems] = useState<EvaluationItemMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'cycles' | 'items'>('cycles')

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

      const [cyclesRes, itemsRes] = await Promise.all([
        supabase
          .from('evaluation_cycles')
          .select('*')
          .eq('company_id', currentUser.company_id)
          .order('start_date', { ascending: false }),
        supabase
          .from('evaluation_items_master')
          .select('*')
          .order('category')
      ])

      if (cyclesRes.error) throw cyclesRes.error
      if (itemsRes.error) throw itemsRes.error

      setCycles(cyclesRes.data || [])
      setItems(itemsRes.data || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-lg lg:text-xl">
                  <Calendar className="mr-2 h-5 w-5" />
                  評価サイクル
                </CardTitle>
                <CardDescription>評価期間の管理</CardDescription>
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
