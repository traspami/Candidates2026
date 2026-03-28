/* ================================================================
   js/analyser.js — Deterministic geek rule detection from PGN.
   Takes arrays of parsed game objects, returns LIVE.geek values.
   ================================================================ */
const Analyser = (() => {

  /* ── Name normaliser ── */
  const NAME_MAP = [
    [/pragg|praggnanandhaa/i, 'Praggnanandhaa'],
    [/bluebaum|blübaum/i,     'Bluebaum'],
    [/esipenko/i,             'Esipenko'],
    [/sindarov/i,             'Sindarov'],
    [/nakamura/i,             'Nakamura'],
    [/caruana/i,              'Caruana'],
    [/\bgiri\b/i,             'Giri'],
    [/wei\s*yi/i,             'Wei Yi'],
    [/goryachkina/i,          'Goryachkina'],
    [/zhu\s*jiner/i,          'Zhu Jiner'],
    [/tan\s*zhongyi/i,        'Tan Zhongyi'],
    [/lagno/i,                'Lagno'],
    [/vaishali/i,             'Vaishali'],
    [/deshmukh|divya/i,       'Divya'],
    [/assaubayeva/i,          'Assaubayeva'],
    [/muzychuk/i,             'Muzychuk'],
  ];

  function norm(raw) {
    if (!raw) return '';
    for (const [re, name] of NAME_MAP) if (re.test(raw)) return name;
    // fallback: first comma-separated token or first word
    return (raw.split(/[,]/)[0] || raw.split(' ')[0]).trim();
  }

  /* ── Build per-player result arrays ── */
  function playerResults(games) {
    const byPlayer = {};
    const add = (p, res, round) => {
      if (!byPlayer[p]) byPlayer[p] = [];
      byPlayer[p].push({ round, res });
    };
    for (const g of games) {
      if (!PGN.isFinished(g)) continue;
      const w = norm(g.headers.White), b = norm(g.headers.Black);
      const round = parseInt(g.headers.Round) || 0;
      const r = PGN.result(g);
      if (r==='1-0')         { add(w,'win',round); add(b,'loss',round); }
      else if (r==='0-1')    { add(w,'loss',round); add(b,'win',round); }
      else                   { add(w,'draw',round); add(b,'draw',round); }
    }
    for (const p of Object.keys(byPlayer))
      byPlayer[p].sort((a,b)=>a.round-b.round);
    return byPlayer;
  }

  function maxStreak(results, target) {
    let max=0, cur=0;
    for (const r of results) { if(r.res===target){cur++;max=Math.max(max,cur);}else cur=0; }
    return max;
  }

  function bestByStreak(byPlayer, target) {
    let best=0, winner=null;
    for (const [p, results] of Object.entries(byPlayer)) {
      const s = maxStreak(results, target);
      if (s > best) { best=s; winner=p; }
    }
    return winner;
  }

  function mostDraws(byPlayer, excluded=[]) {
    let most=0, winner=null;
    for (const [p, results] of Object.entries(byPlayer)) {
      if (excluded.some(ex => p.toLowerCase().includes(ex.toLowerCase()))) continue;
      const d = results.filter(r=>r.res==='draw').length;
      if (d > most) { most=d; winner=p; }
    }
    return winner;
  }

  /* ── Main analysis function ── */
  function analyse(allGames) {
    const games = allGames || [];

    // Null = not yet determined (tournament ongoing, event not seen yet)
    const out = {
      hot_hand: null, tilt: null, pacifist: null,
      philidor: null, en_passant_round: null, underpromotion: null,
      kings_hike: null, castling_last: null, double_queen: null,
      checkmate: null, blitz_decisive: null, marathon_decisive: null,
      pawn_race: null, triple_repetition_blunder: null, last_round_decisive: null,
    };

    if (games.length === 0) return out;

    const finished  = games.filter(g => PGN.isFinished(g));
    const decisive  = games.filter(g => PGN.isDecisive(g));
    const byPlayer  = playerResults(games);
    const maxRound  = Math.max(...games.map(g => parseInt(g.headers.Round)||0), 0);

    // ── Streak-based ──────────────────────────────────────────
    out.hot_hand = bestByStreak(byPlayer, 'win')  || null;
    out.tilt     = bestByStreak(byPlayer, 'loss') || null;
    out.pacifist = mostDraws(byPlayer, ['Giri'])  || null;

    // ── Move-by-move ─────────────────────────────────────────
    let firstEp      = null;
    let underpro     = false;
    let kingsHike    = false;
    let doubleQueen  = false;
    let checkmate    = false;
    let blitz        = false;
    let marathon     = false;
    let pawnRace     = false;
    let tripleRep    = false;
    let philidor     = false;
    const castlingAt = {}; // playerName → move number of first castle

    for (const g of games) {
      const white = norm(g.headers.White);
      const black = norm(g.headers.Black);
      const round = parseInt(g.headers.Round) || null;
      const mc    = PGN.moveCount(g);
      const fin   = PGN.isFinished(g);
      const dec   = PGN.isDecisive(g);
      const draw  = PGN.isDraw(g);

      // Philidor via header
      const opening = ((g.headers.Opening||'') + ' ' + (g.headers.ECO||'')).toLowerCase();
      if (opening.includes('philidor')) philidor = true;

      // Blitz / Marathon
      if (fin && dec && mc < 25) blitz = true;
      if (fin && dec && mc > 90) marathon = true;

      // Threefold blunder: draw + comment mentions repetition
      if (draw) {
        const raw = (g.raw||'').toLowerCase();
        if (raw.includes('repetit') || raw.includes('threefold') || raw.includes('three-fold')) tripleRep = true;
      }

      // Pawn race: both colours promote in same game
      let wPro = false, bPro = false;

      // Replay moves
      try {
        const events = Chess.replay(g);
        for (const ev of events) {
          // En passant
          if (ev.enPassant && firstEp === null && round !== null) firstEp = round;

          // Underpromotion
          if (ev.underpromotion) underpro = true;

          // King crossed 5th rank before move 40
          if (ev.kingCrossed5th && ev.chessMove <= 40) kingsHike = true;

          // Double queen
          if (ev.doubleQueen) doubleQueen = true;

          // Checkmate
          if (ev.checkmate) checkmate = true;

          // Promotions for pawn race
          if (ev.whitePromotion) wPro = true;
          if (ev.blackPromotion) bPro = true;

          // Castling — record per-player earliest castle move
          if (ev.castled) {
            const p = ev.castled === 'white' ? white : black;
            // We want LATEST castle across all games, so track max
            if (!(p in castlingAt) || ev.chessMove > castlingAt[p]) {
              castlingAt[p] = ev.chessMove;
            }
          }
        }
      } catch(e) {
        console.warn('Replay error:', g.headers.White, 'vs', g.headers.Black, e.message);
      }

      if (wPro && bPro) pawnRace = true;
    }

    // ── Assign results (null = not seen yet, false = confirmed no) ──

    // Events that trigger on first occurrence:
    out.en_passant_round = firstEp; // null = not seen yet

    // Bool events: null until we've seen enough games
    const setFlag = (val, seen) => val ? true : (finished.length > 0 ? false : null);
    out.underpromotion             = underpro   ? true : (finished.length > 0 ? false : null);
    out.kings_hike                 = kingsHike  ? true : (finished.length > 0 ? false : null);
    out.double_queen               = doubleQueen? true : (finished.length > 0 ? false : null);
    out.checkmate                  = checkmate  ? true : (finished.length > 0 ? false : null);
    out.blitz_decisive             = blitz      ? true : (finished.length > 0 ? false : null);
    out.marathon_decisive          = marathon   ? true : (finished.length > 0 ? false : null);
    out.pawn_race                  = pawnRace   ? true : (finished.length > 0 ? false : null);
    out.triple_repetition_blunder  = tripleRep  ? true : (finished.length > 0 ? false : null);
    out.philidor                   = philidor   ? true : null; // can't confirm false until all games done

    // Castling holdout: player with the HIGHEST castling move number
    if (Object.keys(castlingAt).length > 0) {
      out.castling_last = Object.entries(castlingAt)
        .sort((a,b) => b[1]-a[1])[0][0];
    }

    // Last round drama: only assessable once round 14 is complete
    if (maxRound >= 14) {
      const r14 = games.filter(g => parseInt(g.headers.Round)===14);
      const r14done = r14.filter(g => PGN.isFinished(g));
      if (r14done.length > 0) {
        out.last_round_decisive = r14.some(g => PGN.isDecisive(g));
      }
    }

    return out;
  }

  /* ── Standings from game results ── */
  function standings(games) {
    const scores = {}, games_played = {};
    for (const g of games) {
      const w = norm(g.headers.White), b = norm(g.headers.Black);
      if (!scores[w]) { scores[w]=0; games_played[w]=0; }
      if (!scores[b]) { scores[b]=0; games_played[b]=0; }
      if (!PGN.isFinished(g)) continue;
      games_played[w]++; games_played[b]++;
      const r = PGN.result(g);
      if (r==='1-0')      { scores[w]+=1; }
      else if (r==='0-1') { scores[b]+=1; }
      else                { scores[w]+=0.5; scores[b]+=0.5; }
    }
    return Object.entries(scores)
      .map(([name, pts]) => ({ name, pts,
        score: pts%1===0.5 ? pts.toFixed(1) : pts.toString(),
        gp: games_played[name] || 0 }))
      .sort((a,b) => b.pts-a.pts)
      .map((e,i) => ({ ...e, pos: i+1 }));
  }

  function currentRound(games) {
    return Math.max(0, ...games.map(g => parseInt(g.headers.Round)||0));
  }

  return { analyse, standings, currentRound, norm };
})();
