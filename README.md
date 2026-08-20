# MORI CAMP 통합 저장소

캠핑장 타이쿤 아이디어로 만든 두 프로토타입을 한 저장소에서 관리합니다. 현재 공개·배포되는 게임은 Three.js 버전이며, 초기 Flutter 버전도 비교하거나 이어서 개발할 수 있도록 함께 보존합니다.

## 바로 플레이

- GitHub Pages: <https://soo7894.github.io/mori-camp/>
- 배포 대상: `threejs-camp/`

## 프로젝트 구성

```text
.
├─ threejs-camp/            # 현재 개발 중인 Three.js 3D 웹·Windows 게임
│  ├─ src/                  # 게임 화면, 규칙, 3D 캠핑장
│  ├─ electron/             # Windows 데스크톱 실행 진입점
│  └─ scripts/              # Windows 빌드 스크립트
├─ lib/                     # 초기 Flutter 3D 타이쿤 프로토타입
│  ├─ game/                 # 경영 규칙과 3D 장면
│  └─ ui/                   # Flutter HUD와 조작 UI
├─ test/                    # Flutter 경영 규칙 테스트
├─ android/, ios/, web/     # Flutter 플랫폼 프로젝트
└─ .github/workflows/       # GitHub Pages 자동 배포
```

두 버전은 같은 캠핑장 게임 기획을 공유하지만 실행 환경은 서로 독립적입니다. 새 기능은 현재 배포본인 `threejs-camp/`에 먼저 적용하면 됩니다.

## 다른 컴퓨터에서 이어서 작업하기

```powershell
git clone https://github.com/soo7894/mori-camp.git
cd mori-camp
```

### Three.js 웹 게임

Node.js 22 이상과 pnpm 10 이상을 준비한 뒤 실행합니다.

```powershell
cd threejs-camp
pnpm install --frozen-lockfile
pnpm dev
```

검증 및 Windows 앱 빌드:

```powershell
pnpm build
pnpm build:win
```

### Flutter 프로토타입

Flutter stable SDK를 준비한 뒤 저장소 루트에서 실행합니다.

```powershell
flutter pub get
flutter analyze
flutter test
flutter run -d chrome
```

## GitHub Pages 배포

`main` 브랜치의 `threejs-camp/` 또는 Pages 워크플로가 변경되면 `.github/workflows/deploy-pages.yml`이 자동으로 빌드하고 GitHub Pages에 배포합니다. 배포 산출물이나 `node_modules`, Flutter 빌드 캐시는 Git에 올리지 않습니다.

## 무료 소스 원칙

프로젝트는 무료로 사용할 수 있는 소스만 사용합니다. 핵심 구성은 Flutter, Three.js, Vite, Electron, `three_js`, Google Fonts의 무료 오픈 소스·무료 라이선스 자원입니다. 새 패키지나 에셋을 추가할 때도 라이선스와 상업적 사용 가능 여부를 먼저 확인합니다.
