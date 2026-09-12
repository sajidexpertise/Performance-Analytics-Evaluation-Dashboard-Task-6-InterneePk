(() => {
  'use strict';
  const D = window.PERF_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const months = D.monthly.map(m => m.month);
  let state = { month: '2026-08', department: 'All Departments', intern: 'All Interns', project: 'All Projects' };
  const deptColors = {'Data Analytics':'#26a7ff','Power BI & BI':'#9366ff','Machine Learning':'#2be0a4','Web Development':'#22d5d5','Business Analysis':'#ff9e43','IT Support':'#ffd34d'};
  const chartColors = ['#1da8ff','#27e2a4','#a06aff','#ffd34d','#ff7b62','#26d3e4'];

  function esc(v){return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function num(v){const n = Number(v); return Number.isFinite(n) ? n : 0;}
  function avg(rows,key){const a=rows.map(r=>num(r[key])).filter(v=>v>0);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
  function pct(a,b){return b ? a/b*100 : 0;}
  function completedRows(rows){return rows.filter(r=>r.completed_date);}
  function score(rows){
    if(!rows.length) return 0;
    const c=completedRows(rows), completion=pct(c.length,rows.length), quality=avg(c,'project_quality')*20, feedback=avg(c,'mentor_feedback')*20;
    const ontime = c.length ? pct(c.filter(r=>num(r.on_time)===1).length,c.length) : 0;
    return .35*completion + .30*quality + .25*feedback + .10*ontime;
  }
  function statusFor(v){return v>=92?'Top Performer':v>=86?'Excellent':v>=76?'Good':v>=64?'Average':v>=52?'Needs Improvement':'At Risk';}
  function statusClass(s){if(s==='Top Performer')return'top';if(s==='Excellent')return'excellent';if(s==='Good')return'good';if(s==='Average')return'average';if(s==='At Risk')return'risk';return'improve';}
  function selectedTasks(includeMonth=true){
    return D.tasks.filter(r =>
      (!includeMonth || state.month==='All Months' || r.month===state.month) &&
      (state.department==='All Departments' || r.department===state.department) &&
      (state.intern==='All Interns' || r.intern_id===state.intern) &&
      (state.project==='All Projects' || r.project_name===state.project)
    );
  }
  function filteredInterns(){
    const allowed = new Set(selectedTasks().map(r=>r.intern_id));
    return D.interns.filter(i => allowed.has(i.intern_id));
  }
  function internMetrics(tasks=selectedTasks()){
    const ids=[...new Set(tasks.map(r=>r.intern_id))];
    return ids.map(id=>{
      const rows=tasks.filter(r=>r.intern_id===id), c=completedRows(rows), i=D.interns.find(x=>x.intern_id===id);
      return {id,name:i?.name||id,department:i?.department||'',mentor:i?.mentor||'',assigned:rows.length,completed:c.length,completion:pct(c.length,rows.length),time:avg(c,'completion_days'),quality:avg(c,'project_quality'),feedback:avg(c,'mentor_feedback'),ontime:c.length?pct(c.filter(r=>num(r.on_time)===1).length,c.length):0,score:score(rows)};
    });
  }
  function currentMonthObj(){return D.monthly.find(m=>m.month===state.month)||D.monthly.at(-1);}
  function previousMonthObj(){const idx=D.monthly.findIndex(m=>m.month===state.month);return D.monthly[Math.max(0,idx-1)]||D.monthly[0];}
  function fmtDelta(cur,prev,inverse=false,suffix='%'){
    if(!prev) return {text:'—',cls:''};
    const d=((cur-prev)/Math.abs(prev))*100; const positive=inverse?d<0:d>=0;
    return {text:`${positive?'↑':'↓'} ${Math.abs(d).toFixed(0)}${suffix}`,cls:positive?'':'down'};
  }
  function initials(name){return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
  function photoOrAvatar(i,cls='mini-avatar'){
    if(i?.name==='Sajid Ali') return `<img class="${cls} photo" src="assets/sajid-ali-professional.jpg" alt="Sajid Ali">`;
    return `<span class="${cls}">${initials(i?.name||'?')}</span>`;
  }
  function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}
  function setView(name){
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    $('#sidebar').classList.remove('open');
    if(name==='interns') renderInternProfiles();
    if(name==='tasks') renderTaskTable();
    if(name==='performance') renderPerformanceView();
    if(name==='feedback') renderFeedbackView();
    if(name==='reports') renderReports();
    if(name==='analytics') renderAnalyticsView();
    if(name==='notifications') renderNotifications();
  }

  function initFilters(){
    $('#monthFilter').innerHTML=D.monthly.map(m=>`<option value="${m.month}">${m.month_label}</option>`).join('')+`<option value="All Months">All Months</option>`;
    $('#monthFilter').value=state.month;
    const depts=[...new Set(D.interns.map(x=>x.department))].sort();
    $('#departmentFilter').innerHTML=`<option>All Departments</option>`+depts.map(x=>`<option>${esc(x)}</option>`).join('');
    $('#departmentFilter').value=state.department;
    refillInterns(); refillProjects();
  }
  function refillInterns(){
    const dept=$('#departmentFilter').value;
    const rows=D.interns.filter(i=>dept==='All Departments'||i.department===dept);
    $('#internFilter').innerHTML=`<option value="All Interns">All Interns</option>`+rows.map(i=>`<option value="${i.intern_id}">${esc(i.name)}</option>`).join('');
    if(rows.some(i=>i.intern_id===state.intern)) $('#internFilter').value=state.intern;
  }
  function refillProjects(){
    const dept=$('#departmentFilter').value;
    const projects=[...new Set(D.tasks.filter(r=>dept==='All Departments'||r.department===dept).map(r=>r.project_name))].sort();
    $('#projectFilter').innerHTML=`<option>All Projects</option>`+projects.map(x=>`<option>${esc(x)}</option>`).join('');
    if(projects.includes(state.project)) $('#projectFilter').value=state.project;
  }

  function sparkline(values,color){
    if(!values.length) return '';
    const w=100,h=22,min=Math.min(...values),max=Math.max(...values),range=max-min||1;
    const pts=values.map((v,i)=>`${(i/(values.length-1||1))*w},${h-2-((v-min)/range)*(h-5)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function renderKPIs(){
    const t=selectedTasks(), c=completedRows(t), interns=new Set(t.map(r=>r.intern_id)).size;
    const cur={interns,assigned:t.length,completed:c.length,time:avg(c,'completion_days'),quality:avg(c,'project_quality'),feedback:avg(c,'mentor_feedback')};
    let prevTasks=D.tasks.filter(r=>r.month===previousMonthObj().month && (state.department==='All Departments'||r.department===state.department) && (state.intern==='All Interns'||r.intern_id===state.intern) && (state.project==='All Projects'||r.project_name===state.project));
    const pc=completedRows(prevTasks), prev={interns:new Set(prevTasks.map(r=>r.intern_id)).size,assigned:prevTasks.length,completed:pc.length,time:avg(pc,'completion_days'),quality:avg(pc,'project_quality'),feedback:avg(pc,'mentor_feedback')};
    const allMonthTasks = D.monthly.map(m=>{
      const rs=D.tasks.filter(r=>r.month===m.month && (state.department==='All Departments'||r.department===state.department) && (state.intern==='All Interns'||r.intern_id===state.intern));
      const cc=completedRows(rs); return {interns:new Set(rs.map(r=>r.intern_id)).size,assigned:rs.length,completed:cc.length,time:avg(cc,'completion_days'),quality:avg(cc,'project_quality'),feedback:avg(cc,'mentor_feedback')};
    });
    const defs=[
      ['◉','Total Interns',cur.interns,prev.interns,false,allMonthTasks.map(x=>x.interns),'#1da8ff'],
      ['▣','Tasks Assigned',cur.assigned,prev.assigned,false,allMonthTasks.map(x=>x.assigned),'#9f63ff'],
      ['✓','Tasks Completed',cur.completed,prev.completed,false,allMonthTasks.map(x=>x.completed),'#27e2a4'],
      ['◷','Avg. Completion Time',`${cur.time.toFixed(1)} days`,prev.time,true,allMonthTasks.map(x=>x.time),'#1da8ff',cur.time],
      ['★','Avg. Project Quality',`${cur.quality.toFixed(1)} / 5`,prev.quality,false,allMonthTasks.map(x=>x.quality),'#ffd34d',cur.quality],
      ['♙','Avg. Mentor Feedback',`${cur.feedback.toFixed(1)} / 5`,prev.feedback,false,allMonthTasks.map(x=>x.feedback),'#9f63ff',cur.feedback]
    ];
    $('#kpiGrid').innerHTML=defs.map((d,i)=>{const numeric=d[7]??d[2];const dl=fmtDelta(num(numeric),num(d[3]),d[4]);return `<div class="kpi-card"><div class="kpi-icon">${d[0]}</div><div class="kpi-body"><small>${d[1]}</small><div class="kpi-value">${d[2]}</div><div class="kpi-delta ${dl.cls}">${dl.text} <span style="font-weight:400;color:var(--muted)">${i===3?'faster':'vs last month'}</span></div><div class="spark">${sparkline(d[5],d[6])}</div></div></div>`;}).join('');
  }

  function monthlySeries(){
    return D.monthly.map(m=>{
      const rs=D.tasks.filter(r=>r.month===m.month && (state.department==='All Departments'||r.department===state.department) && (state.intern==='All Interns'||r.intern_id===state.intern) && (state.project==='All Projects'||r.project_name===state.project));
      const c=completedRows(rs); return {month:m.month,label:m.month_label.split(' ')[0],completion:pct(c.length,rs.length),quality:avg(c,'project_quality'),feedback:avg(c,'mentor_feedback')};
    });
  }
  function renderMonthlyKpi(){
    const a=monthlySeries(), W=720,H=230,p={l:42,r:12,t:26,b:33},cw=W-p.l-p.r,ch=H-p.t-p.b,barW=14,gap=4,groupW=cw/a.length;
    let svg=`<svg viewBox="0 0 ${W} ${H}" aria-label="Monthly KPI grouped bar chart"><g>`;
    for(let k=0;k<=5;k++){const y=p.t+ch*k/5,val=100-k*20;svg+=`<line class="chart-grid" x1="${p.l}" y1="${y}" x2="${W-p.r}" y2="${y}"/><text class="chart-label" x="${p.l-8}" y="${y+3}" text-anchor="end">${val}</text>`;}
    const series=[['completion','#1da8ff',x=>x.completion,x=>`${x.completion.toFixed(0)}%`],['quality','#27e2a4',x=>x.quality*20,x=>x.quality.toFixed(1)],['feedback','#a06aff',x=>x.feedback*20,x=>x.feedback.toFixed(1)]];
    a.forEach((d,i)=>{const gx=p.l+i*groupW+groupW/2;series.forEach((s,j)=>{const v=s[2](d),h=ch*v/100,x=gx-(barW*1.5+gap)+(barW+gap)*j,y=p.t+ch-h;svg+=`<rect class="bar-mark" data-tip="${s[0]}|${d.label}|${s[3](d)}" x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${s[1]}"/><text class="chart-label" x="${x+barW/2}" y="${Math.max(p.t+8,y-4)}" text-anchor="middle">${s[3](d)}</text>`;});svg+=`<text class="chart-label" x="${gx}" y="${H-10}" text-anchor="middle">${d.label}</text>`;});
    svg+=`<g transform="translate(52 8)"><circle cx="0" cy="0" r="4" fill="#1da8ff"/><text class="chart-label" x="8" y="3">Task Completion Rate</text><circle cx="140" cy="0" r="4" fill="#27e2a4"/><text class="chart-label" x="148" y="3">Average Project Quality</text><circle cx="292" cy="0" r="4" fill="#a06aff"/><text class="chart-label" x="300" y="3">Mentor Feedback</text></g></g></svg>`;
    $('#monthlyKpiChart').innerHTML=svg; bindTips();
  }

  function renderDepartmentStacked(){
    const t=selectedTasks(), depts=[...new Set(t.map(r=>r.department))];
    const data=depts.map(d=>{const rs=t.filter(r=>r.department===d);return {d,total:rs.length,completed:rs.filter(r=>r.status==='Completed').length,progress:rs.filter(r=>r.status==='In Progress').length,overdue:rs.filter(r=>r.status==='Overdue').length,notstarted:rs.filter(r=>r.status==='Not Started').length};}).sort((a,b)=>b.total-a.total);
    $('#departmentStacked').innerHTML=`<div class="legend"><span><i class="l-green"></i>Completed</span><span><i class="l-blue"></i>In Progress</span><span><i class="l-red"></i>Overdue</span><span><i class="l-purple"></i>Not Started</span></div>`+data.map(r=>`<div class="dept-row"><span>${esc(r.d)}</span><div class="dept-track" title="${r.total} tasks"><i class="seg completed" style="width:${pct(r.completed,r.total)}%"></i><i class="seg progress" style="width:${pct(r.progress,r.total)}%"></i><i class="seg overdue" style="width:${pct(r.overdue,r.total)}%"></i><i class="seg notstarted" style="width:${pct(r.notstarted,r.total)}%"></i></div><b>${r.total}</b></div>`).join('');
  }

  function renderRadar(){
    const targetId=state.intern!=='All Interns'?state.intern:'INT001';
    const target=D.interns.find(x=>x.intern_id===targetId)||D.interns[0];
    let monthTasks=D.tasks.filter(r=>r.intern_id===targetId && (state.month==='All Months'||r.month===state.month) && r.completed_date);
    if(!monthTasks.length) monthTasks=D.tasks.filter(r=>r.intern_id===targetId && r.completed_date);
    const depRows=D.tasks.filter(r=>r.department===target.department && (state.month==='All Months'||r.month===state.month) && r.completed_date);
    const fields=[['technical_skills','Technical Skills'],['problem_solving','Problem Solving'],['communication','Communication'],['punctuality','Time Management'],['teamwork','Teamwork'],['project_quality','Learning Agility']];
    const v1=fields.map(f=>avg(monthTasks,f[0])),v2=fields.map(f=>avg(depRows,f[0]));
    const W=330,H=230,cx=165,cy=120,R=78,n=fields.length;
    const pts=(vals,scale=1)=>vals.map((v,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*(v/5)*scale;return `${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`}).join(' ');
    let svg=`<svg viewBox="0 0 ${W} ${H}" aria-label="Skills radar chart">`;
    for(let k=1;k<=5;k++){const p=Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*k/5;return `${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`}).join(' ');svg+=`<polygon points="${p}" fill="none" stroke="var(--line)" stroke-width="1"/>`;}
    fields.forEach((f,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,x=cx+Math.cos(a)*(R+18),y=cy+Math.sin(a)*(R+18);svg+=`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(a)*R}" y2="${cy+Math.sin(a)*R}" stroke="var(--line)"/><text class="chart-label" x="${x}" y="${y}" text-anchor="middle">${f[1]}</text>`;});
    svg+=`<polygon points="${pts(v2)}" fill="#9f63ff22" stroke="#9f63ff" stroke-width="2"/><polygon points="${pts(v1)}" fill="#1da8ff20" stroke="#1de5ed" stroke-width="2"/>`;
    v1.forEach((v,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*v/5;svg+=`<circle cx="${cx+Math.cos(a)*r}" cy="${cy+Math.sin(a)*r}" r="3" fill="#1de5ed"/>`;});
    svg+=`<g transform="translate(82 12)"><circle cx="0" cy="0" r="4" fill="#1de5ed"/><text class="chart-label" x="8" y="3">${esc(target.name)}</text><circle cx="118" cy="0" r="4" fill="#9f63ff"/><text class="chart-label" x="126" y="3">Department Avg.</text></g></svg>`;
    $('#skillsRadar').innerHTML=svg;
  }

  function renderTopPerformer(){
    const rows=internMetrics().sort((a,b)=>b.score-a.score); const r=rows[0];
    if(!r){$('#topPerformer').innerHTML='<p>No matching intern data.</p>';return;}
    const intern=D.interns.find(x=>x.intern_id===r.id);
    const photo=r.name==='Sajid Ali'?`<img class="top-photo" src="assets/sajid-ali-professional.jpg" alt="Sajid Ali">`:`<div class="top-photo" style="display:grid;place-items:center;background:#113a5b;font-size:24px;font-weight:900">${initials(r.name)}</div>`;
    const rowsTask=selectedTasks().filter(x=>x.intern_id===r.id), c=completedRows(rowsTask), quote=c.at(-1)?.mentor_comment||'Consistent performance across tracked KPIs.';
    $('#topPerformer').innerHTML=`<span class="rank-badge">#1</span><div class="crown">♛</div>${photo}<h3>${esc(r.name)}</h3><span>${esc(r.department)} Intern</span>${r.name==='Sajid Ali'?'<span>Internee.pk</span>':''}<div class="top-stat-list"><div><span>Tasks Completed</span><b>${r.completed}</b></div><div><span>Project Quality</span><b>${r.quality.toFixed(1)} / 5</b></div><div><span>Mentor Feedback</span><b>${r.feedback.toFixed(1)} / 5</b></div><div><span>On-Time Rate</span><b>${r.ontime.toFixed(0)}%</b></div></div><div class="quote">“${esc(quote)}”<br>— Mentor</div>`;
  }

  function renderHeatmap(){
    const t=selectedTasks(), counts={};
    t.forEach(r=>{const d=new Date(r.assigned_date+'T00:00:00'),week=Math.min(5,Math.ceil(d.getDate()/7)),day=(d.getDay()+6)%7;counts[`${week}-${day}`]=(counts[`${week}-${day}`]||0)+1;});
    const max=Math.max(1,...Object.values(counts)); const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let h='<div></div>'+days.map(d=>`<b>${d}</b>`).join('')+'<div></div>';
    for(let w=1;w<=5;w++){
      h+=`<b>Week ${w}</b>`;
      for(let d=0;d<7;d++){const v=counts[`${w}-${d}`]||0,op=.16+.84*v/max;h+=`<div class="heat-cell" title="Week ${w} ${days[d]}: ${v} tasks" style="background:rgba(39,226,164,${op})"></div>`;}
      h+=w===1?'<div class="heat-scale" title="Low to high activity"></div>':'<span></span>';
    }
    $('#activityHeatmap').innerHTML=`<div class="heat-wrap">${h}</div>`;
  }

  function renderBubble(){
    const rows=completedRows(selectedTasks()).slice(0,160); const W=440,H=220,p={l:38,r:15,t:15,b:35},xMax=Math.max(8,...rows.map(r=>num(r.completion_days))),cx=W-p.l-p.r,cy=H-p.t-p.b;
    let svg=`<svg viewBox="0 0 ${W} ${H}" aria-label="Completion time versus project quality bubble chart">`;
    for(let k=0;k<=5;k++){const y=p.t+cy*k/5;svg+=`<line class="chart-grid" x1="${p.l}" y1="${y}" x2="${W-p.r}" y2="${y}"/><text class="chart-label" x="${p.l-7}" y="${y+3}" text-anchor="end">${(5-k).toFixed(0)}</text>`;}
    for(let k=0;k<=5;k++){const x=p.l+cx*k/5;svg+=`<line class="chart-grid" x1="${x}" y1="${p.t}" x2="${x}" y2="${H-p.b}"/><text class="chart-label" x="${x}" y="${H-16}" text-anchor="middle">${(xMax*k/5).toFixed(0)}</text>`;}
    rows.forEach(r=>{const x=p.l+num(r.completion_days)/xMax*cx,y=p.t+(5-num(r.project_quality))/5*cy,rad=2.3+num(r.mentor_feedback)*.75,c=deptColors[r.department]||'#1da8ff';svg+=`<circle class="bubble-mark" data-tip="${esc(r.intern_name)}|${num(r.completion_days).toFixed(1)} days|Q ${num(r.project_quality).toFixed(1)} • F ${num(r.mentor_feedback).toFixed(1)}" cx="${x}" cy="${y}" r="${rad}" fill="${c}" fill-opacity=".82" stroke="#e5fbff55"/>`;});
    svg+=`<text class="chart-label" x="${W/2}" y="${H-3}" text-anchor="middle">Completion Time (Days)</text><text class="chart-label" transform="translate(10 ${H/2}) rotate(-90)" text-anchor="middle">Project Quality (1–5)</text></svg>`;
    $('#bubbleChart').innerHTML=svg;bindTips();
  }

  function renderDistribution(){
    const rows=internMetrics(), cats=[['Excellent',r=>r.score>=86],['Good',r=>r.score>=76&&r.score<86],['Average',r=>r.score>=64&&r.score<76],['Needs Improvement',r=>r.score>=52&&r.score<64],['At Risk',r=>r.score<52]];
    $('#performanceDistribution').innerHTML=cats.map(([n,fn])=>{const count=rows.filter(fn).length,share=pct(count,rows.length);return `<div class="dist-card ${statusClass(n)}"><strong>${share.toFixed(0)}%</strong><span>${count} intern${count===1?'':'s'} · ${n}</span></div>`;}).join('');
  }
  function renderRanking(){
    const rows=internMetrics().sort((a,b)=>b.score-a.score).slice(0,8);
    $('#rankingBody').innerHTML=rows.map((r,i)=>{const st=statusFor(r.score), intern=D.interns.find(x=>x.intern_id===r.id);return `<tr data-intern="${r.id}"><td class="rank-num">${i+1}</td><td>${photoOrAvatar(intern)}${esc(r.name)}</td><td>${esc(r.department)}</td><td>${r.completed}/${r.assigned}</td><td>${r.completion.toFixed(0)}%</td><td>${r.quality.toFixed(1)}</td><td>${r.feedback.toFixed(1)}</td><td><span class="status-pill ${statusClass(st)}">● ${st}</span></td></tr>`;}).join('')||`<tr><td colspan="8">No records match the current filters.</td></tr>`;
  }
  function renderRecent(){
    const list=D.recentActivity.slice(0,5); const icons={report:'▧',check:'✓',feedback:'●',project:'◆'};
    $('#recentActivity').innerHTML=list.map(r=>`<div class="recent-item"><span class="activity-icon">${icons[r.icon]||'•'}</span><span>${esc(r.text)}</span><small>${esc(r.when)}</small></div>`).join('');
  }
  function renderDeadlines(){
    const rows=D.deadlines.filter(d=>(state.department==='All Departments'||d.department===state.department)&&(state.intern==='All Interns'||d.intern_id===state.intern)).slice(0,5);
    $('#deadlineList').innerHTML=rows.map(r=>`<div class="deadline-item"><span class="activity-icon">▧</span><span><b>${esc(r.task)}</b><small>${esc(r.intern_name)} · ${esc(r.due_date)}</small></span><span class="priority ${r.priority}">${r.priority}</span></div>`).join('')||'<p style="color:var(--muted)">No upcoming deadlines for this filter.</p>';
  }
  function renderSupervisor(){
    const series=monthlySeries(), cur=series.find(x=>x.month===state.month)||series.at(-1), idx=series.findIndex(x=>x.month===cur.month), prev=series[Math.max(0,idx-1)]||cur;
    const cDelta=cur.completion-prev.completion,qDelta=((cur.quality-prev.quality)/Math.max(.1,prev.quality))*100,fDelta=((cur.feedback-prev.feedback)/Math.max(.1,prev.feedback))*100;
    const direction=(v)=>v>=0?'↑':'↓';
    $('#supervisorSummary').innerHTML=`<p>Overall intern performance is evaluated using task completion, project quality, mentor feedback and timeliness. The current selection shows <b>${cur.completion.toFixed(0)}%</b> completion, <b>${cur.quality.toFixed(1)}/5</b> quality and <b>${cur.feedback.toFixed(1)}/5</b> mentor feedback.</p><div class="summary-metric"><b>${direction(cDelta)} ${Math.abs(cDelta).toFixed(0)}%</b><span>Task Completion Rate<em>vs. previous month</em></span></div><div class="summary-metric"><b>${direction(qDelta)} ${Math.abs(qDelta).toFixed(0)}%</b><span>Quality Improvement<em>vs. previous month</em></span></div><div class="summary-metric"><b>${direction(fDelta)} ${Math.abs(fDelta).toFixed(0)}%</b><span>Mentor Satisfaction<em>vs. previous month</em></span></div>`;
  }

  function renderDashboard(){renderKPIs();renderMonthlyKpi();renderDepartmentStacked();renderRadar();renderTopPerformer();renderHeatmap();renderBubble();renderDistribution();renderRanking();renderRecent();renderDeadlines();renderSupervisor();}

  function renderInternProfiles(){
    let rows=internMetrics(), q=($('#internSearch').value||'').trim().toLowerCase(); if(q)rows=rows.filter(r=>(r.name+' '+r.department).toLowerCase().includes(q));rows.sort((a,b)=>b.score-a.score);
    $('#internProfileGrid').innerHTML=rows.map(r=>{const i=D.interns.find(x=>x.intern_id===r.id),st=statusFor(r.score);return `<article class="intern-card" data-detail="${r.id}"><div class="name">${photoOrAvatar(i,'avatar-lg')}<div><b>${esc(r.name)}</b><small>${esc(r.department)}</small></div></div><p><b>${r.score.toFixed(0)}%</b> Performance · ${r.completed}/${r.assigned} completed</p><small>Quality ${r.quality.toFixed(1)} · Feedback ${r.feedback.toFixed(1)} · Avg time ${r.time.toFixed(1)} days</small><div class="meter"><i style="width:${r.score}%"></i></div><p><span class="status-pill ${statusClass(st)}">${st}</span></p></article>`;}).join('')||'<p>No intern profiles match.</p>';
  }
  function renderTaskTable(){
    let rows=selectedTasks(); const q=($('#taskSearch').value||'').trim().toLowerCase(), st=$('#taskStatusFilter').value;if(q)rows=rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(q));if(st!=='All')rows=rows.filter(r=>r.status===st);
    rows=rows.slice().sort((a,b)=>b.assigned_date.localeCompare(a.assigned_date)).slice(0,250);
    $('#taskTableBody').innerHTML=rows.map(r=>`<tr><td>${r.task_id}</td><td>${esc(r.intern_name)}</td><td>${esc(r.department)}</td><td>${esc(r.project_name)}</td><td><span class="status-pill ${r.status==='Completed'?'excellent':r.status==='Overdue'?'risk':r.status==='In Progress'?'good':'average'}">${r.status}</span></td><td>${r.assigned_date}</td><td>${r.due_date}</td><td>${r.completion_days?num(r.completion_days).toFixed(1)+' d':'—'}</td><td>${r.project_quality?num(r.project_quality).toFixed(1):'—'}</td><td>${r.mentor_feedback?num(r.mentor_feedback).toFixed(1):'—'}</td></tr>`).join('')||'<tr><td colspan="10">No task records match.</td></tr>';
  }
  function renderPerformanceView(){
    const t=selectedTasks(),c=completedRows(t),ims=internMetrics().sort((a,b)=>b.score-a.score),best=ims[0],slow=[...c].sort((a,b)=>num(b.completion_days)-num(a.completion_days))[0];
    $('#performanceCards').innerHTML=`<article class="analysis-card"><h3>Task Completion Time</h3><div class="metric-big">${avg(c,'completion_days').toFixed(1)} days</div><p>Primary KPI required by Task 6. Lower completion time is interpreted with quality and timeliness rather than in isolation.</p></article><article class="analysis-card"><h3>Project Quality</h3><div class="metric-big">${avg(c,'project_quality').toFixed(2)} / 5</div><p>Average review score for completed work. ${best?`${esc(best.name)} currently leads the composite ranking.`:''}</p></article><article class="analysis-card"><h3>Mentor Feedback</h3><div class="metric-big">${avg(c,'mentor_feedback').toFixed(2)} / 5</div><p>Supervisor/mentor rating across completed tasks, combined with qualitative review comments.</p></article><article class="analysis-card"><h3>Completion Rate</h3><div class="metric-big">${pct(c.length,t.length).toFixed(1)}%</div><p>${c.length} of ${t.length} filtered tasks have completion dates.</p></article><article class="analysis-card"><h3>On-Time Rate</h3><div class="metric-big">${c.length?pct(c.filter(r=>num(r.on_time)===1).length,c.length).toFixed(1):'0.0'}%</div><p>Completed tasks delivered within their planned due date.</p></article><article class="analysis-card"><h3>Longest Completion</h3><div class="metric-big">${slow?num(slow.completion_days).toFixed(1):'0'} days</div><p>${slow?`${esc(slow.intern_name)} · ${esc(slow.project_name)}`:'No completed task selected.'}</p></article>`;
  }
  function renderFeedbackView(){
    const c=completedRows(selectedTasks()), fields=[['technical_skills','Technical Skills'],['communication','Communication'],['problem_solving','Problem Solving'],['teamwork','Teamwork'],['punctuality','Punctuality']]; const top=[...c].sort((a,b)=>num(b.mentor_feedback)-num(a.mentor_feedback)).slice(0,5);
    $('#feedbackContent').innerHTML=fields.map(([k,l])=>`<article class="analysis-card"><h3>${l}</h3><div class="metric-big">${avg(c,k).toFixed(2)}</div><p>Average rating out of 5 across completed tasks in the current filter.</p></article>`).join('')+`<article class="analysis-card"><h3>Recent Strong Feedback</h3>${top.map(r=>`<p><b>${esc(r.intern_name)}</b> · ${num(r.mentor_feedback).toFixed(1)}/5<br><small>${esc(r.mentor_comment)}</small></p>`).join('')}</article>`;
  }
  function renderReports(){
    $('#reportCards').innerHTML=D.monthly.map(m=>`<article class="report-card"><h3>${m.month_label}</h3><p><b>${m.completion_rate}%</b> completion</p><p>${m.tasks_completed}/${m.tasks_assigned} tasks · ${m.avg_completion_days} days · Quality ${m.avg_quality}/5 · Feedback ${m.avg_feedback}/5</p><a target="_blank" href="outputs/monthly_reports/${m.month}_supervisor_report.html">Open Supervisor Report →</a></article>`).join('');
  }
  function renderAnalyticsView(){
    const t=selectedTasks(),c=completedRows(t),depts=[...new Set(t.map(r=>r.department))];const depRows=depts.map(d=>{const r=t.filter(x=>x.department===d),cc=completedRows(r);return{d,completion:pct(cc.length,r.length),time:avg(cc,'completion_days'),quality:avg(cc,'project_quality'),feedback:avg(cc,'mentor_feedback'),score:score(r)}}).sort((a,b)=>b.score-a.score);
    $('#analyticsContent').innerHTML=depRows.map(r=>`<article class="analysis-card"><h3>${esc(r.d)}</h3><div class="metric-big">${r.score.toFixed(0)}%</div><p>Composite performance score<br>Completion ${r.completion.toFixed(0)}% · ${r.time.toFixed(1)} days<br>Quality ${r.quality.toFixed(1)} · Feedback ${r.feedback.toFixed(1)}</p></article>`).join('');
  }
  function renderNotifications(){
    const t=selectedTasks(), ims=internMetrics(), overdue=t.filter(r=>r.status==='Overdue').length, low=ims.filter(r=>r.score<64), opens=t.filter(r=>r.status==='In Progress'||r.status==='Not Started').length;
    $('#notificationList').innerHTML=`<div class="notice"><b>${overdue} overdue task records</b><p>Review late completions and reinforce planning/mentor check-ins.</p></div><div class="notice"><b>${opens} currently open tasks</b><p>Track in-progress and not-started work before monthly close.</p></div><div class="notice"><b>${low.length} interns below 64% composite score</b><p>${low.length?low.slice(0,5).map(x=>esc(x.name)).join(', '):'No interns currently require escalation.'}</p></div>`;
  }

  function detailIntern(id){
    const i=D.interns.find(x=>x.intern_id===id); const rows=selectedTasks().filter(x=>x.intern_id===id); const use=rows.length?rows:D.tasks.filter(x=>x.intern_id===id); const c=completedRows(use),s=score(use);
    $('#modalContent').innerHTML=`<h2>${esc(i.name)}</h2><p>${esc(i.department)} · ${esc(i.location)}</p><div class="report-kpis"><div><b>Performance</b><br>${s.toFixed(1)}%</div><div><b>Completion</b><br>${pct(c.length,use.length).toFixed(1)}%</div><div><b>Avg Time</b><br>${avg(c,'completion_days').toFixed(1)} days</div><div><b>Quality</b><br>${avg(c,'project_quality').toFixed(2)}/5</div><div><b>Feedback</b><br>${avg(c,'mentor_feedback').toFixed(2)}/5</div><div><b>On-Time</b><br>${c.length?pct(c.filter(r=>num(r.on_time)===1).length,c.length).toFixed(0):0}%</div></div><h3>Mentor Note</h3><p>${esc(c.at(-1)?.mentor_comment||'No completed task comment in this selection.')}</p><p><small>${esc(i.education)}</small></p>`;openModal();
  }
  function openModal(){ $('#modal').classList.add('open'); }
  function closeModal(){ $('#modal').classList.remove('open'); }
  function generateMonthlyReport(){
    const t=selectedTasks(),c=completedRows(t),ims=internMetrics().sort((a,b)=>b.score-a.score),m=state.month==='All Months'?'All Months':(D.monthly.find(x=>x.month===state.month)?.month_label||state.month);
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Task 6 Supervisor Report</title><style>body{font:14px Segoe UI,Arial;margin:40px;color:#17324a}.k{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.k div{padding:12px;border:1px solid #ccdce8;border-radius:8px}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #dbe7ef;padding:8px;text-align:left}</style></head><body><h1>Intern Performance Monthly Supervisor Report</h1><p><b>${esc(m)}</b> · ${esc(state.department)} · Prepared by Sajid Ali, Data Analyst Intern – Internee.pk</p><div class="k"><div>Tasks Assigned<br><b>${t.length}</b></div><div>Tasks Completed<br><b>${c.length}</b></div><div>Completion Rate<br><b>${pct(c.length,t.length).toFixed(1)}%</b></div><div>Avg Completion Time<br><b>${avg(c,'completion_days').toFixed(1)} days</b></div><div>Project Quality<br><b>${avg(c,'project_quality').toFixed(2)}/5</b></div><div>Mentor Feedback<br><b>${avg(c,'mentor_feedback').toFixed(2)}/5</b></div></div><h2>Top Interns</h2><table><tr><th>Intern</th><th>Department</th><th>Score</th></tr>${ims.slice(0,10).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.department)}</td><td>${r.score.toFixed(1)}%</td></tr>`).join('')}</table><p><small>Portfolio dataset note: realistic synthetic data, no confidential internship records.</small></p></body></html>`;
    $('#modalContent').innerHTML=`<h2>Monthly Supervisor Report</h2><p><b>${m}</b> · ${esc(state.department)}</p><div class="report-kpis"><div>Assigned<br><b>${t.length}</b></div><div>Completed<br><b>${c.length}</b></div><div>Completion<br><b>${pct(c.length,t.length).toFixed(1)}%</b></div><div>Avg Time<br><b>${avg(c,'completion_days').toFixed(1)} days</b></div><div>Quality<br><b>${avg(c,'project_quality').toFixed(2)}/5</b></div><div>Feedback<br><b>${avg(c,'mentor_feedback').toFixed(2)}/5</b></div></div><div class="report-actions"><button class="btn primary" id="downloadHtmlReport">Download HTML Report</button><button class="btn" onclick="window.print()">Print / Save PDF</button></div>`;
    openModal(); setTimeout(()=>{$('#downloadHtmlReport').onclick=()=>downloadBlob(html,`Task6_Supervisor_Report_${state.month}.html`,'text/html');},0);
  }
  function downloadBlob(text,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast(`${name} created`);}
  function downloadCsv(){const rows=selectedTasks();if(!rows.length){showToast('No records to export');return;}const keys=Object.keys(rows[0]);const csv=[keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n');downloadBlob('\ufeff'+csv,'task6_filtered_performance.csv','text/csv;charset=utf-8');}
  function bindTips(){
    let tip=document.querySelector('.chart-tooltip');if(!tip){tip=document.createElement('div');tip.className='chart-tooltip';document.body.appendChild(tip);}$$('[data-tip]').forEach(el=>{el.addEventListener('mouseenter',e=>{tip.innerHTML=e.currentTarget.dataset.tip.split('|').map(x=>esc(x)).join('<br>');tip.style.display='block';});el.addEventListener('mousemove',e=>{tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY+12)+'px';});el.addEventListener('mouseleave',()=>tip.style.display='none');});
  }
  function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('task6-theme',next);}catch(e){}showToast(`${next==='dark'?'Dark':'Light'} mode enabled`);}
  function globalSearchAction(){const q=$('#globalSearch').value.trim().toLowerCase();if(!q)return;const i=D.interns.find(x=>x.name.toLowerCase().includes(q)||x.department.toLowerCase().includes(q));if(i){state.intern=i.intern_id;state.department=i.department;initFilters();renderAll();detailIntern(i.intern_id);return;}const task=D.tasks.find(x=>Object.values(x).join(' ').toLowerCase().includes(q));if(task){state.month=task.month;state.department=task.department;state.intern=task.intern_id;state.project=task.project_name;initFilters();renderAll();setView('tasks');$('#taskSearch').value=q;renderTaskTable();return;}showToast('No matching intern, task or project');}
  function applyFilters(){state={month:$('#monthFilter').value,department:$('#departmentFilter').value,intern:$('#internFilter').value,project:$('#projectFilter').value};renderAll();showToast('Filters applied');}
  function resetFilters(){state={month:'2026-08',department:'All Departments',intern:'All Interns',project:'All Projects'};initFilters();renderAll();showToast('Filters reset');}
  function renderAll(){renderDashboard();renderInternProfiles();renderTaskTable();renderPerformanceView();renderFeedbackView();renderReports();renderAnalyticsView();renderNotifications();}

  function init(){
    try{document.documentElement.dataset.theme=localStorage.getItem('task6-theme')||'dark';}catch(e){document.documentElement.dataset.theme='dark';}
    initFilters();renderAll();
    $('#departmentFilter').addEventListener('change',()=>{refillInterns();refillProjects();});
    $('#applyFilters').onclick=applyFilters;$('#resetFilters').onclick=resetFilters;
    $('#themeToggle').onclick=toggleTheme;$('#themeToggle2').onclick=toggleTheme;$('#printDashboard').onclick=()=>window.print();
    $('#exportReport').onclick=()=>window.print();$('#generateReport').onclick=generateMonthlyReport;$('#generateReport2').onclick=generateMonthlyReport;
    $('#downloadTasks').onclick=downloadCsv;$('#taskSearch').oninput=renderTaskTable;$('#taskStatusFilter').onchange=renderTaskTable;$('#internSearch').oninput=renderInternProfiles;
    $('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter')globalSearchAction();});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();}if(e.key==='Escape')closeModal();});
    $$('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));$$('[data-view-link]').forEach(b=>b.onclick=()=>setView(b.dataset.viewLink));
    $('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');$('#modalClose').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal();};
    document.body.addEventListener('click',e=>{const c=e.target.closest('[data-detail]');if(c)detailIntern(c.dataset.detail);const r=e.target.closest('tr[data-intern]');if(r)detailIntern(r.dataset.intern);});
    window.addEventListener('resize',()=>{if($('#view-dashboard').classList.contains('active')){renderMonthlyKpi();renderRadar();renderBubble();}});
  }
  document.addEventListener('DOMContentLoaded',init);
})();
