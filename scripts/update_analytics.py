"""Publish aggregate GA4 statistics without exposing Google credentials."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import google.auth.transport.requests
import google.auth
import requests

ROOT = Path(__file__).resolve().parents[1]
property_id = os.environ.get("GA4_PROPERTY_ID", "").strip()
if not property_id:
    raise SystemExit("GA4_PROPERTY_ID is required.")

credentials, _ = google.auth.default(
    scopes=["https://www.googleapis.com/auth/analytics.readonly"],
)
credentials.refresh(google.auth.transport.requests.Request())
url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
headers = {"Authorization": f"Bearer {credentials.token}"}
sites = json.loads((ROOT / "analytics-sites.json").read_text())["sites"]
result = {"status": "ok", "updatedAt": datetime.now(timezone.utc).isoformat(), "sites": {}}
periods = {"today": ("today", "today"), "days7": ("7daysAgo", "today"),
           "days30": ("30daysAgo", "today"), "all": ("2020-01-01", "today")}

for site in sites:
    site_data = {}
    filters = [{"filter": {"fieldName": "hostName", "stringFilter": {"value": site["host"], "matchType": "EXACT"}}}]
    if site.get("pathPrefix"):
        filters.append({"filter": {"fieldName": "pagePath", "stringFilter": {"value": site["pathPrefix"], "matchType": "BEGINS_WITH"}}})
    dimension_filter = filters[0] if len(filters) == 1 else {"andGroup": {"expressions": filters}}
    for period, (start, end) in periods.items():
        payload = {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "hostName"}],
            "metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}],
            "dimensionFilter": dimension_filter,
            "limit": 1,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        rows = response.json().get("rows", [])
        values = rows[0]["metricValues"] if rows else [{"value": "0"}, {"value": "0"}]
        site_data[period] = {"visitors": int(values[0]["value"]), "views": int(values[1]["value"])}
    result["sites"][site["id"]] = site_data

(ROOT / "analytics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
