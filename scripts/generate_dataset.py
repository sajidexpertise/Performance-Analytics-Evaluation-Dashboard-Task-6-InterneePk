from __future__ import annotations
import csv, json, math, random, sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SRC = ROOT / 'src'
REPORTS = ROOT / 'outputs' / 'monthly_reports'
DATA.mkdir(parents=True, exist_ok=True)
SRC.mkdir(parents=True, exist_ok=True)
REPORTS.mkdir(parents=True, exist_ok=True)
random.seed(260610)

months = [f'2026-{m:02d}' for m in range(1,9)]
month_labels = ['Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026','Jul 2026','Aug 2026']

departments = [
    ('Data Analytics','Mentor – Data Analytics',['Sales Performance Analysis','Internship Funnel Analysis','Data Quality Review','Executive Analytics Report']),
    ('Power BI & BI','Mentor – Business Intelligence',['Executive KPI Dashboard','Recruitment BI Report','Operations Scorecard','Power BI Storytelling']),
    ('Machine Learning','Mentor – Machine Learning',['Prediction Benchmark','Feature Engineering Lab','Model Evaluation','Anomaly Detection Study']),
    ('Web Development','Mentor – Web Development',['Responsive Portfolio','Analytics Portal','Form Validation App','Dashboard Frontend']),
    ('Business Analysis','Mentor – Business Analysis',['Process Gap Review','Requirements Matrix','Stakeholder Analysis','Business Case Study']),
    ('IT Support','Mentor – IT Support',['Support Ticket Analysis','Asset Audit','System Health Review','Knowledge Base Project'])
]

names = [
    'Sajid Ali','Ayesha Khan','Rehan Mehta','Zainab Fatima','Arjun Singh',
    'Hira Memon','Hamza Ahmed','Mariam Baloch','Ali Shah','Neha Hussain',
    'Sara Malik','Usman Ali','Fatima Noor','Bilal Shaikh','Iqra Khan',
    'Danish Raza','Zoya Malik','Fahad Ali','Sana Noor','Adeel Ahmed',
    'Mahnoor Baloch','Saad Shah','Rida Memon','Hassan Shaikh','Anum Hussain',
    'Farhan Qureshi','Mehak Khan','Taha Raza','Nimra Malik','Arham Ahmed'
]

# Relative skill profiles make fields logically related instead of independent random numbers.
base_skill = {}
for i, name in enumerate(names):
    if name == 'Sajid Ali':
        base_skill[name] = 4.82
    else:
        base_skill[name] = round(3.45 + ((i * 37) % 110) / 100, 2)

interns=[]
for i,name in enumerate(names):
    dept,mentor,_ = departments[i % len(departments)]
    if name == 'Sajid Ali':
        dept='Data Analytics'; mentor='Internee.pk Mentor'
    locs=['Sindh, Pakistan','Karachi','Hyderabad','Lahore','Islamabad','Sukkur']
    edus=['BS Information Technology','BS Data Science','BS Computer Science','BBA','BS Software Engineering']
    location = 'Sindh, Pakistan' if name=='Sajid Ali' else locs[(i*5)%len(locs)]
    education = 'BS Information Technology – Shah Abdul Latif University, Khairpur' if name=='Sajid Ali' else edus[(i*3)%len(edus)]
    interns.append({
        'intern_id':f'INT{i+1:03d}','name':name,'department':dept,'mentor':mentor,
        'join_date':'2026-01-05','location':location,'education':education,
        'profile_type':'Portfolio author / sample intern' if name=='Sajid Ali' else 'Synthetic portfolio intern'
    })

id_by_name={x['name']:x['intern_id'] for x in interns}
intern_by_id={x['intern_id']:x for x in interns}

# Generate exactly four tasks per intern per month = 960 task records.
task_types=['Analysis','Dashboard','Cleaning','Research','Presentation','Validation','Documentation','Automation']
comments_high=[
    'Consistently delivers high-quality work with clear communication and strong ownership.',
    'Excellent analytical discipline and dependable delivery against milestones.',
    'Strong technical execution with thoughtful documentation and proactive mentor updates.'
]
comments_mid=[
    'Good progress; improve estimation and communicate blockers earlier.',
    'Meets expectations; focus on stronger documentation and more consistent timeliness.',
    'Solid work with opportunities to improve prioritization and final presentation quality.'
]
comments_low=[
    'Needs closer deadline management and more frequent mentor check-ins.',
    'Quality is improving; additional review before submission is recommended.',
    'Focus on task planning, validation steps, and clearer progress updates.'
]

def clamp(x,a,b): return max(a,min(b,x))

tasks=[]
seq=1
for m_idx,month in enumerate(months):
    y,mo=map(int,month.split('-'))
    month_start=date(y,mo,1)
    next_month=date(y+1,1,1) if mo==12 else date(y,mo+1,1)
    days=(next_month-month_start).days
    month_lift = (m_idx-3.5)*0.035
    for intern in interns:
        name=intern['name']; dept=intern['department']; mentor=intern['mentor']
        dep_tuple=next(d for d in departments if d[0]==dept)
        projects=dep_tuple[2]
        skill=base_skill[name]
        if name=='Sajid Ali': skill=4.86
        for j in range(4):
            assigned=month_start+timedelta(days=2+((i if False else (hash(name)+j*7+m_idx*11)) % max(4,days-12)))
            planned=random.choice([2,3,4,5,6,7])
            due=assigned+timedelta(days=planned)
            # Completion propensity relates to skill and improves slightly over time.
            p_complete=clamp(0.79 + (skill-3.4)*0.09 + month_lift,0.72,0.985)
            # August intentionally contains active work so monthly reporting is realistic.
            if m_idx==7: p_complete-=0.09
            if name=='Sajid Ali': p_complete=min(0.99,p_complete+0.06)
            completed_flag=random.random()<p_complete
            if completed_flag:
                speed_factor=clamp(1.00-(skill-3.4)*0.10+random.gauss(0,0.16),0.55,1.35)
                completion_days=round(max(0.8,planned*speed_factor),1)
                on_time=int(completion_days<=planned)
                completed=assigned+timedelta(days=max(1,min(planned if on_time else planned+3,math.ceil(completion_days))))
                # A late completion can still be completed but carries timeliness penalty.
                status='Completed' if on_time else 'Overdue'
                quality=clamp(skill + month_lift + random.gauss(0,0.22) - (0.14 if not on_time else 0),2.4,5.0)
                feedback=clamp(skill + month_lift*0.8 + random.gauss(0,0.18) - (0.10 if not on_time else 0),2.5,5.0)
                technical=clamp(skill+random.gauss(0,0.18),2.5,5)
                communication=clamp(skill-0.05+random.gauss(0,0.22),2.4,5)
                problem=clamp(skill+random.gauss(0,0.2),2.4,5)
                teamwork=clamp(skill+0.02+random.gauss(0,0.2),2.5,5)
                punctual=clamp(skill+(0.16 if on_time else -0.45)+random.gauss(0,0.15),2.2,5)
                avg=(quality+feedback+technical+communication+problem+teamwork+punctual)/7
                comment=random.choice(comments_high if avg>=4.45 else comments_mid if avg>=3.65 else comments_low)
            else:
                completion_days=''; completed=''; on_time=''; quality=''; feedback=''; technical=''; communication=''; problem=''; teamwork=''; punctual=''
                # August can have in-progress/not-started; historical incomplete is overdue.
                if m_idx==7:
                    status='In Progress' if random.random()<0.72 else 'Not Started'
                else:
                    status='Overdue'
                comment='Task remains open and should be reviewed in the next mentor checkpoint.'
            row={
                'task_id':f'TSK{seq:04d}','intern_id':intern['intern_id'],'intern_name':name,'department':dept,
                'project_name':projects[(j+m_idx)%len(projects)],'task_type':task_types[(seq*3)%len(task_types)],
                'assigned_date':assigned.isoformat(),'due_date':due.isoformat(),
                'completed_date':completed.isoformat() if hasattr(completed,'isoformat') else '',
                'status':status,'planned_days':planned,'completion_days':completion_days,'on_time':on_time,
                'project_quality':round(quality,2) if quality!='' else '',
                'mentor_feedback':round(feedback,2) if feedback!='' else '',
                'technical_skills':round(technical,2) if technical!='' else '',
                'communication':round(communication,2) if communication!='' else '',
                'problem_solving':round(problem,2) if problem!='' else '',
                'teamwork':round(teamwork,2) if teamwork!='' else '',
                'punctuality':round(punctual,2) if punctual!='' else '',
                'mentor_comment':comment,'mentor':mentor,'month':month
            }
            tasks.append(row); seq+=1

# To make Sajid a credible top performer, adjust his completed task metrics without hardcoding KPI totals.
for r in tasks:
    if r['intern_name']=='Sajid Ali' and r['status'] in ('Completed','Overdue') and r['project_quality']!='':
        r['project_quality']=round(max(4.72,float(r['project_quality'])),2)
        r['mentor_feedback']=round(max(4.78,float(r['mentor_feedback'])),2)
        r['technical_skills']=round(max(4.75,float(r['technical_skills'])),2)
        r['communication']=round(max(4.66,float(r['communication'])),2)
        r['problem_solving']=round(max(4.72,float(r['problem_solving'])),2)
        r['teamwork']=round(max(4.70,float(r['teamwork'])),2)
        r['punctuality']=round(max(4.74,float(r['punctuality'])),2)
        # keep the evaluation plausible and usually on-time
        if r['completion_days']!='':
            r['completion_days']=round(min(float(r['completion_days']), float(r['planned_days'])*0.86),1)
            r['on_time']=1; r['status']='Completed'
            ad=date.fromisoformat(r['assigned_date'])
            r['completed_date']=(ad+timedelta(days=max(1,math.ceil(float(r['completion_days']))))).isoformat()

# Helpers for derived tables.
def fvals(rows,key):
    vals=[]
    for r in rows:
        try: vals.append(float(r[key]))
        except: pass
    return vals

def avg(rows,key):
    v=fvals(rows,key); return sum(v)/len(v) if v else 0

def pct(a,b): return (a/b*100) if b else 0

def score_for(rows):
    if not rows: return 0
    comp=[r for r in rows if r['status'] in ('Completed','Overdue') and r['completed_date']]
    cr=pct(len(comp),len(rows))
    quality=avg(comp,'project_quality')*20
    feedback=avg(comp,'mentor_feedback')*20
    ontime=pct(sum(int(r['on_time']) for r in comp if r['on_time']!=''),len(comp)) if comp else 0
    return 0.35*cr+0.30*quality+0.25*feedback+0.10*ontime

monthly=[]
for month,label in zip(months,month_labels):
    rs=[r for r in tasks if r['month']==month]; comp=[r for r in rs if r['completed_date']]
    monthly.append({
        'month':month,'month_label':label,'tasks_assigned':len(rs),'tasks_completed':len(comp),
        'completion_rate':round(pct(len(comp),len(rs)),1),'avg_completion_days':round(avg(comp,'completion_days'),2),
        'avg_quality':round(avg(comp,'project_quality'),2),'avg_feedback':round(avg(comp,'mentor_feedback'),2),
        'on_time_rate':round(pct(sum(int(r['on_time']) for r in comp if r['on_time']!=''),len(comp)),1) if comp else 0
    })

intern_monthly=[]
for intern in interns:
    for month in months:
        rs=[r for r in tasks if r['intern_id']==intern['intern_id'] and r['month']==month]; comp=[r for r in rs if r['completed_date']]
        intern_monthly.append({
            'month':month,'intern_id':intern['intern_id'],'intern_name':intern['name'],'department':intern['department'],
            'tasks_assigned':len(rs),'tasks_completed':len(comp),'completion_rate':round(pct(len(comp),len(rs)),1),
            'avg_completion_days':round(avg(comp,'completion_days'),2),'avg_project_quality':round(avg(comp,'project_quality'),2),
            'avg_mentor_feedback':round(avg(comp,'mentor_feedback'),2),'performance_score':round(score_for(rs),1)
        })

# Upcoming deadlines are derived from open August tasks where available.
open_aug=[r for r in tasks if r['month']=='2026-08' and r['status'] in ('In Progress','Not Started')]
open_aug=sorted(open_aug,key=lambda r:r['due_date'])[:8]
deadlines=[]
for i,r in enumerate(open_aug,1):
    deadlines.append({
        'deadline_id':f'DL{i:02d}','task':r['project_name'],'intern_id':r['intern_id'],'intern_name':r['intern_name'],
        'department':r['department'],'due_date':r['due_date'],'priority':['High','Medium','Medium','Low'][i%4]
    })

# Recent activity is deterministic and tied to actual completed August records.
recent=[]
recent_rows=sorted([r for r in tasks if r['month']=='2026-08' and r['completed_date']],key=lambda r:r['completed_date'], reverse=True)[:7]
for idx,r in enumerate(recent_rows):
    recent.append({
        'icon':['report','check','feedback','project'][idx%4],
        'text':f"{r['intern_name']} completed {r['project_name']}",
        'when':['2 hours ago','4 hours ago','6 hours ago','9 hours ago','1 day ago','1 day ago','2 days ago'][idx]
    })

# CSV writer.
def write_csv(path, rows):
    with open(path,'w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

write_csv(DATA/'interns.csv',interns)
write_csv(DATA/'performance_tasks.csv',tasks)
write_csv(DATA/'monthly_metrics.csv',monthly)
write_csv(DATA/'intern_monthly_metrics.csv',intern_monthly)
write_csv(DATA/'upcoming_deadlines.csv',deadlines)
write_csv(DATA/'recent_activity.csv',recent)

# SQLite database for automated extraction.
db=DATA/'intern_performance.db'
if db.exists(): db.unlink()
con=sqlite3.connect(db); cur=con.cursor()
cur.executescript('''
CREATE TABLE interns(intern_id TEXT PRIMARY KEY,name TEXT,department TEXT,mentor TEXT,join_date TEXT,location TEXT,education TEXT,profile_type TEXT);
CREATE TABLE performance_tasks(task_id TEXT PRIMARY KEY,intern_id TEXT,intern_name TEXT,department TEXT,project_name TEXT,task_type TEXT,assigned_date TEXT,due_date TEXT,completed_date TEXT,status TEXT,planned_days REAL,completion_days REAL,on_time INTEGER,project_quality REAL,mentor_feedback REAL,technical_skills REAL,communication REAL,problem_solving REAL,teamwork REAL,punctuality REAL,mentor_comment TEXT,mentor TEXT,month TEXT);
CREATE TABLE upcoming_deadlines(deadline_id TEXT PRIMARY KEY,task TEXT,intern_id TEXT,intern_name TEXT,department TEXT,due_date TEXT,priority TEXT);
''')
cur.executemany('INSERT INTO interns VALUES (?,?,?,?,?,?,?,?)',[tuple(r.values()) for r in interns])
keys=list(tasks[0].keys()); q=','.join('?'*len(keys))
cur.executemany(f'INSERT INTO performance_tasks VALUES ({q})',[tuple(None if v=='' else v for v in r.values()) for r in tasks])
cur.executemany('INSERT INTO upcoming_deadlines VALUES (?,?,?,?,?,?,?)',[tuple(r.values()) for r in deadlines])
con.commit(); con.close()

# Self-contained JS payload for file:// dashboard usage.
payload={'interns':interns,'tasks':tasks,'monthly':monthly,'internMonthly':intern_monthly,'deadlines':deadlines,'recentActivity':recent,
         'meta':{'author':'Sajid Ali','role':'Data Analyst Intern','organization':'Internee.pk','task':'Task 6 – Performance Evaluation Metrics','data_note':'Realistic synthetic portfolio dataset; no confidential internship records are used.'}}
with open(SRC/'data.js','w',encoding='utf-8') as f:
    f.write('window.PERF_DATA='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';')

# Supervisor HTML reports for all months.
for m in monthly:
    rs=[r for r in tasks if r['month']==m['month']]
    ranking=[]
    for intern in interns:
        ir=[r for r in rs if r['intern_id']==intern['intern_id']]
        if ir: ranking.append((score_for(ir),intern['name'],intern['department']))
    ranking.sort(reverse=True)
    rows=''.join(f'<tr><td>{i+1}</td><td>{n}</td><td>{d}</td><td>{s:.1f}%</td></tr>' for i,(s,n,d) in enumerate(ranking[:10]))
    html=f'''<!doctype html><html><head><meta charset="utf-8"><title>{m['month_label']} Supervisor Report</title><style>body{{font:15px Segoe UI,Arial;margin:40px;color:#17324a}}h1{{color:#0b4a78}}.k{{display:flex;gap:16px;flex-wrap:wrap}}.k div{{border:1px solid #cfe1ee;padding:14px;border-radius:10px;min-width:150px}}table{{border-collapse:collapse;width:100%;margin-top:20px}}td,th{{border:1px solid #dbe7ef;padding:9px;text-align:left}}th{{background:#eaf4fb}}</style></head><body><h1>Intern Performance Monthly Supervisor Report</h1><p><b>Reporting month:</b> {m['month_label']} &nbsp; | &nbsp; <b>Prepared by:</b> Sajid Ali, Data Analyst Intern – Internee.pk</p><div class="k"><div><b>Assigned</b><br>{m['tasks_assigned']}</div><div><b>Completed</b><br>{m['tasks_completed']}</div><div><b>Completion Rate</b><br>{m['completion_rate']}%</div><div><b>Avg Completion Time</b><br>{m['avg_completion_days']} days</div><div><b>Project Quality</b><br>{m['avg_quality']}/5</div><div><b>Mentor Feedback</b><br>{m['avg_feedback']}/5</div></div><h2>Top Intern Performance</h2><table><thead><tr><th>#</th><th>Intern</th><th>Department</th><th>Performance Score</th></tr></thead><tbody>{rows}</tbody></table><p><small>Dataset note: realistic synthetic portfolio data created for Task 6 demonstration. No confidential intern records are used.</small></p></body></html>'''
    (REPORTS/f"{m['month']}_supervisor_report.html").write_text(html,encoding='utf-8')

print(f'Generated {len(interns)} interns, {len(tasks)} task records, {len(monthly)} monthly summaries.')
