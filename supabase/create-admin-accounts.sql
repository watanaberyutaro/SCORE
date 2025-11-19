-- ===================================
-- 管理者アカウント作成スクリプト
-- ===================================

-- 管理者1: 佐藤一斗
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'k.sato@share-llc.co.jp',
  crypt('nopan2525', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"佐藤一斗"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- public.users テーブルに管理者1のレコードを作成
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_admin,
  department,
  position,
  hire_date
)
SELECT
  id,
  'k.sato@share-llc.co.jp',
  '佐藤一斗',
  'admin',
  true,
  '経営企画部',
  '評価責任者',
  '2020-01-01'
FROM auth.users
WHERE email = 'k.sato@share-llc.co.jp';

-- 管理者2: 渡邊隆太郎
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'r.watanabe@share-llc.co.jp',
  crypt('nopan2525', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"渡邊隆太郎"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- public.users テーブルに管理者2のレコードを作成
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_admin,
  department,
  position,
  hire_date
)
SELECT
  id,
  'r.watanabe@share-llc.co.jp',
  '渡邊隆太郎',
  'admin',
  true,
  '人事部',
  '人事マネージャー',
  '2020-01-01'
FROM auth.users
WHERE email = 'r.watanabe@share-llc.co.jp';

-- 管理者3: 大須はるか
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'h.osu@share-llc.co.jp',
  crypt('nopan2525', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"大須はるか"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- public.users テーブルに管理者3のレコードを作成
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_admin,
  department,
  position,
  hire_date
)
SELECT
  id,
  'h.osu@share-llc.co.jp',
  '大須はるか',
  'admin',
  true,
  '営業部',
  '営業部長',
  '2020-01-01'
FROM auth.users
WHERE email = 'h.osu@share-llc.co.jp';

-- 作成されたアカウントの確認
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_admin,
  u.department,
  u.position
FROM public.users u
WHERE u.email IN (
  'k.sato@share-llc.co.jp',
  'r.watanabe@share-llc.co.jp',
  'h.osu@share-llc.co.jp'
)
ORDER BY u.email;
