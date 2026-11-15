import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { getLockedUntil, homePathFor, login, loginWithCloudSession, useSession } from '../auth/session.js'
import { db } from '../db/db.js'
import { supabase } from '../sync/supabaseClient.js'
import { useOnlineStatus } from '../utils/useOnlineStatus.js'
import { clearCurrentMission } from './missions/missionStore.js'

const PIN_LENGTH = 4
const GOOGLE_LOGIN_PENDING = 'astrohealth.googleLoginPending'
const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** Users that can log in on this device: active and with a PIN set. */
async function loadLoginUsers() {
  const [users, roles] = await Promise.all([db.users.toArray(), db.roles.toArray()])
  const codeByRoleId = new Map(roles.map((role) => [role.id, role.code]))
  return users
    .filter((user) => user.active !== false && user.pinSalt && user.pinHash)
    .map((user) => ({
      id: user.id,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name,
      roleCode: codeByRoleId.get(user.roleId) ?? null,
    }))
}

export default function Login() {
  const { t } = useTranslation()
  const session = useSession()
  const isOnline = useOnlineStatus()
  const users = useLiveQuery(() => isOnline ? [] : loadLoginUsers(), [isOnline])
  const [selectedId, setSelectedId] = useState(null)
  const [cloudError, setCloudError] = useState(null)
  const [cloudBusy, setCloudBusy] = useState(false)

  async function signInWithGoogle() {
    setCloudBusy(true)
    setCloudError(null)
    try {
      sessionStorage.setItem(GOOGLE_LOGIN_PENDING, 'true')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: new URL('/login', window.location.origin).href,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch {
      sessionStorage.removeItem(GOOGLE_LOGIN_PENDING)
      setCloudError('login.googleError')
      setCloudBusy(false)
    }
  }

  useEffect(() => {
    if (!isOnline || !supabase || session || !sessionStorage.getItem(GOOGLE_LOGIN_PENDING)) return undefined
    let active = true
    async function restoreCloudLogin() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!active) return
        if (!data.session) throw new Error('Missing Google session')
        const result = await loginWithCloudSession()
        if (active && !result.ok) setCloudError('login.googleUnlinked')
      } catch {
        if (active) setCloudError('login.googleError')
      } finally {
        if (active) sessionStorage.removeItem(GOOGLE_LOGIN_PENDING)
      }
    }
    void restoreCloudLogin()
    return () => { active = false }
  }, [session, isOnline])

  // A new login never reopens the mission picked in a previous session.
  useEffect(() => {
    if (!session) clearCurrentMission()
  }, [session])

  // Also covers the moment right after a successful login.
  if (session) return <Navigate to={homePathFor(session.roleCode)} replace />

  if (isOnline) return (
    <section className="page login-page">
      <h1>{t('pages.login')}</h1>
      {supabase ? (
        <button type="button" disabled={cloudBusy} onClick={signInWithGoogle}>
          {t('comms.cloud.link')}
        </button>
      ) : <p role="status">{t('comms.cloud.notConfigured')}</p>}
      {cloudError && <p role="alert">{t(cloudError)}</p>}
    </section>
  )

  const selected = users?.find((user) => user.id === selectedId)
  const roleLabel = (user) => (user.roleCode ? t(`auth.roles.${user.roleCode}`, user.roleCode) : '')

  return (
    <section className="page login-page">
      <h1>{t('pages.login')}</h1>
      {selected ? (
        <PinStep
          key={selected.id}
          user={selected}
          roleLabel={roleLabel(selected)}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <>
          <p className="muted">{t('login.chooseUser')}</p>
          {!users ? (
            <p className="muted">{t('login.loading')}</p>
          ) : users.length === 0 ? (
            <p className="muted">{t('login.noUsers')}</p>
          ) : (
            <ul className="login-users">
              {users.map((user) => (
                <li key={user.id}>
                  <button type="button" className="login-user" onClick={() => setSelectedId(user.id)}>
                    <span className="login-user-name">{user.fullName}</span>
                    <span className="login-user-role">{roleLabel(user)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="login-offline">{t('login.offlineNote')}</p>
    </section>
  )
}

/** Step 2: on-screen numeric keypad (the physical keyboard works too). */
function PinStep({ user, roleLabel, onBack }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null) // { key, count? } -> i18n message
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(() => getLockedUntil(user.id))
  const [now, setNow] = useState(() => Date.now())

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0
  const locked = secondsLeft > 0
  const disabled = locked || busy

  // Countdown while locked.
  useEffect(() => {
    if (!lockedUntil) return undefined
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [lockedUntil])

  function addDigit(digit) {
    if (disabled) return
    setError(null)
    setPin((value) => (value.length < PIN_LENGTH ? value + digit : value))
  }

  function removeDigit() {
    if (disabled) return
    setPin((value) => value.slice(0, -1))
  }

  async function submit() {
    if (disabled || pin.length !== PIN_LENGTH) return
    setBusy(true)
    try {
      const result = await login(user.id, pin)
      if (result.ok) return // The session changed: <Login> redirects.
      setPin('')
      if (result.reason === 'locked') {
        setError(null)
        setNow(Date.now())
        setLockedUntil(result.lockedUntil)
      } else if (result.reason === 'invalid') {
        setError({ key: 'login.wrongPin', count: result.attemptsLeft })
      } else {
        setError({ key: 'login.error' })
      }
    } catch (cause) {
      console.error('[login] Could not check the PIN', cause?.message)
      setPin('')
      setError({ key: 'login.error' })
    } finally {
      setBusy(false)
    }
  }

  // Physical keyboard. Re-registered on every render so it always sees the current state.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (/^\d$/.test(event.key)) {
        addDigit(event.key)
      } else if (event.key === 'Backspace') {
        removeDigit()
      } else if (event.key === 'Escape') {
        onBack()
      } else if (event.key === 'Enter' && event.target?.tagName !== 'BUTTON') {
        // On a focused button, Enter keeps its normal meaning (press that button).
        submit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="login-pin">
      <p className="login-pin-user">
        <span className="login-user-name">{user.fullName}</span>
        <span className="login-user-role">{roleLabel}</span>
      </p>

      <p id="login-pin-label" className="login-pin-label">
        {t('login.enterPin')}
      </p>
      <div className="login-dots" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span key={index} className={`login-dot${index < pin.length ? ' is-filled' : ''}`} />
        ))}
      </div>
      <p className="visually-hidden" role="status">
        {t('login.pinProgress', { entered: pin.length, total: PIN_LENGTH })}
      </p>

      <div className="login-messages" aria-live="assertive">
        {locked && <p className="login-error">{t('login.locked')}</p>}
        {!locked && error && <p className="login-error">{t(error.key, { count: error.count })}</p>}
      </div>
      {locked && (
        <p className="login-countdown" role="timer">
          {t('login.lockedCountdown', { count: secondsLeft })}
        </p>
      )}

      <div className="login-keypad" role="group" aria-labelledby="login-pin-label">
        {DIGIT_KEYS.map((digit) => (
          <button key={digit} type="button" className="login-key" disabled={disabled} onClick={() => addDigit(digit)}>
            {digit}
          </button>
        ))}
        <button
          type="button"
          className="login-key login-key-action"
          disabled={disabled || pin.length === 0}
          onClick={removeDigit}
        >
          {t('login.delete')}
        </button>
        <button type="button" className="login-key" disabled={disabled} onClick={() => addDigit('0')}>
          0
        </button>
        <button
          type="button"
          className="login-key login-key-action login-key-enter"
          disabled={disabled || pin.length !== PIN_LENGTH}
          onClick={submit}
        >
          {t('login.enter')}
        </button>
      </div>

      <button type="button" className="login-back" onClick={onBack}>
        {t('login.changeUser')}
      </button>
    </div>
  )
}
