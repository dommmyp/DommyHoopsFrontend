
// helpers
export function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(String(iso).replace(" ", "T"))
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function derivePerspective(row, teamName) {
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

export const hex = (x, fallback) => {
  const s = String(x || "").trim().replace(/^#/, "")
  return s ? `#${s}` : fallback
}

export function readableTextColor(bgHex) {
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

export function safePerGame(total, games) {
  if (!games || games <= 0 || total == null) return "—"
  return (Number(total) / games).toFixed(1)
}
