import React, { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

const API_BASE = "https://dommyhoopsbackend.onrender.com/api"

// --- Helper Functions ---
function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(String(iso).replace(" ", "T"))
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
    teamScore != null && oppScore != null ? teamScore - oppScore : null

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

// --- API Functions ---
async function fetchTeamInfo(teamName) {
  const res = await fetch(
    `${API_BASE}/team/${encodeURIComponent(teamName)}/info`,
  )
  if (!res.ok) throw new Error(`team info ${teamName}: ${res.status}`)
  return await res.json()
}

async function fetchPlayerInfo(teamName) {
  const res = await fetch(
    `${API_BASE}/team/${encodeURIComponent(teamName)}/player-stats`,
  )
  if (!res.ok) throw new Error(`team players ${teamName}: ${res.status}`)
  return await res.json()
}

// team stats from /api/stats/:team
async function fetchTeamStats(teamName, year = 2025) {
  const url = `${API_BASE}/stats/team/${encodeURIComponent(teamName)}?year=${year}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`team stats ${teamName}: ${res.status}`)
  return await res.json()
}

/* ------------------------------------------------------------------ */
/* At-a-Glance Card                                                   */
/* ------------------------------------------------------------------ */

const AtAGlance = ({ team, teamInfo, colors, onBack }) => {
  const stats = [
    { label: "Record", value: team?.record ?? "—" },
    {
      label: "AdjEM",
      value: team?.eff != null ? Number(team.eff).toFixed(1) : "—",
      hint: "Efficiency margin",
    },
    {
      label: "AdjOE",
      value: team?.off_eff != null ? Number(team.off_eff).toFixed(1) : "—",
      hint: "Offense / 100 poss",
    },
    {
      label: "AdjDE",
      value: team?.def_eff != null ? Number(team.def_eff).toFixed(1) : "—",
      hint: "Defense / 100 poss",
    },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-4">
      <button
        onClick={onBack}
        className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-blue-600"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to rankings
      </button>

      <div className="flex items-center gap-3">
        {teamInfo?.logo && (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center shadow-md"
            style={{
              background: colors.primary,
            }}
          >
            <img
              src={teamInfo.logo}
              alt={`${team?.team} logo`}
              className="h-8 w-8 object-contain bg-white rounded-full p-1.5"
              onError={e => (e.target.style.display = "none")}
            />
          </div>
        )}
        <div>
          <div className="flex items-baseline gap-2">
            {team?.rank != null && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                  borderColor: `${colors.primary}50`,
                  boxShadow: `0 0 8px ${colors.primary}40`,
                }}
              >
                #{team.rank}
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {team?.team}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {teamInfo?.conference ?? "Conference unknown"}
          </p>
        </div>
      </div>

      <div
        className="h-1 w-full rounded-full"
        style={{
          background: colors.primary,
        }}
      />

      <div className="grid grid-cols-2 gap-3 text-xs">
        {stats.map(stat => (
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
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Game Log Table                                                     */
/* ------------------------------------------------------------------ */

const GameLog = ({ rows, teamName, colors, onSelectGame, onSelectTeam }) => (
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
            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Score
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Venue
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, i) => {
            const { site, opponent, teamScore, oppScore, result, diff } =
              derivePerspective(g, teamName)
            const isWin = result === "w"
            const resultColor = isWin ? "#16a34a" : "#dc2626"

            return (
              <tr
                key={g.gameid}
                className={`cursor-pointer transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50"
                } hover:bg-slate-100/70`}
                onClick={() => onSelectGame?.(g.gameid)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                  {formatDate(g.startdate || g.gamedate)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  <span
                    onClick={e => {
                      e.stopPropagation()
                      onSelectTeam?.(opponent)
                    }}
                    className="text-blue-800 hover:text-blue-600 hover:underline"
                  >
                    {opponent}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-center">
                  {{ home: "H", away: "A", neutral: "N" }[site] || "—"}
                </td>
                <td
                  className="px-3 py-2 whitespace-nowrap font-bold uppercase text-center"
                  style={{
                    color: resultColor,
                    fontSize: "12px",
                  }}
                >
                  {result || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center font-semibold text-slate-900">
                  {teamScore != null && oppScore != null ? (
                    <span>
                      <span className={isWin ? "font-bold" : ""}>
                        {teamScore}
                      </span>
                      <span className="text-slate-400 mx-0.5">-</span>
                      <span className={!isWin ? "font-bold" : ""}>
                        {oppScore}
                      </span>
                      {diff != null && (
                        <span
                          className="text-[10px] ml-1.5 font-normal"
                          style={{ color: resultColor }}
                        >
                          ({diff > 0 ? "+" : ""}
                          {diff})
                        </span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {g.venue ? g.venue : ""}
                  {(g.city || g.state)
                    ? ` ${g.venue ? "· " : ""}${[g.city, g.state]
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td
                className="px-6 py-6 text-center text-xs text-slate-500"
                colSpan={6}
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
/* Roster Table                                                       */
/* ------------------------------------------------------------------ */

const Roster = ({ playerInfo, colors, navigate, year }) => (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-200">
      <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wide">
        Roster
      </h3>
      <span className="text-[11px] text-slate-500">
        {playerInfo.length ? `${playerInfo.length} players` : "No data"}
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-slate-800">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Player
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              Pos
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              MPG
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              PPG
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              RPG
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
              APG
            </th>
          </tr>
        </thead>
        <tbody>
          {playerInfo.map((p, i) => {
            const playerId = p.athletesourceid ?? p.playerid ?? p.id ?? null
            return (
              <tr
                key={
                  playerId ??
                  `${p.name}-${Math.random().toString(36).slice(2)}`
                }
                className={`cursor-pointer transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50"
                } hover:bg-slate-100/70`}
                onClick={() => {
                  if (!playerId) return
                  navigate(`/player/${playerId}/${year}`)
                }}
              >
                <td className="px-3 py-2 whitespace-nowrap font-medium text-blue-800 hover:text-blue-600 hover:underline">
                  <span className="hover:underline">{p.name}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center text-slate-600">
                  {p.position || p.pos || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {p.minutes != null && p.games
                    ? (p.minutes / p.games).toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-slate-900">
                  {p.points != null && p.games
                    ? (p.points / p.games).toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {p.rebounds_total != null && p.games
                    ? (p.rebounds_total / p.games).toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-700">
                  {p.assists != null && p.games
                    ? (p.assists / p.games).toFixed(1)
                    : "—"}
                </td>
              </tr>
            )
          })}
          {playerInfo.length === 0 && (
            <tr>
              <td
                className="px-6 py-6 text-center text-xs text-slate-500"
                colSpan={6}
              >
                No roster data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

/* ------------------------------------------------------------------ */
/* Main Page                                                          */
/* ------------------------------------------------------------------ */

const TeamDetailsPage = ({
  team,
  games,
  teams,
  onBack,
  onSelectGame,
  onSelectTeam,
  year = 2025,
}) => {
  const navigate = useNavigate()

  // teamData is what comes from /api/stats/:team
  const [teamData, setTeamData] = useState(team || null)
  const [teamInfo, setTeamInfo] = useState(null)
  const [playerInfo, setPlayerInfo] = useState(null)

  // Resolve teamName from props or fetched data
  const teamName = teamData?.team || team?.team || "Duke"

  useEffect(() => {
    let alive = true

    // fetch primary rankings row
    ;(async () => {
      try {
        const stats = await fetchTeamStats(teamName, year)
        if (!alive) return
        setTeamData(stats)
      } catch (e) {
        console.error("team stats fetch error", e)
      }
    })()

    ;(async () => {
      try {
        const info = await fetchTeamInfo(teamName)
        if (!alive) return
        setTeamInfo(info)
      } catch (e) {
        console.error("team info fetch error", e)
      }
    })()

    ;(async () => {
      try {
        const info = await fetchPlayerInfo(teamName)
        if (!alive) return
        info.sort((a, b) => b.minutes - a.minutes)
        setPlayerInfo(info)
      } catch (e) {
        console.error("team player fetch error", e)
      }
    })()

    return () => {
      alive = false
    }
  }, [teamName, year])

  const colors = useMemo(() => {
    const primary = hex(teamInfo?.primarycolor, "#1e3a8a")
    const secondary = hex(teamInfo?.secondarycolor, "#3b82f6")
    const text = readableTextColor(primary)
    return { primary, secondary, text }
  }, [teamInfo])

  const gameRows = useMemo(
    () =>
      Array.isArray(games)
        ? [...games].sort(
            (a, b) =>
              new Date(a.gamedate || a.startdate) -
              new Date(b.gamedate || b.startdate),
          )
        : [],
    [games],
  )

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-blue-600"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Rankings
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-sm md:text-base font-semibold text-slate-900">
                {teamData?.team || "Team"} analytics
              </h1>
              <p className="text-[11px] text-slate-500">
                {teamData?.team || "Team"}{" "}
                {teamData?.conference ? `· ${teamData.conference}` : ""} ·
                Season {String(year)}
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

        {/* Main layout */}
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-4">
          <aside className="space-y-4">
            <AtAGlance
              team={teamData}
              teamInfo={teamInfo}
              colors={colors}
              onBack={onBack}
            />
          </aside>

          <main className="space-y-4">
            <GameLog
              rows={gameRows}
              teamName={teamName}
              colors={colors}
              onSelectGame={onSelectGame}
              onSelectTeam={onSelectTeam}
            />
            <Roster
              playerInfo={playerInfo || []}
              colors={colors}
              navigate={navigate}
              year={year}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

export default TeamDetailsPage

