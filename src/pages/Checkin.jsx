import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getSession } from '../auth/session.js'
import catalogs from '../data/seed/catalogs.json'
import { db, seedIfEmpty } from '../db/db.js'
import './Checkin.css'

// Matches Demo Astronaut in src/data/seed/users.json when session stub returns null
const DEMO_ASTRONAUT_ID = '00000000-0000-4000-8000-000000000901'

export default function Checkin() {
  const { t, i18n } = useTranslation()
  const session = getSession()
  const userId = session?.userId ?? DEMO_ASTRONAUT_ID

  const [mood, setMood] = useState(4)
  const [sleepHours, setSleepHours] = useState(7.5)
  const [stress, setStress] = useState(2)
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [notes, setNotes] = useState('')
  const [evaluation, setEvaluation] = useState(null)

  // Psychomotor Vigilance Test (PVT) state
  const [pvtState, setPvtState] = useState('idle') // idle | waiting | ready | early | done
  const [pvtMs, setPvtMs] = useState(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    seedIfEmpty().catch((err) => console.error('[Checkin] Error seeding Dexie:', err))
    return () => clearTimeout(timerRef.current)
  }, [])

  // Load symptoms from Dexie (falls back to catalogs.json on very first render)
  const dbSymptoms = useLiveQuery(() => db.symptoms.toArray(), [])
  const symptomsList = dbSymptoms && dbSymptoms.length > 0 ? dbSymptoms : catalogs.symptoms

  // Live query of recent check-ins in Dexie for offline verification
  const recentCheckins = useLiveQuery(
    () =>
      db.dailyCheckins
        .where('[userId+date]')
        .between([userId, ''], [userId, '\uffff'])
        .reverse()
        .limit(5)
        .toArray(),
    [userId]
  )

  const startPvt = () => {
    clearTimeout(timerRef.current)
    setPvtState('waiting')
    const delay = 1200 + Math.floor(Math.random() * 1800)
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now()
      setPvtState('ready')
    }, delay)
  }

  const handlePvtClick = () => {
    if (pvtState === 'idle' || pvtState === 'done' || pvtState === 'early') {
      startPvt()
      return
    }
    if (pvtState === 'waiting') {
      clearTimeout(timerRef.current)
      setPvtState('early')
      return
    }
    if (pvtState === 'ready') {
      const latency = Math.round(performance.now() - startTimeRef.current)
      setPvtMs(latency)
      setPvtState('done')
    }
  }

  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    )
  }

  const adjustSleep = (delta) => {
    setSleepHours((prev) => {
      const next = Math.round((prev + delta) * 2) / 2
      return Math.min(24, Math.max(0, next))
    })
  }

  const evaluateCheckin = () => {
    let level = 'normal' // normal | caution | critical
    const recommendations = []

    const elevate = (newLevel, recKey, value = '') => {
      if (newLevel === 'critical') level = 'critical'
      else if (newLevel === 'caution' && level === 'normal') level = 'caution'
      recommendations.push(t(`checkin.recs.${recKey}`, { value }))
    }

    if (sleepHours < 4) elevate('critical', 'REC_SLEEP_H_LOW_CRITICAL', sleepHours)
    else if (sleepHours < 6) elevate('caution', 'REC_SLEEP_H_LOW_CAUTION', sleepHours)
    else if (sleepHours > 12) elevate('critical', 'REC_SLEEP_H_HIGH_CRITICAL', sleepHours)
    else if (sleepHours > 9) elevate('caution', 'REC_SLEEP_H_HIGH_CAUTION', sleepHours)

    if (mood < 1.5) elevate('critical', 'REC_MOOD_LOW_CRITICAL', mood)
    else if (mood < 2.5) elevate('caution', 'REC_MOOD_LOW_CAUTION', mood)

    if (stress > 4.5) elevate('critical', 'REC_STRESS_HIGH_CRITICAL', stress)
    else if (stress > 3) elevate('caution', 'REC_STRESS_HIGH_CAUTION', stress)

    if (pvtMs !== null) {
      if (pvtMs > 450) elevate('critical', 'REC_PVT_CRITICAL', pvtMs)
      else if (pvtMs > 320) elevate('caution', 'REC_PVT_CAUTION', pvtMs)
    }

    return { level, recommendations }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const dateUtc = new Date().toISOString().split('T')[0]
    const pvtTag = pvtMs !== null ? `[PVT: ${pvtMs} ms]` : ''
    const cleanNotes = notes.trim()
    const combinedNotes = [cleanNotes, pvtTag].filter(Boolean).join(' ') || null

    let checkinId = crypto.randomUUID()

    await db.transaction('rw', db.dailyCheckins, db.checkinSymptoms, async () => {
      // Enforce unique [userId+date] locally in Dexie
      const existing = await db.dailyCheckins
        .where('[userId+date]')
        .equals([userId, dateUtc])
        .first()

      if (existing) {
        checkinId = existing.id
        const oldSymptoms = await db.checkinSymptoms
          .where('[checkinId+symptomId]')
          .between([checkinId, ''], [checkinId, '\uffff'])
          .toArray()

        if (oldSymptoms.length > 0) {
          await db.checkinSymptoms.bulkDelete(
            oldSymptoms.map((item) => [item.checkinId, item.symptomId])
          )
        }
      }

      await db.dailyCheckins.put({
        id: checkinId,
        userId,
        date: dateUtc,
        mood,
        sleepHours,
        stress,
        notes: combinedNotes,
        syncStatus: 'pending',
      })

      if (selectedSymptoms.length > 0) {
        await db.checkinSymptoms.bulkPut(
          selectedSymptoms.map((symptomId) => ({
            checkinId,
            symptomId,
            syncStatus: 'pending',
          }))
        )
      }
    })

    setEvaluation(evaluateCheckin())
  }

  const pvtButtonLabel = {
    idle: t('checkin.pvtStart'),
    waiting: t('checkin.pvtWait'),
    ready: t('checkin.pvtTapNow'),
    early: t('checkin.pvtEarly'),
    done: t('checkin.pvtRetry'),
  }[pvtState]

  const isEnglish = i18n.language?.startsWith('en')

  return (
    <section className="checkin-container">
      <header className="checkin-header">
        <div>
          <h1>{t('checkin.title')}</h1>
          <p className="checkin-subtitle">{t('checkin.subtitle')}</p>
        </div>
        <button
          type="button"
          className="lang-toggle-btn"
          onClick={() => i18n.changeLanguage(isEnglish ? 'es' : 'en')}
        >
          {isEnglish ? '🇪🇸 ES' : '🇺🇸 EN'}
        </button>
      </header>

      <form onSubmit={handleSubmit}>
        {/* 1. Mood */}
        <div className="checkin-card">
          <h2>{t('checkin.moodLabel')}</h2>
          <p className="checkin-subtitle">{t('checkin.moodHint')}</p>
          <div className="scale-grid">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                className={`scale-btn ${mood === val ? 'active' : ''}`}
                onClick={() => setMood(val)}
              >
                <strong>{val}</strong>
                <span>{t(`checkin.moodOptions.${val}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Sleep hours */}
        <div className="checkin-card">
          <h2>{t('checkin.sleepLabel')}</h2>
          <p className="checkin-subtitle">{t('checkin.sleepHint')}</p>
          <div className="sleep-stepper">
            <button type="button" className="stepper-btn" onClick={() => adjustSleep(-0.5)}>
              −
            </button>
            <div className="sleep-display">
              {sleepHours} {t('checkin.sleepUnit')}
            </div>
            <button type="button" className="stepper-btn" onClick={() => adjustSleep(0.5)}>
              +
            </button>
          </div>
        </div>

        {/* 3. Stress */}
        <div className="checkin-card">
          <h2>{t('checkin.stressLabel')}</h2>
          <p className="checkin-subtitle">{t('checkin.stressHint')}</p>
          <div className="scale-grid">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                className={`scale-btn ${stress === val ? 'active' : ''}`}
                onClick={() => setStress(val)}
              >
                <strong>{val}</strong>
                <span>{t(`checkin.stressOptions.${val}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. PVT Reflex Test */}
        <div className="checkin-card">
          <h2>{t('checkin.pvtTitle')}</h2>
          <p className="checkin-subtitle">{t('checkin.pvtSubtitle')}</p>
          <button type="button" className={`pvt-pad ${pvtState}`} onClick={handlePvtClick}>
            {pvtButtonLabel}
          </button>
          {pvtMs !== null && (
            <div className="pvt-result-badge">
              {t('checkin.pvtResultLabel')} {pvtMs} ms
            </div>
          )}
        </div>

        {/* 5. Symptoms from Dexie / catalogs.json */}
        <div className="checkin-card">
          <h2>{t('checkin.symptomsLabel')}</h2>
          <p className="checkin-subtitle">{t('checkin.symptomsHint')}</p>
          <div className="symptoms-grid">
            {symptomsList.map((sym) => {
              const active = selectedSymptoms.includes(sym.id)
              const label = isEnglish ? sym.nameEn : sym.nameEs
              return (
                <button
                  key={sym.id}
                  type="button"
                  className={`symptom-btn ${active ? 'selected' : ''}`}
                  onClick={() => toggleSymptom(sym.id)}
                >
                  {active ? '✓ ' : '+ '}
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 6. Notes */}
        <div className="checkin-card">
          <h2>{t('checkin.notesLabel')}</h2>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('checkin.notesPlaceholder')}
          />
        </div>

        <button type="submit" className="submit-checkin-btn">
          {t('checkin.submitButton')}
        </button>

        {evaluation && (
          <div className={`triage-box ${evaluation.level}`}>
            <h3>
              {t('checkin.evalTitle')}:{' '}
              {evaluation.level === 'normal'
                ? t('checkin.statusNormal')
                : evaluation.level === 'caution'
                ? t('checkin.statusCaution')
                : t('checkin.statusCritical')}
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}>
              ✓ {t('checkin.savedBadge')}
            </p>
            <ul>
              {evaluation.recommendations.length > 0 ? (
                evaluation.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)
              ) : (
                <li>{t('checkin.recNominal')}</li>
              )}
            </ul>
          </div>
        )}
      </form>

      {/* Live IndexedDB (Dexie) local history verification */}
      <div className="checkin-card" style={{ marginTop: '1.25rem' }}>
        <h2>{t('checkin.historyTitle')}</h2>
        {!recentCheckins || recentCheckins.length === 0 ? (
          <p className="checkin-subtitle">{t('checkin.historyEmpty')}</p>
        ) : (
          <ul className="history-list">
            {recentCheckins.map((item) => (
              <li key={item.id} className="history-item">
                <span>
                  <strong>{item.date}</strong> · Mood: {item.mood}/5 · Sleep: {item.sleepHours}h · Stress:{' '}
                  {item.stress}/5
                </span>
                <span className={`sync-pill ${item.syncStatus}`}>
                  {item.syncStatus === 'pending'
                    ? t('checkin.syncPending')
                    : t('checkin.syncSynced')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
