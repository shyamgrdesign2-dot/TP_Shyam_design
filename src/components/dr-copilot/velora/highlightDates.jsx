import React from "react"

const DAY_MONTH_REGEX =
  /(Day\s+\d+|\d+\s*(?:weeks?|days?|hours?|months?|years?)|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/gi

/**
 * Bold + darken clinically-meaningful time tokens inline ("Day 0", "8 weeks", "16 Mar").
 * No background chip, no color tint — just weight and contrast. Keeps reading flow intact
 * while letting the doctor scan for time anchors.
 */
export function highlightDates(text) {
  const parts = text.split(DAY_MONTH_REGEX)
  return parts.map((part, i) => {
    if (!part) return null
    if (DAY_MONTH_REGEX.test(part)) {
      DAY_MONTH_REGEX.lastIndex = 0
      return (
        <span key={i} className="font-semibold text-tp-slate-900">
          {part}
        </span>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
