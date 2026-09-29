import { useState } from 'react'
import { BrandMark, Notice } from '../components/ui'
import LoginGlobe from '../components/LoginGlobe'

function FloatingRevits() {
  return (
    <span className="login-title-float" aria-hidden>
      {'revits'.split('').map((char, i) => (
        <span
          key={char + i}
          className="login-title-char"
          style={{ animationDelay: `${i * 0.14}s` }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}

export default function Login({ onMasuk, merk }) {
  const [email, setEmail] = useState('')
  const [kode, setKode] = useState('')
  const [step, setStep] = useState('email')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  async function mintaKode(e) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setNotice({ ok: data.ok, pesan: data.pesan || 'Gagal meminta kode.' })
    if (data.ok) setStep('kode')
  }

  async function verifikasi(e) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, kode }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.ok) {
      onMasuk(data)
      return
    }
    setBusy(false)
    setNotice({ ok: false, pesan: data.pesan || 'Kode tidak valid.' })
  }

  return (
    <div className="login-screen">
      <LoginGlobe />
      <div className="login-card panel">
        <div className="login-brand">
          <BrandMark text={merk} />
          <div>
            <div className="login-title">
              <span className="sr-only">revits  -- IMS</span>
              <FloatingRevits />
              <span className="login-title-rest">   --IMS</span>
            </div>
            <div className="muted">Masuk dengan email</div>
          </div>
        </div>

        <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
          {notice?.pesan}
        </Notice>

        {step === 'email' ? (
          <form className="form" onSubmit={mintaKode}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Mengirim…' : 'Kirim kode'}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={verifikasi}>
            <p className="page-sub">Kode 6 digit dikirim ke {email}.</p>
            <label className="field">
              <span className="field-label">Kode</span>
              <input
                className="input otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={kode}
                onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy || kode.length !== 6}>
              {busy ? 'Memeriksa…' : 'Masuk'}
            </button>
            <button
              className="link-btn"
              type="button"
              onClick={() => {
                setStep('email')
                setKode('')
                setNotice(null)
              }}
            >
              Ganti email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
