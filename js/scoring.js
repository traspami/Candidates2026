/* ================================================================
   js/scoring.js — All scoring calculations
   ================================================================ */
const Scoring = (() => {
  function scorePodium(picks, live, exact, consol) {
    let score = 0;
    if (!live?.['1st']) return score;
    const liveArr = ['1st','2nd','3rd'].map(p=>live[p]).filter(Boolean).map(n=>n.toLowerCase());
    ['1st','2nd','3rd'].forEach((p,i) => {
      if (!live[p] || !picks[p]) return;
      if (live[p].toLowerCase() === picks[p].toLowerCase()) score += exact[i];
      else if (liveArr.includes(picks[p].toLowerCase())) score += consol[i];
    });
    return score;
  }

  function scoreGeek(picks, live) {
    let score = 0;
    Object.keys(picks).forEach(k => {
      const lv = live[k];
      if (lv === null || lv === undefined) return;
      const p = typeof picks[k]==='string' ? picks[k].toLowerCase() : picks[k];
      const l = typeof lv==='string' ? lv.toLowerCase() : lv;
      if (p === l) score += DATA.GEEK_PTS;
    });
    return score;
  }

  function calcAll(live) {
    const jo = scorePodium(DATA.JUANI.open,   live.open,   DATA.OPEN_EXACT, DATA.OPEN_CONSOL);
    const jw = scorePodium(DATA.JUANI.womens, live.womens, DATA.WOM_EXACT,  DATA.WOM_CONSOL);
    const jg = scoreGeek(DATA.JUANI.geek, live.geek);
    const bo = scorePodium(DATA.BRU.open,   live.open,   DATA.OPEN_EXACT, DATA.OPEN_CONSOL);
    const bw = scorePodium(DATA.BRU.womens, live.womens, DATA.WOM_EXACT,  DATA.WOM_CONSOL);
    const bg = scoreGeek(DATA.BRU.geek, live.geek);
    return { jo,jw,jg, jt:jo+jw+jg, bo,bw,bg, bt:bo+bw+bg };
  }

  function pickStatus(place, name, live) {
    if (!live?.['1st']) return 'tbd';
    if (!live[place]) return 'tbd';
    if (live[place].toLowerCase() === name.toLowerCase()) return 'hit';
    const arr = ['1st','2nd','3rd'].map(p=>live[p]).filter(Boolean).map(n=>n.toLowerCase());
    return arr.includes(name.toLowerCase()) ? 'partial' : 'miss';
  }

  function pickPts(place, name, live, exact, consol, idx) {
    const s = pickStatus(place, name, live);
    if (s==='tbd') return null;
    if (s==='hit') return exact[idx];
    if (s==='partial') return consol[idx];
    return 0;
  }

  function geekStatus(pick, lv) {
    if (lv===null||lv===undefined) return 'tbd';
    const p = typeof pick==='string' ? pick.toLowerCase() : pick;
    const l = typeof lv==='string' ? lv.toLowerCase() : lv;
    return p===l ? 'hit' : 'miss';
  }

  return { calcAll, pickStatus, pickPts, geekStatus };
})();
