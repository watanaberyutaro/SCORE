-- 評価設定テーブルに company_id を追加して企業ごとに独立させる

-- 1. evaluation_categories テーブルに company_id を追加
ALTER TABLE evaluation_categories
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 2. evaluation_items_master テーブルに company_id を追加
ALTER TABLE evaluation_items_master
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 3. 既存データを削除（全企業共有になっているため）
DELETE FROM evaluation_items_master;
DELETE FROM evaluation_categories;

-- 4. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_company_id
  ON evaluation_categories(company_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_items_master_company_id
  ON evaluation_items_master(company_id);

-- 5. category_key のユニーク制約を company_id と組み合わせに変更
-- まず既存の制約を削除
ALTER TABLE evaluation_categories
  DROP CONSTRAINT IF EXISTS evaluation_categories_category_key_key;

-- 新しい複合ユニーク制約を追加（同じ企業内でのみユニーク）
ALTER TABLE evaluation_categories
  ADD CONSTRAINT evaluation_categories_company_category_key
  UNIQUE (company_id, category_key);

-- 完了: これで各企業が独自の評価カテゴリ・評価項目を設定できます
