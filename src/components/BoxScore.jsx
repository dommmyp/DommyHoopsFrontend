import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";

const HALF_LENGTH = 20 * 60; // 20:00
const DEFAULT_GAME = 40 * 60; // 40:00

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function readableTextColor(bgHex) {
  const s = (bgHex || "#000000").replace("#", "");
  const r = parseInt(s.substring(0, 2) || "00", 16) / 255;
  const g = parseInt(s.substring(2, 4) || "00", 16) / 255;
  const b = parseInt(s.substring(4, 6) || "00", 16) / 255;
  const [R, G, B] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return L > 0.5 ? "#111111" : "#ffffff";
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mm = m.toString();
  const ss = r.toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function parseTime(str) {
  if (!str) return NaN;
  const parts = str.split(":");
  if (parts.length !== 2) return NaN;
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return NaN;
  return m * 60 + s;
}

/**
 * Map PBP (period, secondsRemaining) -> absolute game seconds from tip.
 */
function getGameSecond(e) {
  const period = Number(e.period ?? 1);
  const rawRem = Number(e.secondsRemaining ?? e.seconds_remaining ?? NaN);
  if (!Number.isFinite(rawRem)) return NaN;

  let periodStart = 0;
  let periodDur = HALF_LENGTH;

  if (period === 1) {
    periodStart = 0;
    periodDur = HALF_LENGTH;
  } else if (period === 2) {
    periodStart = HALF_LENGTH;
    periodDur = HALF_LENGTH;
  } else if (period >= 3) {
    periodStart = HALF_LENGTH * 2 + (period - 3) * (5 * 60);
    periodDur = 5 * 60;
  }

  const secRem = clamp(rawRem, 0, periodDur);
  const elapsedInPeriod = periodDur - secRem;
  return periodStart + elapsedInPeriod;
}

/**
 * Get all player names for a side ("home" | "away") across the full game.
 * Uses the new `player` field as the main source, with fallbacks.
 */
function getAllPlayersForSide(pbp, side) {
  const set = new Set();

  for (const e of pbp || []) {
    const eventSide = e.isHomeTeam ? "home" : "away";
    if (eventSide !== side) continue;

    const genericPlayer = e.player;
    const shooter = e.shooterName || e.shooter_name;
    const rebounder = e.reboundPlayerName || e.rebound_player_name;
    const assister = e.assistPlayerName || e.assist_player_name;
    const turnover = e.turnoverPlayerName || e.turnover_player_name;
    const blocker = e.blockPlayerName || e.block_player_name;

    if (genericPlayer) set.add(genericPlayer);
    if (shooter) set.add(shooter);
    if (rebounder) set.add(rebounder);
    if (assister) set.add(assister);
    if (turnover) set.add(turnover);
    if (blocker) set.add(blocker);
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Decide if this event is a true shot event.
 * We use the dedicated flags first, then fall back to `play_type`.
 */
function isShotEvent(e) {
  const playType = (e.play_type || e.playType || "").toLowerCase();
  const hasShotFlag =
    e.shootingPlay ||
    e.shooting_play ||
    typeof e.shotMade === "boolean" ||
    typeof e.shot_made === "boolean" ||
    e.shotRange ||
    e.shot_range;

  if (hasShotFlag) return true;

  if (
    /made/.test(playType) ||
    /missed/.test(playType) ||
    /jumper/.test(playType) ||
    /layup/.test(playType) ||
    /dunk/.test(playType) ||
    /three/.test(playType) ||
    /free_throw/.test(playType)
  ) {
    return true;
  }

  return false;
}

/**
 * Build per-player and team totals for a side within [startSec, endSec],
 * but seed all players who appeared at any time.
 * Uses both the original fields and the new `player` / `play_type`.
 */
function buildBoxFromPbp(pbp, side, allPlayers, startSec, endSec) {
  const stats = new Map();

  // seed rows for everyone so they always show
  for (const name of allPlayers) {
    stats.set(name, {
      name,
      minutes: "",
      fieldgoals_made: 0,
      fieldgoals_attempted: 0,
      points: 0,
      rebounds_defensive: 0,
      rebounds_offensive: 0,
      assists: 0,
      turnovers: 0,
      blocks: 0,
    });
  }

  const ensureRow = name => {
    if (!name) return null;
    if (!stats.has(name)) {
      stats.set(name, {
        name,
        minutes: "",
        fieldgoals_made: 0,
        fieldgoals_attempted: 0,
        points: 0,
        rebounds_defensive: 0,
        rebounds_offensive: 0,
        assists: 0,
        turnovers: 0,
        blocks: 0,
      });
    }
    return stats.get(name);
  };

  for (const e of pbp || []) {
    const gs = getGameSecond(e);
    if (!Number.isFinite(gs)) continue;
    if (gs < startSec || gs > endSec) continue;

    const eventSide = e.isHomeTeam ? "home" : "away";
    if (eventSide !== side) continue;

    const playType = (e.play_type || e.playType || "").toLowerCase();

    // SHOTS
    if (isShotEvent(e)) {
      const shooterName = e.shooterName || e.shooter_name || e.player;
      const row = ensureRow(shooterName);
      if (row) {
        row.fieldgoals_attempted += 1;

        const made = e.shotMade ?? e.shot_made;
        if (made) {
          row.fieldgoals_made += 1;
          const pts =
            e.scoreValue ??
            e.score_value ??
            e.points ??
            e.points_scored ??
            e.shotValue ??
            e.shot_value ??
            0;
          row.points += Number(pts) || 0;
        }
      }
    }

    // REBOUNDS
    if (
      e.reboundPlayerName ||
      e.rebound_player_name ||
      playType.includes("rebound")
    ) {
      const rName =
        e.reboundPlayerName || e.rebound_player_name || e.player || null;
      const rType = (e.reboundType || e.rebound_type || "").toUpperCase();
      const row = ensureRow(rName);
      if (row) {
        if (rType === "DEF" || rType === "D") row.rebounds_defensive += 1;
        else if (rType === "OFF" || rType === "O") row.rebounds_offensive += 1;
        else {
          row.rebounds_defensive += 1;
        }
      }
    }

    // ASSISTS
    if (
      e.assistPlayerName ||
      e.assist_player_name ||
      playType.includes("assist")
    ) {
      const aName =
        e.assistPlayerName || e.assist_player_name || e.player || null;
      const row = ensureRow(aName);
      if (row) row.assists += 1;
    }

    // TURNOVERS
    if (
      e.turnoverPlayerName ||
      e.turnover_player_name ||
      playType.includes("turnover")
    ) {
      const tName =
        e.turnoverPlayerName || e.turnover_player_name || e.player || null;
      const row = ensureRow(tName);
      if (row) row.turnovers += 1;
    }

    // BLOCKS
    if (
      e.blockPlayerName ||
      e.block_player_name ||
      playType.includes("block")
    ) {
      const bName =
        e.blockPlayerName || e.block_player_name || e.player || null;
      const row = ensureRow(bName);
      if (row) row.blocks += 1;
    }
  }

  const players = Array.from(stats.values()).sort(
    (a, b) => (b.points || 0) - (a.points || 0),
  );

  const totals = players.reduce(
    (acc, p) => {
      acc.fg_made += p.fieldgoals_made;
      acc.fg_att += p.fieldgoals_attempted;
      acc.points += p.points;
      acc.dreb += p.rebounds_defensive;
      acc.oreb += p.rebounds_offensive;
      acc.ast += p.assists;
      acc.tov += p.turnovers;
      acc.blk += p.blocks;
      return acc;
    },
    {
      fg_made: 0,
      fg_att: 0,
      points: 0,
      dreb: 0,
      oreb: 0,
      ast: 0,
      tov: 0,
      blk: 0,
    },
  );

  return { players, totals };
}

/* ------------------------------------------------------------------ */
/* TEAM TABLE (GA-STYLE CARD WITH TEAM COLOR ACCENTS)                 */
/* ------------------------------------------------------------------ */

function TeamPlayersTable({ teamName, players, totals, primary, secondary }) {
  const textOnPrimary = readableTextColor(primary || "#1e3a8a");
  const playersSorted = [...(players || [])];

  const totalMinutes = playersSorted.reduce(
    (sum, p) => sum + (Number(p.minutes) || 0),
    0,
  );
  const totalReb = (totals?.oreb ?? 0) + (totals?.dreb ?? 0);

  const fgPct =
    (totals?.fg_att ?? 0) > 0
      ? ((totals.fg_made / totals.fg_att) * 100).toFixed(1)
      : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{
          background: `linear-gradient(90deg, ${primary}20, ${secondary}10)`,
          borderBottom: `1px solid ${primary}40`,
        }}
      >
        <div className="flex flex-col">
          <h4 className="font-semibold text-sm md:text-base text-slate-900 tracking-tight">
            <Link
              to={`/team/${encodeURIComponent(teamName)}`}
              className="hover:underline"
              style={{ color: "#000000" }}
            >
              {teamName}
            </Link>
          </h4>
          <span className="text-[11px] text-slate-600">
            Player impact and team totals for current window
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <div className="px-2 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">
            PTS{" "}
            <span
              className="font-semibold"
            >
              {totals?.points ?? 0}
            </span>
          </div>
          {fgPct && (
            <div className="px-2 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">
              FG {totals.fg_made}/{totals.fg_att} ({fgPct}%)
            </div>
          )}
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-slate-800 table-auto border-collapse">
          <thead
            className="text-[11px] uppercase tracking-wide"
            style={{
              background: `linear-gradient(90deg, ${primary}06, transparent)`,
            }}
          >
            <tr>
              <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">
                Player
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                Min
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                FGM
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                FGA
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                PTS
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                DREB
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                OREB
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                REB
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                AST
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                TOV
              </th>
              <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                BLK
              </th>
            </tr>
          </thead>
          <tbody>
            {playersSorted.map((p, idx) => {
              const key =
                p.unique_key ??
                p.athleteid ??
                `${p.name ?? "Player"}-${p.teamid ?? ""}-${p.gameid ?? ""}`;

              const totreb =
                p.rebounds_total ??
                (Number(p.rebounds_offensive || 0) +
                  Number(p.rebounds_defensive || 0));

              return (
                <tr
                  key={key}
                  className={`transition-colors ${
                    idx % 2 ? "bg-slate-50" : "bg-white"
                  } hover:bg-sky-50`}
                >
                  <td className="px-2 py-1.5 whitespace-nowrap font-medium text-slate-900">
                    {p.name ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-700">
                    {p.minutes ?? ""}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-700">
                    {p.fieldgoals_made ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-600">
                    {p.fieldgoals_attempted ?? 0}
                  </td>
                  <td
                    className="px-2 py-1.5 whitespace-nowrap text-right font-semibold"
                    style={{ color: primary || "#1e3a8a" }}
                  >
                    {p.points ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-600">
                    {p.rebounds_defensive ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-600">
                    {p.rebounds_offensive ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right font-medium text-slate-900">
                    {totreb ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right font-medium text-slate-900">
                    {p.assists ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-700">
                    {p.turnovers ?? 0}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-slate-700">
                    {p.blocks ?? 0}
                  </td>
                </tr>
              );
            })}

            {totals && (
              <tr className="bg-slate-100/90">
                <td
                  className="px-2 py-1.5 whitespace-nowrap text-[11px] font-semibold"
                  style={{ color: primary || "#1e3a8a" }}
                >
                  Team totals
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-900 text-right">
                  {totalMinutes ? totalMinutes.toFixed(1) : ""}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-900 text-right">
                  {totals.fg_made ?? 0}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-700 text-right">
                  {totals.fg_att ?? 0}
                </td>
                <td
                  className="px-2 py-1.5 whitespace-nowrap text-[11px] font-semibold text-right"
                  style={{ color: primary || "#1e3a8a" }}
                >
                  {totals.points ?? 0}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-700 text-right">
                  {totals.dreb ?? 0}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-700 text-right">
                  {totals.oreb ?? 0}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-900 text-right">
                  {totalReb}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-900 text-right">
                  {totals.ast ?? 0}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-700 text-right">
                  {totals.tov ?? 0}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-700 text-right">
                  {totals.blk ?? 0}
                </td>
              </tr>
            )}

            {(!players || players.length === 0) && (
              <tr>
                <td
                  className="px-6 py-4 text-xs text-slate-500 text-center"
                  colSpan={11}
                >
                  No players in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN BOX SCORE: CONTROLS LEFT, TABLES RIGHT (GA-STYLE)             */
/* ------------------------------------------------------------------ */

export default function BoxScore({
  pbp,
  homeTeam,
  awayTeam,
  colors1,
  colors2,
  maxGameSeconds,
}) {
    console.log(colors1)
  // normalize colors so we can pass either string or { primary, secondary }
  const primary1 =
    colors1 && typeof colors1 === "object" ? colors1.primary : colors1 || "#1e3a8a";
  const primary2 =
    colors2 && typeof colors2 === "object" ? colors2.primary : colors2 || "#0f766e";
  const secondary1 =
    colors1 && typeof colors1 === "object" ? colors1.secondary: colors1 || "#1e3a8a";
  const secondary2 =
    colors2 && typeof colors2 === "object" ? colors2.secondary: colors2 || "#0f766e";

  const inferredMax = useMemo(() => {
    let maxSec = 0;
    for (const e of pbp || []) {
      const gs = getGameSecond(e);
      if (Number.isFinite(gs) && gs > maxSec) maxSec = gs;
    }
    return maxSec || DEFAULT_GAME;
  }, [pbp]);

  const gameMax = maxGameSeconds || inferredMax;

  const [timeMode, setTimeMode] = useState("all"); // "all" | "range"
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(gameMax);

  useEffect(() => {
    setEndSec(prev => clamp(prev, 0, gameMax));
  }, [gameMax]);

  const effectiveStart = timeMode === "all" ? 0 : Math.min(startSec, endSec);
  const effectiveEnd =
    timeMode === "all" ? gameMax : Math.max(startSec, endSec);

  const allHomePlayers = useMemo(
    () => getAllPlayersForSide(pbp, "home"),
    [pbp],
  );
  const allAwayPlayers = useMemo(
    () => getAllPlayersForSide(pbp, "away"),
    [pbp],
  );

  const { players: homePlayers, totals: homeTotals } = useMemo(
    () =>
      buildBoxFromPbp(
        pbp,
        "home",
        allHomePlayers,
        effectiveStart,
        effectiveEnd,
      ),
    [pbp, allHomePlayers, effectiveStart, effectiveEnd],
  );

  const { players: awayPlayers, totals: awayTotals } = useMemo(
    () =>
      buildBoxFromPbp(
        pbp,
        "away",
        allAwayPlayers,
        effectiveStart,
        effectiveEnd,
      ),
    [pbp, allAwayPlayers, effectiveStart, effectiveEnd],
  );

  const handleFullGame = () => {
    setTimeMode("all");
    setStartSec(0);
    setEndSec(gameMax);
  };

  const handleFirstHalf = () => {
    setTimeMode("range");
    setStartSec(0);
    setEndSec(Math.min(HALF_LENGTH, gameMax));
  };

  const handleSecondHalfOT = () => {
    setTimeMode("range");
    setStartSec(Math.min(HALF_LENGTH, gameMax));
    setEndSec(gameMax);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* LEFT: controls */}
      <div className="w-full md:w-64 lg:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1">
              Time range (both teams)
            </div>
            <div className="flex flex-wrap gap-1">
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
          </div>

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
                    setStartSec(clamp(val, 0, gameMax));
                  }
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={gameMax}
              value={startSec}
              onChange={e => {
                setTimeMode("range");
                const val = Number(e.target.value);
                setStartSec(clamp(val, 0, Math.min(endSec, gameMax)));
              }}
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
                    setEndSec(clamp(val, 0, gameMax));
                  }
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={gameMax}
              value={endSec}
              onChange={e => {
                setTimeMode("range");
                const val = Number(e.target.value);
                setEndSec(
                  clamp(val, Math.min(startSec, gameMax), gameMax),
                );
              }}
            />

            <div className="text-[10px] text-slate-500">
              Showing {formatTime(effectiveStart)} to {formatTime(effectiveEnd)}{" "}
              (max {formatTime(gameMax)})
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: two team tables */}
      <div className="flex-1 flex flex-col gap-4">
        <TeamPlayersTable
          teamName={homeTeam}
          players={homePlayers}
          totals={homeTotals}
          primary={primary1}
            secondary={secondary1}
        />
        <TeamPlayersTable
          teamName={awayTeam}
          players={awayPlayers}
          totals={awayTotals}
          primary={primary2}
                    secondary={secondary2}
        />
      </div>
    </div>
  );
}

