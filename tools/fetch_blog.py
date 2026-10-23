"""네이버 블로그의 독서·영화 카테고리 글을 모아 library.json을 만든다.

사용법 (pmj.log 폴더에서):  python tools/fetch_blog.py
"""
import datetime
import html
import json
import pathlib
import urllib.request

BLOG_ID = "semimirr"
CATEGORIES = [  # (블로그 카테고리 번호, library.json의 category 키)
    (22, "book"),
    (4, "movie"),
]
# 리뷰가 아닌 글(퍼온 글, 블로그 챌린지 등)은 제목 앞부분으로 제외
EXCLUDE_PREFIXES = ("[공유]", "[20.Blog]", "[2022 마이 블로그 리포트]")
DESC_LEN = 140
OUT = pathlib.Path(__file__).resolve().parent.parent / "library.json"

PROFILE = {
    "name": "책과 영화",
    "tagline": "블로그 「막」에 남긴 독서·영화 기록",
    "links": [{"label": "네이버 블로그", "url": f"https://blog.naver.com/{BLOG_ID}"}],
}
CATEGORY_DEFS = [
    {"key": "book", "label": "책", "badge": "BOOK"},
    {"key": "movie", "label": "영화", "badge": "MOVIE"},
]


def fetch_page(category_no, page):
    url = (f"https://m.blog.naver.com/api/blogs/{BLOG_ID}/post-list"
           f"?categoryNo={category_no}&itemCount=24&page={page}")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
        "Referer": f"https://m.blog.naver.com/{BLOG_ID}",
    })
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.load(res)["result"]


def fetch_category(category_no):
    # totalCount는 페이지 단위 값이라 믿을 수 없어, 빈 페이지가 나올 때까지 넘긴다
    items, page = {}, 1
    while page <= 50:
        page_items = fetch_page(category_no, page)["items"]
        new = [p for p in page_items if p["logNo"] not in items]
        if not new:
            break
        items.update((p["logNo"], p) for p in new)
        page += 1
    return list(items.values())


def to_item(post, category):
    desc = " ".join(html.unescape(post.get("briefContents", "")).split())
    if len(desc) > DESC_LEN:
        desc = desc[:DESC_LEN].rstrip(" .…") + "…"
    thumbs = post.get("thumbnailList") or []
    item = {
        "id": str(post["logNo"]),
        "title": html.unescape(post["titleWithInspectMessage"]).strip(),
        "description": desc,
        "category": category,
        "url": f"https://blog.naver.com/{BLOG_ID}/{post['logNo']}",
        "date": datetime.datetime.fromtimestamp(post["addDate"] / 1000).strftime("%Y-%m-%d"),
    }
    if thumbs and thumbs[0].get("encodedThumbnailUrl"):
        item["thumbnail"] = thumbs[0]["encodedThumbnailUrl"] + "?type=w400"
    return item


def main():
    items = []
    for category_no, key in CATEGORIES:
        posts = [p for p in fetch_category(category_no)
                 if p.get("allOpenPost", True)
                 and not p["titleWithInspectMessage"].strip().startswith(EXCLUDE_PREFIXES)]
        items += [to_item(p, key) for p in posts]
        print(f"{key}: {len(posts)}개")
    items.sort(key=lambda i: i["date"], reverse=True)
    data = {"profile": PROFILE, "categories": CATEGORY_DEFS, "items": items}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{OUT.name} 저장 완료 (총 {len(items)}개)")


if __name__ == "__main__":
    main()
