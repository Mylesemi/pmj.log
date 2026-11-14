# GA4 통합 방문 통계 설정

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

GitHub 저장소 Settings > Secrets and variables > Actions에 다음 Repository secrets를 등록합니다.
- `GA4_PROPERTY_ID`: GA4 속성의 숫자 ID (측정 ID와 다름)
- `GA4_SERVICE_ACCOUNT_JSON`: 서비스 계정 JSON 전체 내용 (절대 코드에 커밋하지 마세요)

## 3. 데이터 갱신
Actions > Update GA4 visitor statistics > Run workflow를 한 번 실행합니다.
이후 매일 01:17 UTC에 `analytics.json`이 자동 갱신됩니다.
GitHub Pages에 반영되면 pmj.log가 이 파일을 읽어 각 카드에 방문자 수를 표시합니다.
오류가 발생하면 이전 수치를 유지하고 GitHub Actions 로그를 확인하세요.

## 주의
- 설정 전에는 수치를 0으로 표시하지 않고 '통계 준비 중'으로 표시합니다.
- 과거에 추적하지 않은 방문은 복원되지 않습니다.
- GA4 활성 사용자 수는 순 방문자의 근사치이며 실제 개인 수와 일치하지 않을 수 있습니다.
- 날짜별 활성 사용자를 단순 합산하지 않습니다. 전체 합계는 서로 다른 사이트를 중복 방문한 사람을 중복 계산할 수 있습니다.
- GitHub Pages는 정적 호스팅이므로 인증키를 브라우저에 노출하지 않습니다.
- `analytics-sites.json`의 도메인 및 경로는 실제 배포 주소와 맞아야 합니다.
- DEDU 등 GitHub 저장소 링크만 있는 항목은 웹 방문 통계에서 제외합니다.
