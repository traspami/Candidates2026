/* ================================================================
   js/render.js — All DOM rendering
   ================================================================ */
const Render = (() => {
  const STATUS_LABEL = { hit:'EXACT', partial:'PODIUM', miss:'MISS', tbd:'TBD' };

  function fmt(v) {
    if (v===null||v===undefined) return '<span class="tbd-val">TBD</span>';
    if (v===true) return 'Yes'; if (v===false) return 'No';
    return String(v);
  }

  function scores(live) {
    const s = Scoring.calcAll(live);
    document.getElementById('juani-pts').textContent = s.jt;
    document.getElementById('bru-pts').textContent   = s.bt;
    document.getElementById('juani-pts').className = 'p-pts'+(s.jt>=s.bt?' leading':'');
    document.getElementById('bru-pts').className   = 'p-pts'+(s.bt>=s.jt?' leading':'');
    document.getElementById('juani-breakdown').textContent = `Open ${s.jo} · Women ${s.jw} · Geek ${s.jg}`;
    document.getElementById('bru-breakdown').textContent   = `Open ${s.bo} · Women ${s.bw} · Geek ${s.bg}`;
    const diff = s.jt - s.bt;
    document.getElementById('diff-chip').textContent =
      diff===0 ? 'Tied' : diff>0 ? `Juani +${diff}` : `Bru +${Math.abs(diff)}`;
    [['s-j-open',s.jo,'s-b-open',s.bo],
     ['s-j-womens',s.jw,'s-b-womens',s.bw],
     ['s-j-geek',s.jg,'s-b-geek',s.bg],
     ['s-j-total',s.jt,'s-b-total',s.bt]].forEach(([ji,jv,bi,bv])=>{
      const je=document.getElementById(ji), be=document.getElementById(bi);
      je.textContent=jv; be.textContent=bv;
      je.className='num'+(jv>bv?' better':'');
      be.className='num'+(bv>jv?' better':'');
    });
  }

  function pickSection(picks, live, id, exact, consol) {
    const el = document.getElementById(id);
    el.innerHTML = ['1st','2nd','3rd'].map((p,i) => {
      const name = picks[p];
      const st   = Scoring.pickStatus(p, name, live);
      const pts  = Scoring.pickPts(p, name, live, exact, consol, i);
      const badge= ['g','s','b'][i];
      return `<div class="pick-row">
        <div class="rank-badge ${badge}">${i+1}</div>
        <div class="pick-name-text">${name}</div>
        <span class="status-chip ${st}">${STATUS_LABEL[st]}</span>
        <span class="pts-chip ${pts>0?'earned':''}">${pts!==null?'+'+pts:'—'}</span>
      </div>`;
    }).join('');
  }

  function allPicks(live) {
    pickSection(DATA.JUANI.open,   live.open,   'j-open-picks',   DATA.OPEN_EXACT, DATA.OPEN_CONSOL);
    pickSection(DATA.JUANI.womens, live.womens, 'j-womens-picks', DATA.WOM_EXACT,  DATA.WOM_CONSOL);
    pickSection(DATA.BRU.open,     live.open,   'b-open-picks',   DATA.OPEN_EXACT, DATA.OPEN_CONSOL);
    pickSection(DATA.BRU.womens,   live.womens, 'b-womens-picks', DATA.WOM_EXACT,  DATA.WOM_CONSOL);
  }

  function geek(live) {
    const tbody = document.getElementById('geek-tbody');
    tbody.innerHTML = Object.keys(DATA.GEEK_META).map(k => {
      const meta = DATA.GEEK_META[k];
      const lv = live.geek[k];
      const jp = DATA.JUANI.geek[k], bp = DATA.BRU.geek[k];
      const jSt = Scoring.geekStatus(jp, lv), bSt = Scoring.geekStatus(bp, lv);
      const ptsLabel = st => st==='tbd'?'—':st==='hit'?'+2':'0';
      return `<tr>
        <td><div class="marker-name">${meta.name}</div><div class="marker-sub">${meta.desc}</div></td>
        <td class="live-cell">${fmt(lv)}</td>
        <td class="pick-cell">${fmt(jp)}</td>
        <td class="pts-cell ${jSt}">${ptsLabel(jSt)}</td>
        <td class="pick-cell">${fmt(bp)}</td>
        <td class="pts-cell ${bSt}">${ptsLabel(bSt)}</td>
      </tr>`;
    }).join('');
    const s = Scoring.calcAll(live);
    document.getElementById('j-geek-running').textContent = `${s.jg} / 30`;
    document.getElementById('b-geek-running').textContent = `${s.bg} / 30`;
  }

  function standingsCard(id, entries) {
    const el = document.getElementById(id);
    if (!entries?.length) { el.innerHTML='<div class="standings-placeholder">No data yet</div>'; return; }
    el.innerHTML = entries.map((e,i) => `
      <div class="standings-row">
        <div class="s-pos">${e.pos}</div>
        <div class="s-name">${e.name}</div>
        <div class="s-flag">${e.flag||''}</div>
        <div class="s-gp">${e.gp||0}g</div>
        <div class="s-score ${i===0?'top':''}">${e.score}</div>
      </div>`).join('');
  }

  function rules() {
    const el = document.getElementById('rules-geek-grid');
    el.innerHTML = Object.entries(DATA.GEEK_META).map(([k, m], i) => `
      <div class="geek-rule-item">
        <div class="gri-num">#${i + 1}</div>
        <div class="gri-name">${m.name}</div>
        <div class="gri-desc">${m.desc}</div>
        <div class="gri-pts">+2 pts &nbsp;·&nbsp; ${m.type === 'player' ? 'player name' : m.type === 'round' ? 'round 1–14' : 'yes / no'}</div>
      </div>`).join('');
  }

  function pill(cls, text) {
    const pill = document.getElementById('live-pill');
    const span = document.getElementById('live-pill-text');
    pill.className = 'live-pill' + (cls ? ` ${cls}` : '');
    span.textContent = text;
  }

  function statusBar(text) {
    document.getElementById('fetch-status').textContent = text;
  }

  function lastUpdated(iso) {
    const el = document.getElementById('last-updated');
    if (!iso) { el.textContent=''; return; }
    const d = new Date(iso);
    el.textContent = `Last updated: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }

  function all(live, snapshots) {
    scores(live); allPicks(live); geek(live); rules();
  }

  return { all, scores, allPicks, geek, standingsCard, rules, pill, statusBar, lastUpdated };
})();
