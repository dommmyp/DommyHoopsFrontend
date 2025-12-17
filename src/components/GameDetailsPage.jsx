import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, Trophy } from "lucide-react"

import BoxScore from "./BoxScore"
import PlayByPlay from "./PlayByPlay"
import ShotChart from "./ShotChart"

import { API_BASE } from "../globals";

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
      <div 
        className="rounded-xl shadow-xl overflow-hidden"
      >
        <div
          className="px-4 py-3 flex items-center justify-between shadow-md"
          style={{
            background: `linear-gradient(90deg, ${colors1.primary} 0%, ${colors1.secondary} 100%)`,
          }}
        >
          <h4 
            className="font-black text-sm uppercase tracking-wider"
            style={{ color: colors1.text }}
          >
            <Link
              to={`/team/${encodeURIComponent(colors1.name)}`}
              className="hover:underline"
            >
              {colors1.name}
            </Link>
          </h4>
          <span 
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${colors1.text}20`,
              color: colors1.text,
            }}
          >
            Home
          </span>
        </div>
        <div className="p-4 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div
              className="text-center rounded-xl px-3 py-4 shadow-lg"
              style={{ 
                background: `${colors1.primary}05`
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-slate-600">
                Offensive efficiency
              </p>
              <p
                className="text-2xl font-black leading-none"
                style={{ color: colors1.primary }}
              >
                {fmt1(data1?.off_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-xl px-3 py-4 shadow-lg"
              style={{ 
                background: `${colors1.secondary}05`
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-slate-600">
                Defensive efficiency
              </p>
              <p
                className="text-2xl font-black leading-none"
                style={{ color: colors1.primary }}
              >
                {fmt1(data1?.def_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-xl px-3 py-4 shadow-lg"
              style={{ 
                background: `${colors1.primary}05`
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-slate-600">
                Efficiency margin
              </p>
              <p
                className="text-2xl font-black leading-none"
                style={{ color: colors1.primary }}
              >
                {data1?.eff != null ? Number(data1.eff).toFixed(1) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Away team card */}
      <div 
        className="rounded-xl shadow-xl overflow-hidden"
      >
        <div
          className="px-4 py-3 flex items-center justify-between shadow-md"
          style={{
            background: `linear-gradient(90deg, ${colors2.primary} 0%, ${colors2.secondary} 100%)`,
          }}
        >
          <h4 
            className="font-black text-sm uppercase tracking-wider"
            style={{ color: colors2.text }}
          >
            <Link
              to={`/team/${encodeURIComponent(colors2.name)}`}
              className="hover:underline"
            >
              {colors2.name}
            </Link>
          </h4>
          <span 
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${colors2.text}20`,
              color: colors2.text,
            }}
          >
            Away
          </span>
        </div>
        <div className="p-4 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div
              className="text-center rounded-xl px-3 py-4 shadow-lg"
              style={{ 
                background: `${colors2.primary}05`
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-slate-600">
                Offensive efficiency
              </p>
              <p
                className="text-2xl font-black leading-none"
                style={{ color: colors2.primary }}
              >
                {fmt1(data2?.off_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-xl px-3 py-4 shadow-lg"
              style={{ 
                background: `${colors2.secondary}05`
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-slate-600">
                Defensive efficiency
              </p>
              <p
                className="text-2xl font-black leading-none"
                style={{ color: colors2.primary }}
              >
                {fmt1(data2?.def_eff)}
              </p>
            </div>

            <div
              className="text-center rounded-xl px-3 py-4 shadow-lg"
              style={{ 
                background: `${colors2.primary}05`
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-slate-600">
                Efficiency margin
              </p>
              <p
                className="text-2xl font-black leading-none"
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
      <div className="bg-white border-2 border-blue-200 rounded-xl shadow-xl overflow-hidden">
        <div 
          className="px-4 py-3 flex items-center justify-between shadow-md"
          style={{
            background: `linear-gradient(90deg, ${colors1.primary} 0%, ${colors2.primary} 100%)`,
          }}
        >
          <h3 
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: readableTextColor(colors1.primary) }}
          >
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
    <div className="px-4 py-6 min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-7xl mx-auto space-y-4 pb-8">
        {/* Top bar */}
        <div className="bg-white rounded-xl shadow-lg px-5 py-4 flex items-center justify-between gap-3">
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
                Game Analytics
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                {awayTeam} @ {homeTeam}
                {dateStr ? ` · ${dateStr}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {status && (
              <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-bold ">
                {status}
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard card */}
        <div 
          className="rounded-xl shadow-2xl p-5 md:p-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(90, ${colors1.primary} 0%, ${colors2.primary} 100%)`,
            borderColor: homeWon ? colors1.primary : colors2.primary,
          }}
        >
          {/* Decorative background elements */}
          <div 
            className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10"
            style={{ background: homeWon ? colors1.primary : colors2.primary }}
          />
          <div 
            className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-10"
            style={{ background: homeWon ? colors2.primary : colors1.primary }}
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <Link
                  to={`/team/${encodeURIComponent(awayTeam)}`}
                  className="text-xl md:text-2xl font-black hover:underline transition-colors"
                  style={{ color: colors2.primary }}
                >
                  {awayTeam}
                </Link>
                <span className="text-slate-400 font-bold">@</span>
                <Link
                  to={`/team/${encodeURIComponent(homeTeam)}`}
                  className="text-xl md:text-2xl font-black hover:underline transition-colors"
                  style={{ color: colors1.primary }}
                >
                  {homeTeam}
                </Link>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {dateStr}
                {venueStr ? ` · ${venueStr}` : ""}
              </div>
              {status && (
                <div className="text-xs font-bold uppercase tracking-wider mt-1 text-slate-500">
                  {status}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-4xl md:text-5xl font-black flex items-center justify-end gap-2">
                {winnerName && (
                  <Trophy 
                    className="h-8 w-8 md:h-10 md:w-10" 
                    style={{ color: homeWon ? colors1.primary : colors2.primary }}
                  />
                )}
                {awayPts != null && homePts != null ? (
                  <span>
                    <span
                      style={{
                        color: !homeWon ? colors2.primary : '#cbd5e1',
                      }}
                    >
                      {awayPts}
                    </span>
                    <span className="text-slate-400 mx-2">-</span>
                    <span
                      style={{
                        color: homeWon ? colors1.primary : '#cbd5e1',
                      }}
                    >
                      {homePts}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-600">{status || ""}</span>
                )}
              </div>
              <div 
                className="text-sm font-bold mt-2"
                style={{ color: homeWon ? colors1.primary : colors2.primary }}
              >
                {resultStr || ""}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-2 border-slate-200 rounded-xl shadow-lg px-3 pt-3 pb-0">
          <nav className="-mb-px flex space-x-4 md:space-x-8 text-sm font-bold">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "box", label: "Box Score" },
              { id: "pbp", label: "Play-by-Play" },
              { id: "shots", label: "Shot Chart" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 pb-3 pt-1 border-b-3 transition-all uppercase tracking-wide text-xs ${
                  activeTab === tab.id
                    ? ""
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        borderBottomWidth: '3px',
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
                <h3 className="text-sm font-black mb-3 text-slate-900 uppercase tracking-widest">
                  Advanced stats
                </h3>
                {renderAdvancedStats()}
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-xl shadow-lg p-4">
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

            <div className="bg-white border-2 border-slate-200 rounded-xl shadow-lg p-4">
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
          <div className="mt-4 bg-white border-2 border-slate-200 rounded-xl shadow-lg p-4">
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
          <div className="mt-4 bg-white border-2 border-slate-200 rounded-xl shadow-lg p-4">
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
