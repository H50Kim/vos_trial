# vos_trial

Blind과 같은 직장인 익명 커뮤니티입니다. 백엔드는 [Supabase 프로젝트](https://tkjsezhhllrpnxhqmmrm.supabase.co)에 연결되어 있습니다.

## 배포된 앱

https://tkjsezhhllrpnxhqmmrm.supabase.co/functions/v1/app/

회사 이메일로 가입하면 글/댓글에는 실명이 아니라 `회사 · N년차`만 보입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

회원가입이 메일 확인에서 멈추면 Supabase Dashboard → Authentication → Providers → Email에서 Confirm email을 끄면 바로 로그인됩니다.

## 스택

- Vite + React + TypeScript
- Supabase Auth / Postgres / RLS / Edge Function 정적 호스팅
