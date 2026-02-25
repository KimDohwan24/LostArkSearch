# LostArkSearch

LostArk 캐릭터 검색 어플리케이션입니다. 게임 내 UI를 반영한 프리미엄 디자인을 바탕으로 캐릭터의 기본 정보 및 아크 패시브 등의 데이터를 조회할 수 있도록 개발되었습니다.

## 📌 주요 기능
- 캐릭터 기본 정보 및 능력치 검색 기능
- 아크 패시브 시스템 (진화, 깨달음, 도약 단계) 정보 제공
- 인게임 화면과 유사한 고급스럽고 통일된 디자인 (다크 모드, 그라데이션, 애니메이션 적용)

## 🛠 기술 스택
### Frontend (`/LostArkFront`)
- React
- Vite
- Vanilla CSS

### Backend (`/LostArkBack`)
- Java
- Spring Boot
- Maven

## 🚀 모듈 별 실행 방법

### 1. Frontend 구동
```bash
cd LostArkFront/frontend
npm install
npm run dev
```
> 또는 루트 디렉토리에 있는 `LostArkFront/start-frontend.bat` 더블 클릭하여 실행 가능

### 2. Backend 구동
```bash
cd LostArkBack/backend
./mvnw spring-boot:run
```
> 또는 루트 디렉토리에 있는 `LostArkBack/start.bat` 더블 클릭하여 실행 가능