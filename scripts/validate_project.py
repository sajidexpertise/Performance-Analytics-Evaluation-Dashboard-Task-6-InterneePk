"""Validation checks for Task 6 project data and deliverables."""
from __future__ import annotations
import csv, sqlite3, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def read(name):
    with (ROOT/'data'/name).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

checks=[]
def check(name, ok, detail=''):
    checks.append((name,bool(ok),detail))

interns=read('interns.csv'); tasks=read('performance_tasks.csv'); monthly=read('monthly_metrics.csv')
check('30 intern profiles', len(interns)==30, str(len(interns)))
check('960 task records', len(tasks)==960, str(len(tasks)))
check('8 monthly summaries', len(monthly)==8, str(len(monthly)))
check('Sajid Ali profile present', any(i['name']=='Sajid Ali' for i in interns))
check('Task completion time populated', any(r['completion_days'] for r in tasks))
check('Project quality populated', any(r['project_quality'] for r in tasks))
check('Mentor feedback populated', any(r['mentor_feedback'] for r in tasks))
check('All KPI ratings within 1-5', all((not r['project_quality']) or 1<=float(r['project_quality'])<=5 for r in tasks))
check('All completion time non-negative', all((not r['completion_days']) or float(r['completion_days'])>=0 for r in tasks))
check('Dashboard entry file', (ROOT/'index.html').exists())
check('Windows launcher', (ROOT/'OPEN_DASHBOARD.bat').exists())
check('Python automation', (ROOT/'scripts'/'extract_monthly_metrics.py').exists())
check('SQL automation', (ROOT/'sql'/'monthly_metrics.sql').exists())
check('SQLite database', (ROOT/'data'/'intern_performance.db').exists())
check('All 8 monthly reports', len(list((ROOT/'outputs'/'monthly_reports').glob('*_supervisor_report.html')))==8)

con=sqlite3.connect(ROOT/'data'/'intern_performance.db')
db_count=con.execute('SELECT COUNT(*) FROM performance_tasks').fetchone()[0]; con.close()
check('SQLite task count reconciles', db_count==len(tasks), str(db_count))

failed=[x for x in checks if not x[1]]
for name,ok,detail in checks:
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ''))
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
sys.exit(1 if failed else 0)
