# community-svc

> E-ON 플랫폼의 커뮤니티 도메인을 담당하는 마이크로서비스입니다.
게시판, 게시글, 댓글, 신고, 게시판 개설 신청 기능을 제공합니다.
> 



## 📁 프로젝트 구조

```
community-svc/
├── config/
│   └── database.js          # Sequelize DB 연결 설정
├── controllers/
│   └── boardController.js   # 요청/응답 처리
├── middleware/
│   ├── auth.js              # Gateway 헤더 기반 인증
│   ├── checkBoardAccess.js  # 게시판 접근 권한 체크
│   └── upload.js            # 이미지 업로드 (multer)
├── models/
│   ├── index.js             # 모델 로드 및 관계 설정
│   ├── Board.js             # 게시판
│   ├── BoardRequest.js      # 게시판 개설 신청
│   ├── Post.js              # 게시글
│   ├── PostImage.js         # 게시글 이미지
│   ├── Comment.js           # 댓글 (대댓글 포함)
│   └── Report.js            # 신고
├── routes/
│   └── boardRoute.js        # 라우터
├── services/
│   ├── boardService.js      # 비즈니스 로직
│   └── userClient.js        # user-svc 내부 API 호출
├── uploads/                 # 업로드된 이미지 저장 폴더
├── .env                     # 환경변수 (git 제외)
├── .gitignore
├── .dockerignore
├── Dockerfile
├── app.js                   # Express 앱 설정
├── index.js                 # 서버 진입점
└── package.json
```



## ⚙️ 환경변수 설정

`.env` 파일을 루트에 생성하고 아래 내용을 채워주세요.

```
PORT=8083

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=community_db

# user-svc 내부 통신용
USER_SVC_URL=http://localhost:8082
```



## 🚀 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. MySQL에서 DB 생성
CREATE DATABASE community_db;

# 3. 서버 실행
npm run dev
```

서버가 정상적으로 실행되면 아래 메시지가 출력됩니다.

```
DB 연결 성공
community-svc listening on :8083
```



## 🐳 Docker 실행 방법

```bash
# 이미지 빌드
docker build -t community-svc .

# 컨테이너 실행
docker run -p 8083:8083 --env-file .env community-svc
```



## 🗄️ DB 설계 원칙 (MSA)

- `community_db` 단독 사용
- User 테이블 FK 제거 → `user_id` 값만 보관
- `author_name` 컬럼: 작성 시점에 user-svc에서 조회 후 저장 (서비스 정책상 변경 불가)
- 타 서비스 DB 직접 접근 금지 → HTTP API 호출로 대체



## 🔐 인증 방식

세션을 직접 확인하지 않고 Gateway에서 넘긴 헤더를 신뢰합니다.

| 헤더 | 값 예시 | 용도 |
| --- | --- | --- |
| `X-User-Id` | `123` | 사용자 식별 |
| `X-User-Type` | `student`, `parent`, `admin` | 권한 구분 |

```jsx
// middleware/auth.js
req.user = {
  user_id: Number(req.headers['x-user-id']),
  type:    req.headers['x-user-type'],
};
```



## 📨 RabbitMQ 이벤트 수신

| 이벤트 | 처리 내용 |
| --- | --- |
| `user.deactivated` | 해당 userId 게시글·댓글 → HIDDEN |
| `user.suspended` | 해당 userId 게시글·댓글 → HIDDEN |
| `user.unsuspended` | 해당 userId 게시글·댓글 → ACTIVE 복원 |
| `admin.board.approved` | 게시판 생성, 신청 레코드 → 승인 |
| `admin.board.rejected` | 신청 레코드 → 거절 |



## 📝 커밋 컨벤션

| 타입 | 설명 |
| --- | --- |
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 작업 |
| `refactor` | 기능 변경 없이 코드 구조 개선 |
| `chore` | 빌드, 패키지, 설정 변경 |
| `style` | 코드 포맷, 세미콜론 등 스타일만 변경 |

```
feat: 게시글 CRUD 구현
fix: x-user-id 헤더 유효성 검사 추가
docs: README.md 작성
```



## 🌿 브랜치 전략

```
main
└── feat/#이슈번호-작업내용
```

```bash
# 브랜치 생성 예시
git checkout -b feat/#2-post-crud
```
