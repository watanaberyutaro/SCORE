# カスタム評価項目の確認手順

## 1. データベースの確認

### 1.1 評価カテゴリマスターの確認
Supabaseダッシュボードで以下を確認：

**テーブル:** `evaluation_categories`
**確認項目:**
- 企業のcompany_idで登録されたカテゴリが存在するか
- 必須カラム:
  - `category_key` (例: 'performance', 'behavior', 'growth')
  - `category_label` (例: '成果評価', '行動評価', '成長評価')
  - `is_active` = true
  - `display_order` (表示順)

**SQLクエリ例:**
```sql
SELECT * FROM evaluation_categories
WHERE company_id = 'YOUR_COMPANY_ID'
AND is_active = true
ORDER BY display_order;
```

### 1.2 評価項目マスターの確認
**テーブル:** `evaluation_items_master`
**確認項目:**
- 企業のcompany_idで登録された評価項目が存在するか
- 必須カラム:
  - `category` (カテゴリキー: 'performance', 'behavior', 'growth')
  - `item_name` (項目名: 例: '実績評価', '主体性評価')
  - `min_score` (最小点)
  - `max_score` (最大点)

**SQLクエリ例:**
```sql
SELECT category, item_name, min_score, max_score
FROM evaluation_items_master
WHERE company_id = 'YOUR_COMPANY_ID'
ORDER BY category, item_name;
```

## 2. 画面での確認

### 2.1 評価入力フォームの確認
1. **アクセス:** 管理者アカウントでログイン
2. **ページ:** `/admin/evaluations/{staffId}?year=2024&month=12`
3. **確認ポイント:**
   - カスタムカテゴリ名が表示されているか
   - カスタム評価項目が表示されているか
   - 各項目の最小点・最大点が正しいか
   - 総合スコアが正しく計算されているか

**期待される表示:**
```
カテゴリ1 (例: 成果評価)
├─ 項目A (0〜25点)
├─ 項目B (0〜15点)
└─ 項目C (-5〜5点)

カテゴリ2 (例: 行動評価)
├─ 項目D (0〜10点)
└─ 項目E (0〜7点)
```

### 2.2 評価結果ページの確認
1. **アクセス:** スタッフアカウントでログイン
2. **ページ:** `/my-evaluation`
3. **確認ポイント:**
   - カスタムカテゴリ名が表示されているか
   - カスタム評価項目と点数が表示されているか
   - 各項目の管理者コメントが表示されているか
   - 平均点が正しく計算されているか

### 2.3 グラフ・チャートの確認
**ページ:** `/my-evaluation` (スタッフ側)
**確認ポイント:**
- カテゴリ別スコアグラフにカスタムカテゴリ名が表示されているか
- レーダーチャートにカスタムカテゴリ名が表示されているか
- 各カテゴリの最大点が正しく反映されているか

**ページ:** `/admin/analytics` (管理者側)
**確認ポイント:**
- カテゴリ別平均スコアにカスタムカテゴリ名が表示されているか
- 月次推移グラフにカスタムカテゴリ名が表示されているか
- 部門別統計にカスタムカテゴリ名が表示されているか

### 2.4 四半期レポートの確認
**ページ:** `/admin/quarterly-reports/{staffId}?year=2024&quarter=4`
**確認ポイント:**
- カテゴリ別平均にカスタムカテゴリ名が表示されているか
- 月次評価詳細にカスタムカテゴリ名が表示されているか

## 3. デバッグ方法

### ブラウザの開発者ツールで確認
1. **F12キー** で開発者ツールを開く
2. **Network タブ** でAPIリクエストを確認

**確認すべきAPIエンドポイント:**
- `GET /rest/v1/evaluation_categories?company_id=...&is_active=eq.true`
- `GET /rest/v1/evaluation_items_master?company_id=...`

**確認項目:**
- ステータスコード: 200 OK
- レスポンスデータにカスタム設定が含まれているか
- エラーが発生していないか

### コンソールでエラー確認
**Console タブ** で以下のエラーがないか確認:
- ❌ `column ... does not exist` → カラム名の不一致
- ❌ `relation ... does not exist` → テーブル名の不一致
- ❌ `null` or `undefined` → データが取得できていない

## 4. トラブルシューティング

### カテゴリが表示されない場合
1. `evaluation_categories` テーブルにデータが登録されているか確認
2. `is_active = true` になっているか確認
3. `company_id` が正しいか確認

### 評価項目が表示されない場合
1. `evaluation_items_master` テーブルにデータが登録されているか確認
2. `category` カラムの値が `evaluation_categories.category_key` と一致しているか確認
3. `company_id` が正しいか確認

### デフォルト値が表示される場合
- データベースにカスタム設定がない場合、デフォルト値が使用されます
- これは正常な動作です（後方互換性のため）

## 5. サンプルデータの投入

もしテストデータが必要な場合は、以下のSQLを実行してください：

```sql
-- 評価カテゴリの登録例
INSERT INTO evaluation_categories (company_id, category_key, category_label, display_order, is_active)
VALUES
  ('YOUR_COMPANY_ID', 'performance', '成果評価', 1, true),
  ('YOUR_COMPANY_ID', 'behavior', '行動評価', 2, true),
  ('YOUR_COMPANY_ID', 'growth', '成長評価', 3, true);

-- 評価項目の登録例
INSERT INTO evaluation_items_master (company_id, category, item_name, min_score, max_score, description)
VALUES
  ('YOUR_COMPANY_ID', 'performance', '実績評価', 0, 25, '目標達成度'),
  ('YOUR_COMPANY_ID', 'performance', '勤怠評価', -5, 5, '出勤状況'),
  ('YOUR_COMPANY_ID', 'behavior', '主体性評価', 0, 10, '自発的な行動'),
  ('YOUR_COMPANY_ID', 'growth', '自己研鑽評価', 0, 7, '学習意欲');
```

**注意:** `YOUR_COMPANY_ID` を実際の company_id に置き換えてください。
