# UnBlind 애플리케이션 상세 설명서

대상: 구성·운영·업데이트 담당 관리자  
제품: UnBlind (S&E Voice to Value) — 익명 S&E VoC 게시판  
작성일: 2026-09-20

이 문서는 **지금 운영 중인 웹 앱**을 기준으로 합니다. 화면은 `public/`의 정적 HTML/JS/CSS이고, 글·댓글·인증 데이터는 API 서버가 맡습니다.

---

## 1. 한눈에 보는 운영 주소

| 구분 | 주소 | 역할 |
|------|------|------|
| 공개 사이트 | https://h50kim.github.io/vos_trial/ | GitHub Pages. 사용자가 여는 화면 |
| GitHub 저장소 | https://github.com/H50Kim/vos_trial | 소스, `main` 브랜치 |
| API (배포) | https://tkjsezhhllrpnxhqmmrm.supabase.co/functions/v1/app/ | Supabase Edge Function `app` |
| Supabase 프로젝트 | `tkjsezhhllrpnxhqmmrm` | 게시판 JSON 저장소 `public.voc_store` |
| 로컬 개발 | http://localhost:4173 | Express가 `public/`을 직접 제공하고 `data/db.json`에 저장 |

Pages에서 연 화면은 **로컬 API를 쓰지 않습니다.** 브라우저가 Edge Function으로 글 목록을 요청합니다. 그래서 화면만 GitHub에 올려도 게시판 내용이 달라 보일 수 있고, 반대로 데이터만 서버에 넣어도 예전 JS가 캐시되면 UI가 다릅니다.

---

## 2. 무엇을 관리하는가

관리자가 다루는 일은 세 층입니다.

1. **제품 운영 (화면에서)**  
   공지 작성, 제안글 대기/완료 전환, 글·댓글 수정·삭제.
2. **구성 (코드)**  
   관리자 이메일, 로그인 도메인(`@gm.com`), 번역, 글 종류 규칙.
3. **배포·데이터**  
   GitHub Pages 화면 배포, Edge Function API 배포, 로컬 게시판을 서버에 맞추기.

일반 사용자는 `@gm.com` 이메일로 등록한 뒤 익명 ID(`VOC-XXXXXXXX`)로 참여합니다. 이메일은 화면에 나오지 않습니다.

---

## 3. 권한

### 3.1 로그인

- 허용 도메인: **`@gm.com`만** (`AUTH_EMAIL_PATTERN`).
- OTP 없이 이메일 등록 즉시 세션이 발급됩니다. (`POST /api/auth`, `/api/auth/request`, `/api/auth/verify` 모두 동일 등록 경로)
- 세션: HMAC 서명 토큰 `voc_session` (버전 `v: 2`). Authorization Bearer 또는 쿠키.
- 익명 ID: 이메일 HMAC → `VOC-` + 8자리. 같은 이메일이면 같은 ID가 유지됩니다.

### 3.2 관리자 계정 (코드에 고정)

아래 세 주소만 관리자입니다. 목록은 **두 곳 모두** 같아야 합니다.

- `server/index.js` → `ADMIN_EMAILS`
- `supabase/functions/app/index.ts` → `ADMIN_EMAILS`

현재:

- `junhui.park@gm.com`
- `namhyuk.1.yoo@gm.com`
- `hyoyoung.kim@gm.com`

관리자를 추가·삭제하려면 위 두 파일을 고친 뒤 **Edge Function을 다시 배포**해야 라이브에 반영됩니다. GitHub Pages만 올리면 권한은 바뀌지 않습니다.

### 3.3 권한 비교

| 동작 | 일반 사용자 | 관리자 |
|------|-------------|--------|
| 제안하기 / 공유하기 작성 | 가능 | 가능 |
| 공지사항 작성·전환 | 불가 | 가능 |
| 본인 글·댓글 수정·삭제 | 가능 | 가능 |
| 다른 사람 글·댓글 수정·삭제 | 불가 | 가능 |
| 제안글 대기 ↔ 완료 | 불가 | 가능 |
| 추천(하트) / 댓글 | 본인 글 제외, 하트는 1회 | 동일 |
| 화면 EN ↔ 한글 전환 | 가능 (UI 문구만) | 가능 |

삭제 시 브라우저 기본 `confirm`이 아니라 앱 안 확인 창이 뜹니다.

---

## 4. 화면에서 하는 운영

주소: https://h50kim.github.io/vos_trial/

1. **내 정보**에서 `@gm.com` 등록. 관리자면 `Admin` 칩이 보입니다.
2. **글쓰기**
   - 기본 탭: **제안하기** (`kind: proposal`, 상태 `open` = 대기)
   - **공유하기** (`kind: share`, 상태 `none` — 대기/완료 없음)
   - **공지사항** (`kind: notice`, 상태 `none`) — 관리자만
3. **홈 필터**: 전체 / 공지 / 공유 / 대기 / 완료. 숫자는 현재 글 수.
4. 공지는 **전체** 목록 맨 위에 고정됩니다. 목록에서는 본문이 약 80자로 축약되고 **자세히 보기**로 상세에 들어갑니다.
5. 제안글 상세에서 관리자는 대기/완료를 바꿀 수 있습니다.
6. 헤더 **EN** 버튼은 메뉴·안내 문구만 바꿉니다. 작성된 한글 본문은 번역하지 않고, 게시 시 서버가 영문을 **추가로** 붙입니다.
7. **Dashboard** 메뉴는 누구나 헤더/하단 내비게이션에서 볼 수 있습니다. 기본은 최근 7일(KST)이며, 14일·30일·이번 달·직접 선택 기간을 고를 수 있습니다. 접속 인원, 방문 횟수, 체류시간, 현재 접속, 선택 기간 게시글 감성(긍정/부정/개선 요청)과 키워드, 게시판 현황을 보여 줍니다. 이메일은 표시하지 않습니다.

한글이 포함된 글·댓글은 Google Translate(gtx) → MyMemory 순으로 영문을 만들고 `askEn` / `othersEn` / `bodyEn`에 저장합니다. 목록·상세에서 한글 아래 영문이 같이 보입니다.

---

## 5. 데이터 모델 (요약)

저장 단위는 JSON 한 덩어리입니다.

```json
{
  "users": [],
  "opinions": [],
  "votes": [],
  "comments": [],
  "ratings": [],
  "nextNumber": 1
}
```

| 필드 | 의미 |
|------|------|
| `opinions.number` | 공개 고유번호 `#021` 형식. `nextNumber`로 증가 |
| `opinions.kind` | `proposal` \| `share` \| `notice` |
| `opinions.status` | 제안만 `open` / `done`. 공유·공지는 `none` |
| `opinions.priority` | 0–5 (화면 기본 3, 막대 표시) |
| `users.emailHash` | 이메일 HMAC. 원문 이메일은 DB에 없음 |
| `users.anonId` | `VOC-XXXXXXXX` |
| 번역 | `askEn`, `othersEn`, 댓글 `bodyEn` |

로컬: `data/db.json` + HMAC 비밀키 `data/.secret`  
배포: 테이블 `public.voc_store` 행 `id = 'main'`의 `payload`(jsonb) + `secret`

**비밀키(`secret`)를 바꾸면 기존 사용자의 익명 ID와 로그인 토큰이 전부 깨집니다.** 데이터만 덮어쓸 때는 `payload`만 바꾸고 `secret`은 유지하십시오.

---

## 6. 저장소 구조 (어디를 고칠까)

```
public/                         ← 화면 원본. 여기만 직접 수정
  index.html                    ← 캐시 무효화 ?v=YYYYMMDDx
  app.js
  styles.css
  favicon.svg

server/                         ← 로컬 Express API
  index.js                      ← 인증, 권한, REST
  store.js
  translate.js
  googleForm.js

supabase/functions/app/         ← 배포 API (Deno Edge)
  index.ts                      ← server/index.js와 같은 규칙
  store.ts
  translate.ts
  www/                          ← public/ 복사본 (직접 수정하지 말 것)

docs/                           ← GitHub Pages 산출물 (직접 수정하지 말 것)
web/                            ← public/ 복사본

scripts/publish-web.mjs         ← public/ → docs/, web/, www/
data/db.json                    ← 로컬 전용. 저장소에 커밋하지 않음
apps-script/                    ← 예전 Google Apps Script 웹앱 (운영 본선 아님)
src/                            ← 쓰이지 않는 React 초안. 라이브와 무관
```

규칙: **화면은 `public/`만 고친다.** `docs/`, `web/`, `supabase/functions/app/www/`는 `node scripts/publish-web.mjs`가 덮어씁니다.  
**API 규칙을 바꾸면 `server/`와 `supabase/functions/app/`을 같이 고친다.**

---

## 7. 로컬에서 실행

필요: Node.js 18+

```bash
npm install
npm start
```

브라우저: http://localhost:4173

로컬은 `public/`을 그대로 읽고 API는 같은 출처(`/api/...`)를 씁니다. 데이터는 `data/db.json`입니다.

로컬과 라이브가 다르게 보이는 전형적인 이유:

1. `public/` 변경 후 GitHub `docs/`에 반영·푸시하지 않음
2. Pages JS는 캐시됨 (`index.html`의 `?v=`를 안 올림)
3. 글 데이터가 `db.json`과 `voc_store.payload`로 나뉨
4. API 로직만 Edge에 안 올림 (관리자 권한, 번역, 공지 규칙)

---

## 8. 화면(UI) 업데이트 배포

GitHub Pages는 **`main`의 `/docs` 폴더**를 사이트 루트로 씁니다.

1. `public/index.html`, `public/app.js`, `public/styles.css`를 수정합니다.
2. `public/index.html`에서 CSS/JS 쿼리를 올립니다. 예: `?v=20260920g` → `?v=20260920h`. 안 올리면 사용자 브라우저가 이전 `app.js`를 붙잡습니다.
3. 복사합니다.

```bash
node scripts/publish-web.mjs
```

4. `docs/`, `web/`, `supabase/functions/app/www/` 변경을 커밋하고 `main`에 푸시합니다.
5. 1–2분 뒤 https://h50kim.github.io/vos_trial/ 를 **강력 새로고침**하고, 필요하면 `?v=`가 새 값인지 페이지 소스를 확인합니다.

`npm run build:supabase`는 Vite React 빌드 뒤에 같은 publish 스크립트를 돌립니다. 라이브 UnBlind 화면은 Vite `dist/`가 아니라 **`public/` → `docs/`** 입니다. 일상 배포에는 `publish-web.mjs`만으로 충분합니다.

---

## 9. API(서버) 업데이트 배포

바꿀 파일 예:

- 권한, REST, 공지 가드: `server/index.js` **그리고** `supabase/functions/app/index.ts`
- JSON 저장 형식: `server/store.js` **그리고** `supabase/functions/app/store.ts`
- 번역: `server/translate.js` **그리고** `supabase/functions/app/translate.ts`

Edge Function 설정은 `supabase/config.toml`에 있습니다.

```toml
project_id = "tkjsezhhllrpnxhqmmrm"

[functions.app]
verify_jwt = false
```

**`verify_jwt`는 반드시 꺼 둔 상태를 유지합니다.** 켜면 브라우저의 앱 세션 토큰이 Supabase JWT가 아니라서 `/api/*`가 401/404가 됩니다.

배포 방법 (택1):

```bash
npx supabase login
npx supabase functions deploy app --project-ref tkjsezhhllrpnxhqmmrm
```

CLI가 레거시 로그인 오류를 내면 [Supabase Dashboard](https://supabase.com/dashboard/project/tkjsezhhllrpnxhqmmrm/functions)에서 `app` 함수를 배포하거나, 프로젝트에 연결된 MCP `deploy_edge_function`을 사용합니다.

배포 후 확인:

```text
GET https://tkjsezhhllrpnxhqmmrm.supabase.co/functions/v1/app/api/opinions
```

응답 `{ "items": [ ... ] }` 와 HTTP 200이어야 합니다. HTML 플레이스홀더나 JWT 에러가 나오면 배포가 잘못된 것입니다. 그 상태에서는 공개 사이트가 글을 못 불러옵니다.

Edge는 정적 파일 요청 시 GitHub Pages(`PAGES_ORIGIN`)에서 `index.html` / `app.js` / `styles.css`를 다시 가져옵니다. 함수 URL로 직접 열 때도 Pages와 같은 화면이 보이게 하려는 보조 경로입니다. 사용자에게 안내하는 공식 주소는 GitHub Pages입니다.

---

## 10. 로컬 게시판을 서버에 맞추기

로컬에서 글을 쓴 뒤 라이브에도 같게 하려면 **UI 푸시와 별개로** `voc_store.payload`를 갱신해야 합니다.

주의:

- `secret` 컬럼은 유지합니다. 바꾸면 익명 ID·로그인이 깨집니다.
- `data/db.json`과 `data/.secret`은 커밋하지 않습니다.
- 라이브에 있는 글을 로컬 JSON으로 통째로 덮으면, 그 사이 서버에만 생긴 글은 사라집니다. 덮기 전에 Dashboard에서 현재 `payload`를 백업하십시오.

절차 개요:

1. 로컬 Express를 잠시 끄고 `data/db.json`이 의도한 내용인지 확인합니다.
2. Supabase SQL Editor 또는 MCP `execute_sql`로 `public.voc_store`의 `id = 'main'` 행을 갱신합니다. `payload`만 로컬 JSON으로 교체합니다.
3. `GET .../functions/v1/app/api/opinions`에서 글 수, 공지/공유 개수가 로컬과 같은지 확인합니다.
4. Pages를 새로고침해 홈 탭 숫자가 맞는지 봅니다.

참고 스크립트 `scripts/build-seed-sql.mjs`는 로컬 `db.json` + `.secret`으로 upsert SQL을 만듭니다. **비밀키가 파일에 들어가므로 결과 SQL을 커밋하지 말고, 가능하면 secret은 제외하고 payload만 반영하십시오.**

---

## 11. API 목록

기본 경로: 로컬 `/api/...`, 라이브 `{Edge URL}api/...`

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/auth`, `/api/auth/request`, `/api/auth/verify` | 없음 | `@gm.com` 등록 후 세션 |
| POST | `/api/auth/logout` | 없음 | 쿠키 삭제 |
| GET | `/api/me` | 필요 | `anonId`, `isAdmin` |
| GET | `/api/dashboard`, `/api/admin/dashboard` | 없음 | Dashboard 접속·체류 집계, 기간 게시글 감성·키워드. `preset=7\|14\|30\|month` 또는 `from`/`to`(YYYY-MM-DD, 최대 90일) |
| POST | `/api/presence` | 선택 | 화면이 열려 있는 동안 체류시간 기록 |
| GET | `/api/opinions` | 선택 | 목록. 로그인 시 `mine` / `canManage` |
| POST | `/api/opinions` | 필요 | 작성. 공지는 관리자만 |
| PUT | `/api/opinions/:id` | 필요 | 수정. `status` 변경은 관리자만 |
| DELETE | `/api/opinions/:id` | 필요 | 삭제 |
| POST | `/api/opinions/:id/comments` | 필요 | 댓글 (본문 최대 1000자, 들여쓰기 유지) |
| PUT | `/api/comments/:id` | 필요 | 댓글 수정 |
| DELETE | `/api/comments/:id` | 필요 | 댓글 삭제 |
| POST | `/api/opinions/:id/vote` | 필요 | 하트 1회, 본인 글 불가 |
| POST | `/api/opinions/:id/rate` | 필요 | 별점 1–5 (내부 필드, 홈 UI는 하트·댓글·우선순위 막대) |

제목(`ask`)·본문(`others`) 각 최대 4000자. 우선순위 정수 0–5.

---

## 12. 자주 바꾸는 설정

| 목적 | 위치 |
|------|------|
| 관리자 이메일 | `ADMIN_EMAILS` (`server/index.js`, `supabase/functions/app/index.ts`) |
| 허용 메일 도메인 | `AUTH_EMAIL_PATTERN` (같은 두 파일) |
| 공개 사이트 주소 (Edge가 정적 파일을 가져올 때) | `PAGES_ORIGIN` (`supabase/functions/app/index.ts`) |
| API 주소 (Pages JS가 호출) | `public/app.js`의 `API_BASE` |
| 캐시 무효화 | `public/index.html`의 `?v=` |
| Google Form 전송 | `server/googleForm.js` 및 Edge `index.ts`의 `FORM_RESPONSE_URLS` |
| 언어 UI 문구 | `public/app.js`의 `I18N` |
| Edge JWT 검증 | `supabase/config.toml` `[functions.app] verify_jwt = false` |

`API_BASE`와 Supabase 프로젝트 ref가 어긋나면 Pages는 열리지만 글이 안 나옵니다.

---

## 13. 배포 체크리스트

화면만 바꿨을 때:

- [ ] `public/` 수정
- [ ] `index.html`의 `?v=` 증가
- [ ] `node scripts/publish-web.mjs`
- [ ] `docs/` 커밋 후 `main` 푸시
- [ ] 라이브 강력 새로고침, 소스에서 새 `?v=` 확인

권한·번역·글 종류 등 API를 바꿨을 때 (위에 더해):

- [ ] `server/`와 `supabase/functions/app/` 동기화
- [ ] Edge `app` 재배포, `verify_jwt = false`
- [ ] `GET .../api/opinions` 200 확인

게시판 내용을 라이브에 맞출 때:

- [ ] `voc_store.secret` 유지
- [ ] `payload` 교체 전 백업
- [ ] 라이브 목록 건수와 공지/공유 수 확인

커밋하지 말 것: `.env`, `data/.secret`, `data/db.json`, 임시 SQL, 서비스 롤 키.

---

## 14. 장애 때 볼 곳

| 증상 | 원인 후보 |
|------|-----------|
| Pages는 열리는데 글이 없거나 예전 글만 보임 | `voc_store`가 로컬과 다름. 또는 Edge 미배포 |
| 화면 레이아웃/문구가 로컬과 다름 | `docs/` 미푸시 또는 `?v=` 미변경 |
| `/api/opinions` 401 JWT | `verify_jwt`가 켜짐 |
| `/api/auth/request` 404 | Pages JS가 상대경로 `/api`로 치고 있음. `API_BASE` 확인 |
| 공지 탭이 안 보임 / 작성 거부 | 관리자 메일이 `ADMIN_EMAILS`에 없음. Edge 미배포 |
| 익명 ID가 갑자기 바뀜 | `secret`이 재생성됨 |
| 한글만 보이고 영문이 없음 | 번역 API 실패. 목록 GET 시 백그라운드 hydrate가 돌므로 잠시 후 새로고침 |

---

## 15. 레거시 (본선이 아닌 것)

**Google Apps Script** (`apps-script/`)는 예전 호스팅입니다. clasp 프로젝트 ID는 `.clasp.json`에 있습니다. 현재 공식 사용자 주소는 GitHub Pages입니다. Apps Script 글을 가져올 때는 `scripts/import-apps-script-posts.mjs`가 로컬 `data/db.json`에만 넣습니다. 라이브 반영은 10절을 따릅니다.

**`src/` React + Vite**는 실험용입니다. `npm run build`의 `dist/`는 공개 UnBlind가 아닙니다.

Google Form (`12jEITV1PpsrhIaDekBKpE5uo5nnQSuZdHye6PPUvxOE`)에는 글 작성 시 가능하면 응답이 한 번 더 남습니다. 게시판의 정본은 `voc_store` / `db.json`입니다.

---

## 16. 연락·계정

제품 관리자 메일(코드 기준): `junhui.park@gm.com`, `namhyuk.1.yoo@gm.com`, `hyoyoung.kim@gm.com`

GitHub 저장소 권한, Supabase 프로젝트 권한, Pages 설정(`Settings → Pages → Deploy from branch: main / docs`)이 있어야 이 문서의 배포 절차를 실행할 수 있습니다.
