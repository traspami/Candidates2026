/* ================================================================
   js/chart.js — Points race chart. Draws from stored snapshots.
   ================================================================ */
const RaceChart = (() => {
  let instance = null;

  function draw(snapshots) {
    const canvas = document.getElementById('race-chart');
    const note   = document.getElementById('chart-note');
    if (!snapshots?.length) {
      note.textContent = 'No data yet — standings will auto-track as rounds are fetched.';
      if (instance) { instance.destroy(); instance=null; }
      return;
    }

    const labels   = ['Start', ...snapshots.map(s=>'R'+s.round)];
    const jPts     = [0, ...snapshots.map(s=>s.jt)];
    const bPts     = [0, ...snapshots.map(s=>s.bt)];
    const maxPts   = Math.max(...jPts, ...bPts, 10);

    // Detect lead changes
    const leadChange = new Set();
    for (let i=1; i<jPts.length; i++) {
      const prev = Math.sign(jPts[i-1]-bPts[i-1]);
      const cur  = Math.sign(jPts[i]-bPts[i]);
      if (prev!==cur && prev!==0) leadChange.add(i);
    }

    const jR = jPts.map((_,i)=>leadChange.has(i)?9:4);
    const bR = bPts.map((_,i)=>leadChange.has(i)?9:4);

    const cfg = {
      type: 'line',
      data: { labels, datasets: [
        { label:'Juani', data:jPts, borderColor:'#c9a84c', backgroundColor:'rgba(201,168,76,0.07)',
          borderWidth:2.5, pointBackgroundColor:'#c9a84c', pointBorderColor:'#c9a84c',
          pointRadius:jR, pointHoverRadius:9, tension:0.35, fill:true },
        { label:'Bru',   data:bPts, borderColor:'#5b8fc9', backgroundColor:'rgba(91,143,201,0.07)',
          borderWidth:2.5, pointBackgroundColor:'#5b8fc9', pointBorderColor:'#5b8fc9',
          pointRadius:bR, pointHoverRadius:9, tension:0.35, fill:true },
      ]},
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ intersect:false, mode:'index' },
        plugins: {
          legend:{ labels:{ color:'#7a7870', font:{family:"'DM Mono',monospace",size:12},
            boxWidth:14, usePointStyle:true }},
          tooltip:{ backgroundColor:'#1c1c1e', borderColor:'rgba(255,255,255,0.15)',
            borderWidth:0.5, titleColor:'#7a7870', bodyColor:'#e8e6e0', padding:10,
            bodyFont:{family:"'DM Mono',monospace",size:12},
            titleFont:{family:"'DM Mono',monospace",size:11},
            callbacks:{
              title: items => items[0].label==='Start'?'Before R1':items[0].label,
              afterBody(items) {
                const j=items.find(i=>i.dataset.label==='Juani')?.raw??0;
                const b=items.find(i=>i.dataset.label==='Bru')?.raw??0;
                const d=j-b, lc=leadChange.has(items[0].dataIndex)?'\n  ⚡ Lead change!':'';
                if(d===0) return `  Tied at ${j} pts${lc}`;
                return (d>0?`  Juani leads +${d}`:`  Bru leads +${Math.abs(d)}`)+lc;
              }
            }
          }
        },
        scales:{
          x:{ grid:{color:'rgba(255,255,255,0.04)'}, border:{color:'rgba(255,255,255,0.07)'},
              ticks:{color:'#5a5852',font:{family:"'DM Mono',monospace",size:11}} },
          y:{ beginAtZero:true, grid:{color:'rgba(255,255,255,0.04)'}, border:{color:'rgba(255,255,255,0.07)'},
              ticks:{color:'#5a5852',font:{family:"'DM Mono',monospace",size:11},stepSize:10},
              suggestedMax: Math.ceil(maxPts/10)*10+10 }
        },
        animation:{ duration:600, easing:'easeInOutQuart' }
      }
    };

    if (instance) instance.destroy();
    instance = new Chart(canvas, cfg);

    const last = snapshots[snapshots.length-1];
    const left = 14 - last.round;
    const gap  = Math.abs(last.jt-last.bt);
    const leader = last.jt>last.bt?'Juani':last.bt>last.jt?'Bru':null;
    note.textContent = leader
      ? `${leader} leads ${Math.max(last.jt,last.bt)}–${Math.min(last.jt,last.bt)} (+${gap}) after R${last.round}. ${left} round${left!==1?'s':''} to go.`
      : `Tied at ${last.jt} after R${last.round}. ${left} rounds to go.`;
  }

  return { draw };
})();
