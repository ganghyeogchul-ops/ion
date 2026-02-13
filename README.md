# 🎮 AION Forum - 아이온 커뮤니티 포럼

## 📋 프로젝트 개요
- **프로젝트명**: AION Forum
- **목표**: 아이온 온라인 게임을 위한 커뮤니티 포럼 웹사이트
- **주요 기능**: 자유게시판, 아이템 거래장터, 운영자 직거래장터, 거래신청 관리

## 🌐 배포 URL
- **개발 환경**: https://3000-iz23yms2e5q4kwizn3vw1-a402f90a.sandbox.novita.ai
- **프로덕션**: (Cloudflare Pages 배포 후 업데이트 예정)

## ✅ 완료된 기능

### 1. 사용자 기능
- ✅ 회원가입 / 로그인 시스템
- ✅ 게시판 기능 (자유게시판, 아이템 거래장터, 운영자 직거래장터)
- ✅ 게시글 작성, 수정, 삭제
- ✅ 댓글 작성, 삭제
- ✅ 게시글 조회수 카운팅

### 2. 운영자 직거래장터 거래신청
- ✅ 판매신청 / 구매신청 버튼
- ✅ 판매금액 / 구매금액 입력
- ✅ 신청자 정보 입력 (이름, 주민번호, 게임 ID)
- ✅ 자동으로 관리자에게 거래신청 전송
- ✅ 상태 관리 (대기중 → 거래진행중 → 거래완료/취소)

### 3. 관리자 대시보드
- ✅ 통계 대시보드 (게시글 수, 거래신청 수, 회원 수)
- ✅ 게시글 관리 (조회, 삭제, 작성일시 수정)
- ✅ 거래신청 내역 관리 (수정, 삭제, 상태 변경, 일괄 삭제)
- ✅ 운영자 직판장 게시글 작성
- ✅ 샘플 데이터 생성 기능

### 4. 엑셀 일괄 업로드
- ✅ 거래신청 엑셀 업로드 (.xlsx, .xls, .csv 지원)
- ✅ 엑셀 시리얼 날짜 자동 변환
- ✅ 미리보기 기능
- ✅ 일괄 등록 후 자동 리스트 새로고침

### 5. 관리자 로그인
- ✅ 관리자 로그인 페이지
- ✅ 기본 계정: `admin` / `admin1234`
- ✅ localStorage 기반 세션 관리

## 📊 데이터 구조

### 테이블 스키마

#### posts (게시글)
- `id` (TEXT): 게시글 ID
- `board_type` (TEXT): 게시판 타입 (free, trade, admin_shop)
- `title` (TEXT): 제목
- `content` (TEXT): 내용
- `author` (TEXT): 작성자
- `item_name` (TEXT): 아이템명
- `price` (TEXT): 가격
- `views` (INTEGER): 조회수
- `is_admin` (INTEGER): 운영자 글 여부
- `created_at` (INTEGER): 작성일시 (timestamp)
- `updated_at` (INTEGER): 수정일시 (timestamp)

#### trade_requests (거래신청)
- `id` (TEXT): 거래신청 ID
- `post_id` (TEXT): 게시글 ID
- `post_title` (TEXT): 상품명
- `name` (TEXT): 신청자 이름
- `id_number` (TEXT): 주민등록번호
- `phone` (TEXT): 연락처
- `game_id` (TEXT): 게임 아이디
- `sell_amount` (INTEGER): 판매금액
- `buy_amount` (INTEGER): 구매금액
- `trade_type` (TEXT): 거래 타입 (sell/buy)
- `status` (TEXT): 상태 (completed 기본값)
- `custom_date` (TEXT): 커스텀 신청일시
- `created_at` (INTEGER): 신청일시
- `updated_at` (INTEGER): 수정일시

#### comments (댓글)
- `id` (TEXT): 댓글 ID
- `post_id` (TEXT): 게시글 ID
- `author` (TEXT): 작성자
- `content` (TEXT): 내용
- `created_at` (INTEGER): 작성일시

#### members (회원)
- `id` (TEXT): 회원 ID
- `username` (TEXT): 사용자명
- `password` (TEXT): 비밀번호
- `name` (TEXT): 이름
- `phone` (TEXT): 연락처
- `id_number` (TEXT): 주민등록번호
- `status` (TEXT): 상태 (pending/approved)
- `created_at` (INTEGER): 가입일시

## 🎨 기술 스택

### Backend
- **Hono**: 경량 웹 프레임워크
- **Cloudflare Pages**: 엣지 배포 플랫폼
- **Cloudflare D1**: SQLite 기반 글로벌 분산 데이터베이스
- **TypeScript**: 타입 안전성

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 다크 모드 디자인, 반응형 레이아웃
- **JavaScript (ES6+)**: 비동기 API 통신, 동적 렌더링
- **Font Awesome 6**: 아이콘
- **Google Fonts**: Noto Sans KR
- **SheetJS (xlsx)**: 엑셀 파일 파싱

## 🚀 사용 방법

### 개발 환경 실행

```bash
# 패키지 설치
npm install

# 프로젝트 빌드
npm run build

# 로컬 데이터베이스 마이그레이션
npm run db:migrate:local

# 개발 서버 시작
npm run dev:sandbox
```

### 배포

```bash
# Cloudflare Pages에 배포
npm run deploy:prod
```

## 🔧 주요 URI 및 API 엔드포인트

### 사용자 페이지
- `/` - 홈페이지
- `/register.html` - 회원가입
- `/login.html` - 로그인
- `/board.html?type={type}` - 게시판 (free, trade, admin_shop)
- `/post.html?id={postId}` - 게시글 상세
- `/write.html?type={type}` - 글쓰기

### 관리자 페이지
- `/admin-login.html` - 관리자 로그인
- `/admin.html` - 관리자 대시보드

### RESTful API
- `GET /tables/{table}?page=1&limit=20` - 목록 조회
- `GET /tables/{table}/{id}` - 단일 레코드 조회
- `POST /tables/{table}` - 레코드 생성
- `PATCH /tables/{table}/{id}` - 레코드 수정
- `PUT /tables/{table}/{id}` - 레코드 전체 업데이트
- `DELETE /tables/{table}/{id}` - 레코드 삭제

## 📝 미구현 기능

- [ ] 회원 승인 자동화 시스템
- [ ] 게시글 검색 기능
- [ ] 파일 업로드 (이미지 첨부)
- [ ] 알림 시스템
- [ ] 모바일 앱 버전

## 🔄 권장 다음 단계

1. **보안 강화**
   - 비밀번호 해시 처리
   - HTTPS 적용
   - CSRF 토큰 구현

2. **UX 개선**
   - 로딩 스피너 추가
   - 에러 메시지 개선
   - 입력 필드 유효성 검사 강화

3. **기능 확장**
   - 회원 승인 자동화
   - 게시글 검색 및 필터링
   - 거래신청 알림 기능

4. **성능 최적화**
   - 이미지 최적화
   - 코드 번들링 최적화
   - 캐싱 전략 구현

## 📞 문의
- **운영자 연락처**: 010-2644-3529

---

**Copyright © 2026 AION FORUM. All rights reserved.**
