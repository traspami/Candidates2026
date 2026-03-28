/* ================================================================
   js/chess.js — Lightweight move replayer for geek rule detection.
   Detects: en passant, underpromotion, double queen, king excursion,
   castling move number, checkmate, pawn race (both sides promote).
   ================================================================ */
const Chess = (() => {
  const FILES = 'abcdefgh';
  const fileOf = s => s % 8;
  const rankOf = s => Math.floor(s / 8);
  const sq = (f, r) => r * 8 + f;
  const sqName = s => FILES[fileOf(s)] + (8 - rankOf(s));

  function nameToSq(n) {
    if (!n || n.length < 2) return -1;
    const f = FILES.indexOf(n[0]), r = 8 - parseInt(n[1]);
    return (f < 0 || isNaN(r) || r < 0 || r > 7) ? -1 : sq(f, r);
  }

  function fenToBoard(fen) {
    const board = new Array(64).fill(null);
    const rows = fen.split(' ')[0].split('/');
    let idx = 0;
    for (const row of rows)
      for (const ch of row)
        if (/\d/.test(ch)) idx += +ch; else board[idx++] = ch;
    return board;
  }

  function createState() {
    const board = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    return { board, turn: 'w', castling: 'KQkq', epSq: null,
             whiteKing: sq(4,7), blackKing: sq(4,0), halfMove: 0, fullMove: 1 };
  }

  function slideClear(board, from, to) {
    const sf = Math.sign(fileOf(to)-fileOf(from)), sr = Math.sign(rankOf(to)-rankOf(from));
    let f = fileOf(from)+sf, r = rankOf(from)+sr;
    while (f !== fileOf(to) || r !== rankOf(to)) {
      if (board[sq(f,r)] !== null) return false;
      f += sf; r += sr;
    }
    return true;
  }

  function canReach(board, from, to, pt, isWhite, epSq) {
    const df = fileOf(to)-fileOf(from), dr = rankOf(to)-rankOf(from);
    const adf = Math.abs(df), adr = Math.abs(dr);
    switch (pt) {
      case 'P': {
        const dir = isWhite ? -1 : 1;
        if (adf===1 && dr===dir) {
          const t = board[to];
          if (t && (isWhite ? t===t.toLowerCase() : t===t.toUpperCase())) return true;
          if (to === epSq) return true;
        }
        if (df===0 && dr===dir && !board[to]) return true;
        if (df===0 && dr===dir*2 && !board[to] && !board[sq(fileOf(from), rankOf(from)+dir)]) {
          const startRank = isWhite ? 6 : 1;
          return rankOf(from) === startRank;
        }
        return false;
      }
      case 'N': return (adf===2&&adr===1)||(adf===1&&adr===2);
      case 'B': return adf===adr && adf>0 && slideClear(board,from,to);
      case 'R': return (df===0||dr===0) && (df!==0||dr!==0) && slideClear(board,from,to);
      case 'Q': return ((adf===adr&&adf>0)||(df===0&&dr!==0)||(dr===0&&df!==0)) && slideClear(board,from,to);
      case 'K': return adf<=1 && adr<=1 && (adf+adr>0);
      default: return false;
    }
  }

  function findSrc(board, isWhite, pt, dest, disambig, epSq) {
    const piece = isWhite ? pt : pt.toLowerCase();
    const cands = [];
    for (let s = 0; s < 64; s++) {
      if (board[s] !== piece) continue;
      if (canReach(board, s, dest, pt, isWhite, epSq)) cands.push(s);
    }
    if (cands.length === 1) return cands[0];
    if (cands.length === 0) return -1;
    if (disambig) {
      const fc = disambig.match(/[a-h]/)?.[0];
      const rc = disambig.match(/[1-8]/)?.[0];
      const filtered = cands.filter(s =>
        (!fc || FILES[fileOf(s)] === fc) && (!rc || (8-rankOf(s)).toString() === rc));
      if (filtered.length === 1) return filtered[0];
    }
    return cands[0];
  }

  /* Returns event object describing what happened */
  function applyMove(state, san) {
    const ev = { enPassant:false, underpromotion:false, queenPromotion:false,
                 whitePromotion:false, blackPromotion:false,
                 castled:null, checkmate:false, kingCrossed5th:false };
    const { board, turn } = state;
    const isWhite = turn === 'w';

    if (san.endsWith('#')) ev.checkmate = true;

    // Castling
    const isCastle = san.startsWith('O-O') || san.startsWith('0-0');
    if (isCastle) {
      const long = san.startsWith('O-O-O') || san.startsWith('0-0-0');
      ev.castled = isWhite ? 'white' : 'black';
      if (isWhite) {
        board[sq(4,7)]=null; board[sq(7,7)]=null;
        board[long?sq(2,7):sq(6,7)]='K'; board[long?sq(3,7):sq(5,7)]='R';
        state.whiteKing = long ? sq(2,7) : sq(6,7);
        state.castling = state.castling.replace(/[KQ]/g,'');
      } else {
        board[sq(4,0)]=null; board[sq(7,0)]=null;
        board[long?sq(2,0):sq(6,0)]='k'; board[long?sq(3,0):sq(5,0)]='r';
        state.blackKing = long ? sq(2,0) : sq(6,0);
        state.castling = state.castling.replace(/[kq]/g,'');
      }
      state.turn = isWhite?'b':'w';
      state.epSq = null;
      if (!isWhite) state.fullMove++;
      return ev;
    }

    const clean = san.replace(/[+#!?]/g,'');
    const promoMatch = clean.match(/=([QRBN])$/);
    const promoteTo = promoMatch ? promoMatch[1] : null;
    if (promoteTo) {
      ev.underpromotion = promoteTo !== 'Q';
      ev.queenPromotion = promoteTo === 'Q';
      if (isWhite) ev.whitePromotion = true; else ev.blackPromotion = true;
    }

    // Destination square: last two chars of algebraic (before =PROMO)
    const withoutPromo = promoMatch ? clean.slice(0,-2) : clean;
    const destMatch = withoutPromo.match(/([a-h][1-8])$/);
    if (!destMatch) { state.turn=isWhite?'b':'w'; return ev; }
    const dest = nameToSq(destMatch[1]);
    if (dest < 0) { state.turn=isWhite?'b':'w'; return ev; }

    const isCapture = clean.includes('x');
    const ptRaw = /^[KQRBN]/.test(clean) ? clean[0] : 'P';
    const pt = ptRaw.toUpperCase();

    // Disambiguation: everything between piece letter and destination
    const midStr = withoutPromo.slice(pt==='P'?0:1).replace(/x/,'').replace(destMatch[1],'');

    const src = findSrc(board, isWhite, pt, dest, midStr, state.epSq);
    if (src < 0) { state.turn=isWhite?'b':'w'; return ev; }

    // En passant
    if (pt==='P' && isCapture && board[dest]===null) {
      ev.enPassant = true;
      board[sq(fileOf(dest), rankOf(src))] = null;
    }

    // New ep square
    state.epSq = (pt==='P' && Math.abs(rankOf(dest)-rankOf(src))===2)
      ? sq(fileOf(dest), (rankOf(src)+rankOf(dest))/2) : null;

    // Move
    const finalPiece = promoteTo
      ? (isWhite ? promoteTo.toUpperCase() : promoteTo.toLowerCase())
      : board[src];
    board[src] = null;
    board[dest] = finalPiece;

    // Update king position
    if (pt==='K') { if(isWhite) state.whiteKing=dest; else state.blackKing=dest; }

    // King crossed 5th rank (array rank: white rank5 = arrayRank 3, black rank5 = arrayRank 4)
    if (pt==='K') {
      const r = rankOf(dest);
      if (isWhite && r <= 3) ev.kingCrossed5th = true;   // chess rank >= 5
      if (!isWhite && r >= 4) ev.kingCrossed5th = true;  // chess rank <= 4 (opp half)
    }

    // Update castling rights
    if (pt==='K') state.castling = state.castling.replace(isWhite?/[KQ]/g:/[kq]/g,'');
    if (pt==='R') {
      if (src===sq(0,7)) state.castling=state.castling.replace('Q','');
      if (src===sq(7,7)) state.castling=state.castling.replace('K','');
      if (src===sq(0,0)) state.castling=state.castling.replace('q','');
      if (src===sq(7,0)) state.castling=state.castling.replace('k','');
    }

    state.turn = isWhite?'b':'w';
    if (!isWhite) state.fullMove++;
    return ev;
  }

  function countPiece(board, piece) { return board.filter(p=>p===piece).length; }

  /* Replay a full game, return array of per-move events */
  function replay(game) {
    const state = createState();
    const events = [];
    for (let i = 0; i < game.moves.length; i++) {
      const isWhite = i%2===0;
      const chessMove = Math.floor(i/2)+1;
      const wQBefore = countPiece(state.board,'Q');
      const bQBefore = countPiece(state.board,'q');
      let ev;
      try { ev = applyMove(state, game.moves[i]); }
      catch(e) { ev = { enPassant:false,underpromotion:false,queenPromotion:false,
                        whitePromotion:false,blackPromotion:false,castled:null,
                        checkmate:false,kingCrossed5th:false }; }
      ev.chessMove = chessMove;
      ev.isWhite   = isWhite;
      ev.wQueens   = countPiece(state.board,'Q');
      ev.bQueens   = countPiece(state.board,'q');
      ev.doubleQueen = (ev.wQueens >= 2 && wQBefore < 2) || (ev.bQueens >= 2 && bQBefore < 2);
      events.push(ev);
    }
    return events;
  }

  return { createState, applyMove, replay };
})();
