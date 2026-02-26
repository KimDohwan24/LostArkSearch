# 로스트아크 캐릭터 검색 사이트 (Lost Ark Character Search)

이 프로젝트는 React와 Spring Boot를 사용하여 만든 간단한 로스트아크 캐릭터 검색 사이트입니다.

## 기술 스택
- **Backend**: Spring Boot 3.2.2, Java 17, Maven
- **Frontend**: React (Vite), Vanilla CSS (Modern Design)

## 실행 방법

### 1. Backend (Spring Boot) 실행
1. `backend/src/main/resources/application.properties` 파일을 엽니다.
2. `lostark.api.key` 항목에 [로스트아크 개발자 센터](https://developer-lostark.game.onstove.com/)에서 발급받은 API 키를 입력합니다.
3. 백엔드 디렉토리에서 다음 명령어를 실행합니다:
   ```bash
   mvn spring-boot:run
   ```

### 2. Frontend (React) 실행
1. `frontend` 디렉토리로 이동합니다.
2. 환경에 Node.js가 설치되어 있어야 합니다. (설치되지 않았다면 [nodejs.org](https://nodejs.org/)에서 설치하세요)
3. 다음 명령어를 실행하여 의존성을 설치하고 개발 서버를 가동합니다:
   ```bash
   npm install
   npm run dev
   ```
4. 브라우저에서 `http://localhost:5173`에 접속합니다.

## 주요 기능
- 캐릭터 명으로 검색하여 기본 프로필 정보 조회
- 아이템 레벨, 전투 레벨, 칭호, 길드 정보 표시
- 기본 특성(치명, 특화, 신속 등) 요약 정보 제공
- 고급스럽고 현대적인 다크 모드 UI (Lost Ark 테마)

## 주의 사항
- 로스트아크 API 키가 없으면 검색 기능이 작동하지 않습니다.
- 백엔드가 8080 포트에서 실행 중이어야 프론트엔드와 통신이 가능합니다.
