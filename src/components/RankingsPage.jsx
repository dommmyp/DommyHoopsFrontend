import React, { useState, useEffect, useMemo } from "react"
import {
  Search,
  TrendingUp,
  TrendingDown,
  Award,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

const API_BASE = "https://dommyhoopsbackend.onrender.com/api"

const RankingsPage = () => {
  const [year, setYear] = useState("2025")
  const [teams, setTeams] = useState([])
  const [search, setSearch] = useState("")
  const [selectedConference, setSelectedConference] = useState("All")
  const [sorting, setSorting] = useState({ field: "rank", ascending: true })
  const navigate = useNavigate()

  const years = ["2020", "2021", "2022", "2023", "2024", "2025"]
  const conferences = [
    "All",
    "ACC",
    "Big 12",
    "Big East",
    "Big Ten",
    "Pac-12",
    "SEC",
    "AAC",
    "WCC",
    "MVC",
  ]

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/rankings?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        const teamData = Array.isArray(data) ? data : []
        setTeams(teamData)
                console.log(teamData)
      })
      .catch(() => {
        if (alive) setTeams([])
      })
    return () => {
      alive = false
    }
  }, [year])

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchSearch = t.team
        ?.toLowerCase()
        .includes(search.trim().toLowerCase())
      const matchConf =
        selectedConference === "All" || t.conference === selectedConference
      return matchSearch && matchConf
    })
  }, [teams, search, selectedConference])

  function applySorting(field) {
    const ascending = sorting.field === field ? !sorting.ascending : true
    setSorting({ field, ascending })

    const sorted = [...teams].sort((a, b) => {
      const av = a[field]
      const bv = b[field]

      // For rank we treat lower as better regardless of missing values
      if (field === "rank") {
        const aRank = av ?? Infinity
        const bRank = bv ?? Infinity
        return ascending ? aRank - bRank : bRank - aRank
      }

      const aVal = av ?? (ascending ? -Infinity : Infinity)
      const bVal = bv ?? (ascending ? -Infinity : Infinity)
      return ascending ? aVal - bVal : bVal - aVal
    })
    setTeams(sorted)
  }

  const SortableHeader = ({ field, label, align = "center" }) => {
    const isActive = sorting.field === field
    const direction = sorting.ascending ? "asc" : "desc"

    return (
      <th
        onClick={() => applySorting(field)}
        className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide cursor-pointer border-b border-slate-200 text-${align} text-slate-600 hover:text-blue-600`}
      >
        <div className="flex items-center justify-center gap-1">
          <span>{label}</span>
          <ArrowUpDown
            className={`h-3 w-3 ${
              isActive ? "text-blue-500" : "text-slate-300"
            } ${isActive && direction === "asc" ? "rotate-180" : ""}`}
          />
        </div>
      </th>
    )
  }

  const formatStat = (value, decimals = 1, percentage = false) => {
    if (value === null || value === undefined) return "—"
    if (percentage) {
      return `${(value * 100).toFixed(decimals)}%`
    }
    return Number(value).toFixed(decimals)
  }

  // Simple “Analytics-style” summary stats
  const totalTeams = filteredTeams.length

  const avgEff = useMemo(() => {
    if (!filteredTeams.length) return null
    const sum = filteredTeams.reduce(
      (acc, t) => (t.eff != null ? acc + Number(t.eff) : acc),
      0
    )
    const count = filteredTeams.filter((t) => t.eff != null).length
    if (!count) return null
    return sum / count
  }, [filteredTeams])

  const bestOffTeam = useMemo(() => {
    if (!filteredTeams.length) return null
    const sorted = [...filteredTeams].filter((t) => t.off_eff != null)
    if (!sorted.length) return null
    sorted.sort((a, b) => Number(b.off_eff) - Number(a.off_eff))
    return sorted[0]
  }, [filteredTeams])

  const bestDefTeam = useMemo(() => {
    if (!filteredTeams.length) return null
    const sorted = [...filteredTeams].filter((t) => t.def_eff != null)
    if (!sorted.length) return null
    // Lower defensive efficiency is better
    sorted.sort((a, b) => Number(a.def_eff) - Number(b.def_eff))
    return sorted[0]
  }, [filteredTeams])

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top "App bar" */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              DommyHoops Analytics
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Rankings overview · Advanced efficiency and rebounding metrics
            </p>
          </div>

          {/* Year and quick filters like GA date picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Year</span>
              <select
                className="bg-transparent text-xs font-medium text-slate-700 outline-none"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Filters</span>
            </div>
          </div>
        </div>

        {/* Controls row (search + conference) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search teams"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-56 text-sm border border-slate-200 rounded-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Conference
              </span>
              <select
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-full bg-slate-50 text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none"
                value={selectedConference}
                onChange={(e) => setSelectedConference(e.target.value)}
              >
                {conferences.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sorting summary text */}
          <div className="text-[11px] text-slate-500 text-right">
            Sorted by{" "}
            <span className="font-medium text-slate-700">
              {sorting.field}
            </span>{" "}
            ({sorting.ascending ? "ascending" : "descending"})
          </div>
        </div>

        {/* Main table card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">
              Rankings table
            </p>
            <p className="text-[11px] text-slate-400">
              Click a row to view team details
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-slate-700">
              <thead className="bg-slate-50">
                <tr>
                  <SortableHeader field="rank" label="Rk" />
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-left border-b border-slate-200 text-slate-600">
                    Team
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-center border-b border-slate-200 text-slate-600">
                    Conf
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-center border-b border-slate-200 text-slate-600">
                    W-L
                  </th>

                  <SortableHeader field="eff" label="AdjEM" />
                  <SortableHeader field="off_eff" label="AdjOE" />
                  <SortableHeader field="def_eff" label="AdjDE" />
                  <SortableHeader field="oreb_p" label="OReb%" />
                  <SortableHeader field="dreb_p" label="DReb%" />
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((t, i) => (
                  <tr
                    key={`${t.team}-${t.rank}-${i}`}
                    onClick={() => navigate(`/team/${t.team}`)}
                    className={`cursor-pointer transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                    } hover:bg-blue-50`}
                  >
                    <td className="px-3 py-2 text-center font-semibold text-slate-900">
                      {t.rank}
                    </td>
                    <td className="px-3 py-2 text-left font-medium text-slate-900">
                      {t.team}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500">
                      {t.conference || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-700">
                      {t.record || "—"}
                    </td>

                    <td className="px-3 py-2 text-center font-semibold text-slate-900">
                      {formatStat(t.eff)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-800">
                      {formatStat(t.off_eff)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-800">
                      {formatStat(t.def_eff)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-800">
                      {formatStat(t.oreb_p, 1, true)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-800">
                      {formatStat(t.dreb_p, 1, true)}
                    </td>
                  </tr>
                ))}

                {filteredTeams.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      No teams found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom definitions panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Metric definitions
            </h3>
            <ul className="space-y-1 text-slate-600 text-xs">
              <li>
                <span className="font-semibold">AdjEM</span> Adjusted efficiency
                margin, calculated as AdjOE minus AdjDE.
              </li>
              <li>
                <span className="font-semibold">AdjOE</span> Adjusted offensive
                efficiency, points scored per 100 possessions.
              </li>
              <li>
                <span className="font-semibold">AdjDE</span> Adjusted defensive
                efficiency, points allowed per 100 possessions.
              </li>
              <li>
                <span className="font-semibold">OReb%</span> Offensive rebounding
                rate, share of available offensive rebounds secured.
              </li>
              <li>
                <span className="font-semibold">DReb%</span> Defensive rebounding
                rate, share of available defensive rebounds secured.
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              How to read this view
            </h3>
            <p className="text-xs text-slate-600 mb-2">
              Use the search bar and conference filter to narrow the teams in
              view. Sorting by AdjEM or efficiency splits helps you find elite
              offenses, defenses, or balanced teams quickly.
            </p>
            <p className="text-xs text-slate-600">
              Click any team row to drill into a team detail page, similar to a
              property view in an analytics dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RankingsPage

