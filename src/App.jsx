import React, { useEffect, useState, useCallback } from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useParams,
  useNavigate,
} from "react-router-dom"
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  LineChart,
  Settings,
  Info,
  ListOrdered,
  Users,
  Database,
  Trophy,
  LayoutDashboard,
} from "lucide-react"

import RankingsPage from "./components/RankingsPage"
import TeamDetailsPage from "./components/TeamDetailsPage"
import GameDetailsPage from "./components/GameDetailsPage"
import ScoutingReportPage from "./components/ScoutingReportPage"
import PlayerDetailsPage from "./components/PlayerDetailsPage"
import AgentChat from "./components/AgentChat"

import { API_BASE } from "./globals";

const SIDEBAR_W_EXPANDED = 256
const SIDEBAR_W_COLLAPSED = 72

/* Reusable simple card page for non-core routes */
function SimpleCardPage({ title, subtitle, children }) {
  return (
    <div className="px-4 py-6 bg-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-5">
          <h1 className="text-sm md:text-base font-semibold text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          )}
          {children && (
            <div className="mt-3 text-sm text-slate-700">{children}</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Sidebar link */
function SidebarLink({ to, icon: Icon, label, expanded }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
      title={expanded ? undefined : label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {expanded && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

/* Sidebar */
function Sidebar({ expanded, setExpanded, drawerOpen, setDrawerOpen }) {
  const width = expanded ? SIDEBAR_W_EXPANDED : SIDEBAR_W_COLLAPSED

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={[
          "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity",
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setDrawerOpen(false)}
      />

      <aside
        className={[
          "h-full bg-white border-r border-slate-200 flex flex-col transition-transform",
          "fixed md:static z-50",
          drawerOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{ width }}
        aria-label="Sidebar"
      >
        {/* Brand + toggles */}
        <div className="flex items-center justify-between gap-2 p-3 border-b border-slate-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-sm" />
            {expanded && (
              <span className="font-semibold text-slate-900 tracking-tight">
                DommyHoops
              </span>
            )}
          </div>

          {/* Mobile close button */}
          <button
            className="p-2 rounded-md hover:bg-slate-100 md:hidden"
            aria-label="Close sidebar"
            onClick={() => setDrawerOpen(false)}
          >
            <ChevronLeft className="h-5 w-5 text-slate-700" />
          </button>

          {/* Desktop collapse or expand */}
          <button
            className="hidden md:inline-flex p-2 rounded-md hover:bg-slate-100"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setExpanded(v => !v)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronLeft className="h-5 w-5 text-slate-700" />
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-700" />
            )}
          </button>
        </div>

        {/* Primary nav */}
        <nav className="p-3 space-y-1 overflow-y-auto text-xs">
          <SidebarLink
            to="/"
            icon={LayoutDashboard}
            label="Rankings"
            expanded={expanded}
          />
          <SidebarLink
            to="/scouting"
            icon={Users}
            label="Scouting Report"
            expanded={expanded}
          />
          <SidebarLink
            to="/data"
            icon={Database}
            label="Data"
            expanded={expanded}
          />

          {expanded && (
            <div className="pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Explore
            </div>
          )}
          <SidebarLink
            to="/teams"
            icon={ListOrdered}
            label="Teams"
            expanded={expanded}
          />
          <SidebarLink
            to="/games"
            icon={Trophy}
            label="Games"
            expanded={expanded}
          />
          <SidebarLink
            to="/trends"
            icon={LineChart}
            label="Trends"
            expanded={expanded}
          />
          <SidebarLink
            to="/compare"
            icon={BarChart3}
            label="Compare"
            expanded={expanded}
          />

          {expanded && (
            <div className="pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              App
            </div>
          )}
          <SidebarLink
            to="/settings"
            icon={Settings}
            label="Settings"
            expanded={expanded}
          />
          <SidebarLink
            to="/about"
            icon={Info}
            label="About"
            expanded={expanded}
          />
        </nav>
      </aside>
    </>
  )
}

/* Data page */
const DataPage = ({ teams, year }) => (
  <SimpleCardPage
    title="Data explorer"
    subtitle={`DommyHoops DuckDB snapshot · Season ${year}`}
  >
    <p>
      You can add tables, metrics, and custom views here. Current season has{" "}
      <span className="font-semibold">{teams.length}</span> teams loaded.
    </p>
  </SimpleCardPage>
)

/* Placeholders for future tabs */
const TeamsIndex = () => (
  <SimpleCardPage
    title="Teams directory"
    subtitle="Browse teams and jump into their analytics pages."
  >
    Teams directory coming soon.
  </SimpleCardPage>
)

const GamesIndex = () => (
  <SimpleCardPage
    title="Games browser"
    subtitle="Search, filter, and jump into detailed game views."
  >
    Games browser coming soon.
  </SimpleCardPage>
)

const TrendsPage = () => (
  <SimpleCardPage
    title="Trends"
    subtitle="Tempo, efficiency, and win probability trends over the season."
  >
    Trends and charts coming soon.
  </SimpleCardPage>
)

const ComparePage = () => (
  <SimpleCardPage
    title="Compare"
    subtitle="Side-by-side team or player comparisons."
  >
    Team or player compare coming soon.
  </SimpleCardPage>
)

const SettingsPage = () => (
  <SimpleCardPage
    title="Settings"
    subtitle="Control DommyHoops preferences and defaults."
  >
    App settings coming soon.
  </SimpleCardPage>
)

const AboutPage = () => (
  <SimpleCardPage
    title="About DommyHoops"
    subtitle="NCAA Division I men’s basketball analytics."
  >
    This is your custom analytics workspace for college hoops.
  </SimpleCardPage>
)

/* App shell with fixed sidebar */
const NCAABasketballApp = () => {
  const [teams, setTeams] = useState([])
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem("sidebarExpanded")
    return saved ? JSON.parse(saved) : true
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Global AI overlay state
  const [showAgent, setShowAgent] = useState(false)

  const agentContext =
    "You are the DommyHoops basketball analytics assistant for NCAA Division I men's college basketball, 2025 season. Use only DommyHoops database values."

  useEffect(() => {
    localStorage.setItem("sidebarExpanded", JSON.stringify(sidebarExpanded))
  }, [sidebarExpanded])

  const onKey = useCallback(e => {
    // Sidebar toggle: Ctrl/Cmd + B
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault()
      if (window.matchMedia("(min-width: 768px)").matches) {
        setSidebarExpanded(v => !v)
      } else {
        setDrawerOpen(v => !v)
      }
    }
    // AI toggle: Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault()
      setShowAgent(v => !v)
    }
    // Close sidebar and AI with Escape
    if (e.key === "Escape") {
      setDrawerOpen(false)
      setShowAgent(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onKey])

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/teams`)
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : data?.teams
        setTeams(Array.isArray(rows) ? rows : [])
      })
      .catch(err => {
        console.error("teams fetch error", err)
        if (alive) setTeams([])
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <Router>
      {/* Full height layout with fixed sidebar and scrollable content */}
      <div className="h-screen flex overflow-hidden bg-slate-100 relative">
        {/* Fixed sidebar column */}
        <div className="fixed inset-y-0 left-0 z-40 flex">
          <Sidebar
            expanded={sidebarExpanded}
            setExpanded={setSidebarExpanded}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
          />
        </div>

        {/* Main content column */}
        <div
          className="flex-1 flex flex-col overflow-scroll"
          style={{
            marginLeft: sidebarExpanded
              ? SIDEBAR_W_EXPANDED
              : SIDEBAR_W_COLLAPSED,
            transition: "margin-left 0.2s ease-in-out",
          }}
        >
          {/* Scrollable content area */}
          <main className="flex-1 w-full mx-auto">
            <Routes>
              <Route path="/" element={<RankingsPage teams={teams} />} />
              <Route path="/scouting" element={<ScoutingReportPage />} />
              <Route
                path="/data"
                element={<DataPage teams={teams} year={2025} />}
              />

              {/* Future tabs */}
              <Route path="/teams" element={<TeamsIndex />} />
              <Route path="/games" element={<GamesIndex />} />
              <Route path="/trends" element={<TrendsPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Detail wrappers */}
              <Route
                path="/team/:teamName"
                element={<TeamDetailsWrapper teams={teams} />}
              />
              <Route
                path="/game/:gameId"
                element={<GameDetailsWrapper teams={teams} />}
              />
              <Route
                path="/player/:playerId/:year"
                element={<PlayerDetailsWrapper teams={teams} />}
              />
            </Routes>
          </main>
        </div>

        {/* Global AI slide-over overlay */}
        {showAgent && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* backdrop */}
            <div
              className="flex-1 bg-black/30"
              onClick={() => setShowAgent(false)}
            />
            {/* panel */}
            <div className="w-[90%] max-w-sm max-h-screen h-full bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col">
              <AgentChat
                initialContext={agentContext}
                onClose={() => setShowAgent(false)}
              />
            </div>
          </div>
        )}

        {/* Floating AI toggle button */}
        <button
          type="button"
          onClick={() => setShowAgent(true)}
          className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-100"
        >
          AI
        </button>
      </div>
    </Router>
  )
}

/* Wrappers */
const TeamDetailsWrapper = ({ teams, year = 2025 }) => {
  const navigate = useNavigate()
  const { teamName } = useParams()
  const teamname = decodeURIComponent(teamName || "")
  const team = Array.isArray(teams)
    ? teams.find(t => t.team === teamname)
    : undefined

  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])

  useEffect(() => {
    if (!teamname) return
    let alive = true
    fetch(
      `${API_BASE}/team/${encodeURIComponent(
        teamname,
      )}/season-averages?year=${year}`,
    )
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        setPlayers(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error("players fetch error", err)
        if (alive) setPlayers([])
      })
    return () => {
      alive = false
    }
  }, [teamname, year])

  useEffect(() => {
    if (!teamname) return
    let alive = true
    fetch(
      `${API_BASE}/team/${encodeURIComponent(
        teamname,
      )}/schedule?year=${year}`,
    )
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : []
        rows.sort((a, b) => new Date(a.gamedate) - new Date(b.gamedate))
        setGames(rows)
      })
      .catch(err => {
        console.error("schedule fetch error", err)
        if (alive) setGames([])
      })
    return () => {
      alive = false
    }
  }, [teamname, year])

  return team ? (
    <TeamDetailsPage
      team={team}
      games={games}
      teams={teams}
      players={players}
      onBack={() => navigate("/")}
      onSelectGame={gameId => navigate(`/game/${gameId}`)}
      onSelectTeam={name => navigate(`/team/${encodeURIComponent(name)}`)}
    />
  ) : (
    <div className="px-4 py-6 bg-slate-100">
      <p className="text-sm text-slate-500">Loading team…</p>
    </div>
  )
}

const PlayerDetailsWrapper = ({ teams, year = 2025 }) => {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null)
  const [gameLog, setGameLog] = useState([])

  // Fetch core player info / season averages
  useEffect(() => {
    if (!playerId) return
    let alive = true

    fetch(
      `${API_BASE}/player/${encodeURIComponent(playerId)}?year=${year}`,
    )
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        if (Array.isArray(data) && data.length > 0) {
          setPlayer(data[0])
        } else {
          setPlayer(data || null)
        }
      })
      .catch(err => {
        console.error("player fetch error", err)
        if (alive) setPlayer(null)
      })

    return () => {
      alive = false
    }
  }, [playerId, year])

  // Fetch game log
  useEffect(() => {
    if (!playerId) return
    let alive = true

    fetch(
      `${API_BASE}/player/${encodeURIComponent(
        playerId,
      )}/gamelog?year=${year}`,
    )
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : []
        rows.sort((a, b) => new Date(a.gamedate) - new Date(b.gamedate))
        console.log(rows)
        setGameLog(rows)
      })
      .catch(err => {
        console.error("player gamelog fetch error", err)
        if (alive) setGameLog([])
      })

    return () => {
      alive = false
    }
  }, [playerId, year])

  if (!player) {
    return (
      <div className="px-4 py-6 bg-slate-100">
        <p className="text-sm text-slate-500">Loading player…</p>
      </div>
    )
  }

  const playerTeamName =
    player.team || player.teamname || player.school || player.Team || null

  const team =
    playerTeamName && Array.isArray(teams)
      ? teams.find(
          t => t.team === playerTeamName || t.school === playerTeamName,
        )
      : undefined

  return (
    <PlayerDetailsPage
      player={player}
      team={team}
      teams={teams}
      gameLog={gameLog}
      year={year}
      onBack={() => navigate(-1)}
      onSelectTeam={name => navigate(`/team/${encodeURIComponent(name)}`)}
      onSelectGame={gameId => navigate(`/game/${gameId}`)}
    />
  )
}

const GameDetailsWrapper = ({ teams }) => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const [boxScore, setBoxScore] = useState(null)
  const [game, setGame] = useState(null)

  useEffect(() => {
    if (!gameId) return
    let alive = true
    fetch(`${API_BASE}/game/${gameId}`)
      .then(r => r.json())
      .then(data => {
        if (alive) setGame(data)
      })
      .catch(console.error)
    fetch(`${API_BASE}/game/${gameId}/boxscore`)
      .then(r => r.json())
      .then(data => {
        if (alive) setBoxScore(data)
      })
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [gameId])

  return game ? (
    <GameDetailsPage
      game={game}
      teams={teams}
      team1={game?.hometeam}
      team2={game?.awayteam}
      onBack={() => navigate("/")}
      boxScore={boxScore}
    />
  ) : (
    <div className="px-4 py-6 bg-slate-100">
      <p className="text-sm text-slate-500">Loading game…</p>
    </div>
  )
}

export default NCAABasketballApp

