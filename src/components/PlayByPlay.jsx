import React, { useMemo } from "react"

/* ------------------------------------------------------------------ */
/* PLAY BY PLAY (styled to match TeamDetails / GameDetails cards)     */
/* ------------------------------------------------------------------ */

export default function PlayByPlay({
  pbp,
  homeTeam,
  awayTeam,
  highlightedId,
  onHighlight,
}) {
  const grouped = useMemo(() => {
    const byPeriod = {}
    ;(pbp || []).forEach(e => {
      const p = e.period ?? 1
      if (!byPeriod[p]) byPeriod[p] = []
      byPeriod[p].push(e)
    })
    return Object.entries(byPeriod)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([period, events]) => ({ period: Number(period), events }))
  }, [pbp])

  const periodLabel = p => {
    if (p === 1) return "1st Half"
    if (p === 2) return "2nd Half"
    if (p === 3) return "OT"
    if (p === 4) return "2OT"
    return `Period ${p}`
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* header matches other cards: bg-slate-50, slate text */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <h3 className="text-xs font-medium text-slate-800 uppercase tracking-wide">
          Play by play
        </h3>
        <p className="text-[11px] text-slate-500">
          Game flow by period with running score, newest events at the bottom.
        </p>
      </div>

      <div className="max-h-[480px] overflow-y-auto text-xs">
        {grouped.map(({ period, events }) => (
          <div key={period}>
            {/* sticky period header, same neutral band style as other sections */}
            <div className="sticky top-0 z-10 bg-slate-100 border-y border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              {periodLabel(period)}
            </div>

            <table className="min-w-full table-auto border-collapse">
              <tbody>
                {events.map((e, idx) => {
                  const id = `${e.period}-${e.secondsRemaining}-${idx}`
                  const isHighlighted = highlightedId === id
                  const isHome = !!e.isHomeTeam
                  const teamLabel = isHome ? homeTeam : awayTeam

                  return (
                    <tr
                      key={id}
                      className={[
                        "cursor-pointer transition-colors",
                        idx % 2 ? "bg-slate-50" : "bg-white",
                        isHighlighted
                          ? "bg-blue-50 border-l-2 border-blue-500"
                          : "border-l-2 border-transparent",
                      ].join(" ")}
                      onMouseEnter={() => onHighlight?.(id)}
                      onMouseLeave={() => onHighlight?.(null)}
                      onClick={() => onHighlight?.(id)}
                    >
                      {/* clock */}
                      <td className="px-2 py-1 whitespace-nowrap text-slate-500 font-mono text-center align-top w-[56px]">
                        {e.clock ?? ""}
                      </td>

                      {/* team label */}
                      <td className="px-2 py-1 whitespace-nowrap text-slate-600 align-top w-[110px]">
                        <span className="font-semibold text-slate-800 truncate">
                          {teamLabel}
                        </span>
                      </td>

                      {/* play text */}
                      <td className="px-2 py-1 text-slate-800 align-top">
                        {e.playText}
                      </td>

                      {/* running score */}
                      <td className="px-2 py-1 whitespace-nowrap text-right text-slate-700 font-semibold align-top w-[90px]">
                        {e.homeScore != null && e.awayScore != null ? (
                          <span className="inline-flex items-baseline gap-0.5">
                            <span className="truncate">
                              {awayTeam} {e.awayScore}
                            </span>
                            <span className="text-slate-400 mx-0.5">-</span>
                            <span className="truncate">
                              {homeTeam} {e.homeScore}
                            </span>
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                    </tr>
                  )
                })}

                {events.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-xs text-slate-500"
                    >
                      No events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-slate-500">
            No play by play data.
          </div>
        )}
      </div>
    </div>
  )
}

