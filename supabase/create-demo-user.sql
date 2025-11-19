-- ===================================
-- デモユーザーアカウント作成スクリプト
-- ===================================

-- デモスタッフユーザー
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
  'demo@share-llc.co.jp',
  crypt('demo2525', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"デモユーザー"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- public.users テーブルにデモユーザーのレコードを作成
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
  'demo@share-llc.co.jp',
  'デモユーザー',
  'staff',
  false,
  'デモ部署',
  'デモ担当',
  '2024-01-01'
FROM auth.users
WHERE email = 'demo@share-llc.co.jp';

-- 作成されたデモアカウントの確認
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_admin,
  u.department,
  u.position
FROM public.users u
WHERE u.email = 'demo@share-llc.co.jp';
