import React, { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Trophy, TrendingUp } from "lucide-react"
import { API_BASE } from "../globals";

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

// Helper to create lighter version of color
function lightenColor(hex, percent = 30) {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.floor((255 - ((num >> 16) & 0xff)) * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor((255 - ((num >> 8) & 0xff)) * percent / 100))
  const b = Math.min(255, (num & 0xff) + Math.floor((255 - (num & 0xff)) * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
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
    <div 
      className="rounded-xl shadow-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Decorative background pattern */}

      <div className="flex items-center gap-3 z-10">
        {teamInfo?.logo && (
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl relative"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            <img
              src={teamInfo.logo}
              alt={`${team?.team} logo`}
              className="h-12 w-12 object-contain bg-white rounded-xl p-2"
              onError={e => (e.target.style.display = "none")}
            />
          </div>
        )}
        <div>
          <div className="flex items-baseline gap-2">
            {team?.rank != null && (
              <span
                className="text-xs font-black px-3 py-1 rounded-full border-2 shadow-lg flex items-center gap-1"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                  borderColor: colors.secondary,
                }}
              >
                <Trophy className="h-3 w-3" />
                #{team.rank}
              </span>
            )}
            <h2 className="text-xl font-black leading-tight text-slate-900">
              {team?.team}
            </h2>
          </div>
          <p className="text-xs font-semibold mt-1 text-slate-600">
            {teamInfo?.conference ?? "Conference unknown"}
          </p>
        </div>
      </div>

      <div
        className="h-1.5 w-full rounded-full shadow-md"
        style={{
          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        }}
      />

      <div className="grid grid-cols-2 gap-3 text-xs z-10">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl px-4 py-3 shadow-lg relative overflow-hidden backdrop-blur-sm bg-white"
          >
            <span 
              className="text-[11px] font-bold uppercase tracking-wide text-slate-600"
            >
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
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Game Log Table                                                     */
/* ------------------------------------------------------------------ */
const GameLog = ({ rows, teamName, colors, onSelectGame, onSelectTeam }) => (
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
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Score
            </th>
            <th 
              className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
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
                className="cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: i % 2 === 0 ? "#ffffff" : `${colors.primary}05`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.dataset.originalBg = e.currentTarget.style.backgroundColor
                  e.currentTarget.style.background = `linear-gradient(90deg, ${colors.primary}15 0%, ${colors.secondary}15 100%)`
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.backgroundColor = e.currentTarget.dataset.originalBg || (i % 2 === 0 ? "#ffffff" : `${colors.primary}05`)
                  e.currentTarget.style.boxShadow = ''
                }}
                onClick={() => onSelectGame?.(g.gameid)}
              >
                <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-700">
                  {formatDate(g.startdate || g.gamedate)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap font-bold">
                  <span
                    onClick={e => {
                      e.stopPropagation()
                      onSelectTeam?.(opponent)
                    }}
                    className="hover:underline transition-colors"
                    style={{ color: colors.primary}}
                  >
                    {opponent}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap font-bold text-center text-slate-700">
                  {{ home: "H", away: "A", neutral: "N" }[site] || "—"}
                </td>
                <td
                  className="px-3 py-3 whitespace-nowrap font-black uppercase text-center text-sm"
                  style={{ color: resultColor }}
                >
                  {result || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center font-bold text-slate-900">
                  {teamScore != null && oppScore != null ? (
                    <span>
                      <span className={isWin ? "font-black" : ""}>
                        {teamScore}
                      </span>
                      <span className="text-slate-400 mx-1">-</span>
                      <span className={!isWin ? "font-black" : ""}>
                        {oppScore}
                      </span>
                      {diff != null && (
                        <span
                          className="text-xs ml-2 font-bold"
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
                <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium">
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
                className="px-6 py-8 text-center text-xs font-semibold text-slate-500"
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
  <div 
    className="rounded-xl shadow-xl overflow-hidden"
  >
    <div 
      className="px-4 py-3 flex items-center justify-between shadow-md"
      style={{
        background: `linear-gradient(90deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
      }}
    >
      <h3 
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: colors.text }}
      >
        Roster
      </h3>
      <span 
        className="text-xs font-bold px-3 py-1 rounded-full"
        style={{
          backgroundColor: `${colors.text}20`,
          color: colors.text,
        }}
      >
        {playerInfo.length ? `${playerInfo.length} players` : "No data"}
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead 
          style={{
            background: `linear-gradient(135deg, ${colors.secondary}08 0%, ${colors.primary}08 100%)`,
          }}
        >
          <tr>
            <th 
              className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Player
            </th>
            <th 
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              Pos
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              MPG
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              PPG
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
              RPG
            </th>
            <th 
              className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider border-b-2 text-slate-700"
              style={{ borderColor: colors.primary }}
            >
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
                className="cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: i % 2 === 0 ? "#ffffff" : `${colors.secondary}05`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.dataset.originalBg = e.currentTarget.style.backgroundColor
                  e.currentTarget.style.background = `linear-gradient(90deg, ${colors.secondary}15 0%, ${colors.primary}15 100%)`
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.backgroundColor = e.currentTarget.dataset.originalBg || (i % 2 === 0 ? "#ffffff" : `${colors.secondary}05`)
                  e.currentTarget.style.boxShadow = ''
                }}
                onClick={() => {
                  if (!playerId) return
                  navigate(`/player/${playerId}/${year}`)
                }}
              >
                <td 
                  className="px-3 py-3 whitespace-nowrap font-bold hover:underline"
                  style={{ color: colors.primary}}
                >
                  {p.name}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center font-bold text-slate-700">
                  {p.position || p.pos || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-700">
                  {p.minutes != null && p.games
                    ? (p.minutes / p.games).toFixed(1)
                    : "—"}
                </td>
                <td 
                  className="px-3 py-3 whitespace-nowrap text-right font-black text-base"
                  style={{ color: colors.primary }}
                >
                  {p.points != null && p.games
                    ? (p.points / p.games).toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-700">
                  {p.rebounds_total != null && p.games
                    ? (p.rebounds_total / p.games).toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-700">
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
                className="px-6 py-8 text-center text-xs font-semibold text-slate-500"
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
  const [teamData, setTeamData] = useState(team || null)
  const [teamInfo, setTeamInfo] = useState(null)
  const [playerInfo, setPlayerInfo] = useState(null)

  const teamName = teamData?.team || team?.team || "Duke"

  useEffect(() => {
    let alive = true
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
              Rankings
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900">
                {teamData?.team || "Team"} Analytics
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                {teamData?.team || "Team"}{" "}
                {teamData?.conference ? `· ${teamData.conference}` : ""} ·
                Season {String(year)}
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

        {/* Main layout */}
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-4">
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
