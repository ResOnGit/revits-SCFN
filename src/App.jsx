import { ChevronLeft, ChevronRight, Receipt, Tags, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Login from './Login.jsx'
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

function formatDate(value) {
  const parts = value ? klParts(value) : null
  if (!parts) return '—'
  return `${parts.day} ${MONTHS[parts.month - 1]}`
}

function monthTitle(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function shiftMonth({ year, month }, delta) {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

const REVITS = 'revits'
const SWAP_OUT_MS = 180
const SWAP_IN_MS = 280

function runRevitsWave(letters, frame, hovering, loop) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const handle = { id: 0 }
  const start = performance.now()

  const step = (now) => {
    const elapsed = now - start
    const local = loop && hovering.current ? elapsed % 1500 : elapsed
    for (let i = 0; i < REVITS.length; i += 1) {
      const el = letters.current[i]
      if (!el) continue
      const delay = (REVITS.charCodeAt(i) - 97) * 34
      const t = local - delay
      const y = t >= 0 && t <= 460 ? Math.sin((t / 460) * Math.PI) * -7 : 0
      el.style.transform = `translateY(${y}px)`
    }
    if ((loop && hovering.current) || elapsed < 1500) {
      handle.id = requestAnimationFrame(step)
      frame.current = handle.id
    }
  }

  cancelAnimationFrame(frame.current)
  handle.id = requestAnimationFrame(step)
  frame.current = handle.id
  return () => cancelAnimationFrame(handle.id)
}

function RevitsMark({ wave }) {
  const letters = useRef([])
  const frame = useRef(0)
  const hovering = useRef(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    if (wave === 0) return undefined
    return runRevitsWave(letters, frame, hovering, hovering.current)
  }, [wave])

  function stop() {
    hovering.current = false
    cancelAnimationFrame(frame.current)
    letters.current.forEach((el) => {
      if (el) el.style.transform = 'translateY(0px)'
    })
  }

  return (
    <span
      role="img"
      aria-label="revits"
      className="inline-flex cursor-default select-none text-[0.95rem] font-medium tracking-wide text-zinc-500"
      onMouseEnter={() => {
        hovering.current = true
        runRevitsWave(letters, frame, hovering, true)
      }}
      onMouseLeave={stop}
    >
      {REVITS.split('').map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          aria-hidden="true"
          ref={(node) => {
            letters.current[index] = node
          }}
          className="inline-block"
        >
          {letter}
        </span>
      ))}
    </span>
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
      return
    }

    const direction = delta > 0 ? 'next' : 'prev'
    setWave((count) => count + 1)
    swapBusy.current = true
    setSwap({ phase: 'out', direction })
    swapTimer.current = window.setTimeout(() => {
      setSelectedMonth((month) => shiftMonth(month, delta))
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

  const byType = useMemo(() => {
    const totals = new Map()
    for (const tx of monthTransactions) {
      const type = tx.type?.trim() || 'Untyped'
      totals.set(type, (totals.get(type) ?? 0) + Number(tx.amount || 0))
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [monthTransactions])

  const largestType = byType[0]?.[1] ?? 0

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
            {loading || displayError ? '—' : money.format(totalSpent)}
          </p>
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
          ) : byType.length === 0 ? (
            <p className="text-sm text-zinc-400">No spending this month.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {byType.map(([type, amount]) => (
                <li key={type}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{type}</span>
                    <span className="tabular-nums text-zinc-600">{money.format(amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-900"
                      style={{
                        width: `${largestType > 0 ? (Math.max(amount, 0) / largestType) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Receipt size={16} />
            Recent
          </div>
          {displayError ? (
            <p className="text-sm text-red-600">{displayError}</p>
          ) : loading ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : monthTransactions.length === 0 ? (
            <p className="text-sm text-zinc-400">No transactions this month.</p>
          ) : (
            <ul>
              {monthTransactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-zinc-500">{formatDate(tx.date)}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {tx.type?.trim() || 'Untyped'}
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
