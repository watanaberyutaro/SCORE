# セットアップガイド

このガイドでは、SHARESCOREシステムを最初からセットアップする手順を詳しく説明します。

## 1. Supabaseプロジェクトの作成

### 1.1 アカウント作成

1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ

### 1.2 新規プロジェクト作成

1. 「New Project」をクリック
2. プロジェクト情報を入力:
   - Name: `sharescore-evaluation`
   - Database Password: 強固なパスワードを設定（保存しておく）
   - Region: `Tokyo (ap-northeast-1)` を選択
3. 「Create new project」をクリック

### 1.3 APIキーの取得

プロジェクトが作成されたら:

1. 左サイドバーから「Settings」→「API」を選択
2. 以下の情報をコピー:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 機密情報)

## 2. データベースのセットアップ

### 2.1 スキーマの作成

1. Supabaseダッシュボードの「SQL Editor」を開く
2. 「New query」をクリック
3. `supabase/schema.sql`の内容を全てコピー＆ペースト
4. 「Run」をクリックして実行

✅ 成功すると以下のテーブルが作成されます:
- users
- evaluations
- evaluation_responses
- evaluation_items
- admin_comments
- staff_goals
- evaluation_questions
- evaluation_items_master
- evaluation_cycles
- productivity_data

### 2.2 RLSポリシーの設定

1. 同じSQL Editorで新しいクエリを作成
2. `supabase/rls-policies.sql`の内容を全てコピー＆ペースト
3. 「Run」をクリックして実行

✅ Row Level Securityが有効化され、適切なアクセス権限が設定されます

### 2.3 確認

「Table Editor」で以下を確認:
- 全てのテーブルが表示されている
- `evaluation_items_master`に初期データが入っている

## 3. 認証の設定

### 3.1 メール認証の設定

1. 「Authentication」→「Settings」→「Auth Providers」
2. Email Providerが有効になっていることを確認
3. 「Confirm email」を無効化（開発環境の場合）

### 3.2 管理者アカウントの作成

**方法1: UIから作成（推奨）**

1. 「Authentication」→「Users」→「Add user」
2. 以下の情報で3名のユーザーを作成:

```
ユーザー1:
Email: admin1@example.com
Password: Admin123!@#

ユーザー2:
Email: admin2@example.com
Password: Admin123!@#

ユーザー3:
Email: admin3@example.com
Password: Admin123!@#
```

3. 各ユーザー作成後、そのユーザーIDをコピー

**方法2: SQLで作成**

SQL Editorで以下を実行:

```sql
-- 管理者情報を挿入（auth.usersのIDを使用）
-- まず認証ユーザーのIDを確認
SELECT id, email FROM auth.users;

-- 上記で取得したIDを使って、管理者情報を挿入
INSERT INTO public.users (id, email, full_name, role, is_admin, department, position)
VALUES
  ('取得したID1', 'admin1@example.com', '山田太郎', 'admin', true, '経営企画部', '部長'),
  ('取得したID2', 'admin2@example.com', '佐藤花子', 'admin', true, '人事部', 'マネージャー'),
  ('取得したID3', 'admin3@example.com', '鈴木一郎', 'admin', true, '営業部', '部長');
```

### 3.3 スタッフアカウントの作成

同様に、スタッフ用のアカウントを作成:

```sql
-- スタッフユーザーを追加
INSERT INTO public.users (id, email, full_name, role, is_admin, department, position, hire_date)
VALUES
  ('取得したID', 'staff1@example.com', '田中健太', 'staff', false, '営業部', '営業担当', '2023-04-01'),
  ('取得したID', 'staff2@example.com', '高橋美咲', 'staff', false, '開発部', 'エンジニア', '2023-04-01');
```

## 4. ローカル環境のセットアップ

### 4.1 環境変数の設定

1. プロジェクトルートに`.env.local`ファイルを作成
2. 以下の内容を記入:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External API（オプション）
EXTERNAL_API_URL=
EXTERNAL_API_KEY=
```

### 4.2 依存関係のインストール

```bash
npm install
```

### 4.3 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 5. 初期データの投入

### 5.1 評価サイクルの作成

SQL Editorで実行:

```sql
INSERT INTO evaluation_cycles (cycle_name, start_date, end_date, status)
VALUES ('2025-Q1', '2025-01-01', '2025-03-31', 'active');
```

### 5.2 テスト評価の作成（オプション）

```sql
-- スタッフの評価レコードを作成
INSERT INTO evaluations (staff_id, evaluation_period, status)
SELECT id, '2025-Q1', 'draft'
FROM users
WHERE role = 'staff';
```

## 6. 動作確認

### 6.1 管理者ログイン

1. http://localhost:3000 にアクセス
2. 管理者アカウントでログイン
3. ダッシュボードが表示されることを確認

### 6.2 スタッフログイン

1. 別のブラウザまたはシークレットモードでアクセス
2. スタッフアカウントでログイン
3. ダッシュボードが表示されることを確認

### 6.3 評価機能のテスト

1. 管理者でログイン
2. 「評価管理」→ スタッフを選択
3. 評価を入力して保存
4. スタッフでログインして評価が表示されることを確認

## 7. 本番環境へのデプロイ

### 7.1 Vercelへのデプロイ

1. GitHubにリポジトリをプッシュ
2. Vercelにログイン
3. 「New Project」→ リポジトリを選択
4. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (Vercelのドメイン)
5. 「Deploy」をクリック

### 7.2 本番環境の確認

1. デプロイ完了後、URLにアクセス
2. ログイン機能を確認
3. 各機能が正常に動作することを確認

## トラブルシューティング

### データベース接続エラー

**症状**: 「Failed to connect to database」エラー

**解決方法**:
1. `.env.local`の環境変数を確認
2. SupabaseプロジェクトがActive状態か確認
3. APIキーが正しいか再確認

### 認証エラー

**症状**: ログインできない

**解決方法**:
1. RLSポリシーが正しく設定されているか確認
2. `users`テーブルにユーザーが存在するか確認
3. メールアドレスとパスワードが正しいか確認

### ビルドエラー

**症状**: `npm run build`が失敗する

**解決方法**:
```bash
rm -rf .next node_modules
npm install
npm run build
```

## サポート

問題が解決しない場合は、以下を確認してください:

1. Node.jsのバージョン（18以上推奨）
2. npmのバージョン
3. Supabaseのプロジェクトステータス
4. ブラウザのコンソールエラー

それでも解決しない場合は、開発チームに連絡してください。
