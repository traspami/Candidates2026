/* ================================================================
   js/pgn.js — PGN parser. No dependencies.
   ================================================================ */
const PGN = (() => {
  function parseMulti(text) {
    if (!text || !text.trim()) return [];
    const games = [];
    // Split on lines that start a new game header block
    const chunks = text.split(/\n(?=\[Event )/);
    for (const chunk of chunks) {
      const g = parseOne(chunk.trim());
      if (g && (g.headers.White || g.headers.Black)) games.push(g);
    }
    return games;
  }

  function parseOne(text) {
    if (!text) return null;
    const headers = {};
    const headerRe = /\[(\w+)\s+"([^"]*)"\]/g;
    let m;
    while ((m = headerRe.exec(text)) !== null) headers[m[1]] = m[2];
    const moveText = text.replace(/\[\w+\s+"[^"]*"\]\s*/g, '').trim();
    const moves = parseMoves(moveText);
    return { headers, moves, raw: moveText };
  }

  function parseMoves(text) {
    // Strip nested variations (up to 3 deep)
    let s = text;
    for (let i = 0; i < 4; i++) s = s.replace(/\([^()]*\)/g, '');
    s = s
      .replace(/\{[^}]*\}/g, ' ')   // comments
      .replace(/\$\d+/g, '')        // NAGs
      .replace(/\d+\.+/g, '')       // move numbers
      .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '') // result
      .replace(/\s+/g, ' ').trim();
    return s.split(' ').filter(t => t && /^[a-zA-Z]/.test(t) && !t.match(/^\d/));
  }

  const result = g => g.headers.Result || '*';
  const moveCount = g => Math.ceil(g.moves.length / 2);
  const isDecisive = g => { const r = result(g); return r === '1-0' || r === '0-1'; };
  const isDraw = g => result(g) === '1/2-1/2';
  const isFinished = g => isDecisive(g) || isDraw(g);
  const winner = g => { const r = result(g); return r === '1-0' ? g.headers.White : r === '0-1' ? g.headers.Black : null; };
  const loser  = g => { const r = result(g); return r === '1-0' ? g.headers.Black : r === '0-1' ? g.headers.White : null; };

  return { parseMulti, parseOne, parseMoves, result, moveCount, isDecisive, isDraw, isFinished, winner, loser };
})();
