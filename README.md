# pmj.log

직접 만든 Tool과 HTML 자료를 한 페이지에 모아 보여주는 GitHub Pages 사이트입니다.
빌드 도구 없이 `projects.json`만 수정하면 페이지에 반영돼요.

## 항목 추가하기

1. **로컬 HTML 자료**는 `created_by_mj/` 폴더에 넣습니다. (파일이 쓰는 CSS/JS/이미지도 같은 폴더에)
2. 카드 썸네일을 쓰려면 `thumbnails/<slug>.png`에 이미지를 넣습니다. (선택, 16:9 권장)
3. `projects.json`의 `items`에 항목을 추가합니다.

```json
{
  "id": "my-tool",
  "title": "제목",
  "description": "한두 줄 설명",
  "category": "tool",
  "tags": ["AI", "자동화"],
  "url": "created_by_mj/my-tool.html",
  "repo": "https://github.com/USERNAME/my-tool",
  "thumbnail": "thumbnails/my-tool.png",
  "date": "2026-10-23",
  "featured": false
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `title`, `url` | ✅ | 없으면 표시되지 않음. `url`은 상대경로(로컬) 또는 `https://...`(외부) |
| `category` | ✅ | `tool` 또는 `material`(자료) |
| `description`, `tags`, `date` | | 검색·필터·정렬에 사용. `date`는 `YYYY-MM-DD` |
| `repo` | | 넣으면 "소스코드" 버튼 표시 |
| `thumbnail` | | 없으면 색상 + 첫 글자로 자동 생성 |
| `featured` | | `true`면 상단 "추천" 영역에 크게 표시 |

상단 프로필(이름, 소개, GitHub, 이메일, 추가 링크 `links: [{"label": "...", "url": "..."}]`)은 `profile`에서 수정합니다.

## 책·영화 페이지 (`library.html`)

네이버 블로그(semimirr)의 **취향 독서**·**취향 영화** 카테고리 글을 모아 보여줍니다.
새 글을 쓴 뒤 아래 명령으로 `library.json`을 다시 만들고 push하면 반영돼요.

```bash
python tools/fetch_blog.py
git add library.json && git commit -m "Update library" && git push
```

- 카테고리 번호, 제외할 글(제목 앞부분)은 `tools/fetch_blog.py` 위쪽에서 바꿀 수 있어요.
- 썸네일은 블로그 원본 이미지를 그대로 링크합니다. 이미지가 없는 글은 색상 + 첫 글자로 표시돼요.

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
