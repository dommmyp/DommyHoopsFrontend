import React, { useEffect, useMemo, useState } from "react"
import { ChevronLeft } from "lucide-react"

const API_BASE = "http://localhost:4000/api"

// helpers
function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(String(iso).replace(" ", "T"))
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function derivePerspective(row, teamName) {
  const isHome = row.hometeam === teamName
  const isAway = row.awayteam === teamName
  const site = isHome ? "home" : isAway ? "away" : "neutral"
  const opponent = isHome ? row.awayteam : row.hometeam
  const teamScore = isHome ? row.homepoints : row.awaypoints
  const oppScore = isHome ? row.awaypoints : row.homepoints
  const result =
    row.status === "final" && teamScore != null && oppScore != null
      ? teamScore > oppScore
        ? "w"
        : "l"
      : row.status || ""
  const diff =
    teamScore != null && oppScore != null
      ? Math.abs(teamScore - oppScore)
      : null

  return { site, opponent, teamScore, oppScore, result, diff }
}

const hex = (x, fallback) => {
  const s = String(x || "").trim().replace(/^#/, "")
  return s ? `#${s}` : fallback
}

function readableTextColor(bgHex) {
  const s = (bgHex || "#000000").replace("#", "")
  const r0 = parseInt(s.substring(0, 2) || "00", 16) / 255
  const g0 = parseInt(s.substring(2, 4) || "00", 16) / 255
  const b0 = parseInt(s.substring(4, 6) || "00", 16) / 255
  const [r, g, b] = [r0, g0, b0].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  )
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.5 ? "#111111" : "#ffffff"
}

async function fetchTeamInfo(teamName) {
  const res = await fetch(
    `${API_BASE}/team/${encodeURIComponent(teamName)}/info`,
  )
  if (!res.ok) throw new Error(`team info ${teamName}: ${res.status}`)
  return await res.json()
}

function safePerGame(total, games) {
  if (!games || games <= 0 || total == null) return "—"
  return (Number(total) / games).toFixed(1)
}

/* ------------------------------------------------------------------ */
/* Player At-a-Glance (left column)                                   */
/* ------------------------------------------------------------------ */

const PlayerAtAGlance = ({ player, teamName, team, colors, gamesPlayed, year, onSelectTeam }) => {
  const lastHeight =
    player?.height || player?.height_cm || player?.height_in || null
  const lastWeight =
    player?.weight || player?.weight_lbs || player?.weight_kg || null

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Simple avatar circle */}
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm shadow-md"
          style={{ background: colors.primary, color: colors.text }}
        >
          {player?.name
            ?.split(" ")
            .map(part => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P"}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {player?.name || "Player"}
            </h2>
            {player?.jersey && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                #{player.jersey}
              </span>
            )}
            {player?.position && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {player.position}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            <button
              onClick={() => onSelectTeam?.(teamName)}
              className="font-medium text-blue-700 hover:text-blue-600 hover:underline"
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
        className="h-1 w-full rounded-full"
        style={{ background: colors.primary }}
      />

      {/* Core per-game stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
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
        ].map(stat => (
          <div
            key={stat.label}
            className="flex flex-col gap-0.5 rounded-lg px-3 py-2 bg-slate-50 border border-slate-200"
          >
            <span className="text-[11px] text-slate-500">{stat.label}</span>
            <span
              className="text-sm font-bold"
              style={{ color: colors.primary }}
            >
              {stat.value}
            </span>
            {stat.hint && (
              <span className="text-[10px] text-slate-400">{stat.hint}</span>
            )}
          </div>
        ))}
      </div>

      {/* Physical and misc info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2 bg-slate-50 border border-slate-200">
          <span className="text-[11px] text-slate-500">Height</span>
          <span className="text-sm font-semibold text-slate-800">
            {lastHeight ? String(lastHeight) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2 bg-slate-50 border border-slate-200">
          <span className="text-[11px] text-slate-500">Weight</span>
          <span className="text-sm font-semibold text-slate-800">
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
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-200">
      <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wide">
        Game log
      </h3>
      <span className="text-[11px] text-slate-500">
        {rows.length ? `${rows.length} games` : "No data"}
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-slate-800">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Date
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Opponent
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              H/A/N
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Result
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Min
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Pts
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Reb
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Ast
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              FG
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              3PT
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
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
                className={`cursor-pointer transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                } hover:bg-slate-100/70`}
                onClick={() => {
                  if (g.gameid) onSelectGame?.(g.gameid)
                }}
              >
                <td className="px-3 py-2 whitespace-nowrap text-slate-700 font-medium">
                  {formatDate(g.startdate || g.gamedate)}
                </td>

                <td
                  className="px-3 py-2 whitespace-nowrap font-medium text-blue-800 hover:text-blue-600 hover:underline"
                  onClick={e => {
                    e.stopPropagation()
                    if (opponent) onSelectTeam?.(opponent)
                  }}
                >
                  {opponent || "—"}
                </td>

                <td className="px-3 py-2 whitespace-nowrap text-center text-slate-600">
                  {{ home: "H", away: "A", neutral: "N" }[site] || "—"}
                </td>

                <td
                  className="px-3 py-2 whitespace-nowrap text-center font-bold uppercase"
                  style={{ color: resultColor, fontSize: "12px" }}
                >
                  {result || "—"}
                </td>

                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {min}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-900">
                  {pts}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {reb}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {ast}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {fg[0] != null && fg[1] != null ? `${fg[0]}-${fg[1]}` : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {fg3[0] != null && fg3[1] != null ? `${fg3[0]}-${fg3[1]}` : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {ft[0] != null && ft[1] != null ? `${ft[0]}-${ft[1]}` : "—"}
                </td>
              </tr>
            )
          })}

          {rows.length === 0 && (
            <tr>
              <td
                className="px-6 py-6 text-center text-xs text-slate-500"
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
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar to match TeamDetailsPage */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-blue-600"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-sm md:text-base font-semibold text-slate-900">
                {player?.name || "Player"} profile
              </h1>
              <p className="text-[11px] text-slate-500">
                {teamName}{" "}
                {team?.conference ? `· ${team.conference}` : ""} · Season{" "}
                {String(year)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border"
              style={{
                borderColor: colors.primary,
                background: `${colors.primary}10`,
              }}
            >
              <span className="text-slate-600">Season</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-xs text-slate-800">
                {String(year)}
              </span>
            </div>
          </div>
        </div>

        {/* Main layout: left player card, right game log */}
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-4">
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

