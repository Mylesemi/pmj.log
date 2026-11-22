# GA4 통합 방문 통계 설정

## 현재 연결 설정

2026-11-15에 GitHub Actions의 OIDC 인증, GA4 Data API 조회, GitHub Pages 통계 표시를 확인했습니다.

| 설정 | 값 |
|---|---|
| GA4 속성 ID | `564297056` |
| 측정 ID | `G-CVFCN7ZP28` |
| Google Cloud 프로젝트 | `pmj-ga4-reader` |
| 프로젝트 번호 | `412932215004` |
| `GCP_WIF_PROVIDER` | `projects/412932215004/locations/global/workloadIdentityPools/github-pmj/providers/github` |
| `GCP_SERVICE_ACCOUNT` | `pmj-ga4-reader@pmj-ga4-reader.iam.gserviceaccount.com` |

WIF 경로와 서비스 계정 이메일은 비밀키가 아닌 설정 식별자입니다.
워크플로는 등록된 Repository Variables 세 개(`GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GA4_PROPERTY_ID`)를 읽어 실행합니다.
JSON 키 없이 GitHub OIDC의 단기 자격 증명으로 인증합니다.
Variables가 비어 있으면 인증 전에 설정 누락을 보고하고 이전 통계를 보존합니다.

## 빠른 연결: Google Cloud Shell

`pmj-ga4-reader`를 만든 Google Cloud 프로젝트를 선택하고 Cloud Shell에서 실행합니다.
서비스 계정과 기존 GA4 뷰어 권한을 그대로 사용하며 JSON 키는 생성하지 않습니다.

```bash
git clone https://github.com/Mylesemi/pmj.log.git pmj-ga4-setup
cd pmj-ga4-setup
bash scripts/setup_ga4_wif.sh
```

이미 내려받은 저장소에서는 `git pull` 후 마지막 명령만 다시 실행하면 됩니다.
프로젝트를 명시하려면 `bash scripts/setup_ga4_wif.sh YOUR_PROJECT_ID`로 실행합니다.
서비스 계정이 그 프로젝트에 없으면 변경 전에 중단합니다.

이 스크립트는 필요한 API와 `github-pmj` 풀, `github` OIDC 공급자를 설정하고,
해당 서비스 계정에 `roles/iam.workloadIdentityUser` 바인딩을 추가합니다.
GitHub의 고정 저장소 ID `1430624700`, 소유자 ID `94043537`, `main` 브랜치의
`ga4-analytics.yml` 워크플로만 인증할 수 있도록 제한합니다.

GitHub CLI(`gh`)가 로그인되어 있으면 다음 Variables를 저장하고 갱신 워크플로를 실행합니다.
로그인되어 있지 않으면 실제 프로젝트 번호와 이메일이 포함된 값을 출력하므로
[GitHub Actions Variables](https://github.com/Mylesemi/pmj.log/settings/variables/actions)에 추가하세요.

| Variable | 값 |
|---|---|
| `GCP_WIF_PROVIDER` | 스크립트가 출력한 `projects/.../providers/github` |
| `GCP_SERVICE_ACCOUNT` | 스크립트가 확인한 `pmj-ga4-reader@...iam.gserviceaccount.com` |
| `GA4_PROPERTY_ID` | `564297056` (필수) |

Variables를 저장한 뒤 **Actions → Update GA4 visitor statistics → Run workflow**를 실행합니다.
`gh`가 설치되어 있으면 `gh auth login`으로 로그인하고 스크립트를 다시 실행해도 됩니다.
새 WIF 설정의 전파에 몇 분이 걸릴 수 있으므로 생성 직후 인증이 거부되면 잠시 후 다시 실행합니다.
GA4 뷰어 권한은 Google Cloud IAM 역할과 별개입니다.

## 1. GA4 수집 설정
측정 ID `G-CVFCN7ZP28`을 등록된 웹서비스의 공통 레이아웃에 적용했습니다. 사이트별 배포 후 GA4 실시간 보고서에서 수집 여부를 확인하세요.

Google Analytics에서 GA4 속성과 웹 데이터 스트림을 만들고 측정 ID(G-CVFCN7ZP28)를 확인합니다.
등록된 **각 웹사이트**의 HTML head 또는 앱 공통 레이아웃에 아래 코드를 추가하세요.
사이트마다 동일한 GA4 측정 ID를 사용할 수 있으며, 보고서에서는 호스트명으로 구분합니다.

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-CVFCN7ZP28"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-CVFCN7ZP28');
</script>
```

SPA 사이트는 라우트 변경 시 중복 page_view가 기록되지 않는지 확인하세요.
이미 GA4가 설치된 사이트에 동일한 태그를 중복 설치하지 마세요.

## 2. 통계 읽기 권한
Google Cloud에서 Google Analytics Data API를 활성화하고 서비스 계정을 생성합니다.
GA4 관리 > 속성 액세스 관리에서 서비스 계정 이메일에 **뷰어** 권한을 부여하세요.

**JSON 키 없이 연결 (Workload Identity Federation)**

1. Google Cloud에서 IAM & Admin > Workload Identity Federation으로 이동하여 풀 `github-pmj`를 생성합니다.
2. OIDC 공급자를 추가합니다. 발급자 URL: `https://token.actions.githubusercontent.com`, 대상(audience)은 기본값을 사용합니다.
3. 속성 매핑: `google.subject=assertion.sub`, `attribute.repository=assertion.repository`.
4. 공급자 속성 조건: `assertion.repository == "Mylesemi/pmj.log"` (다른 저장소의 인증 거부).
5. `pmj-ga4-reader` 서비스 계정 > 권한 > 액세스 권한 부여에서 **Workload Identity User** 역할을 부여합니다. 구성원 형식: `principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pmj/attribute.repository/Mylesemi/pmj.log` (PROJECT_NUMBER는 프로젝트 **번호**).
6. GitHub 저장소 Settings > Secrets and variables > Actions > **Variables**에서 다음 두 Repository variables를 추가합니다.
   - `GCP_WIF_PROVIDER`: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pmj/providers/PROVIDER_ID`
   - `GCP_SERVICE_ACCOUNT`: `pmj-ga4-reader@PROJECT_ID.iam.gserviceaccount.com`
7. Google Cloud에서 IAM Credentials API 및 Analytics Data API를 활성화합니다.

GA4 속성 ID는 Repository Variable `GA4_PROPERTY_ID`에 `564297056`으로 설정합니다. JSON 키나 비밀키는 만들거나 업로드할 필요가 없습니다.

## 3. 데이터 갱신
Actions > Update GA4 visitor statistics > Run workflow를 한 번 실행합니다.
이후 **매시 17분(한국시간)**에 `analytics.json`을 자동 갱신합니다.
개인 보기의 **방문자 수 조회**와 **다시 조회**는 저장소에 마지막으로 집계된 통계를 표시합니다.
새 집계는 조회창의 **GitHub에서 Run workflow** 링크를 통해 실행할 수 있습니다.
워크플로는 갱신한 파일을 커밋한 뒤 GitHub Pages 빌드를 명시적으로 요청합니다.
`GITHUB_TOKEN`으로 만든 커밋은 자체적으로 Pages 빌드를 시작하지 않기 때문입니다.
빌드가 끝나면 pmj.log가 이 파일을 읽어 각 카드에 방문자 수를 표시합니다.
오류가 발생하면 이전 수치를 유지하고 GitHub Actions 로그를 확인하세요.

### 연결 확인

- `Validate keyless authentication settings`: WIF 경로와 서비스 계정 설정이 비어 있는지 확인합니다.
- `Authenticate to Google Cloud without a key`: GitHub OIDC → WIF → 기존 서비스 계정 인증입니다.
- `Fetch GA4 statistics`: GA4의 `activeUsers`, `screenPageViews`를 실제 조회합니다.
- 워크플로 Summary에는 사이트별 최근 30일 방문자·조회 수가 표시됩니다.
- 배포 후 `https://mylesemi.github.io/pmj.log/analytics.json`의 `status`가 `ok`이고,
  `updatedAt`과 수치가 Summary와 일치하는지 확인합니다.
- API가 정상적인 빈 보고서를 반환한 경우에만 0으로 기록합니다. 인증·권한 오류는 성공으로 처리하지 않습니다.
- 최근 7일·30일은 GA4 속성의 시간대에서 오늘을 포함한 각각 7일·30일입니다.
- 로컬 회귀 확인: `python -m unittest discover -s tests -v`.

## 주의
- 설정 전에는 수치를 0으로 표시하지 않고 '통계 준비 중'으로 표시합니다.
- 과거에 추적하지 않은 방문은 복원되지 않습니다.
- GA4 활성 사용자 수는 순 방문자의 근사치이며 실제 개인 수와 일치하지 않을 수 있습니다.
- 날짜별 활성 사용자를 단순 합산하지 않습니다. 전체 합계는 서로 다른 사이트를 중복 방문한 사람을 중복 계산할 수 있습니다.
- GitHub Pages는 정적 호스팅이므로 인증키를 브라우저에 노출하지 않습니다.
- `analytics-sites.json`의 도메인 및 경로는 실제 배포 주소와 맞아야 합니다.
- DEDU 등 GitHub 저장소 링크만 있는 항목은 웹 방문 통계에서 제외합니다.
