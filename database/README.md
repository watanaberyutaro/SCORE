# データベース管理

## 目次
- [パフォーマンス改善インデックスの追加](#パフォーマンス改善インデックスの追加)
- [ランク設定テーブルの作成](#ランク設定テーブルの作成)
- [デモユーザーの削除](#デモユーザーの削除)

## パフォーマンス改善インデックスの追加

ログインやページ読み込みの速度を大幅に改善するため、以下の手順でデータベースインデックスを追加してください。

### 手順

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック
4. 「New query」をクリック
5. `database/migrations/add_performance_indexes.sql` の内容をコピー&ペースト
6. 「Run」ボタンをクリックして実行

### 期待される効果

- **ログイン処理**: 30-50%高速化
- **ダッシュボード読み込み**: 50-70%高速化
- **評価詳細ページ**: 40-60%高速化
- **全般的なクエリ**: 20-40%高速化

### 追加されるインデックス

このマイグレーションでは以下のテーブルにインデックスを追加します：

- `users` - company_id, role, email
- `companies` - company_code, is_active
- `evaluations` - staff_id, year/month, status
- `evaluation_responses` - evaluation_id, admin_id
- `evaluation_items` - response_id, category
- `staff_goals` - company_id, interview_status
- `evaluation_questions` - company_id（未回答のみ）
- その他のテーブル

### 確認方法

マイグレーション実行後、以下のSQLで追加されたインデックスを確認できます：

```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

---

## ランク設定テーブルの作成

ランク設定機能を有効にするには、以下の手順でマイグレーションを実行してください：

### 手順

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック
4. 「New query」をクリック
5. `database/migrations/create_rank_settings.sql` の内容をコピー&ペースト
6. 「Run」ボタンをクリックして実行

### マイグレーション内容

`create_rank_settings.sql` は以下を作成します：

- `rank_settings` テーブル（企業ごとのカスタムランク設定を保存）
- 必要なインデックス
- RLSポリシー（管理者のみがアクセス可能）
- 自動更新トリガー

### 確認方法

マイグレーション実行後、以下のSQLで確認できます：

```sql
SELECT * FROM rank_settings;
```

空の結果が返れば、マイグレーションは成功です。
管理者は設定画面の「ランク設定」タブから、カスタムランクを追加できます。

---

## デモユーザーの削除

⚠️ **重要**: この操作は元に戻せません！必ずバックアップを取得してから実行してください。

### クイックスタート

1. **Supabaseダッシュボード**にアクセス
2. **SQL Editor**を開く
3. `database/delete_demo_user.sql` の内容をコピー&ペースト
4. **ステップ2**の確認クエリを実行して、削除されるデータ量を確認
5. **ステップ3**のコメントアウトを解除して、順番に実行

### 削除されるデータ

- `evaluation_items` - 評価項目の詳細
- `evaluation_responses` - 評価回答
- `admin_comments` - 管理者コメント
- `evaluations` - 評価レコード
- `goals` - 目標データ
- `users` - デモユーザーアカウント

### 詳細な手順

詳しい手順とトラブルシューティングについては、`delete_demo_user.sql` のコメントを参照してください。
