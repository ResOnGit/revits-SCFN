import { ChevronLeft, ChevronRight, Receipt, Tags, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BUDGET, isOutOfBudget, typeLabel, weekLabel, weeksInMonth } from './budget.js'
import Login from './Login.jsx'
import { RevitsMark } from './RevitsMark.jsx'
import { supabase } from './supabaseClient'

const TIMEZONE = 'Asia/Kuala_Lumpur'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const money = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
})

function klParts(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const pick = (type) => Number(parts.find((part) => part.type === type).value)
  return { year: pick('year'), month: pick('month'), day: pick('day') }
}

const weekdayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'short',
})

function formatDate(value) {
  const parts = value ? klParts(value) : null
  if (!parts) return '—'
  const weekday = weekdayFormat.format(value instanceof Date ? value : new Date(value))
  return `${weekday} ${parts.day} ${MONTHS[parts.month - 1]}`
}

function monthTitle(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function shiftMonth({ year, month }, delta) {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

const SWAP_OUT_MS = 180
const SWAP_IN_MS = 280
const SLICE_COLORS = [
  '#18181b',
  '#3f3f46',
  '#57534e',
  '#78716c',
  '#a8a29e',
  '#44403c',
  '#292524',
  '#71717a',
  '#a1a1aa',
  '#d6d3d1',
]
const OUT_COLOR = '#8f454c'
const RING_INK = [244, 244, 245]
const RING_MAROON = [158, 74, 84]
const MAROON_AT = 0.78

function mixRgb(from, to, t) {
  const channels = [0, 1, 2].map((index) => Math.round(from[index] + (to[index] - from[index]) * t))
  return `rgb(${channels.join(' ')})`
}

function ringColor(t) {
  if (t <= MAROON_AT) return `rgb(${RING_INK.join(' ')})`
  const blend = (t - MAROON_AT) / (1 - MAROON_AT)
  return mixRgb(RING_INK, RING_MAROON, blend)
}

function ringFill(progress) {
  const ink = `rgb(${RING_INK.join(' ')})`
  if (progress <= 0) return 'transparent'
  const end = progress * 360
  const maroonDeg = MAROON_AT * 360
  if (progress <= MAROON_AT) {
    return `conic-gradient(from 0deg, ${ink} 0deg ${end}deg, transparent ${end}deg 360deg)`
  }
  const tip = ringColor(progress)
  if (progress >= 1) {
    return `conic-gradient(from 0deg, ${ink} 0deg ${maroonDeg}deg, ${tip} 360deg)`
  }
  return `conic-gradient(from 0deg, ${ink} 0deg ${maroonDeg}deg, ${tip} ${end}deg, transparent ${end}deg 360deg)`
}

const RING_MASK =
  'radial-gradient(farthest-side, transparent calc(100% - 16px), #000 calc(100% - 15px) calc(100% - 3px), transparent calc(100% - 2px))'

function BudgetRing({ spent, cap, blank }) {
  const progress = blank || cap <= 0 ? 0 : Math.min(Math.max(spent, 0) / cap, 1)
  const label = blank
    ? 'Budget ring'
    : `In budget ${money.format(Math.max(spent, 0))} of ${money.format(cap)}`

  return (
    <div className="relative h-36 w-36" role="img" aria-label={label}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: 'rgba(255,255,255,0.14)', WebkitMask: RING_MASK, mask: RING_MASK }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: ringFill(progress), WebkitMask: RING_MASK, mask: RING_MASK }}
      />
    </div>
  )
}

function shade(hex, amount) {
  const value = hex.slice(1)
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16)
    return Math.max(0, Math.min(255, Math.round(channel * amount)))
  })
  return `rgb(${channels.join(' ')})`
}

function wedgePath(start, end, radius) {
  const sweep = end - start
  if (sweep >= Math.PI * 2 - 0.0001) {
    return `M 50 ${50 - radius} A ${radius} ${radius} 0 1 1 50 ${50 + radius} A ${radius} ${radius} 0 1 1 50 ${50 - radius} Z`
  }
  const x0 = 50 + radius * Math.cos(start)
  const y0 = 50 + radius * Math.sin(start)
  const x1 = 50 + radius * Math.cos(end)
  const y1 = 50 + radius * Math.sin(end)
  const large = sweep > Math.PI ? 1 : 0
  return `M 50 50 L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`
}

function buildSlices(entries) {
  const usable = entries.filter(([, amount]) => amount > 0)
  const total = usable.reduce((sum, [, amount]) => sum + amount, 0)
  if (total <= 0) return []

  let angle = -Math.PI / 2
  let colorIndex = 0
  return usable.map(([type, amount]) => {
    const sweep = (amount / total) * Math.PI * 2
    const gap = usable.length > 1 && sweep > 0.09 ? 0.03 : 0
    const path = wedgePath(angle + gap / 2, angle + sweep - gap / 2, 42)
    angle += sweep
    const color = isOutOfBudget(type) ? OUT_COLOR : SLICE_COLORS[colorIndex++ % SLICE_COLORS.length]
    return { type, amount, color, crust: shade(color, 0.62), d: path }
  })
}

const CRUST_LAYERS = [-15, -12, -9, -6, -3, 0]

function SpendPie({ slices, selected, onToggle }) {
  const ordered = slices.some((slice) => slice.type === selected)
    ? [...slices.filter((slice) => slice.type !== selected), slices.find((slice) => slice.type === selected)]
    : slices

  return (
    <div className="pie-stage relative mx-auto h-[220px] w-[220px]" aria-hidden="true">
      <div className="pointer-events-none absolute top-[58%] left-1/2 h-8 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900/15 blur-md" />
      <div className="pie-tilt relative h-full w-full">
        {ordered.map((slice) => {
          const quiet = Boolean(selected) && selected !== slice.type
          return (
            <div key={slice.type} className="pie-slice" data-up={selected === slice.type}>
              {CRUST_LAYERS.map((depth) => (
                <div
                  key={depth}
                  className="pointer-events-none absolute inset-0"
                  style={{ transform: `translateZ(${depth}px)` }}
                >
                  <svg viewBox="0 0 100 100" className="pointer-events-none h-full w-full overflow-visible">
                    <path
                      d={slice.d}
                      fill={depth === 0 ? slice.color : slice.crust}
                      fillOpacity={quiet ? 0.38 : 1}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => onToggle(slice.type)}
                    />
                  </svg>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = klParts(new Date())
    return { year: today.year, month: today.month }
  })
  const [selectedType, setSelectedType] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [swap, setSwap] = useState({ phase: 'shown', direction: 'next' })
  const [wave, setWave] = useState(0)
  const swapTimer = useRef(0)
  const swapBusy = useRef(false)
  const displayError = supabase
    ? error
    : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file, then restart the dev server.'

  useEffect(() => () => window.clearTimeout(swapTimer.current), [])

  function showMonth(delta) {
    if (swapBusy.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSelectedMonth((month) => shiftMonth(month, delta))
      setSelectedType(null)
      setSelectedWeek(null)
      return
    }

    const direction = delta > 0 ? 'next' : 'prev'
    setWave((count) => count + 1)
    swapBusy.current = true
    setSwap({ phase: 'out', direction })
    swapTimer.current = window.setTimeout(() => {
      setSelectedMonth((month) => shiftMonth(month, delta))
      setSelectedType(null)
      setSelectedWeek(null)
      setSwap({ phase: 'in', direction })
      swapTimer.current = window.setTimeout(() => {
        setSwap({ phase: 'shown', direction })
        swapBusy.current = false
      }, SWAP_IN_MS)
    }, SWAP_OUT_MS)
  }

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase
      .from('transactions')
      .select('id, amount, type, comment, date')
      .order('date', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
        } else {
          setTransactions(data ?? [])
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const monthTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        const parts = tx.date ? klParts(tx.date) : null
        return parts?.year === selectedMonth.year && parts?.month === selectedMonth.month
      }),
    [transactions, selectedMonth.year, selectedMonth.month],
  )

  const totalSpent = monthTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const budgetSpent = monthTransactions.reduce((sum, tx) => {
    if (isOutOfBudget(tx.type)) return sum
    return sum + Number(tx.amount || 0)
  }, 0)
  const blank = loading || Boolean(displayError)

  const byType = useMemo(() => {
    const totals = new Map()
    for (const tx of monthTransactions) {
      const type = typeLabel(tx.type)
      totals.set(type, (totals.get(type) ?? 0) + Number(tx.amount || 0))
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [monthTransactions])

  const slices = useMemo(() => buildSlices(byType), [byType])

  const weeks = useMemo(
    () => weeksInMonth(selectedMonth.year, selectedMonth.month),
    [selectedMonth.year, selectedMonth.month],
  )

  const activeWeek = weeks.find((week) => week.index === selectedWeek) ?? null

  const weeksWithSpend = useMemo(() => {
    const found = new Set()
    for (const tx of monthTransactions) {
      const day = tx.date ? klParts(tx.date)?.day : null
      if (day == null) continue
      const week = weeks.find((item) => day >= item.start && day <= item.end)
      if (week) found.add(week.index)
    }
    return found
  }, [monthTransactions, weeks])

  const recentTransactions = useMemo(() => {
    return monthTransactions.filter((tx) => {
      if (selectedType && typeLabel(tx.type) !== selectedType) return false
      if (activeWeek) {
        const day = tx.date ? klParts(tx.date)?.day : null
        if (day == null || day < activeWeek.start || day > activeWeek.end) return false
      }
      return true
    })
  }, [monthTransactions, selectedType, activeWeek])

  function toggleType(type) {
    setSelectedType((current) => (current === type ? null : type))
  }

  function toggleWeek(index) {
    setSelectedWeek((current) => (current === index ? null : index))
  }

  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-no-repeat [mask-size:100%_100%] [mask-image:radial-gradient(ellipse_at_50%_38%,#000_10%,transparent_48%)] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:100%_100%] [-webkit-mask-image:radial-gradient(ellipse_at_50%_38%,#000_10%,transparent_48%)]"
      />
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10">
        <header>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium text-zinc-500">Shortcuts Finance</p>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Log out
            </button>
          </div>
          <h1 className="mt-1 flex items-baseline gap-2 text-3xl font-semibold tracking-tight">
            <RevitsMark wave={wave} />
            SCFN
          </h1>
        </header>

        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => showMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="w-40 overflow-hidden">
            <p
              className="month-swap text-center text-sm font-medium"
              data-phase={swap.phase}
              data-dir={swap.direction}
              style={{ transitionDuration: `${SWAP_OUT_MS}ms`, animationDuration: `${SWAP_IN_MS}ms` }}
            >
              {monthTitle(selectedMonth.year, selectedMonth.month)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => showMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          className="month-swap flex flex-col gap-5"
          data-phase={swap.phase}
          data-dir={swap.direction}
          style={{ transitionDuration: `${SWAP_OUT_MS}ms`, animationDuration: `${SWAP_IN_MS}ms` }}
        >
        <section className="rounded-2xl bg-zinc-900 p-6 text-white">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Wallet size={16} />
            Total spent
          </div>
          <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
            {blank ? '—' : money.format(totalSpent)}
          </p>
          <div className="mt-6 flex flex-col items-center">
            <BudgetRing spent={budgetSpent} cap={BUDGET} blank={blank} />
            <p className={`mt-2 text-sm tabular-nums ${!blank && budgetSpent > BUDGET ? 'text-rose-200' : 'text-zinc-300'}`}>
              {blank ? '—' : `${money.format(budgetSpent)} / ${money.format(BUDGET)}`}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Tags size={16} />
            By type
          </div>
          {loading ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : displayError ? (
            <p className="text-sm text-zinc-400">Couldn't load this month.</p>
          ) : slices.length === 0 ? (
            <p className="text-sm text-zinc-400">No spending this month.</p>
          ) : (
            <>
              <SpendPie slices={slices} selected={selectedType} onToggle={toggleType} />
              <ul className="mt-2 flex flex-col gap-1">
                {slices.map((slice) => {
                  const on = selectedType === slice.type
                  const quiet = Boolean(selectedType) && !on
                  return (
                    <li key={slice.type}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleType(slice.type)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${on ? 'bg-zinc-100' : 'hover:bg-zinc-50'} ${quiet ? 'text-zinc-400' : ''}`}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                        <span className="min-w-0 flex-1 truncate font-medium">{slice.type}</span>
                        <span className="tabular-nums">{money.format(slice.amount)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Receipt size={16} />
            Recent
          </div>
          {displayError ? (
            <p className="text-sm text-red-600">{displayError}</p>
          ) : loading ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : (
            <>
              <div className="week-row -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
                {weeks.map((week) => {
                  const on = selectedWeek === week.index
                  const empty = !weeksWithSpend.has(week.index)
                  return (
                    <button
                      key={week.index}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleWeek(week.index)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${on ? 'bg-zinc-900 text-white' : empty ? 'bg-zinc-50 text-zinc-400' : 'bg-zinc-100 text-zinc-700'}`}
                    >
                      {weekLabel(week)}
                    </button>
                  )
                })}
              </div>
              {monthTransactions.length === 0 ? (
                <p className="text-sm text-zinc-400">No transactions this month.</p>
              ) : recentTransactions.length === 0 ? (
                <p className="text-sm text-zinc-400">Nothing in this filter.</p>
              ) : (
                <ul>
                  {recentTransactions.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-zinc-500">{formatDate(tx.date)}</span>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                            {typeLabel(tx.type)}
                          </span>
                        </div>
                        {tx.comment ? (
                          <p className="mt-1 truncate text-sm text-zinc-800">{tx.comment}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {money.format(Number(tx.amount || 0))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
        </div>
      </main>
    </div>
  )
}

const AUTH_OUT_MS = 180
const AUTH_IN_MS = 240

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [view, setView] = useState(null)
  const [phase, setPhase] = useState('shown')
  const viewRef = useRef(null)
  const fadeTimer = useRef(0)

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
      window.clearTimeout(fadeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!authReady) return undefined
    const next = session ? 'dashboard' : 'login'
    if (viewRef.current === next) return undefined

    const show = () => {
      viewRef.current = next
      setView(next)
      setPhase('shown')
    }

    if (viewRef.current === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show()
      return undefined
    }

    setPhase('out')
    fadeTimer.current = window.setTimeout(() => {
      viewRef.current = next
      setView(next)
      setPhase('in')
      fadeTimer.current = window.setTimeout(() => setPhase('shown'), AUTH_IN_MS)
    }, AUTH_OUT_MS)

    return () => window.clearTimeout(fadeTimer.current)
  }, [session, authReady])

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-sm text-red-600">
        Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file, then restart the dev server.
      </div>
    )
  }

  if (!authReady || !view) {
    return <div className="min-h-screen bg-zinc-50" />
  }

  return (
    <div
      className="auth-fade"
      data-phase={phase}
      style={{ transitionDuration: `${AUTH_OUT_MS}ms`, animationDuration: `${AUTH_IN_MS}ms` }}
    >
      {view === 'dashboard' ? <Dashboard /> : <Login />}
    </div>
  )
}
