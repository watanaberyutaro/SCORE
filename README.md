# SHARESCORE - 社員評価管理システム

社員の包括的な評価を管理するNext.jsベースのWebアプリケーションです。3名の管理者がスタッフを評価し、スタッフは自分の評価結果を確認できるシステムです。

## 主要機能

### 管理者機能
- スタッフ評価の入力・管理
- 評価進捗のダッシュボード表示
- スタッフへのコメント機能
- 分析・レポート機能
- 評価項目・評価サイクルの管理

### スタッフ機能
- 自分の評価結果確認（3名の管理者からの評価）
- 目標管理
- 管理者からのコメント確認
- 評価に対する質問機能
- 生産性データ確認

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **デプロイ**: Vercel
- **状態管理**: React Hooks
- **フォーム管理**: React Hook Form
- **データ検証**: Zod
- **チャート**: Recharts
- **日付処理**: date-fns

## セットアップ

### 1. 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント

### 2. リポジトリのクローン

```bash
git clone <repository-url>
cd SHARESCORE
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 環境変数の設定

`.env.example`をコピーして`.env.local`を作成:

```bash
cp .env.example .env.local
```

`.env.local`に以下の情報を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Supabaseのセットアップ

#### データベーススキーマの作成

1. Supabaseプロジェクトにログイン
2. SQL Editorを開く
3. `supabase/schema.sql`の内容を実行
4. `supabase/rls-policies.sql`の内容を実行

#### 管理者アカウントの作成

1. Supabaseの Authentication > Users から3名のユーザーを作成
2. SQL Editorで以下を実行:

```sql
-- 作成したユーザーのIDを確認
SELECT id, email FROM auth.users;

-- 管理者として設定（3名分実行）
INSERT INTO users (id, email, full_name, role, is_admin)
VALUES
  ('user-id-1', 'admin1@example.com', '管理者1', 'admin', true),
  ('user-id-2', 'admin2@example.com', '管理者2', 'admin', true),
  ('user-id-3', 'admin3@example.com', '管理者3', 'admin', true);
```

#### スタッフアカウントの作成

```sql
-- スタッフユーザーを追加
INSERT INTO users (id, email, full_name, role, is_admin, department, position)
VALUES
  ('staff-id-1', 'staff1@example.com', 'スタッフ1', 'staff', false, '営業部', '営業担当'),
  ('staff-id-2', 'staff2@example.com', 'スタッフ2', 'staff', false, '開発部', 'エンジニア');
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## プロジェクト構造

```
SHARESCORE/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # 認証関連ページ
│   │   └── login/              # ログインページ
│   ├── (admin)/                # 管理者専用ページ
│   │   └── admin/
│   │       ├── dashboard/      # 管理者ダッシュボード
│   │       ├── evaluations/    # 評価管理
│   │       ├── analytics/      # 分析・レポート
│   │       └── settings/       # 設定
│   ├── (staff)/                # スタッフ専用ページ
│   │   ├── dashboard/          # スタッフダッシュボード
│   │   ├── my-evaluation/      # 評価結果
│   │   ├── my-goals/          # 目標管理
│   │   ├── my-comments/        # コメント
│   │   ├── my-questions/       # 質問・回答
│   │   └── my-productivity/    # 生産性データ
│   └── api/                    # API Routes
├── components/                  # Reactコンポーネント
│   ├── ui/                     # UIコンポーネント
│   ├── forms/                  # フォームコンポーネント
│   └── navigation/             # ナビゲーション
├── lib/                        # ユーティリティ
│   ├── supabase/              # Supabaseクライアント
│   ├── auth/                  # 認証関連
│   ├── utils/                 # ユーティリティ関数
│   └── constants/             # 定数定義
├── types/                      # TypeScript型定義
├── hooks/                      # Reactカスタムフック
└── supabase/                   # Supabaseスキーマ
    ├── schema.sql             # データベーススキーマ
    └── rls-policies.sql       # RLSポリシー
```

## 評価システム

### 評価項目

#### 成果評価 (-15〜100点)
- 実績評価: 0〜25点
- 勤怠評価: -5〜5点
- コンプライアンス評価: -10〜3点
- クライアント評価: 0〜15点

#### 行動評価 (0〜30点)
- 主体性評価: 0〜10点
- 責任感: 0〜7点
- 協調性評価: 0〜10点
- アピアランス評価: 0〜3点

#### 成長評価 (0〜30点)
- 自己研鑽評価: 0〜7点
- レスポンス評価: 0〜5点
- 自己目標達成評価: 0〜10点

### ランク判定

- **SS**: 95点以上 → +15,000円（加算式）
- **S**: 90〜94点 → +10,000円（加算式）
- **A+**: 85〜89点 → +4,000円（加算式）
- **A**: 80〜84点 → +3,000円（加算式）
- **A-**: 75〜79点 → +2,000円（加算式）
- **B**: 60〜74点 → 特に無し
- **C**: 55〜59点 → -5,000円（固定式）
- **D**: 〜54点 → -10,000円（固定式）

### 評価の流れ

1. 管理者が評価サイクルを作成
2. 3名の管理者が各スタッフを評価
3. システムが自動的に平均点を計算
4. ランクを自動判定
5. スタッフが結果を確認

## デプロイ

### Vercelへのデプロイ

1. GitHubにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

```bash
# ビルド確認
npm run build

# 本番環境起動
npm start
```

## トラブルシューティング

### データベース接続エラー

- Supabaseの環境変数が正しく設定されているか確認
- Supabaseプロジェクトがアクティブか確認

### 認証エラー

- RLSポリシーが正しく設定されているか確認
- ユーザーが正しく作成されているか確認

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf .next
npm install
npm run build
```

## ライセンス

このプロジェクトは社内利用専用です。

## サポート

問題が発生した場合は、開発チームに連絡してください。
