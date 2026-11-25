# pmj.log

직접 만든 Tool과 HTML 자료를 한 페이지에 모아 보여주는 GitHub Pages 사이트입니다.
빌드 도구 없이 `projects.json`만 수정하면 페이지에 반영돼요.

## 항목 추가하기

1. **로컬 HTML 자료**는 `created_by_mj/` 폴더에 넣습니다. (파일이 쓰는 CSS/JS/이미지도 같은 폴더에)
2. `projects.json`의 `items`에 항목을 추가합니다.

```json
{
  "id": "my-tool",
  "title": "제목",
  "description": "한두 줄 설명",
  "category": "tool",
  "tags": ["AI", "자동화"],
  "url": "created_by_mj/my-tool.html",
  "repo": "https://github.com/USERNAME/my-tool",
  "date": "2026-10-23",
  "featured": false
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `title`, `url` | ✅ | 없으면 표시되지 않음. `url`은 상대경로(로컬) 또는 `https://...`(외부) |
| `category` | ✅ | `tool` 또는 `reference`(참고 사이트) |
| `description`, `tags`, `date` | | 검색·필터·정렬에 사용. `date`는 `YYYY-MM-DD` |
| `repo` | | 개인 보기에서 "소스코드" 버튼 표시 |
| `color` | | 카드 고유 색 (예: `"#1d4ed8"`). 없으면 카테고리 색 |
| `icon` | | 카드 아이콘: `calculator`, `file-code`, `book-open`, `chart`, `pencil`, `map`, `images` |
| `kind` | | 라벨 옆 종류 표시 (예: `웹앱`, `Windows 앱`, `HTML 파일`) |
| `links` | | 추가 버튼 `[{"label": "오프라인 HTML", "url": "..."}]` |
| `featured` | | `true`면 목록 위 "추천" 영역에 따로 표시 |

상단 히어로 영역은 `profile`에서 수정합니다.

| 필드 | 설명 |
|---|---|
| `eyebrow` | 제목 위 작은 영문 라벨 (예: `PMJ.LOG · TOOLS & NOTES`) |
| `headline` | 큰 제목 2줄. 두 번째 줄은 강조색으로 표시 |
| `tagline` | 오른쪽 소개 문장 |
| `github`, `email`, `links` | 소개 아래 링크. `links: [{"label": "...", "url": "..."}]` |

## 책·영화 페이지 (`library.html`)

네이버 블로그(semimirr)의 **취향 독서**·**취향 영화** 카테고리 글을 모아 보여줍니다.
GitHub Actions(`.github/workflows/update-library.yml`)가 **매일 아침 6시**에 블로그를 확인해 자동으로 갱신해요.
바로 반영하고 싶으면 저장소 Actions 탭에서 "Update library"를 **Run workflow** 하거나, 아래 명령을 직접 실행하세요.

```bash
python tools/fetch_blog.py
git add library.json && git commit -m "Update library" && git push
```

- 카테고리 번호, 제외할 글(제목 앞부분)은 `tools/fetch_blog.py` 위쪽에서 바꿀 수 있어요.
- 표지 뒷면의 한 줄 요약은 `tools/library_notes.json`(글 번호 → 문장)에서 고쳐요. 없는 글은 본문 첫 문장이 자동으로 들어가요.

## 로컬에서 미리보기

`projects.json`을 fetch하므로 파일을 직접 열지 말고 서버로 띄워주세요.

```bash
python -m http.server 8000
# http://localhost:8000
```

## 배포 (GitHub Pages)

1. GitHub에 `pmj.log` 저장소를 만들고 push
2. 저장소 **Settings › Pages** › Source: `Deploy from a branch`, Branch: `main` / `(root)`
3. 몇 분 후 `https://USERNAME.github.io/pmj.log/` 에서 확인

필터 상태는 주소에 저장돼요. 예: `.../pmj.log/#cat=tool&tag=AI`

## 개인 보기

일반 방문 화면에는 방문 통계·방문자 수 조회·GitHub·소스코드 보조 버튼을 표시하지 않습니다.
개인 기기에서 사이트 주소 뒤에 `#owner=on`을 붙여 한 번 열면 해당 브라우저에 표시 설정을 기억합니다.
책·영화 페이지에도 같은 설정이 적용됩니다. 필터와 함께 쓸 때는 `#cat=tool&owner=on`처럼 지정합니다.
개인 보기의 푸터에서 **개인 보기 끄기**를 누르거나 `#owner=off`로 열면 기본 화면으로 돌아갑니다.
공유 기기에서는 사용 후 개인 보기를 꺼 주세요.

이 기능은 브라우저별 표시 설정입니다. 계정 본인 확인이나 데이터 접근 통제를 제공하지 않습니다.
공개 저장소의 `analytics.json`과 소스코드는 계속 공개되어 있습니다. 일반 방문 화면에서는 통계 파일을 요청하지 않습니다.
사이트의 일반 방문 집계용 GA4 태그는 계속 동작합니다.
GitHub가 앱 자체의 배포·다운로드 주소인 항목은 기존 열기 링크를 유지합니다.

개인 보기의 **사용자 문의함**에서 StoryBeat와 글자 탐험대 문의를 확인할 수 있습니다. 문의함은 소유자만 접근할 수 있는 Vercel 인증 배포에서 열립니다. GitHub 문의 이슈는 매시간 동기화되며 공개 GitHub Pages에는 문의 데이터가 저장되지 않습니다. 문의함 코드는 `owner-inbox/`에 있습니다.
