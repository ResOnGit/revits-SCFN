import { useState } from 'react'
import LoginGlobe from './LoginGlobe.jsx'
import { RevitsMark } from './RevitsMark.jsx'
import { supabase } from './supabaseClient'

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL?.trim() ?? ''

export default function Login() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  async function sendCode(event) {
    event.preventDefault()
    const nextEmail = email.trim()
    if (nextEmail !== ALLOWED_EMAIL) {
      setError('Nice try! This is a private dashboard.')
      return
    }

    setBusy(true)
    setError('')
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: nextEmail,
    })
    setBusy(false)
    if (sendError) {
      setError(sendError.message)
      return
    }
    setEmail(nextEmail)
    setToken('')
    setOtpSent(true)
  }

  async function verifyCode(event) {
    event.preventDefault()
    const nextToken = token.trim()
    if (!/^\d{6}$/.test(nextToken)) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setBusy(true)
    setError('')
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: nextToken,
      type: 'email',
    })
    setBusy(false)
    if (verifyError) {
      setError(verifyError.message)
    }
  }

  function editEmail() {
    setOtpSent(false)
    setToken('')
    setError('')
  }

  return (
    <div className="login-screen text-zinc-900">
      <LoginGlobe />
      <form
        onSubmit={otpSent ? verifyCode : sendCode}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      >
        <p className="text-sm font-medium text-zinc-500">Shortcuts Finance</p>
        <h1 className="mt-1 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
          <RevitsMark pulse />
          SCFN
        </h1>

        {otpSent ? (
          <>
            <p className="mt-4 text-sm text-zinc-600">
              Enter the 6-digit code sent to <span className="font-medium text-zinc-800">{email}</span>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              pattern="\d{6}"
              value={token}
              onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-center text-lg tracking-[0.4em] outline-none focus:border-zinc-400"
            />
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || token.length !== 6}
              className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Verify'}
            </button>
            <div className="mt-3 flex items-center justify-between text-sm">
              <button type="button" onClick={editEmail} className="text-zinc-500 hover:text-zinc-800">
                Use a different email
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={sendCode}
                className="text-zinc-500 hover:text-zinc-800 disabled:opacity-60"
              >
                Resend code
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-zinc-600">Sign in with the email for this dashboard.</p>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
            />
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Send code'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
