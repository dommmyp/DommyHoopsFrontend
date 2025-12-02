import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

import BoxScore from "./BoxScore"
import PlayByPlay from "./PlayByPlay"
import ShotChart from "./ShotChart"

const API_BASE = "http://localhost:4000/api"

// helpers
const unwrap = x =>
  x && typeof x === "object" && Object.prototype.hasOwnProperty.call(x, "0")
    ? x["0"]
    : x

const fmt1 = v =>
  v == null || Number.isNaN(Number(v)) ? "N/A" : Number(v).toFixed(1)

const fmtDate = iso =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : ""

const hex = (x, fallback) => {
  const s = String(x || "").trim().replace(/^#/, "")
  return s ? `#${s}` : fallback
}

function readableTextColor(bgHex) {
  const s = (bgHex || "#000000").replace("#", "")
  const r = parseInt(s.substring(0, 2) || "00", 16) / 255
  const g = parseInt(s.substring(2, 4) || "00", 16) / 255
  const b = parseInt(s.substring(4, 6) || "00", 16) / 255
  const [R, G, B] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  )
  const L = 0.2126 * R + 0.7152 * G + 0.0722 * B
  return L > 0.5 ? "#111111" : "#ffffff"
}

async function fetchTeamInfo(teamName) {
  const res = await fetch(
    `${API_BASE}/team/${encodeURIComponent(teamName)}/info`,
  )
  if (!res.ok) throw new Error(`team info ${teamName}: ${res.status}`)
  return await res.json()
}

async function fetchTeamData(teamName) {
  const res = await fetch(
    `${API_BASE}/stats/team/${encodeURIComponent(teamName)}`,
  )
  if (!res.ok) throw new Error(`team info ${teamName}: ${res.status}`)
  return await res.json()
}

export default function GameDetailsPage({
  game,
  teams,
  onBack,
  team1,
  team2,
  boxScore,
}) {
  const [info1, setInfo1] = useState(null)
  const [info2, setInfo2] = useState(null)
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [shotTeamFilter, setShotTeamFilter] = useState("home")
  const [pbp, setPbp] = useState([])
  const [shots, setShots] = useState([])
  const [highlightedEventId, setHighlightedEventId] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard") // "dashboard" | "box" | "pbp" | "shots"

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [a, b] = await Promise.all([
          fetchTeamData(team1),
          fetchTeamData(team2),
        ])
        if (!alive) return
        setData1(a)
        setData2(b)
      } catch (e) {
        console.error("team info fetch error", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [team1, team2])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [a, b] = await Promise.all([
          fetchTeamInfo(team1),
          fetchTeamInfo(team2),
        ])
        if (!alive) return
        setInfo1(a)
        setInfo2(b)
      } catch (e) {
        console.error("team info fetch error", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [team1, team2])

  useEffect(() => {
    if (!game?.gameid && !game?.gameId) return
    const gid = game.gameid ?? game.gameId

    let alive = true
    ;(async () => {
      try {
        const [pbpRes, shotsRes] = await Promise.all([
          fetch(`${API_BASE}/game/${gid}/pbp`),
          fetch(`${API_BASE}/game/${gid}/shots`),
        ])
        if (!alive) return
        if (pbpRes.ok) {
          const data = await pbpRes.json()
          setPbp(Array.isArray(data) ? data : [])
        }
        if (shotsRes.ok) {
          const data = await shotsRes.json()
          setShots(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        console.error("pbp/shots fetch error", e)
        if (!alive) return
        setPbp([])
        setShots([])
      }
    })()

    return () => {
      alive = false
    }
  }, [game?.gameid, game?.gameId])

  const colors1 = useMemo(() => {
    const primary = hex(info1?.primarycolor, "#1e3a8a")
    const secondary = hex(info1?.secondarycolor, "#3b82f6")
    const text = readableTextColor(primary)
    return {
      primary,
      secondary,
      text,
      name: info1?.school || team1 || "Team 1",
    }
  }, [info1, team1])

  const colors2 = useMemo(() => {
    const primary = hex(info2?.primarycolor, "#065f46")
    const secondary = hex(info2?.secondarycolor, "#10b981")
    const text = readableTextColor(primary)
    return {
      primary,
      secondary,
      text,
      name: info2?.school || team2 || "Team 2",
    }
  }, [info2, team2])

  const playersRaw = Array.isArray(boxScore?.players) ? boxScore.players : []
  const players = playersRaw.map(unwrap)
  const grouped = players.reduce((acc, p) => {
    const key = p.team || "Unknown"
    ;(acc[key] ||= []).push(p)
    return acc
  }, {})

  const teamRows = Array.isArray(boxScore?.teams) ? boxScore.teams : []
  const totalsByName = teamRows.reduce((m, r) => {
    m[r.team] = r
    return m
  }, {})

  const homeTeam = game?.hometeam
  const awayTeam = game?.awayteam
  const ordered = [homeTeam, awayTeam].filter(Boolean)
  for (const name of Object.keys(grouped))
    if (!ordered.includes(name)) ordered.push(name)

  const homePts = game?.homepoints
  const awayPts = game?.awaypoints
  const dateStr = fmtDate(game?.gamedate)
  const venueStr = [game?.venue, [game?.city, game?.state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ")
  const status = game?.status

  const winnerName =
    homePts != null && awayPts != null
      ? homePts > awayPts
        ? homeTeam
        : awayTeam
      : null
  const margin =
    homePts != null && awayPts != null ? Math.abs(homePts - awayPts) : null
  const resultStr = winnerName ? `${winnerName} won by ${margin}` : status || ""
  const homeWon = homePts > awayPts

  /* ------------------------------------------------------------------ */
  /* Subsections (styled like TeamDetailsPage cards)                    */
  /* ------------------------------------------------------------------ */

  const renderAdvancedStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {/* Home team card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div
          className="px-3 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-200"
          style={{ borderColor: `${colors1.primary}33` }}
        >
          <h4 className="font-semibold text-xs md:text-sm text-slate-900 tracking-tight">
            <Link
              to={`/team/${encodeURIComponent(colors1.name)}`}
              className="hover:underline"
            >
              {colors1.name}
            </Link>
          </h4>
          <span className="text-[11px] text-slate-600">Home</span>
        </div>
        <div className="p-3">
          {/* now 3 tiles: OffEff, DefEff, Overall Eff */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div
              className="text-center rounded-lg px-2 py-3 bg-slate-50 border border-slate-200"
              style={{ borderColor: `${colors1.primary}25` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors1.primary }}
              >
                Offensive efficiency
              </p>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: colors1.primary }}
              >
                {fmt1(data1?.off_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-lg px-2 py-3 bg-slate-50 border border-slate-200"
              style={{ borderColor: `${colors1.primary}25` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors1.primary }}
              >
                Defensive efficiency
              </p>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: colors1.primary }}
              >
                {fmt1(data1?.def_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-lg px-2 py-3 bg-slate-50 border border-slate-200"
              style={{ borderColor: `${colors1.primary}25` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors1.primary }}
              >
                Efficiency margin
              </p>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: colors1.primary }}
              >
                {data1?.eff != null ? Number(data1.eff).toFixed(1) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Away team card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div
          className="px-3 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-200"
          style={{ borderColor: `${colors2.primary}33` }}
        >
          <h4 className="font-semibold text-xs md:text-sm text-slate-900 tracking-tight">
            <Link
              to={`/team/${encodeURIComponent(colors2.name)}`}
              className="hover:underline"
            >
              {colors2.name}
            </Link>
          </h4>
          <span className="text-[11px] text-slate-600">Away</span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div
              className="text-center rounded-lg px-2 py-3 bg-slate-50 border border-slate-200"
              style={{ borderColor: `${colors2.primary}25` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors2.primary }}
              >
                Offensive efficiency
              </p>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: colors2.primary }}
              >
                {fmt1(data2?.off_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-lg px-2 py-3 bg-slate-50 border border-slate-200"
              style={{ borderColor: `${colors2.primary}25` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors2.primary }}
              >
                Defensive efficiency
              </p>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: colors2.primary }}
              >
                {fmt1(data2?.def_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-lg px-2 py-3 bg-slate-50 border border-slate-200"
              style={{ borderColor: `${colors2.primary}25` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors2.primary }}
              >
                Efficiency margin
              </p>
              <p
                className="text-xl font-bold leading-none"
                style={{ color: colors2.primary }}
              >
                {data2?.eff != null ? Number(data2.eff).toFixed(1) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBoxScore = () => (
    <div className="mt-4 space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wide">
            Box score
          </h3>
        </div>
        <div className="p-3">
          <BoxScore
            pbp={pbp}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            colors1={colors1}
            colors2={colors2}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="px-4 py-6 bg-slate-100">
      <div className="max-w-7xl mx-auto space-y-4 pb-8">
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
                Game analytics
              </h1>
              <p className="text-[11px] text-slate-500">
                {awayTeam} @ {homeTeam}
                {dateStr ? ` · ${dateStr}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {status && (
              <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                {status}
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                <Link
                  to={`/team/${encodeURIComponent(awayTeam)}`}
                  className="text-lg md:text-xl font-semibold text-slate-900 hover:text-blue-700"
                >
                  {awayTeam}
                </Link>
                <span className="text-slate-400">@</span>
                <Link
                  to={`/team/${encodeURIComponent(homeTeam)}`}
                  className="text-lg md:text-xl font-semibold text-slate-900 hover:text-blue-700"
                >
                  {homeTeam}
                </Link>
              </div>
              <div className="text-xs text-slate-500">
                {dateStr}
                {venueStr ? ` · ${venueStr}` : ""}
              </div>
              {status && (
                <div className="text-[11px] text-slate-500 uppercase tracking-wide mt-0.5">
                  {status}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900">
                {awayPts != null && homePts != null ? (
                  <span>
                    <span
                      style={{
                        color: !homeWon ? colors2.primary : undefined,
                      }}
                    >
                      {awayPts}
                    </span>
                    <span className="text-slate-400 mx-1.5">-</span>
                    <span
                      style={{
                        color: homeWon ? colors1.primary : undefined,
                      }}
                    >
                      {homePts}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-600">{status || ""}</span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {resultStr || ""}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-3 pt-2 pb-0">
          <nav className="-mb-px flex space-x-4 md:space-x-8 text-sm font-semibold">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "box", label: "Box Score" },
              { id: "pbp", label: "Play-by-Play" },
              { id: "shots", label: "Shot Chart" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 pb-2 pt-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        borderColor: colors1.primary,
                        color: colors1.primary,
                      }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "dashboard" && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.4fr)] gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-900 uppercase tracking-wide">
                  Advanced stats
                </h3>
                {renderAdvancedStats()}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
                <ShotChart
                  shots={shots}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  colors1={colors1}
                  colors2={colors2}
                  highlightedId={highlightedEventId}
                  onHighlight={setHighlightedEventId}
                  teamFilter={shotTeamFilter}
                  onChangeTeamFilter={setShotTeamFilter}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
              <PlayByPlay
                pbp={pbp}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                highlightedId={highlightedEventId}
                onHighlight={setHighlightedEventId}
              />
            </div>
          </div>
        )}

        {activeTab === "box" && renderBoxScore()}

        {activeTab === "pbp" && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <PlayByPlay
              pbp={pbp}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              highlightedId={highlightedEventId}
              onHighlight={setHighlightedEventId}
            />
          </div>
        )}

        {activeTab === "shots" && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <ShotChart
              shots={shots}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              colors1={colors1}
              colors2={colors2}
              highlightedId={highlightedEventId}
              onHighlight={setHighlightedEventId}
              teamFilter={shotTeamFilter}
              onChangeTeamFilter={setShotTeamFilter}
            />
          </div>
        )}
      </div>
    </div>
  )
}

