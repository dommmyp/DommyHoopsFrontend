import React, { useMemo, useState, useEffect } from "react";

export default function ShotChart({
  shots,
  homeTeam,
  awayTeam,
  colors1,
  colors2,
  highlightedId,
  onHighlight,
  teamFilter, // "home" | "away"
  onChangeTeamFilter,
}) {
  // normalize colors (support object or plain string)
  const primary1 =
    colors1 && typeof colors1 === "object" ? colors1.primary : colors1 || "#1e3a8a";
  const primary2 =
    colors2 && typeof colors2 === "object" ? colors2.primary : colors2 || "#0f766e";

  // logical SVG size (half court)
  const width = 50;
  const height = 47;

  const H_PAD = 3;
  const TOP_PAD = 2;
  const BOT_PAD = 2;

  const HALF_LENGTH = 20 * 60; // 20:00 per half
  const OT_LENGTH = 5 * 60; // 5:00 per OT

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // map period + secondsRemaining to absolute game seconds from tip
  const getGameSecond = s => {
    const period = Number(s.period ?? 1);
    const secRemRaw = Number(s.secondsRemaining ?? NaN);
    if (!Number.isFinite(secRemRaw)) return NaN;

    let periodStart = 0;
    let periodDur = HALF_LENGTH;

    if (period === 1) {
      periodStart = 0;
      periodDur = HALF_LENGTH;
    } else if (period === 2) {
      periodStart = HALF_LENGTH;
      periodDur = HALF_LENGTH;
    } else if (period >= 3) {
      periodStart = HALF_LENGTH * 2 + (period - 3) * OT_LENGTH;
      periodDur = OT_LENGTH;
    }

    const secRem = clamp(secRemRaw, 0, periodDur);
    const elapsedInPeriod = periodDur - secRem;
    return periodStart + elapsedInPeriod;
  };

  // bounds from raw shot coordinates
  const bounds = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const s of shots || []) {
      const x = Number(s.x);
      const y = Number(s.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      return { minX: 0, maxX: 47, minY: 0, maxY: 50 };
    }

    if (minY === maxY) {
      minY = 0;
      maxY = 1;
    }

    return { minX, maxX, minY, maxY };
  }, [shots]);

  const { minX, maxX, minY, maxY } = bounds;
  const halfLen = (maxX - minX) / 2 || 1;

  const scaleX = rawY => {
    const y = Number(rawY);
    if (!Number.isFinite(y)) return width / 2;
    const t = clamp((y - minY) / (maxY - minY), 0, 1);
    return H_PAD + t * (width - 2 * H_PAD);
  };

  const scaleY = rawX => {
    const x = Number(rawX);
    if (!Number.isFinite(x)) return height - BOT_PAD;

    const dLeft = clamp(x - minX, 0, halfLen);
    const dRight = clamp(maxX - x, 0, halfLen);
    const dHoop = Math.min(dLeft, dRight);

    const t = clamp(dHoop / halfLen, 0, 1);

    const usable = height - TOP_PAD - BOT_PAD;
    return height - BOT_PAD - t * usable;
  };

  // filters
  const [selectedPlayer, setSelectedPlayer] = useState("all");

  // time mode: "all" or "range" (range uses startSec/endSec)
  const [timeMode, setTimeMode] = useState("all");
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(40 * 60); // default 40:00

  // reset player filter when team changes
  useEffect(() => {
    setSelectedPlayer("all");
  }, [teamFilter]);

  // compute max game seconds from data
  const maxGameSec = useMemo(() => {
    let maxVal = 0;
    for (const s of shots || []) {
      const gs = getGameSecond(s);
      if (Number.isFinite(gs) && gs > maxVal) maxVal = gs;
    }
    return maxVal || 40 * 60;
  }, [shots]);

  // keep endSec within data range
  useEffect(() => {
    setEndSec(prev => clamp(prev, 0, maxGameSec));
  }, [maxGameSec]);

  const getPlayerName = s => s.shooterName || "Unknown";

  // first restrict to selected team
  const shotsByTeam = useMemo(() => {
    if (!shots) return [];
    if (teamFilter === "home") {
      return shots.filter(s => !!s.isHomeTeam);
    }
    if (teamFilter === "away") {
      return shots.filter(s => !s.isHomeTeam);
    }
    return shots;
  }, [shots, teamFilter]);

  // player options only from current team’s shots
  const playerOptions = useMemo(() => {
    const names = new Set();
    shotsByTeam.forEach(s => {
      names.add(getPlayerName(s));
    });
    return Array.from(names).sort();
  }, [shotsByTeam]);

  // time helpers
  const formatTime = sec => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const mm = m.toString();
    const ss = r.toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const parseTime = str => {
    if (!str) return NaN;
    const parts = str.split(":");
    if (parts.length !== 2) return NaN;
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return NaN;
    return m * 60 + s;
  };

  // apply player + time filters
  const filteredShots = useMemo(() => {
    let out = shotsByTeam;

    if (selectedPlayer !== "all") {
      out = out.filter(s => getPlayerName(s) === selectedPlayer);
    }

    if (timeMode === "range") {
      const lo = Math.min(startSec, endSec);
      const hi = Math.max(startSec, endSec);
      out = out.filter(s => {
        const gs = getGameSecond(s);
        if (!Number.isFinite(gs)) return false;
        return gs >= lo && gs <= hi;
      });
    }

    return out;
  }, [shotsByTeam, selectedPlayer, timeMode, startSec, endSec]);

  // stats for current filter
  const attempts = filteredShots.length;
  const made = filteredShots.filter(s => !!s.shotMade).length;
  const pct = attempts ? ((made / attempts) * 100).toFixed(1) : null;

  const homeAttempts = filteredShots.filter(s => !!s.isHomeTeam).length;
  const homeMade = filteredShots.filter(
    s => !!s.isHomeTeam && !!s.shotMade,
  ).length;
  const awayAttempts = filteredShots.filter(s => !s.isHomeTeam).length;
  const awayMade = filteredShots.filter(
    s => !s.isHomeTeam && !!s.shotMade,
  ).length;

  // court layout
  const hoopX = width / 2;
  const hoopY = height - BOT_PAD;
  const laneWidth = 12;
  const laneHeight = 15;
  const laneTop = hoopY - laneHeight;

  const threeRadius = 19;
  const breakThree = 40;

  // quick time presets
  const handleFullGame = () => {
    setTimeMode("all");
    setStartSec(0);
    setEndSec(maxGameSec);
  };

  const handleFirstHalf = () => {
    setTimeMode("range");
    setStartSec(0);
    setEndSec(Math.min(HALF_LENGTH, maxGameSec));
  };

  const handleSecondHalfOT = () => {
    setTimeMode("range");
    setStartSec(Math.min(HALF_LENGTH, maxGameSec));
    setEndSec(maxGameSec);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* header now matches other cards: bg-slate-50, border-slate-200 */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-200">
        <div>
          <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wide">
            Shot chart
          </h3>
          <p className="text-[11px] text-slate-600">
            Circles are makes, crosses are misses. Colored by team.
          </p>
        </div>

        {/* Home / Away toggle using team colors, pill style like rest of app */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            className={`px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
              teamFilter === "away"
                ? "bg-white text-slate-900"
                : "bg-slate-50 text-slate-700"
            }`}
            style={
              teamFilter === "away"
                ? {
                    borderColor: primary2,
                    boxShadow: `0 0 0 1px ${primary2}20`,
                  }
                : { borderColor: "#e5e7eb" }
            }
            onClick={() => onChangeTeamFilter("away")}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: primary2 }}
            />
            <span className="max-w-[120px] truncate">{awayTeam}</span>
          </button>
          <button
            className={`px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
              teamFilter === "home"
                ? "bg-white text-slate-900"
                : "bg-slate-50 text-slate-700"
            }`}
            style={
              teamFilter === "home"
                ? {
                    borderColor: primary1,
                    boxShadow: `0 0 0 1px ${primary1}20`,
                  }
                : { borderColor: "#e5e7eb" }
            }
            onClick={() => onChangeTeamFilter("home")}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: primary1 }}
            />
            <span className="max-w-[120px] truncate">{homeTeam}</span>
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex gap-4">
          {/* sidebar */}
          <aside className="w-64 border border-slate-200 rounded-lg bg-slate-50 p-3 text-xs flex-shrink-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 mb-2">
              Filters
            </h4>

            {/* player select */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Player
              </label>
              <select
                className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={selectedPlayer}
                onChange={e => setSelectedPlayer(e.target.value)}
              >
                <option value="all">All players</option>
                {playerOptions.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* time selection */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Time range
              </label>

              {/* preset buttons */}
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  type="button"
                  onClick={handleFullGame}
                  className={`px-1.5 py-0.5 rounded-full border text-[10px] transition-colors ${
                    timeMode === "all"
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  Full game
                </button>
                <button
                  type="button"
                  onClick={handleFirstHalf}
                  className="px-1.5 py-0.5 rounded-full border text-[10px] bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                >
                  1st half
                </button>
                <button
                  type="button"
                  onClick={handleSecondHalfOT}
                  className="px-1.5 py-0.5 rounded-full border text-[10px] bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                >
                  2nd half + OT
                </button>
              </div>

              {/* custom range controls */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-8">From</span>
                  <input
                    type="text"
                    className="flex-1 border border-slate-300 rounded px-1 py-0.5 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={formatTime(startSec)}
                    onChange={e => {
                      const val = parseTime(e.target.value);
                      if (Number.isFinite(val)) {
                        setTimeMode("range");
                        setStartSec(clamp(val, 0, maxGameSec));
                      }
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxGameSec}
                  value={startSec}
                  onChange={e => {
                    setTimeMode("range");
                    const val = Number(e.target.value);
                    setStartSec(clamp(val, 0, Math.min(endSec, maxGameSec)));
                  }}
                  className="w-full accent-sky-600"
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-8">To</span>
                  <input
                    type="text"
                    className="flex-1 border border-slate-300 rounded px-1 py-0.5 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={formatTime(endSec)}
                    onChange={e => {
                      const val = parseTime(e.target.value);
                      if (Number.isFinite(val)) {
                        setTimeMode("range");
                        setEndSec(clamp(val, 0, maxGameSec));
                      }
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxGameSec}
                  value={endSec}
                  onChange={e => {
                    setTimeMode("range");
                    const val = Number(e.target.value);
                    setEndSec(
                      clamp(val, Math.min(startSec, maxGameSec), maxGameSec),
                    );
                  }}
                  className="w-full accent-sky-600"
                />

                <div className="text-[10px] text-slate-500">
                  Game time {formatTime(startSec)} to {formatTime(endSec)} (max{" "}
                  {formatTime(maxGameSec)})
                </div>
              </div>
            </div>

            {/* stats */}
            <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
              <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Stats (current filter)
              </div>
              <div className="text-[11px] text-slate-800">
                Total{" "}
                <span className="font-semibold">
                  {made}/{attempts}
                </span>
                {pct && <span> ({pct}%)</span>}
              </div>
              <div className="text-[11px] text-slate-800">
                {homeTeam}{" "}
                <span className="font-semibold">
                  {homeMade}/{homeAttempts}
                </span>
              </div>
              <div className="text-[11px] text-slate-800">
                {awayTeam}{" "}
                <span className="font-semibold">
                  {awayMade}/{awayAttempts}
                </span>
              </div>
            </div>
          </aside>

          {/* chart */}
          <div className="flex-1">
            <div
              className="relative w-full max-w-md mx-auto rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-2"
              style={{ aspectRatio: "50 / 47" }}
            >
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full rounded-lg bg-white"
              >
                {/* outer border */}
                <rect
                  x="0"
                  y="0"
                  width={width}
                  height={height}
                  fill="none"
                  stroke="#cbd5f5"
                  strokeWidth="0.5"
                />

                {/* hoop */}
                <circle
                  cx={hoopX}
                  cy={hoopY}
                  r="1.1"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="0.5"
                />

                {/* lane */}
                <rect
                  x={hoopX - laneWidth / 2}
                  y={laneTop}
                  width={laneWidth}
                  height={laneHeight}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="0.5"
                />

                {/* free-throw arc */}
                <path
                  d={`
                    M ${hoopX + laneWidth / 2} ${laneTop}
                    A ${laneWidth / 2} ${laneWidth / 2} 0 0 0 ${
                    hoopX - laneWidth / 2
                  } ${laneTop}
                  `}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="0.5"
                />

                {/* 3-point line */}
                <line
                  x1={hoopX - threeRadius}
                  y1={height}
                  x2={hoopX - threeRadius}
                  y2={breakThree}
                  stroke="#9ca3af"
                  strokeWidth="0.6"
                />
                <path
                  d={`
                    M ${hoopX - threeRadius} ${breakThree}
                    A ${threeRadius} ${threeRadius} 0 0 1 ${
                    hoopX + threeRadius
                  } ${breakThree}
                  `}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="0.6"
                />
                <line
                  x1={hoopX + threeRadius}
                  y1={breakThree}
                  x2={hoopX + threeRadius}
                  y2={height}
                  stroke="#9ca3af"
                  strokeWidth="0.6"
                />

                {/* shots */}
                {filteredShots.map((s, idx) => {
                  const id = `${s.period}-${s.secondsRemaining ?? ""}-${idx}`;
                  const cx = scaleX(s.y);
                  const cy = scaleY(s.x);
                  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

                  const isHome = !!s.isHomeTeam;
                  const color = isHome ? primary1 : primary2;
                  const madeShot = !!s.shotMade;
                  const baseR = 0.9;
                  const r = highlightedId === id ? baseR * 1.4 : baseR;
                  const stroke = highlightedId === id ? 0.7 : 0.45;

                  return (
                    <g
                      key={id}
                      onMouseEnter={() => onHighlight?.(id)}
                      onMouseLeave={() => onHighlight?.(null)}
                      onClick={() => onHighlight?.(id)}
                      style={{ cursor: "pointer" }}
                    >
                      {madeShot ? (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="none"
                          stroke={color}
                          strokeWidth={stroke}
                        />
                      ) : (
                        <>
                          <line
                            x1={cx - r}
                            y1={cy - r}
                            x2={cx + r}
                            y2={cy + r}
                            stroke={color}
                            strokeWidth={stroke}
                          />
                          <line
                            x1={cx - r}
                            y1={cy + r}
                            x2={cx + r}
                            y2={cy - r}
                            stroke={color}
                            strokeWidth={stroke}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

