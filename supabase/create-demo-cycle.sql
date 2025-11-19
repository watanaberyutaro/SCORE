-- ===================================
-- デモ評価サイクル作成スクリプト
-- ===================================

-- 2025年度上半期評価サイクルを作成
INSERT INTO evaluation_cycles (
  cycle_name,
  start_date,
  end_date,
  trial_date,
  implementation_date,
  final_date,
  status
) VALUES (
  '2025年度上半期',
  '2025-01-01',
  '2025-06-30',
  '2025-02-15',
  '2025-04-01',
  '2025-06-30',
  'active'
);

-- 作成された評価サイクルの確認
SELECT
  id,
  cycle_name,
  start_date,
  end_date,
  status,
  created_at
FROM evaluation_cycles
WHERE cycle_name = '2025年度上半期';
