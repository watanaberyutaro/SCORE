-- evaluation_items_masterのcategory CHECK制約を削除
-- これにより、管理者設定で追加したカスタムカテゴリが使用可能になります

-- CHECK制約を削除
ALTER TABLE evaluation_items_master
  DROP CONSTRAINT IF EXISTS evaluation_items_master_category_check;

-- categoryフィールドをtext型に変更（制約なし）
ALTER TABLE evaluation_items_master
  ALTER COLUMN category TYPE text;

-- 基本カテゴリを追加（既存データとの互換性のため）
INSERT INTO evaluation_categories (category_key, category_label, description, display_order, is_default, is_active)
VALUES
  ('performance', '成果評価', '売上や実績、勤怠など業務成果に関する評価', 1, true, true),
  ('behavior', '行動評価', '主体性、責任感、協調性など行動面に関する評価', 2, true, true),
  ('growth', '成長評価', '自己研鑽、レスポンス、目標達成など成長面に関する評価', 3, true, true)
ON CONFLICT (category_key) DO NOTHING;

-- 完了: 管理者設定ページから評価項目を自由に追加できます
