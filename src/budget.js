export const BUDGET = 800

export function typeLabel(type) {
  const trimmed = type?.trim()
  return trimmed || 'Untyped'
}

export function isOutOfBudget(type) {
  return typeLabel(type).toLowerCase() === 'out of budget'
}

export function weeksInMonth(year, month) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const buckets = []
  let current = null

  for (let day = 1; day <= days; day += 1) {
    const sunday0 = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    const monday0 = (sunday0 + 6) % 7
    if (!current || monday0 === 0) {
      current = { index: buckets.length + 1, start: day, end: day }
      buckets.push(current)
    } else {
      current.end = day
    }
  }

  return buckets
}

export function weekLabel(week) {
  const span = week.start === week.end ? `${week.start}` : `${week.start}\u2013${week.end}`
  return `Week ${week.index} \u00b7 ${span}`
}
