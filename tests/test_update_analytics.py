import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from scripts.update_analytics import fetch_statistics, update_statistics


def report(visitors=3, views=8):
    return {"rows": [{"metricValues": [{"value": str(visitors)}, {"value": str(views)}]}]}


def session_for(payload, status=200):
    session = Mock()
    session.post.return_value.ok = status == 200
    session.post.return_value.status_code = status
    session.post.return_value.json.return_value = payload
    return session


class AnalyticsTests(unittest.TestCase):
    def test_report_values_and_inclusive_date_ranges(self):
        session = session_for(report())
        result = fetch_statistics(session, "564297056", [{"id": "a", "host": "example.com"}])
        self.assertEqual(result["sites"]["a"]["days30"], {"visitors": 3, "views": 8})
        ranges = [call.kwargs["json"]["dateRanges"][0]["startDate"] for call in session.post.call_args_list]
        self.assertEqual(ranges, ["today", "6daysAgo", "29daysAgo", "2020-01-01"])

    def test_shared_github_host_is_separated_by_path(self):
        session = session_for(report())
        sites = [
            {"id": "taxis", "host": "mylesemi.github.io", "pathPrefix": "/taxis/"},
            {"id": "pmj", "host": "mylesemi.github.io", "pathPrefix": "/pmj.log/"},
        ]
        fetch_statistics(session, "564297056", sites)
        calls = session.post.call_args_list
        for index, prefix in [(0, "/taxis/"), (4, "/pmj.log/")]:
            expressions = calls[index].kwargs["json"]["dimensionFilter"]["andGroup"]["expressions"]
            self.assertEqual(expressions[1]["filter"]["stringFilter"]["value"], prefix)
            self.assertTrue(expressions[1]["filter"]["stringFilter"]["caseSensitive"])

    def test_valid_empty_report_means_zero(self):
        session = session_for({"metricHeaders": [{"name": "activeUsers"}, {"name": "screenPageViews"}]})
        result = fetch_statistics(session, "564297056", [{"id": "a", "host": "example.com"}])
        self.assertEqual(result["sites"]["a"]["today"], {"visitors": 0, "views": 0})

    def test_malformed_response_does_not_mean_zero(self):
        with self.assertRaisesRegex(RuntimeError, "Invalid GA4 response"):
            fetch_statistics(session_for({}), "564297056", [{"id": "a", "host": "example.com"}])

    def test_permission_failure_keeps_previous_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            previous = '{"status":"ok","sites":{"old":{}}}\n'
            (root / "analytics.json").write_text(previous)
            (root / "analytics-sites.json").write_text(json.dumps({"sites": [{"id": "a", "host": "example.com"}]}))
            session = session_for({"error": {"message": "Permission denied"}}, 403)
            with self.assertRaisesRegex(RuntimeError, "HTTP 403.*Permission denied"):
                update_statistics(session, "564297056", root)
            self.assertEqual((root / "analytics.json").read_text(), previous)
            self.assertFalse((root / "analytics.json.tmp").exists())

    def test_success_publishes_complete_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "analytics-sites.json").write_text(json.dumps({"sites": [{"id": "a", "host": "example.com"}]}))
            update_statistics(session_for(report(5, 12)), "564297056", root)
            data = json.loads((root / "analytics.json").read_text())
            self.assertEqual(data["status"], "ok")
            self.assertEqual(len(data["sites"]["a"]), 4)
            self.assertFalse((root / "analytics.json.tmp").exists())


if __name__ == "__main__":
    unittest.main()
