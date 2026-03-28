/* ================================================================
   js/lichess.js — Lichess Broadcast API (no auth, no CORS issues)
   Fetches all round PGNs for Open + Women's Candidates 2026.
   ================================================================ */
const Lichess = (() => {
  const BASE = 'https://lichess.org';
  const { OPEN_TOUR_ID, WOMENS_TOUR_ID, OPEN_R1_ID } = DATA.LICHESS;

  /* Discover round IDs for a tournament */
  async function discoverRounds(tourId) {
    const res = await fetch(`${BASE}/api/broadcast/${tourId}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.rounds || []).map((r, i) => ({ round: i+1, id: r.id, name: r.name }));
  }

  /* Fetch PGN text for one round */
  async function roundPgn(roundId) {
    const res = await fetch(`${BASE}/api/broadcast/round/${roundId}/pgn`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  /* Fetch all games from both sections, return { open:[], womens:[], round, errors:[] } */
  async function fetchAll(onProgress) {
    const result = { open: [], womens: [], round: 0, errors: [] };
    const delay  = ms => new Promise(r => setTimeout(r, ms));

    const fetchSection = async (tourId, fallbackR1, label) => {
      const games = [];
      let rounds;
      try {
        rounds = await discoverRounds(tourId);
      } catch(e) {
        result.errors.push(`${label} round discovery failed: ${e.message}`);
        // Use fallback: just round 1
        rounds = fallbackR1 ? [{ round:1, id: fallbackR1 }] : [];
      }

      for (const r of rounds) {
        if (!r.id) continue;
        try {
          if (onProgress) onProgress(`${label} R${r.round}…`);
          const pgn   = await roundPgn(r.id);
          const gms   = PGN.parseMulti(pgn);
          gms.forEach(g => { if (!g.headers.Round) g.headers.Round = String(r.round); });
          games.push(...gms);
          await delay(200); // polite to Lichess
        } catch(e) {
          // 404 = round not published yet, skip silently
          if (!e.message.includes('404') && !e.message.includes('HTTP 4')) {
            result.errors.push(`${label} R${r.round}: ${e.message}`);
          }
        }
      }
      return games;
    };

    result.open   = await fetchSection(OPEN_TOUR_ID,   OPEN_R1_ID, 'Open');
    result.womens = await fetchSection(WOMENS_TOUR_ID, null,        "Women's");
    result.round  = Analyser.currentRound([...result.open, ...result.womens]);
    return result;
  }

  return { fetchAll, discoverRounds, roundPgn };
})();
