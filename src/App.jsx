import { useState, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const BOARD_T = 1.5;   // actual 2x4 thickness
const BOARD_W = 3.5;   // actual 2x4 width
const GAP_SIDE  = 0.1875;  // 3/16" side clearance → bayW = toteW + 2×GAP_SIDE = 20.625"
const GAP_HEAD  = 2;
const GAP_FRONT = 0.125;   // 1/8" front clearance ↘ runner = toteL + GAP_FRONT + GAP_BACK = 30.5"
const GAP_BACK  = 0.125;   // 1/8" back clearance  ↗
const STD_LENGTHS = [96, 120, 144, 192];

// ─── Price Table ──────────────────────────────────────────────────────────────
const PRICE_TABLE = {
  1: { 2: 60,  3: 100, 4: 110, 5: 140 },
  2: { 2: 100, 3: 150, 4: 180, 5: 210 },
  3: { 2: 150, 3: 200, 4: 230, 5: 270 },
  4: { 2: 180, 3: 230, 4: 280, 5: 300 },
  5: { 2: 210, 3: 270, 4: 300, 5: 340 },
};

function lookupPrice(cols, rows) {
  const cc = Math.max(1, Math.min(5, cols));
  const cr = Math.max(2, Math.min(5, rows));
  let base = PRICE_TABLE[cc][cr];
  if (cols > 5) base += (PRICE_TABLE[5][cr] - PRICE_TABLE[4][cr]) * (cols - 5);
  if (rows > 5) base += (PRICE_TABLE[cc][5] - PRICE_TABLE[cc][4]) * (rows - 5);
  if (rows === 1) base -= (PRICE_TABLE[cc][3] - PRICE_TABLE[cc][2]);
  const exact = cols >= 1 && cols <= 5 && rows >= 2 && rows <= 5;
  return { price: Math.max(20, Math.round(base / 5) * 5), exact };
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n) {
  if (typeof n !== "number" || isNaN(n)) return '–"';
  const whole = Math.floor(n);
  const frac = n - whole;
  const fracs = [[1,2],[1,4],[3,4],[1,8],[3,8],[5,8],[7,8],[1,16],[3,16],[5,16],[7,16],[9,16],[11,16],[13,16],[15,16]];
  let best = null, bestDist = 0.02;
  for (const [num, den] of fracs) {
    const d = Math.abs(frac - num / den);
    if (d < bestDist) { bestDist = d; best = `${num}/${den}`; }
  }
  if (best) return whole > 0 ? `${whole} ${best}"` : `${best}"`;
  return `${n.toFixed(2)}"`;
}
function fmtFt(inches) {
  if (typeof inches !== "number" || isNaN(inches)) return "–";
  const ft = Math.floor(inches / 12), rem = inches % 12;
  return rem < 0.1 ? `${ft}'` : `${ft}' ${fmt(rem)}`;
}
function fmtMoney(n) {
  const v = typeof n === "number" && !isNaN(n) ? Math.round(n) : 0;
  return `$${v.toLocaleString()}`;
}
function safeFixed(n, d = 1) {
  return typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "0";
}

// ─── Calculation Engine ───────────────────────────────────────────────────────
function calculate(cols, rows, tote) {
  const tL = parseFloat(tote.length) || 0;
  const tW = parseFloat(tote.width)  || 0;
  const tH = parseFloat(tote.height) || 0;

  const bayW        = tW + 2 * GAP_SIDE;
  const bayH        = tH + GAP_HEAD + BOARD_T;
  const rackDepth   = tL + GAP_FRONT + GAP_BACK + 2 * BOARD_T;
  const totalWidth  = cols * bayW + (cols + 1) * BOARD_T;
  const totalHeight = rows * bayH + BOARD_T;
  const runnerLen   = Math.max(1, rackDepth - 2 * BOARD_T);

  const cuts = [
    { label: "Vertical Posts",         desc: "Front & back legs",                                           qty: 2*(cols+1), length: totalHeight, note: "Full height" },
    { label: "Front Horizontal Rails", desc: "Top & bottom frame rails, front face",                        qty: 2,          length: totalWidth,  note: "Full width" },
    { label: "Back Horizontal Rails",  desc: "Top & bottom frame rails, back face",                         qty: 2,          length: totalWidth,  note: "Full width" },
    { label: "Runners",                desc: "Run front-to-back per bay — tote lips rest on these",         qty: 2*cols*rows, length: runnerLen,  note: "1 per outer post face, 2 per inner" },
  ];

  const lumberDetails = {};
  cuts.forEach(cut => {
    const bestLen        = STD_LENGTHS.find(l => l >= cut.length) || STD_LENGTHS[STD_LENGTHS.length - 1];
    const piecesPerBoard = Math.max(1, Math.floor(bestLen / cut.length));
    const boardsNeeded   = Math.ceil(cut.qty / piecesPerBoard);
    lumberDetails[cut.label] = { ...cut, boardFt: bestLen / 12, piecesPerBoard, boardsNeeded };
  });

  const lumberTally = {};
  Object.values(lumberDetails).forEach(b => {
    const k = String(b.boardFt);
    lumberTally[k] = (lumberTally[k] || 0) + b.boardsNeeded;
  });

  const totalBoards = Object.values(lumberDetails).reduce((s, b) => s + b.boardsNeeded, 0);
  const totalLinFt  = cuts.reduce((s, c) => s + c.qty * c.length, 0) / 12;
  const boardFeet   = cuts.reduce((s, c) => s + c.qty * (2 * 4 * (c.length / 12)) / 12, 0);

  return { totalWidth, totalHeight, rackDepth, bayW, bayH, runnerLen,
           cuts, lumber: { details: lumberDetails, tally: lumberTally, totalBoards },
           totalLinFt, boardFeet, toteL: tL, toteH: tH };
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#0A0E14", surface:"#0F1923", border:"#1E2D3D", borderAlt:"#162030",
  blue:"#3B9EFF", blueDim:"#1D6FD8", blueDark:"#0F2744",
  text:"#CBD5E1", textDim:"#A8BDD0", textMuted:"#8BA4BC", white:"#E2EAF4", slate:"#334155",
  green:"#22C55E", greenDark:"#0D2A15", greenDim:"#166534",
  red:"#EF4444", redDark:"#2D0A0A", yellow:"#EAB308",
  runner:"#2DD4BF", runnerDim:"#0E7490",
};

// ─── Diagram colors (match reference image) ───────────────────────────────────
const D = {
  bg:      "#F5F0E8",   // cream/off-white background
  wood:    "#C4955A",   // tan/wood color for posts & rails
  woodDk:  "#9C7040",   // darker wood grain shadow
  tote:    "#8A9BAE",   // gray-blue for tote bodies
  toteDk:  "#6B7A8D",   // tote border
  lip:     "#F0C040",   // yellow/amber for runner lip strips (matches reference)
  lipDk:   "#D4A020",   // lip border
  dim:     "#1D4ED8",   // blue for dimension lines
  label:   "#374151",   // dark gray labels
  faint:   "#9CA3AF",   // faint lines
};

// ─── SVG: Front Elevation ─────────────────────────────────────────────────────
// Runners run FRONT-TO-BACK. From the front you see only the END of each runner:
// a small rectangle on the inner face of each post at each row level.
// Two runner ends visible per bay (left side + right side).
// The yellow tote lid rests on top of those two runner ends.
// Stack per bay, top to bottom:
//   2" gap (GAP_HEAD)
//   Tote lid — yellow, spans bay width, rests on runner ends
//   Runner ends — two small wood rectangles (BOARD_T wide × BOARD_W tall), one each side
//   Tote body — gray, hangs below runners
function FrontDiagram({ cols, rows, dims }) {
  const { bayW, bayH, totalWidth, totalHeight } = dims;

  const LID_H      = 2.0;              // tote lid height (inches)
  const RUN_END_W  = BOARD_T;          // runner end width = 1.5" (same as post thickness)
  const RUN_END_H  = BOARD_W;          // runner end height = 3.5" (2x4 lying flat, face-on)

  const PAD_L = 28, PAD_R = 72, PAD_T = 50, PAD_B = 38;
  const SCALE = Math.min((540 - PAD_L - PAD_R) / totalWidth, (400 - PAD_T - PAD_B) / totalHeight);
  const svgW  = totalWidth * SCALE + PAD_L + PAD_R;
  const svgH  = totalHeight * SCALE + PAD_T + PAD_B;
  const px    = x => PAD_L + x * SCALE;
  const py    = y => svgH - PAD_B - y * SCALE;
  const fs    = Math.max(7, Math.min(10, SCALE * 1.0));

  // For row r: lid bottom = where lid meets body AND where runners support from below
  const pos = r => {
    const lidTop    = (r + 1) * bayH - GAP_HEAD;   // 2" below crossbeam above
    const lidBot    = lidTop - LID_H;               // lid bottom = body top = runner support level
    const runEndTop = lidBot;                       // runner top surface supports the lid
    const runEndBot = runEndTop - RUN_END_H;
    const bodyTop   = lidBot;                       // body attaches DIRECTLY to lid bottom
    const bodyBot   = bodyTop - (dims.toteH - LID_H); // body height = toteH minus lid
    return { lidTop, lidBot, runEndTop, runEndBot, bodyTop, bodyBot };
  };

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:"100%", maxWidth:600, borderRadius:6, overflow:"hidden" }}>
      <rect width={svgW} height={svgH} fill={D.bg}/>

      {/* LAYER 1 — Tote bodies (gray) */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (__, c) => {
          const { bodyTop, bodyBot } = pos(r);
          const bayLeft   = c * (bayW + BOARD_T) + BOARD_T;
          const bodyInset = GAP_SIDE + 0.5;
          const h = Math.max(0.5, bodyTop - bodyBot);
          return (
            <rect key={`body-${r}-${c}`}
              x={px(bayLeft + bodyInset)} y={py(bodyTop)}
              width={(bayW - 2*bodyInset) * SCALE} height={h * SCALE}
              fill={D.tote} stroke={D.toteDk} strokeWidth={0.8} rx={1}/>
          );
        })
      )}

      {/* LAYER 2 — Runner ends: TWO small rectangles per bay, one each side.
          These are the front ends of the front-to-back runners sitting on the
          inner post faces. The yellow lid rests on top of them. */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (__, c) => {
          const { runEndTop, runEndBot } = pos(r);
          const bayLeft = c * (bayW + BOARD_T) + BOARD_T;
          const h = (runEndTop - runEndBot) * SCALE;
          return (
            <g key={`runners-${r}-${c}`}>
              {/* Left runner end — on inner face of left post */}
              <rect
                x={px(bayLeft)} y={py(runEndTop)}
                width={RUN_END_W * SCALE} height={h}
                fill={D.woodDk} stroke="#5C3A10" strokeWidth={0.7}/>
              {/* Right runner end — on inner face of right post */}
              <rect
                x={px(bayLeft + bayW - RUN_END_W)} y={py(runEndTop)}
                width={RUN_END_W * SCALE} height={h}
                fill={D.woodDk} stroke="#5C3A10" strokeWidth={0.7}/>
            </g>
          );
        })
      )}

      {/* LAYER 3 — Tote lids (yellow, rests on top of runner ends) */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (__, c) => {
          const { lidTop } = pos(r);
          const bayLeft  = c * (bayW + BOARD_T) + BOARD_T;
          const lidInset = GAP_SIDE * 0.25;
          return (
            <rect key={`lid-${r}-${c}`}
              x={px(bayLeft + lidInset)} y={py(lidTop)}
              width={(bayW - 2*lidInset) * SCALE} height={LID_H * SCALE}
              fill={D.lip} stroke={D.lipDk} strokeWidth={0.9} rx={1}/>
          );
        })
      )}

      {/* LAYER 4 — Posts: wood, drawn IN FRONT covering runner end edges */}
      {Array.from({ length: cols + 1 }, (_, c) => {
        const postX = c * (bayW + BOARD_T);
        return (
          <g key={`post-${c}`}>
            <rect x={px(postX)} y={py(totalHeight)} width={BOARD_T*SCALE} height={totalHeight*SCALE} fill={D.wood}/>
            <line x1={px(postX + BOARD_T*0.35)} y1={py(totalHeight)} x2={px(postX + BOARD_T*0.35)} y2={py(0)}
              stroke={D.woodDk} strokeWidth={0.5} opacity={0.35}/>
          </g>
        );
      })}

      {/* LAYER 5 — Top and bottom rails */}
      <rect x={px(0)} y={py(totalHeight)} width={totalWidth*SCALE} height={BOARD_T*SCALE} fill={D.wood} stroke={D.woodDk} strokeWidth={0.6}/>
      <rect x={px(0)} y={py(BOARD_T)}     width={totalWidth*SCALE} height={BOARD_T*SCALE} fill={D.wood} stroke={D.woodDk} strokeWidth={0.6}/>

      {/* Dimension: total width */}
      <line x1={px(0)} y1={py(totalHeight)-16} x2={px(totalWidth)} y2={py(totalHeight)-16} stroke={D.dim} strokeWidth={1}/>
      <line x1={px(0)} y1={py(totalHeight)-20} x2={px(0)} y2={py(totalHeight)-12} stroke={D.dim} strokeWidth={1}/>
      <line x1={px(totalWidth)} y1={py(totalHeight)-20} x2={px(totalWidth)} y2={py(totalHeight)-12} stroke={D.dim} strokeWidth={1}/>
      <text x={(px(0)+px(totalWidth))/2} y={py(totalHeight)-21} fill={D.dim} fontSize={fs} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
        {fmt(totalWidth)} wide
      </text>

      {/* Dimension: total height */}
      <line x1={px(totalWidth)+16} y1={py(0)} x2={px(totalWidth)+16} y2={py(totalHeight)} stroke={D.dim} strokeWidth={1}/>
      <line x1={px(totalWidth)+12} y1={py(0)} x2={px(totalWidth)+20} y2={py(0)} stroke={D.dim} strokeWidth={1}/>
      <line x1={px(totalWidth)+12} y1={py(totalHeight)} x2={px(totalWidth)+20} y2={py(totalHeight)} stroke={D.dim} strokeWidth={1}/>
      <text x={px(totalWidth)+30} y={(py(0)+py(totalHeight))/2} fill={D.dim} fontSize={fs} fontFamily="monospace" fontWeight="bold"
        transform={`rotate(90,${px(totalWidth)+30},${(py(0)+py(totalHeight))/2})`} textAnchor="middle">
        {fmt(totalHeight)} tall
      </text>

      {/* Bay width callout */}
      {cols >= 1 && (() => {
        const x1 = px(BOARD_T), x2 = px(BOARD_T+bayW), y = py(0)+16;
        return (
          <g>
            <line x1={x1} y1={y-3} x2={x2} y2={y-3} stroke={D.faint} strokeWidth={0.7}/>
            <line x1={x1} y1={y-6} x2={x1} y2={y} stroke={D.faint} strokeWidth={0.7}/>
            <line x1={x2} y1={y-6} x2={x2} y2={y} stroke={D.faint} strokeWidth={0.7}/>
            <text x={(x1+x2)/2} y={y+10} fill={D.faint} fontSize={Math.max(7,fs-1)} textAnchor="middle" fontFamily="monospace">
              {fmt(bayW)} bay
            </text>
          </g>
        );
      })()}

      {/* Column + row labels */}
      {Array.from({ length: cols }, (_, c) => (
        <text key={c} x={px(c*(bayW+BOARD_T)+BOARD_T+bayW/2)} y={svgH-6}
          fill={D.label} fontSize={Math.max(7,fs-1)} textAnchor="middle" fontFamily="monospace">C{c+1}</text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={r} x={PAD_L-5} y={py(r*bayH + bayH/2)}
          fill={D.label} fontSize={Math.max(7,fs-1)} textAnchor="end" fontFamily="monospace">R{r+1}</text>
      ))}

      <text x={svgW/2} y={18} fill={D.label} fontSize={9} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
        FRONT ELEVATION
      </text>
    </svg>
  );
}

// ─── Shared row position helper (matches FrontDiagram geometry exactly) ───────
const DIAG_LID_H = 2.0;
function rPos(r, bayH, toteH) {
  const lidTop = (r + 1) * bayH - GAP_HEAD;
  const lidBot = lidTop - DIAG_LID_H;
  return {
    lidTop, lidBot,
    runTop: lidBot,               // runner top = lid bottom (lid rests on runner)
    runBot: lidBot - BOARD_W,     // runner is 3.5" tall (on edge)
    bodyBot: lidBot - (toteH - DIAG_LID_H)
  };
}

// ─── SVG: Side Elevation ──────────────────────────────────────────────────────
// Looking from the side. Horizontal axis = depth (front→back), vertical = height.
// The runner is a full-depth board (BOARD_W tall) spanning between the two posts.
// The tote lid rests on the runner's top surface. Tote body hangs below.
// Draw order: totes → runners (over totes) → posts (in front of everything).
function SideDiagram({ rows, dims }) {
  const { bayH, rackDepth, totalHeight, toteL, toteH } = dims;
  const PAD_L = 24, PAD_R = 68, PAD_T = 44, PAD_B = 28;
  const SCALE = Math.min((440 - PAD_L - PAD_R) / rackDepth, (380 - PAD_T - PAD_B) / totalHeight);
  const svgW  = rackDepth * SCALE + PAD_L + PAD_R;
  const svgH  = totalHeight * SCALE + PAD_T + PAD_B;
  const pz    = z => PAD_L + z * SCALE;   // depth → x on screen
  const py    = y => svgH - PAD_B - y * SCALE;
  const fs    = Math.max(7, Math.min(10, SCALE * 1.0));

  const z0 = BOARD_T + GAP_FRONT;   // tote front edge (world depth)
  const z1 = z0 + toteL;            // tote back edge

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:"100%", maxWidth:500, borderRadius:6, overflow:"hidden" }}>
      <rect width={svgW} height={svgH} fill={D.bg}/>

      {/* LAYER 1 — Tote bodies (gray, below runner) */}
      {Array.from({ length: rows }, (_, r) => {
        const { lidTop, lidBot, bodyBot } = rPos(r, bayH, toteH);
        return (
          <rect key={`tbody-${r}`}
            x={pz(z0)} y={py(lidBot)}
            width={toteL * SCALE} height={(lidBot - bodyBot) * SCALE}
            fill={D.tote} stroke={D.toteDk} strokeWidth={0.8} rx={1}/>
        );
      })}

      {/* LAYER 2 — Tote lids (yellow, resting on top of runner) */}
      {Array.from({ length: rows }, (_, r) => {
        const { lidTop, lidBot } = rPos(r, bayH, toteH);
        return (
          <rect key={`tlid-${r}`}
            x={pz(z0)} y={py(lidTop)}
            width={toteL * SCALE} height={DIAG_LID_H * SCALE}
            fill={D.lip} stroke={D.lipDk} strokeWidth={0.8} rx={1}/>
        );
      })}

      {/* LAYER 3 — Runners: full-depth boards spanning front post to back post.
          Runner sits BELOW the lid. Lid rests on runner's top surface.
          runTop = lidBot, so the runner starts where the lid ends. */}
      {Array.from({ length: rows }, (_, r) => {
        const { runBot } = rPos(r, bayH, toteH);
        const { lidBot } = rPos(r, bayH, toteH);  // runTop === lidBot
        return (
          <rect key={`runner-${r}`}
            x={pz(BOARD_T)} y={py(lidBot)}
            width={(rackDepth - 2*BOARD_T) * SCALE} height={BOARD_W * SCALE}
            fill={D.woodDk} stroke="#5C3A10" strokeWidth={0.9}/>
        );
      })}

      {/* LAYER 4 — Front post (left on screen) */}
      <rect x={pz(0)} y={py(totalHeight)} width={BOARD_T*SCALE} height={totalHeight*SCALE} fill={D.wood} stroke={D.woodDk} strokeWidth={0.5}/>
      {/* LAYER 4 — Back post (right on screen) */}
      <rect x={pz(rackDepth-BOARD_T)} y={py(totalHeight)} width={BOARD_T*SCALE} height={totalHeight*SCALE} fill={D.wood} stroke={D.woodDk} strokeWidth={0.5}/>

      {/* Top and bottom rail cross-sections on posts */}
      {[0, rackDepth-BOARD_T].map((z, i) => (
        <g key={i}>
          <rect x={pz(z)} y={py(totalHeight)} width={BOARD_T*SCALE} height={BOARD_T*SCALE} fill={D.woodDk}/>
          <rect x={pz(z)} y={py(BOARD_T)}     width={BOARD_T*SCALE} height={BOARD_T*SCALE} fill={D.woodDk}/>
        </g>
      ))}

      {/* Dimension: depth */}
      <line x1={pz(0)} y1={py(totalHeight)-14} x2={pz(rackDepth)} y2={py(totalHeight)-14} stroke={D.dim} strokeWidth={1}/>
      <line x1={pz(0)} y1={py(totalHeight)-18} x2={pz(0)} y2={py(totalHeight)-10} stroke={D.dim} strokeWidth={1}/>
      <line x1={pz(rackDepth)} y1={py(totalHeight)-18} x2={pz(rackDepth)} y2={py(totalHeight)-10} stroke={D.dim} strokeWidth={1}/>
      <text x={(pz(0)+pz(rackDepth))/2} y={py(totalHeight)-19} fill={D.dim} fontSize={fs} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
        {fmt(rackDepth)} deep
      </text>

      {/* Dimension: height */}
      <line x1={pz(rackDepth)+14} y1={py(0)} x2={pz(rackDepth)+14} y2={py(totalHeight)} stroke={D.dim} strokeWidth={1}/>
      <line x1={pz(rackDepth)+10} y1={py(0)} x2={pz(rackDepth)+18} y2={py(0)} stroke={D.dim} strokeWidth={1}/>
      <line x1={pz(rackDepth)+10} y1={py(totalHeight)} x2={pz(rackDepth)+18} y2={py(totalHeight)} stroke={D.dim} strokeWidth={1}/>
      <text x={pz(rackDepth)+28} y={(py(0)+py(totalHeight))/2} fill={D.dim} fontSize={fs} fontFamily="monospace" fontWeight="bold"
        transform={`rotate(90,${pz(rackDepth)+28},${(py(0)+py(totalHeight))/2})`} textAnchor="middle">
        {fmt(totalHeight)} tall
      </text>

      {/* Runner length callout */}
      {rows > 0 && (() => {
        const { lidTop } = rPos(0, bayH, toteH);
        const y = py(lidTop) - 10;
        return (
          <g>
            <line x1={pz(BOARD_T)} y1={y} x2={pz(rackDepth-BOARD_T)} y2={y} stroke={D.faint} strokeWidth={0.7}/>
            <line x1={pz(BOARD_T)} y1={y-3} x2={pz(BOARD_T)} y2={y+3} stroke={D.faint} strokeWidth={0.7}/>
            <line x1={pz(rackDepth-BOARD_T)} y1={y-3} x2={pz(rackDepth-BOARD_T)} y2={y+3} stroke={D.faint} strokeWidth={0.7}/>
            <text x={(pz(BOARD_T)+pz(rackDepth-BOARD_T))/2} y={y-4} fill={D.faint} fontSize={Math.max(7,fs-1)} textAnchor="middle" fontFamily="monospace">
              {fmt(dims.runnerLen)} runner
            </text>
          </g>
        );
      })()}

      <text x={svgW/2} y={18} fill={D.label} fontSize={9} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
        SIDE ELEVATION
      </text>
    </svg>
  );
}

// ─── UI Primitives ────────────────────────────────────────────────────────────
const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px" };
const cardHead = { fontSize:9, letterSpacing:3, color:C.textDim, borderBottom:`1px solid ${C.borderAlt}`, paddingBottom:8 };

function Spinner({ label, value, min, max, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span style={{ fontSize:12, color:C.textDim }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {[[-1,"−"],[1,"+"]].map(([d,sym],i) => (
          <button key={i} onClick={() => onChange(Math.min(max, Math.max(min, value+d)))} style={{
            background:C.surface, border:`1px solid ${C.border}`, color:C.blue,
            width:30, height:30, borderRadius:5, cursor:"pointer", fontSize:18, fontFamily:"monospace",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>{sym}</button>
        ))}
        <div style={{ width:28, textAlign:"center", fontSize:20, color:C.white, fontWeight:"bold", fontFamily:"monospace" }}>{value}</div>
      </div>
    </div>
  );
}

function InchInput({ label, value, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:11, color:C.textDim, flex:1 }}>{label}</span>
      <input type="number" step="0.125" value={value} onChange={e => onChange(e.target.value)} style={{
        width:72, background:"#060D16", border:`1px solid ${C.border}`, color:C.blue,
        padding:"5px 7px", borderRadius:5, fontSize:13, fontFamily:"monospace", textAlign:"right",
      }}/>
      <span style={{ fontSize:11, color:C.textMuted }}>"</span>
    </div>
  );
}

function MoneyInput({ label, value, onChange, highlight=false, sublabel=null, narrow=false }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, color:C.textDim }}>{label}</div>
        {sublabel && <div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>{sublabel}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ fontSize:13, color:C.textMuted }}>$</span>
        <input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)} style={{
          width: narrow ? 56 : 72, background:"#060D16",
          border:`1px solid ${highlight ? C.blueDim : C.border}`,
          color: highlight ? C.blue : C.text,
          padding:"5px 7px", borderRadius:5, fontSize:13, fontFamily:"monospace", textAlign:"right",
        }}/>
      </div>
    </div>
  );
}

function Toggle({ label, sublabel, checked, onChange, charge }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
      background: checked ? C.blueDark : "#060D16",
      border:`1px solid ${checked ? C.blueDim : C.border}`,
      borderRadius:6, cursor:"pointer" }}
      onClick={() => onChange(!checked)}>
      <div style={{ width:22, height:22, borderRadius:4, border:`2px solid ${checked ? C.blue : C.slate}`,
        background: checked ? C.blue : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {checked && <span style={{ color:"#000", fontSize:13, fontWeight:"bold" }}>✓</span>}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, color: checked ? C.white : C.text }}>{label}</div>
        {sublabel && <div style={{ fontSize:10, color:C.textDim, marginTop:1 }}>{sublabel}</div>}
      </div>
      <div style={{ fontSize:14, color: checked ? C.green : C.textDim, fontWeight:"bold" }}>+${charge}</div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:3, marginBottom:16, overflowX:"auto", paddingBottom:2 }}>
      {tabs.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)} style={{
          background: active===id ? C.blueDark : "transparent",
          border:`1px solid ${active===id ? C.blueDim : C.border}`,
          color: active===id ? C.blue : C.textDim,
          padding:"7px 13px", borderRadius:5, fontSize:11, cursor:"pointer",
          fontFamily:"monospace", letterSpacing:1, whiteSpace:"nowrap",
        }}>{label}</button>
      ))}
    </div>
  );
}

function ProfitBar({ profit, total }) {
  if (!total || total <= 0) return null;
  const pct = Math.max(0, Math.min(100, (profit / total) * 100));
  const color = profit < 0 ? C.red : pct < 20 ? C.yellow : C.green;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:10, color:C.textDim }}>MARGIN</span>
        <span style={{ fontSize:10, color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height:6, background:C.borderAlt, borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.3s" }}/>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
let nextId = 1;

export default function ToteRackConfigurator() {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [tote, setTote] = useState({ length:30.25, width:20.25, height:14.125 });
  const [tab,  setTab]  = useState("dims");

  // Pricing
  const [priceOverride,    setPriceOverride]    = useState("");
  const [boardPrices,      setBoardPrices]      = useState({ 8:3.75, 10:4.75, 12:5.50, 16:7.00 });
  const [lumberChoices,    setLumberChoices]    = useState({});  // cut label → chosen ft
  const [materialOverride, setMaterialOverride]  = useState("");
  const [hoursToSell,      setHoursToSell]       = useState(3);
  const [deliveryCharge,   setDeliveryCharge]    = useState(0);
  const [addWheels,        setAddWheels]         = useState(false);
  const [wheelCost,        setWheelCost]         = useState(40);
  const [addPlywood,       setAddPlywood]        = useState(false);
  const [plywoodCost,      setPlywoodCost]       = useState(40);
  const [screwBoxCost,     setScrewBoxCost]      = useState(50);     // ← updated default
  const [buildsPerBox,     setBuildsPerBox]      = useState(5);

  // Custom buy-list items: { id, name, qty, unitCost }
  const [customItems, setCustomItems] = useState([]);

  const dims = useMemo(() => calculate(cols, rows, tote), [cols, rows, tote]);
  const updateTote = (f, v) => setTote(p => ({ ...p, [f]: v }));

  // Per-cut lumber analysis: all viable board lengths with cost comparison
  const STD_FT = [8, 10, 12, 16];
  const lumberAnalysis = useMemo(() => {
    return dims.cuts.map(cut => {
      const options = STD_FT.map(ft => {
        const lenIn = ft * 12;
        if (lenIn < cut.length) return null;
        const piecesPerBoard = Math.floor(lenIn / cut.length);
        const boardsNeeded   = Math.ceil(cut.qty / piecesPerBoard);
        const price          = parseFloat(boardPrices[ft]) || 0;
        const cost           = boardsNeeded * price;
        return { ft, piecesPerBoard, boardsNeeded, price, cost };
      }).filter(Boolean);
      // cheapest option by total cost (tie-break: fewest boards)
      const cheapest = options.reduce((best, o) =>
        o.cost < best.cost || (o.cost === best.cost && o.boardsNeeded < best.boardsNeeded) ? o : best
      , options[0]);
      const chosenFt = lumberChoices[cut.label] ?? cheapest?.ft;
      const chosen   = options.find(o => o.ft === chosenFt) || options[0];
      return { ...cut, options, chosen, cheapest };
    });
  }, [dims.cuts, boardPrices, lumberChoices]);

  // Order summary tally from chosen lengths
  const lumberTally = useMemo(() => {
    const tally = {};
    lumberAnalysis.forEach(item => {
      if (!item.chosen) return;
      const k = item.chosen.ft;
      tally[k] = (tally[k] || 0) + item.chosen.boardsNeeded;
    });
    return tally;
  }, [lumberAnalysis]);

  const { price: tablePrice, exact: priceExact } = useMemo(() => lookupPrice(cols, rows), [cols, rows]);
  const salePrice    = priceOverride !== "" ? (parseFloat(priceOverride)||0) : tablePrice;
  const addonRevenue = (addWheels ? 40 : 0) + (addPlywood ? 100 : 0);
  const delivAmt     = parseFloat(deliveryCharge) || 0;
  const totalRevenue = salePrice + addonRevenue + delivAmt;

  const estimatedMaterialCost = lumberAnalysis.reduce((s, item) => s + (item.chosen?.cost || 0), 0);
  const materialCost          = materialOverride !== "" ? (parseFloat(materialOverride)||0) : estimatedMaterialCost;
  const addonCost             = (addWheels ? (parseFloat(wheelCost)||0) : 0) + (addPlywood ? (parseFloat(plywoodCost)||0) : 0);
  const screwCostPerBuild     = (parseFloat(screwBoxCost)||0) / Math.max(1, parseInt(buildsPerBox)||1);
  const customItemsTotalCost  = customItems.reduce((s, it) => s + (parseFloat(it.qty)||0)*(parseFloat(it.unitCost)||0), 0);
  const totalCost             = materialCost + addonCost + screwCostPerBuild + customItemsTotalCost;
  const profit                = totalRevenue - totalCost;

  // Custom item helpers
  const addCustomItem = () => {
    setCustomItems(prev => [...prev, { id: nextId++, name: "Item", qty: 1, unitCost: 0 }]);
  };
  const removeCustomItem = (id) => setCustomItems(prev => prev.filter(it => it.id !== id));
  const updateCustomItem = (id, field, val) => setCustomItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));

  const TABS = [
    { id:"dims",    label:"📐 Dimensions" },
    { id:"cuts",    label:"🪚 Cut List" },
    { id:"lumber",  label:"🛒 Buy List" },
    { id:"diagram", label:"📊 Diagram" },
    { id:"pricing", label:"💰 Pricing" },
  ];

  return (
    <div style={{ fontFamily:"'Courier New',monospace", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,#0D1929 0%,#0A0E14 100%)",
        borderBottom:`1px solid ${C.border}`, padding:"18px 20px 14px",
        display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontSize:28 }}>🪵</div>
        <div>
          <div style={{ fontSize:18, fontWeight:"bold", color:C.white, letterSpacing:2, textTransform:"uppercase" }}>Tote Rack Builder</div>
          <div style={{ fontSize:9, color:C.textDim, letterSpacing:3 }}>2×4 LUMBER CONFIGURATOR · NAMPA, ID</div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:9, color:C.textMuted, letterSpacing:2 }}>TOTES</div>
          <div style={{ fontSize:22, color:C.blue, fontWeight:"bold" }}>{cols*rows}</div>
        </div>
      </div>

      <div style={{ padding:"16px" }}>

        {/* Controls */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={card}>
            <div style={cardHead}>LAYOUT</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14, marginTop:14 }}>
              <Spinner label="Columns" value={cols} min={1} max={8} onChange={setCols}/>
              <Spinner label="Rows"    value={rows} min={1} max={6} onChange={setRows}/>
            </div>
          </div>
          <div style={card}>
            <div style={cardHead}>TOTE SIZE (in)</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:12 }}>
              <InchInput label="Length" value={tote.length} onChange={v => updateTote("length",v)}/>
              <InchInput label="Width"  value={tote.width}  onChange={v => updateTote("width",v)}/>
              <InchInput label="Height" value={tote.height} onChange={v => updateTote("height",v)}/>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
          {[["WIDTH",dims.totalWidth],["HEIGHT",dims.totalHeight],["DEPTH",dims.rackDepth]].map(([lbl,val]) => (
            <div key={lbl} style={{ background:C.blueDark, border:`1px solid ${C.blueDim}`, borderRadius:7, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:C.blue, letterSpacing:2, marginBottom:3 }}>{lbl}</div>
              <div style={{ fontSize:16, color:C.white, fontWeight:"bold" }}>{fmt(val)}</div>
              <div style={{ fontSize:9, color:C.textDim, marginTop:2 }}>{fmtFt(val)}</div>
            </div>
          ))}
        </div>

        <TabBar tabs={TABS} active={tab} onChange={setTab}/>

        {/* ── Dimensions ── */}
        {tab === "dims" && (
          <div style={card}>
            <div style={cardHead}>RACK SPECIFICATIONS</div>
            <table style={{ width:"100%", borderCollapse:"collapse", marginTop:12 }}>
              <tbody>
                {[
                  ["Overall Width",        fmt(dims.totalWidth),        fmtFt(dims.totalWidth)],
                  ["Overall Height",       fmt(dims.totalHeight),       fmtFt(dims.totalHeight)],
                  ["Overall Depth",        fmt(dims.rackDepth),         fmtFt(dims.rackDepth)],
                  [null],
                  ["Bay Width (per col)",  fmt(dims.bayW),              "interior clear"],
                  ["Bay Height (per row)", fmt(dims.bayH),              "floor to runner top"],
                  ["Runner length",        fmt(dims.runnerLen),         "depth between post faces"],
                  [null],
                  ["Side clearance",       `${GAP_SIDE}" per side`,     "totes won't bind"],
                  ["Top clearance",        `${GAP_HEAD}"`,              "lid lifts freely"],
                  ["Front/back clear",     `${GAP_FRONT}" / ${GAP_BACK}"`, "slide in easily"],
                ].map((row, i) => row[0] === null
                  ? <tr key={i}><td colSpan={3}><div style={{ height:1, background:C.borderAlt, margin:"4px 0" }}/></td></tr>
                  : (<tr key={i} style={{ borderBottom:`1px solid ${C.borderAlt}` }}>
                      <td style={{ padding:"7px 0",  color:C.textDim,   fontSize:12 }}>{row[0]}</td>
                      <td style={{ padding:"7px 8px",color:C.blue,      fontSize:14, fontWeight:"bold" }}>{row[1]}</td>
                      <td style={{ padding:"7px 0",  color:C.textMuted, fontSize:10 }}>{row[2]}</td>
                    </tr>)
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Cut List ── */}
        {tab === "cuts" && (
          <div style={card}>
            <div style={cardHead}>CUT LIST — ALL 2×4 LUMBER</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", marginTop:12 }}>
                <thead>
                  <tr>{["PIECE","QTY","CUT LENGTH","NOTE"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"5px 8px", fontSize:9, color:C.textDim, letterSpacing:2, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {dims.cuts.map((cut, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.borderAlt}` }}>
                      <td style={{ padding:"9px 8px 5px" }}>
                        <div style={{ color: cut.label==="Runners" ? C.runner : C.white, fontSize:12 }}>{cut.label}</div>
                        <div style={{ color:C.textMuted, fontSize:10, marginTop:2 }}>{cut.desc}</div>
                      </td>
                      <td style={{ padding:"9px 8px", color: cut.label==="Runners" ? C.runner : C.blue, fontSize:20, fontWeight:"bold", textAlign:"center" }}>{cut.qty}</td>
                      <td style={{ padding:"9px 8px", whiteSpace:"nowrap" }}>
                        <div style={{ color:C.blue, fontSize:14, fontWeight:"bold" }}>{fmt(cut.length)}</div>
                        <div style={{ color:C.textDim, fontSize:10 }}>{fmtFt(cut.length)}</div>
                      </td>
                      <td style={{ padding:"9px 8px", color:C.textDim, fontSize:11 }}>{cut.note}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:`2px solid ${C.border}` }}>
                    <td style={{ padding:"10px 8px", color:C.textDim, fontSize:11 }}>TOTALS</td>
                    <td style={{ padding:"10px 8px", color:C.blue, fontWeight:"bold", textAlign:"center" }}>{dims.cuts.reduce((s,c)=>s+c.qty,0)} pcs</td>
                    <td style={{ padding:"10px 8px", color:C.blue, fontWeight:"bold" }}>{safeFixed(dims.totalLinFt)} lin ft</td>
                    <td style={{ padding:"10px 8px", color:C.textDim, fontSize:11 }}>≈ {safeFixed(dims.boardFeet)} bd ft</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Buy List ── */}
        {tab === "lumber" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={card}>
              <div style={cardHead}>LUMBER — SHOPPING LIST</div>
              <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:12 }}>
                {lumberAnalysis.map((item, i) => (
                  <div key={i} style={{ borderBottom:`1px solid ${C.borderAlt}`, paddingBottom:12 }}>
                    {/* Cut header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:7 }}>
                      <div>
                        <span style={{ color:C.white, fontSize:13, fontWeight:"bold" }}>{item.label}</span>
                        <span style={{ color:C.textMuted, fontSize:10, marginLeft:8 }}>{item.qty} pcs @ {fmt(item.length)} ea</span>
                      </div>
                      {item.chosen && (
                        <span style={{ color:C.blue, fontSize:12, fontWeight:"bold" }}>
                          {item.chosen.boardsNeeded} bd · {fmtMoney(item.chosen.cost)}
                        </span>
                      )}
                    </div>
                    {/* Board length options */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {item.options.map(opt => {
                        const isChosen   = opt.ft === item.chosen?.ft;
                        const isCheapest = opt.ft === item.cheapest?.ft;
                        return (
                          <button key={opt.ft}
                            onClick={() => setLumberChoices(p => ({ ...p, [item.label]: opt.ft }))}
                            style={{
                              padding:"6px 10px", borderRadius:6, cursor:"pointer", fontFamily:"monospace",
                              border:`1px solid ${isChosen ? C.blue : C.border}`,
                              background: isChosen ? C.blueDark : "#060D16",
                              display:"flex", flexDirection:"column", alignItems:"center", gap:1,
                            }}>
                            <span style={{ fontSize:12, color: isChosen ? C.blue : C.text, fontWeight: isChosen ? "bold" : "normal" }}>
                              {opt.ft}′ board
                              {isCheapest && <span style={{ fontSize:9, color:C.green, marginLeft:4 }}>★</span>}
                            </span>
                            <span style={{ fontSize:10, color:C.textMuted }}>{opt.piecesPerBoard} pcs/bd</span>
                            <span style={{ fontSize:11, color: isChosen ? C.white : C.textDim }}>{opt.boardsNeeded} bd · {fmtMoney(opt.cost)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lumber order summary */}
            <div style={card}>
              <div style={cardHead}>ORDER SUMMARY</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
                {Object.entries(lumberTally).sort(([a],[b])=>a-b).map(([ft, count]) => (
                  <div key={ft} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:C.blueDark, border:`1px solid ${C.blueDim}`, borderRadius:6 }}>
                    <span style={{ color:C.text, fontSize:13 }}>2×4 × {ft}-foot boards</span>
                    <span style={{ color:C.blue, fontSize:22, fontWeight:"bold" }}>{count} <span style={{ fontSize:11, color:C.textDim }}>pcs</span></span>
                  </div>
                ))}
                <div style={{ padding:"10px 12px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 }}>
                  <div style={{ color:C.textDim, marginBottom:4 }}>Add 10% for waste & mis-cuts</div>
                  <div style={{ color:C.blue }}>{safeFixed(dims.totalLinFt)} lin ft &nbsp;/&nbsp; ≈ {safeFixed(dims.boardFeet)} bd ft total</div>
                </div>
              </div>
            </div>

            {/* Custom additional items */}
            <div style={card}>
              <div style={{ ...cardHead, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>ADDITIONAL ITEMS</span>
                <button onClick={addCustomItem} style={{
                  background:C.blueDark, border:`1px solid ${C.blueDim}`, color:C.blue,
                  padding:"3px 10px", borderRadius:4, cursor:"pointer", fontSize:11,
                  fontFamily:"monospace", letterSpacing:1,
                }}>+ ADD ITEM</button>
              </div>

              {customItems.length === 0 ? (
                <div style={{ marginTop:12, fontSize:11, color:C.textMuted, textAlign:"center", padding:"16px 0" }}>
                  No extra items added yet. Tap + ADD ITEM to track wheels, plywood, hardware, etc.
                </div>
              ) : (
                <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                  {/* Header row */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 72px 28px", gap:6, padding:"0 4px" }}>
                    {["ITEM NAME","QTY","UNIT COST",""].map((h,i) => (
                      <div key={i} style={{ fontSize:9, color:C.textDim, letterSpacing:1 }}>{h}</div>
                    ))}
                  </div>
                  {customItems.map(it => (
                    <div key={it.id} style={{ display:"grid", gridTemplateColumns:"1fr 60px 72px 28px", gap:6, alignItems:"center" }}>
                      <input
                        value={it.name}
                        onChange={e => updateCustomItem(it.id, "name", e.target.value)}
                        placeholder="Item name"
                        style={{ background:"#060D16", border:`1px solid ${C.border}`, color:C.text, padding:"5px 7px", borderRadius:5, fontSize:12, fontFamily:"monospace" }}
                      />
                      <input
                        type="number" min="1" step="1" value={it.qty}
                        onChange={e => updateCustomItem(it.id, "qty", e.target.value)}
                        style={{ background:"#060D16", border:`1px solid ${C.border}`, color:C.text, padding:"5px 6px", borderRadius:5, fontSize:12, fontFamily:"monospace", textAlign:"center" }}
                      />
                      <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                        <span style={{ fontSize:11, color:C.textMuted }}>$</span>
                        <input
                          type="number" min="0" step="0.01" value={it.unitCost}
                          onChange={e => updateCustomItem(it.id, "unitCost", e.target.value)}
                          style={{ flex:1, background:"#060D16", border:`1px solid ${C.border}`, color:C.blue, padding:"5px 6px", borderRadius:5, fontSize:12, fontFamily:"monospace", textAlign:"right" }}
                        />
                      </div>
                      <button onClick={() => removeCustomItem(it.id)} style={{
                        background:"none", border:`1px solid #3A1A1A`, color:C.red,
                        width:28, height:28, borderRadius:4, cursor:"pointer", fontSize:14,
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>×</button>
                    </div>
                  ))}

                  {/* Subtotal */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 4px", borderTop:`1px solid ${C.borderAlt}`, marginTop:4 }}>
                    <span style={{ fontSize:11, color:C.textDim }}>Custom items subtotal</span>
                    <span style={{ fontSize:14, color:C.blue, fontWeight:"bold" }}>{fmtMoney(customItemsTotalCost)}</span>
                  </div>
                  <div style={{ fontSize:10, color:C.textMuted }}>↑ This total is included in your materials cost on the Pricing tab</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Diagram ── */}
        {tab === "diagram" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={card}>
              <div style={cardHead}>FRONT ELEVATION — {cols} COL × {rows} ROW</div>
              <div style={{ marginTop:12 }}>
                <FrontDiagram cols={cols} rows={rows} dims={dims}/>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}>SIDE ELEVATION</div>
              <div style={{ marginTop:12 }}>
                <SideDiagram rows={rows} dims={dims}/>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.textDim, display:"flex", gap:16, flexWrap:"wrap", padding:"8px 2px" }}>
              <span><span style={{ color:"#C4955A" }}>■</span> Posts &amp; rails</span>
              <span><span style={{ color:"#9C7040" }}>■</span> Runners</span>
              <span><span style={{ color:"#F0C040" }}>■</span> Tote lid</span>
              <span><span style={{ color:"#8A9BAE" }}>■</span> Tote body</span>
            </div>
          </div>
        )}

        {/* ── Pricing & Profit ── */}
        {tab === "pricing" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

            {/* Sale Price */}
            <div style={card}>
              <div style={cardHead}>SALE PRICE</div>
              <div style={{ marginTop:14 }}>
                <div style={{ padding:"14px 16px", marginBottom:14,
                  background: priceExact ? C.blueDark : "#1C1A08",
                  border:`1px solid ${priceExact ? C.blueDim : C.yellow}`, borderRadius:8 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color: priceExact ? C.blue : C.yellow, marginBottom:4 }}>
                    {priceExact ? `CATALOG — ${cols}W × ${rows}H` : `EXTRAPOLATED — ${cols}W × ${rows}H`}
                  </div>
                  <div style={{ fontSize:36, fontWeight:"bold", color:C.white, fontFamily:"monospace" }}>{fmtMoney(tablePrice)}</div>
                  {!priceExact && <div style={{ fontSize:10, color:C.yellow, marginTop:4 }}>Suggested — override below if needed</div>}
                </div>

                <MoneyInput label={priceOverride!=="" ? "Price override ✎" : "Override price (optional)"}
                  value={priceOverride!=="" ? priceOverride : ""} onChange={setPriceOverride} highlight={priceOverride!==""}/>
                {priceOverride!=="" && (
                  <div style={{ textAlign:"right", marginTop:4 }}>
                    <button onClick={() => setPriceOverride("")} style={{ background:"none", border:"none", color:C.textDim, fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>↩ reset to catalog</button>
                  </div>
                )}

                <div style={{ fontSize:9, letterSpacing:2, color:C.textDim, margin:"14px 0 8px" }}>ADD-ONS</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <Toggle label="Heavy Duty Locking Wheels" sublabel="Rolls & locks in place" checked={addWheels} onChange={setAddWheels} charge={40}/>
                  <Toggle label="Plywood Top" sublabel="Custom fitted solid top panel" checked={addPlywood} onChange={setAddPlywood} charge={100}/>
                </div>
                <div style={{ marginTop:12 }}>
                  <MoneyInput label="Delivery charge" sublabel="0 = pickup only" value={deliveryCharge} onChange={setDeliveryCharge}/>
                </div>
                <div style={{ marginTop:12, padding:"12px 14px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:C.textDim }}>Total to customer</span>
                    <span style={{ fontSize:24, color:C.white, fontWeight:"bold" }}>{fmtMoney(totalRevenue)}</span>
                  </div>
                  {(addonRevenue>0||delivAmt>0) && (
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:3 }}>
                      {fmtMoney(salePrice)} rack{addWheels?" + $40 wheels":""}{addPlywood?" + $100 top":""}{delivAmt>0?` + ${fmtMoney(delivAmt)} delivery`:""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Material Cost */}
            <div style={card}>
              <div style={cardHead}>MATERIAL COST</div>
              <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>

                <div style={{ padding:"12px 14px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6 }}>
                  <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:10 }}>LUMBER PRICES (per board)</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {STD_FT.map(ft => (
                      <MoneyInput key={ft}
                        label={`2×4 × ${ft}′ board`}
                        value={boardPrices[ft]}
                        onChange={v => setBoardPrices(p => ({ ...p, [ft]: v }))}
                        highlight/>
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:8, borderTop:`1px solid ${C.borderAlt}` }}>
                    <span style={{ fontSize:11, color:C.textDim }}>
                      {lumberAnalysis.reduce((s,i) => s + (i.chosen?.boardsNeeded||0), 0)} boards total
                    </span>
                    <span style={{ fontSize:15, color:C.blue, fontWeight:"bold" }}>{fmtMoney(estimatedMaterialCost)}</span>
                  </div>
                </div>

                <MoneyInput label={materialOverride!=="" ? "Material override ✎ (active)" : "Override material cost (optional)"}
                  value={materialOverride!=="" ? materialOverride : ""} onChange={setMaterialOverride} highlight={materialOverride!==""}/>
                {materialOverride!=="" && (
                  <div style={{ textAlign:"right", marginTop:-4 }}>
                    <button onClick={() => setMaterialOverride("")} style={{ background:"none", border:"none", color:C.textDim, fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>↩ use estimate</button>
                  </div>
                )}

                {/* Screws consumable */}
                <div style={{ padding:"12px 14px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6 }}>
                  <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:10 }}>SCREWS (CONSUMABLE)</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <MoneyInput label="Box of screws" sublabel="10 lb / 848 ct, 2½ in." value={screwBoxCost} onChange={setScrewBoxCost} highlight/>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:C.textDim, flex:1 }}>Builds per box</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {[[-1,"−"],[1,"+"]].map(([d,sym],i) => (
                          <button key={i} onClick={() => setBuildsPerBox(p => Math.max(1,(parseInt(p)||1)+d))} style={{
                            background:C.surface, border:`1px solid ${C.border}`, color:C.blue,
                            width:28, height:28, borderRadius:4, cursor:"pointer", fontSize:16,
                            fontFamily:"monospace", display:"flex", alignItems:"center", justifyContent:"center",
                          }}>{sym}</button>
                        ))}
                        <div style={{ width:24, textAlign:"center", fontSize:18, color:C.white, fontWeight:"bold", fontFamily:"monospace" }}>{buildsPerBox}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${C.borderAlt}` }}>
                      <span style={{ fontSize:11, color:C.textDim }}>${parseFloat(screwBoxCost)||0} ÷ {buildsPerBox} builds</span>
                      <span style={{ fontSize:14, color:C.blue, fontWeight:"bold" }}>{fmtMoney(screwCostPerBuild)}/build</span>
                    </div>
                  </div>
                </div>

                {/* Add-on costs */}
                {(addWheels || addPlywood) && (
                  <div style={{ padding:"12px 14px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6 }}>
                    <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:10 }}>ADD-ON COSTS (what YOU pay)</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {addWheels  && <MoneyInput label="Wheels (Amazon)"  value={wheelCost}   onChange={setWheelCost}  highlight/>}
                      {addPlywood && <MoneyInput label="Plywood sheet"     value={plywoodCost} onChange={setPlywoodCost} highlight/>}
                    </div>
                  </div>
                )}

                {/* Custom items summary if any */}
                {customItemsTotalCost > 0 && (
                  <div style={{ padding:"10px 14px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, color:C.textDim }}>Custom buy-list items</div>
                      <div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>{customItems.length} item{customItems.length!==1?"s":""} from Buy List</div>
                    </div>
                    <span style={{ fontSize:15, color:C.blue, fontWeight:"bold" }}>{fmtMoney(customItemsTotalCost)}</span>
                  </div>
                )}

                <div style={{ padding:"10px 14px", background:"#060D16", border:`1px solid ${C.border}`, borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.textDim }}>Total cost to you</span>
                  <span style={{ fontSize:20, color:C.text, fontWeight:"bold" }}>{fmtMoney(totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Build Time */}
            <div style={card}>
              <div style={cardHead}>BUILD TIME</div>
              <div style={{ marginTop:14 }}>
                <Spinner label="Hours to build" value={hoursToSell} min={1} max={20} onChange={setHoursToSell}/>
                <div style={{ marginTop:8, fontSize:11, color:C.textMuted }}>Used to calculate your effective hourly rate below</div>
              </div>
            </div>

            {/* Profit Summary */}
            <div style={{ ...card, border:`1px solid ${profit>=0 ? C.greenDim : C.red}`, background: profit>=0 ? C.greenDark : C.redDark }}>
              <div style={{ fontSize:9, letterSpacing:3, color:profit>=0?C.green:C.red, paddingBottom:8, borderBottom:`1px solid ${profit>=0?C.greenDim:"#4A1A1A"}` }}>
                PROFIT SUMMARY
              </div>
              <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  ["Rack sale price",            fmtMoney(salePrice),                                    false],
                  addWheels    ? ["+ Wheels (revenue)",      "+$40",                                     false] : null,
                  addPlywood   ? ["+ Plywood top (revenue)", "+$100",                                    false] : null,
                  delivAmt > 0 ? [`+ Delivery`,              `+${fmtMoney(delivAmt)}`,                  false] : null,
                  ["− Lumber & materials",        `−${fmtMoney(materialCost)}`,                          true],
                  ["− Screws (per build)",         `−${fmtMoney(screwCostPerBuild)}`,                    true],
                  customItemsTotalCost > 0 ? ["− Custom items", `−${fmtMoney(customItemsTotalCost)}`,    true] : null,
                  addWheels    ? [`− Wheels (cost)`,          `−${fmtMoney(parseFloat(wheelCost)||0)}`,  true] : null,
                  addPlywood   ? [`− Plywood (cost)`,         `−${fmtMoney(parseFloat(plywoodCost)||0)}`,true] : null,
                ].filter(Boolean).map(([lbl, val, isCost], i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color: profit>=0 ? "#86EFAC" : "#FCA5A5" }}>{lbl}</span>
                    <span style={{ fontSize:12, color: isCost ? "#FCA5A5" : C.white, fontFamily:"monospace" }}>{val}</span>
                  </div>
                ))}

                <div style={{ height:1, background:profit>=0?C.greenDim:"#4A1A1A", margin:"8px 0" }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:9, letterSpacing:2, color:profit>=0?C.green:C.red }}>NET PROFIT</div>
                    <div style={{ fontSize:10, color:profit>=0?"#86EFAC":"#FCA5A5", marginTop:1 }}>before {hoursToSell}h of your labor</div>
                  </div>
                  <div style={{ fontSize:38, fontWeight:"bold", color:profit>=0?C.green:C.red, fontFamily:"monospace" }}>
                    {profit<0?"−":""}{fmtMoney(Math.abs(profit))}
                  </div>
                </div>

                {profit > 0 && hoursToSell > 0 && (
                  <div style={{ padding:"10px 12px", background:"rgba(0,0,0,0.25)", borderRadius:6, marginTop:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, color:"#86EFAC" }}>Your effective hourly rate</span>
                      <span style={{ fontSize:16, fontWeight:"bold", color:C.green, fontFamily:"monospace" }}>{fmtMoney(profit/hoursToSell)}/hr</span>
                    </div>
                  </div>
                )}
                <ProfitBar profit={profit} total={totalRevenue}/>
              </div>
            </div>

            {/* Price Reference Table */}
            <div style={card}>
              <div style={cardHead}>YOUR FULL PRICE LIST</div>
              <div style={{ overflowX:"auto", marginTop:12 }}>
                <table style={{ borderCollapse:"collapse", fontSize:11, width:"100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding:"5px 8px", color:C.textDim, textAlign:"left", borderBottom:`1px solid ${C.border}` }}></th>
                      {[2,3,4,5].map(r => (
                        <th key={r} style={{ padding:"5px 8px", color:r===rows?C.blue:C.textDim, textAlign:"center", borderBottom:`1px solid ${C.border}`, fontWeight:r===rows?"bold":"normal" }}>{r}R</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1,2,3,4,5].map(c => (
                      <tr key={c} style={{ borderBottom:`1px solid ${C.borderAlt}` }}>
                        <td style={{ padding:"6px 8px", color:c===cols?C.blue:C.textDim, fontWeight:c===cols?"bold":"normal" }}>{c}C</td>
                        {[2,3,4,5].map(r => {
                          const active = c===cols && r===rows;
                          return (
                            <td key={r} style={{ padding:"6px 8px", textAlign:"center",
                              background: active ? C.blueDark : "transparent",
                              color: active ? C.blue : C.text,
                              fontWeight: active ? "bold" : "normal",
                              borderRadius: active ? 4 : 0,
                            }}>{fmtMoney(PRICE_TABLE[c][r])}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop:10, fontSize:10, color:C.textMuted, lineHeight:1.7 }}>
                  Current selection highlighted · Configs outside grid are extrapolated<br/>
                  Add-ons: +$40 wheels · +$100 plywood top · Delivery extra · Custom made in Nampa, ID
                </div>
              </div>
            </div>

          </div>
        )}

        <div style={{ marginTop:20, fontSize:10, color:C.textMuted, textAlign:"center", lineHeight:1.8 }}>
          All 2×4 dimensions use actual size (1.5" × 3.5")<br/>
          Custom made to order · Nampa, ID · Delivery available
        </div>
      </div>
    </div>
  );
}
