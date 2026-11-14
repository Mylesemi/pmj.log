"""Publish aggregate GA4 statistics without exposing Google credentials."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
# GA4 includes both startDate and endDate in each range.
PERIODS = {
    "today": ("today", "today"),
    "days7": ("6daysAgo", "today"),
    "days30": ("29daysAgo", "today"),
    "all": ("2020-01-01", "today"),
}


def fetch_statistics(session, property_id, sites):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    result = {
        "status": "ok",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sites": {},
    }
    for site in sites:
        filters = [{"filter": {"fieldName": "hostName", "stringFilter": {
            "value": site["host"], "matchType": "EXACT", "caseSensitive": False,
        }}}]
        if site.get("pathPrefix"):
            filters.append({"filter": {"fieldName": "pagePath", "stringFilter": {
                "value": site["pathPrefix"], "matchType": "BEGINS_WITH", "caseSensitive": True,
            }}})
        dimension_filter = filters[0] if len(filters) == 1 else {"andGroup": {"expressions": filters}}
        site_data = {}
        for period, (start, end) in PERIODS.items():
            payload = {
                "dateRanges": [{"startDate": start, "endDate": end}],
                "dimensions": [{"name": "hostName"}],
                "metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}],
                "dimensionFilter": dimension_filter,
                "limit": 1,
            }
            response = session.post(url, json=payload, timeout=30)
            if not response.ok:
                # Report the API error, never the request's authorization headers.
                error = response.json().get("error", {})
                raise RuntimeError(
                    f"GA4 API HTTP {response.status_code} ({site['id']}/{period}): "
                    f"{error.get('message', 'Request failed')}. "
                    "Check Analytics Data API, the WIF binding, and GA4 Viewer access."
                )
            report = response.json()
            if "rows" not in report and "metricHeaders" not in report:
                raise RuntimeError(f"Invalid GA4 response for {site['id']}/{period}")
            rows = report.get("rows", [])
            values = rows[0]["metricValues"] if rows else [{"value": "0"}, {"value": "0"}]
            site_data[period] = {
                "visitors": int(values[0]["value"]),
                "views": int(values[1]["value"]),
            }
        result["sites"][site["id"]] = site_data
    return result


def update_statistics(session, property_id, root=ROOT):
    sites = json.loads((root / "analytics-sites.json").read_text(encoding="utf-8"))["sites"]
    result = fetch_statistics(session, property_id, sites)
    # Leave the last successful file intact if any report fails.
    temporary = root / "analytics.json.tmp"
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(root / "analytics.json")
    return result


def main():
    property_id = os.environ.get("GA4_PROPERTY_ID", "").strip()
    if not property_id.isdecimal():
        raise SystemExit("GA4_PROPERTY_ID must be a numeric property ID.")
    import google.auth
    from google.auth.transport.requests import AuthorizedSession

    credentials, _ = google.auth.default(scopes=SCOPES)
    with AuthorizedSession(credentials) as session:
        result = update_statistics(session, property_id)
    print(f"Fetched GA4 property {property_id}: {len(result['sites'])} sites; {result['updatedAt']}")


if __name__ == "__main__":
    main()
