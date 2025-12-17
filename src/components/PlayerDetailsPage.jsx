import React, { useEffect, useMemo, useState } from "react"
import { ChevronLeft, User, TrendingUp } from "lucide-react"
import { API_BASE } from "../globals";
import { safePerGame, derivePerspective, hex, readableTextColor, formatDate } from "./helper_functions/PlayerDetailsPageHelpers"

async function fetchTeamInfo(teamName) {
  const res = await fetch(
    `${API_BASE}/team/${encodeURIComponent(teamName)}/info`,
  )
  if (!res.ok) throw new Error(`team info ${teamName}: ${res.status}`)
  return await res.json()
}

/* ------------------------------------------------------------------ */
/* Player At-a-Glance (left column)                                   */
/* ------------------------------------------------------------------ */
const PlayerAtAGlance = ({ player, teamName, team, colors, gamesPlayed, year, onSelectTeam, onBack }) => {
  const lastHeight =
    player?.height || player?.height_cm || player?.height_in || null
  const lastWeight =
    player?.weight || player?.weight_lbs || player?.weight_kg || null

  return (
    <div 
      className="rounded-xl shadow-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}08 100%)`,
        borderColor: colors.primary,
      }}
    >
      {/* Decorative background pattern */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
        style={{ background: colors.primary }}
      />
      <div 
        className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-3xl opacity-10"
        style={{ background: colors.secondary }}
      />

      <div className="flex items-center gap-3 z-10">
        {/* Avatar circle with icon */}
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              {player?.name || "Player"}
            </h2>
            {player?.jersey && (
              <span 
                className="px-2 py-1 rounded-full text-xs font-black shadow-md"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                  borderColor: colors.secondary,
                }}
              >
                #{player.jersey}
              </span>
            )}
            {player?.position && (
              <span 
                className="px-2 py-1 rounded-full text-xs font-black shadow-md"
                style={{
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  borderColor: colors.primary,
                }}
              >
                {player.position}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold mt-1 text-slate-600">
            <button
              onClick={() => onSelectTeam?.(teamName)}
              className="font-bold hover:underline transition-colors"
              style={{ color: colors.primary }}
            >
              {teamName}
            </button>
            {team?.conference && <> · {team.conference}</>}
            {year && <> · Season {year}</>}
            {gamesPlayed ? <> · {gamesPlayed} games</> : null}
          </p>
        </div>
      </div>

      <div
        className="h-1.5 w-full rounded-full shadow-md z-10"
        style={{
          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        }}
      />

      {/* Core per-game stats */}
      <div className="grid grid-cols-2 gap-3 text-xs z-10">
        {[
          {
            label: "Minutes",
            value: safePerGame(player?.minutes, gamesPlayed),
            hint: "Per game",
          },
          {
            label: "Points",
            value: safePerGame(player?.points, gamesPlayed),
            hint: "Per game",
          },
          {
            label: "Rebounds",
            value: safePerGame(
              player?.rebounds_total ?? player?.rebounds,
              gamesPlayed,
            ),
            hint: "Per game",
          },
          {
            label: "Assists",
            value: safePerGame(player?.assists, gamesPlayed),
            hint: "Per game",
          },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl px-4 py-3 shadow-lg bg-white"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
              {stat.label}
            </span>
            <span
              className="text-lg font-black"
              style={{ color: colors.primary }}
            >
              {stat.value}
            </span>
            {stat.hint && (
              <span className="text-[10px] font-medium text-slate-500">
                {stat.hint}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Physical and misc info */}
      <div className="grid grid-cols-2 gap-3 text-xs z-10">
        <div 
          className="flex flex-col gap-1 rounded-xl px-4 py-3 shadow-lg bg-white"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
            Height
          </span>
          <span className="text-base font-black text-slate-900">
            {lastHeight ? String(lastHeight) : "—"}
          </span>
        </div>
        <div 
          className="flex flex-col gap-1 rounded-xl px-4 py-3 shadow-lg bg-white"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
            Weight
          </span>
          <span className="text-base font-black text-slate-900">
            {lastWeight ? String(lastWeight) : "—"}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Game log (right column)                                            */
/* ------------------------------------------------------------------ */
const PlayerGameLog = ({
  rows,
  teamName,
  colors,
  onSelectTeam,
  onSelectGame,
}) => (
  <div 
    className="rounded-xl shadow-xl overflow-hidden"
  >
    <div 
      className="px-4 py-3 flex items-center justify-between shadow-md"
      style={{
        background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      }}
    >
      <h3 
        className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
        style={{ color: colors.text }}
      >
        <TrendingUp className="h-4 w-4" />
        Game log
      </h3>
      <span 
        className="text-xs font-bold px-3 py-1 rounded-full"
        style={{
          backgroundColor: `${colors.text}20`,
          color: colors.text,
        }}
      >
        {rows.length ? `${rows.length} games` : "No data"}
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead 
          style={{
            background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}08 100%)`,
          }}
        >
          <tr>
            <th 
              className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Date
            </th>
            <th 
              className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Opponent
            </th>
            <th 
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              H/A/N
            </th>
            <th 
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Result
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Min
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Pts
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Reb
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Ast
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              FG
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              3PT
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              FT
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, idx) => {
            const { site, opponent, result } = derivePerspective(g, teamName)
            const min =
              g.minutes != null
                ? Number(g.minutes).toFixed(1)
                : g.min != null
                ? Number(g.min).toFixed(1)
                : "—"
            const pts =
              g.points != null
                ? g.points
                : g.pts != null
                ? g.pts
                : "—"
            const reb =
              g.rebounds_total != null
                ? g.rebounds_total
                : g.reb != null
                ? g.reb
                : "—"
            const ast =
              g.assists != null
                ? g.assists
                : g.ast != null
                ? g.ast
                : "—"
            const fg = [g.fgm ?? g.fg_made, g.fga ?? g.fg_att]
            const fg3 = [
              g.fg3m ?? g.fg3_made ?? g.tpm,
              g.fg3a ?? g.fg3_att ?? g.tpa,
            ]
            const ft = [g.ftm ?? g.ft_made, g.fta ?? g.ft_att]
            const isWin = result === "w"
            const resultColor = isWin ? "#16a34a" : "#dc2626"
            return (
              <tr
                key={g.gameid ?? `${g.gamedate}-${idx}`}
                className="cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: idx % 2 === 0 ? "#ffffff" : `${colors.primary}05`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.dataset.originalBg = e.currentTarget.style.backgroundColor
                  e.currentTarget.style.background = `linear-gradient(90deg, ${colors.primary}15 0%, ${colors.secondary}15 100%)`
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.backgroundColor = e.currentTarget.dataset.originalBg || (idx % 2 === 0 ? "#ffffff" : `${colors.primary}05`)
                  e.currentTarget.style.boxShadow = ''
                }}
                onClick={() => {
                  if (g.gameid) onSelectGame?.(g.gameid)
                }}
              >
                <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-700">
                  {formatDate(g.startdate || g.gamedate)}
                </td>
                <td
                  className="px-3 py-3 whitespace-nowrap font-bold hover:underline"
                  style={{ color: colors.secondary }}
                  onClick={e => {
                    e.stopPropagation()
                    if (opponent) onSelectTeam?.(opponent)
                  }}
                >
                  {opponent || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center font-bold text-slate-700">
                  {{ home: "H", away: "A", neutral: "N" }[site] || "—"}
                </td>
                <td
                  className="px-3 py-3 whitespace-nowrap text-center font-black uppercase text-sm"
                  style={{ color: resultColor }}
                >
                  {result || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-700">
                  {min}
                </td>
                <td 
                  className="px-3 py-3 whitespace-nowrap text-right font-black text-base"
                  style={{ color: colors.primary }}
                >
                  {pts}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-700">
                  {reb}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-700">
                  {ast}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-medium text-slate-700">
                  {fg[0] != null && fg[1] != null ? `${fg[0]}-${fg[1]}` : "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-medium text-slate-700">
                  {fg3[0] != null && fg3[1] != null ? `${fg3[0]}-${fg3[1]}` : "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-medium text-slate-700">
                  {ft[0] != null && ft[1] != null ? `${ft[0]}-${ft[1]}` : "—"}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td
                className="px-6 py-8 text-center text-xs font-semibold text-slate-500"
                colSpan={11}
              >
                No games found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

/* ------------------------------------------------------------------ */
/* Main page                                                          */
/* ------------------------------------------------------------------ */
const PlayerDetailsPage = ({
  player,
  team,
  teams,
  gameLog,
  year = 2025,
  onBack,
  onSelectTeam,
  onSelectGame,
}) => {
  const teamName =
    team?.team || player?.team || player?.teamname || player?.school || "Unknown"

  const [teamInfo, setTeamInfo] = useState(null)

  useEffect(() => {
    if (!teamName) return
    let alive = true
    ;(async () => {
      try {
        const info = await fetchTeamInfo(teamName)
        if (!alive) return
        setTeamInfo(info)
      } catch (e) {
        console.error("player page team info fetch error", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [teamName])

  const colors = useMemo(() => {
    const primary = hex(teamInfo?.primarycolor, "#1e3a8a")
    const secondary = hex(teamInfo?.secondarycolor, "#3b82f6")
    const text = readableTextColor(primary)
    return { primary, secondary, text }
  }, [teamInfo])

  const gamesPlayed =
    player?.games ?? player?.gp ?? (Array.isArray(gameLog) ? gameLog.length : 0)

  const rows = Array.isArray(gameLog)
    ? [...gameLog].sort(
        (a, b) =>
          new Date(a.gamedate || a.startdate) -
          new Date(b.gamedate || b.startdate),
      )
    : []

  return (
    <div className="px-4 py-6 min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600 transition-all hover:translate-x-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900">
                {player?.name || "Player"} Profile
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                {teamName}{" "}
                {team?.conference ? `· ${team.conference}` : ""} · Season{" "}
                {String(year)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border-2 border-slate-200 bg-slate-50 text-slate-700 shadow-md">
              <span>Season</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white text-slate-800 border border-slate-200">
                {String(year)}
              </span>
            </div>
          </div>
        </div>

        {/* Main layout: left player card, right game log */}
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-4">
          <aside className="space-y-4">
            <PlayerAtAGlance
              player={player}
              teamName={teamName}
              team={team}
              colors={colors}
              gamesPlayed={gamesPlayed}
              year={year}
              onSelectTeam={onSelectTeam}
            />
          </aside>
          <main className="space-y-4">
            <PlayerGameLog
              rows={rows}
              teamName={teamName}
              colors={colors}
              onSelectTeam={onSelectTeam}
              onSelectGame={onSelectGame}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

export default PlayerDetailsPage
