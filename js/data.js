/* ================================================================
   js/data.js  —  Picks, geek bets, player lists, scoring constants
   All 15 geek rules are 100% deterministic from PGN move data.
   ================================================================ */

const DATA = {

  /* ── YOUR PICKS — edit before Round 1 ─────────────────────── */
  JUANI: {
    open:   { '1st': 'Caruana',      '2nd': 'Nakamura',  '3rd': 'Praggnanandhaa' },
    womens: { '1st': 'Goryachkina',  '2nd': 'Muzychuk',  '3rd': 'Zhu Jiner'      },
    geek: {
      hot_hand:                  'Caruana',
      tilt:                      'Sindarov',
      pacifist:                  'Giri',
      philidor:                  true,
      en_passant_round:          2,
      underpromotion:            false,
      kings_hike:                true,
      castling_last:             'Bluebaum',
      double_queen:              false,
      checkmate:                 true,
      blitz_decisive:            false,
      marathon_decisive:         true,
      pawn_race:                 true,
      triple_repetition_blunder: true,
      last_round_decisive:       true,
    }
  },

  BRU: {
    open:   { '1st': 'Nakamura',     '2nd': 'Caruana',   '3rd': 'Giri'    },
    womens: { '1st': 'Goryachkina',  '2nd': 'Zhu Jiner', '3rd': 'Vaishali' },
    geek: {
      hot_hand:                  'Nakamura',
      tilt:                      'Esipenko',
      pacifist:                  'Caruana',
      philidor:                  false,
      en_passant_round:          4,
      underpromotion:            true,
      kings_hike:                false,
      castling_last:             'Nakamura',
      double_queen:              true,
      checkmate:                 false,
      blitz_decisive:            true,
      marathon_decisive:         false,
      pawn_race:                 false,
      triple_repetition_blunder: false,
      last_round_decisive:       false,
    }
  },

  GEEK_META: {
    hot_hand:                  { name: 'Hot Hand',             desc: 'Player with the longest consecutive win streak',                       type: 'player' },
    tilt:                      { name: 'On Tilt',              desc: 'Player with the longest consecutive loss streak',                      type: 'player' },
    pacifist:                  { name: 'The Pacifist',         desc: 'Most draws overall — Giri is ineligible',                             type: 'player' },
    philidor:                  { name: 'Philidor Sighting',    desc: 'Philidor Defence played — detected via Opening/ECO header',           type: 'bool'   },
    en_passant_round:          { name: 'First En Passant',     desc: 'Round (1–14) of the first en passant capture',                        type: 'round'  },
    underpromotion:            { name: 'Disrespect Move',      desc: 'A pawn promotes to knight, bishop or rook (=N/=B/=R in notation)',    type: 'bool'   },
    kings_hike:                { name: "King's Excursion",     desc: "King crosses to opponent's half before move 40",                      type: 'bool'   },
    castling_last:             { name: 'Castling Holdout',     desc: 'Player who castles at the highest move number across all their games', type: 'player' },
    double_queen:              { name: 'Second Queen',         desc: 'Two queens of same colour on the board simultaneously',               type: 'bool'   },
    checkmate:                 { name: 'Actual Checkmate',     desc: 'A game ends with checkmate on the board (# on final move)',           type: 'bool'   },
    blitz_decisive:            { name: 'Blitz Game',           desc: 'A decisive game ends in under 25 moves',                             type: 'bool'   },
    marathon_decisive:         { name: 'The Marathon',         desc: 'A decisive game lasts more than 90 moves',                           type: 'bool'   },
    pawn_race:                 { name: 'Pawn Race',            desc: 'Both sides promote a pawn in the same game',                         type: 'bool'   },
    triple_repetition_blunder: { name: 'The Blunder Draw',     desc: 'A draw by repetition noted in PGN comments of a decisive-looking game', type: 'bool' },
    last_round_decisive:       { name: 'Last Round Drama',     desc: 'At least one decisive result in Round 14',                           type: 'bool'   },
  },

  PLAYERS_OPEN: [
    { name: 'Caruana',        full: 'Fabiano Caruana',        flag: 'USA',  rating: 2795 },
    { name: 'Nakamura',       full: 'Hikaru Nakamura',        flag: 'USA',  rating: 2810 },
    { name: 'Giri',           full: 'Anish Giri',             flag: 'NED',  rating: 2753 },
    { name: 'Praggnanandhaa', full: 'R Praggnanandhaa',       flag: 'IND',  rating: 2741 },
    { name: 'Wei Yi',         full: 'Wei Yi',                 flag: 'CHN',  rating: 2754 },
    { name: 'Sindarov',       full: 'Javokhir Sindarov',      flag: 'UZB',  rating: 2745 },
    { name: 'Esipenko',       full: 'Andrey Esipenko',        flag: 'FIDE', rating: 2698 },
    { name: 'Bluebaum',       full: 'Matthias Bluebaum',      flag: 'GER',  rating: 2698 },
  ],

  PLAYERS_WOMENS: [
    { name: 'Goryachkina',    full: 'Aleksandra Goryachkina', flag: 'FIDE', rating: 2534 },
    { name: 'Zhu Jiner',      full: 'Zhu Jiner',              flag: 'CHN',  rating: 2578 },
    { name: 'Tan Zhongyi',    full: 'Tan Zhongyi',            flag: 'CHN',  rating: 2535 },
    { name: 'Lagno',          full: 'Kateryna Lagno',         flag: 'FIDE', rating: 2515 },
    { name: 'Vaishali',       full: 'Vaishali Rameshbabu',    flag: 'IND',  rating: 2470 },
    { name: 'Divya',          full: 'Divya Deshmukh',         flag: 'IND',  rating: 2497 },
    { name: 'Assaubayeva',    full: 'Bibisara Assaubayeva',   flag: 'KAZ',  rating: 2490 },
    { name: 'Muzychuk',       full: 'Anna Muzychuk',          flag: 'UKR',  rating: 2523 },
  ],

  OPEN_EXACT:  [25, 15, 10],
  OPEN_CONSOL: [ 5,  5,  5],
  WOM_EXACT:   [10,  6,  4],
  WOM_CONSOL:  [ 2,  2,  2],
  GEEK_PTS:    2,

  LICHESS: {
    OPEN_TOUR_ID:   'BLA70Vds',
    WOMENS_TOUR_ID: 'xj4qM8Nw',
    OPEN_R1_ID:     'uLCZwqAK',
    WOMENS_R1_ID:   null,
  },
};
