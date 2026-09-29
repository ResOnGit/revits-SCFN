import { useEffect, useRef } from 'react'

const REVITS = 'revits'
const PULSE_MS = 3000

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

export function RevitsMark({ wave = 0, pulse = false }) {
  const letters = useRef([])
  const frame = useRef(0)
  const hovering = useRef(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    if (wave === 0) return undefined
    return runRevitsWave(letters, frame, hovering, hovering.current)
  }, [wave])

  useEffect(() => {
    if (!pulse) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let stopWave = () => {}
    const play = () => {
      if (hovering.current || document.hidden) return
      stopWave()
      stopWave = runRevitsWave(letters, frame, hovering, false)
    }

    play()
    const id = window.setInterval(play, PULSE_MS)
    return () => {
      window.clearInterval(id)
      stopWave()
    }
  }, [pulse])

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
