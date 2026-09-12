"""Extract Task 6 KPI summaries from the included SQLite database.

Usage:
    python scripts/extract_monthly_metrics.py
    python scripts/extract_monthly_metrics.py 2026-08

The script writes CSV and supervisor HTML output under outputs/exports/.
No external Python packages are required.
"""
from __future__ import annotations
import csv, sqlite3, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "intern_performance.db"
OUT = ROOT / "outputs" / "exports"
OUT.mkdir(parents=True, exist_ok=True)
month = sys.argv[1] if len(sys.argv) > 1 else None

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row
where = "WHERE month = ?" if month else ""
params = (month,) if month else ()
query = f"""
SELECT month,
       COUNT(*) AS tasks_assigned,
       SUM(CASE WHEN completed_date IS NOT NULL THEN 1 ELSE 0 END) AS tasks_completed,
       ROUND(100.0 * SUM(CASE WHEN completed_date IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*),1) AS completion_rate,
       ROUND(AVG(CASE WHEN completed_date IS NOT NULL THEN completion_days END),2) AS avg_completion_days,
       ROUND(AVG(CASE WHEN completed_date IS NOT NULL THEN project_quality END),2) AS avg_quality,
       ROUND(AVG(CASE WHEN completed_date IS NOT NULL THEN mentor_feedback END),2) AS avg_feedback,
       ROUND(100.0 * AVG(CASE WHEN completed_date IS NOT NULL THEN on_time END),1) AS on_time_rate
FROM performance_tasks
{where}
GROUP BY month ORDER BY month
"""
rows = con.execute(query, params).fetchall()
if not rows:
    raise SystemExit(f"No data found for month: {month}")

csv_path = OUT / (f"monthly_metrics_{month}.csv" if month else "monthly_metrics_all.csv")
with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f); w.writerow(rows[0].keys()); w.writerows([tuple(r) for r in rows])

html_rows = "".join(
    f"<tr><td>{r['month']}</td><td>{r['tasks_assigned']}</td><td>{r['tasks_completed']}</td>"
    f"<td>{r['completion_rate']}%</td><td>{r['avg_completion_days']} days</td>"
    f"<td>{r['avg_quality']}/5</td><td>{r['avg_feedback']}/5</td><td>{r['on_time_rate']}%</td></tr>"
    for r in rows
)
html = f"""<!doctype html><html><head><meta charset='utf-8'><title>Task 6 KPI Export</title>
<style>body{{font:14px Segoe UI,Arial;margin:40px;color:#17324a}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #d3e1ea;padding:8px}}th{{background:#e9f4fb}}</style></head>
<body><h1>Intern Performance KPI Export</h1><p>Prepared by Sajid Ali – Data Analyst Intern, Internee.pk</p>
<table><tr><th>Month</th><th>Assigned</th><th>Completed</th><th>Completion</th><th>Avg Time</th><th>Quality</th><th>Feedback</th><th>On-Time</th></tr>{html_rows}</table>
<p><small>Portfolio dataset: realistic synthetic records; no confidential internship data.</small></p></body></html>"""
html_path = OUT / (f"supervisor_report_{month}.html" if month else "supervisor_report_all.html")
html_path.write_text(html, encoding="utf-8")
con.close()
print(f"Created: {csv_path}")
print(f"Created: {html_path}")
