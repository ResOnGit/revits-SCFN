import { useState } from 'react'
import { supabase } from './supabaseClient'

const ALLOWED_EMAIL = 'miihendraa@gmail.com'

export default function Login() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendLink(event) {
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
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (sendError) {
      setError(sendError.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900">
      <form onSubmit={sendLink} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-zinc-500">Shortcuts Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">SCFN</h1>

        {sent ? (
          <p className="mt-4 text-sm text-zinc-700">
            ✅ Magic link sent! Please check your email and click the link to log in.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-zinc-600">Sign in with the email for this dashboard.</p>
            <input
              type="email"
              required
              autoComplete="email"
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
              {busy ? 'Please wait…' : 'Send link'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
