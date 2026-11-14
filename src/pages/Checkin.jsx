import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getSession } from '../auth/session.js'
import catalogs from '../data/seed/catalogs.json'
import { db, seedIfEmpty } from '../db/db.js'
import './Checkin.css'

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

  // Psychomotor Vigilance Test (PVT)
  const [pvtState, setPvtState] = useState('idle') // idle | waiting | ready | early | done
  const [pvtMs, setPvtMs] = useState(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    seedIfEmpty().catch((err) => console.error('[Checkin] Error seeding Dexie:', err))
    return () => clearTimeout(timerRef.current)
  }, [])

  const dbSymptoms = useLiveQuery(() => db.symptoms.toArray(), [])
  const symptomsList = dbSymptoms && dbSymptoms.length > 0 ? dbSymptoms : catalogs.symptoms

  const recentCheckins = useLiveQuery(
    () =>
      db.dailyCheckins
        .where('[userId+date]')
        .between([userId, ''], [userId, '\uffff'])
        .reverse()
        .limit(4)
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
    let level = 'normal'
    const recommendations = []

    const elevate = (newLevel, recKey, value = '') => {
      if (newLevel === 'critical') level = 'critical'
      else if (newLevel === 'caution' && level === 'normal') level = 'caution'
      recommendations.push(t(`checkin.recs.${recKey}`, { value }))
    }

    // Umbrales alineados a TH_SLEEP_H (6.5 - 9.0 h nominal)
    if (sleepHours < 4) elevate('critical', 'REC_SLEEP_H_LOW_CRITICAL', sleepHours)
    else if (sleepHours < 6.5) elevate('caution', 'REC_SLEEP_H_LOW_CAUTION', sleepHours)
    else if (sleepHours > 14) elevate('critical', 'REC_SLEEP_H_HIGH_CRITICAL', sleepHours)
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

    const nowIso = new Date().toISOString()
    const dateUtc = nowIso.split('T')[0]
    const pvtTag = pvtMs !== null ? `[PVT: ${pvtMs} ms]` : ''
    const cleanNotes = notes.trim()
    const combinedNotes = [cleanNotes, pvtTag].filter(Boolean).join(' ') || null

    let checkinId = crypto.randomUUID()

    await db.transaction(
      'rw',
      db.dailyCheckins,
      db.checkinSymptoms,
      db.readings,
      async () => {
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
            }))
          )
        }

        // Guardar también PVT como lectura oficial para que lo vean Vitals y el motor de reglas
        if (pvtMs !== null) {
          await db.readings.put({
            id: crypto.randomUUID(),
            userId,
            indicatorCode: 'PVT',
            value: pvtMs,
            measuredAt: nowIso,
            source: 'simulated',
            syncStatus: 'pending',
          })
        }
      }
    )

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
  const sleepStatusClass =
    sleepHours >= 6.5 && sleepHours <= 9 ? 'is-nominal' : 'is-warn'

  return (
    <section className="checkin-page">
      <header className="checkin-top">
        <h1>{t('checkin.title')}</h1>
        <p className="muted">{t('checkin.subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit} className="checkin-grid">
        {/* Columna izquierda: Estado diario */}
        <div className="checkin-col">
          {/* 1. Ánimo */}
          <div className="checkin-card">
            <div className="checkin-card-head">
              <h2>{t('checkin.moodLabel')}</h2>
              <span className="checkin-hint">{t('checkin.moodHint')}</span>
            </div>
            <div className="seg-bar">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`seg-btn ${mood === val ? 'is-active' : ''}`}
                  onClick={() => setMood(val)}
                >
                  <strong>{val}</strong>
                  <span>{t(`checkin.moodOptions.${val}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Sueño */}
          <div className="checkin-card">
            <div className="checkin-card-head">
              <h2>{t('checkin.sleepLabel')}</h2>
              <span className="checkin-hint">6.5 – 9.0 h</span>
            </div>
            <div className="sleep-bar">
              <button
                type="button"
                className="sleep-btn"
                onClick={() => adjustSleep(-0.5)}
                aria-label="-0.5 h"
              >
                −
              </button>
              <span className={`sleep-val ${sleepStatusClass}`}>
                {sleepHours.toFixed(1)} {t('checkin.sleepUnit')}
              </span>
              <button
                type="button"
                className="sleep-btn"
                onClick={() => adjustSleep(0.5)}
                aria-label="+0.5 h"
              >
                +
              </button>
            </div>
          </div>

          {/* 3. Estrés */}
          <div className="checkin-card">
            <div className="checkin-card-head">
              <h2>{t('checkin.stressLabel')}</h2>
              <span className="checkin-hint">{t('checkin.stressHint')}</span>
            </div>
            <div className="seg-bar">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`seg-btn ${stress === val ? 'is-active' : ''}`}
                  onClick={() => setStress(val)}
                >
                  <strong>{val}</strong>
                  <span>{t(`checkin.stressOptions.${val}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: PVT, Síntomas, Notas y Envío */}
        <div className="checkin-col">
          {/* 4. Test PVT */}
          <div className="checkin-card">
            <div className="checkin-card-head">
              <h2>{t('checkin.pvtTitle')}</h2>
              <span className="checkin-hint">180–300 ms</span>
            </div>
            <div className="pvt-row">
              <button
                type="button"
                className={`pvt-trigger ${pvtState}`}
                onClick={handlePvtClick}
              >
                {pvtButtonLabel}
              </button>
              <div className="pvt-metric">
                <strong>{pvtMs !== null ? `${pvtMs}` : '—'}</strong>
                <span>ms PVT</span>
              </div>
            </div>
          </div>

          {/* 5. Síntomas */}
          <div className="checkin-card">
            <div className="checkin-card-head">
              <h2>{t('checkin.symptomsLabel')}</h2>
              <span className="checkin-hint">{selectedSymptoms.length}</span>
            </div>
            <div className="symptom-chips">
              {symptomsList.map((sym) => {
                const active = selectedSymptoms.includes(sym.id)
                const label = isEnglish ? sym.nameEn : sym.nameEs
                return (
                  <button
                    key={sym.id}
                    type="button"
                    className={`chip-btn ${active ? 'is-selected' : ''}`}
                    onClick={() => toggleSymptom(sym.id)}
                  >
                    {active ? '✓ ' : '+ '}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 6. Notas + Guardar */}
          <div className="checkin-card">
            <div className="checkin-card-head">
              <h2>{t('checkin.notesLabel')}</h2>
            </div>
            <textarea
              className="checkin-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('checkin.notesPlaceholder')}
            />
          </div>

          <button type="submit" className="checkin-submit">
            {t('checkin.submitButton')}
          </button>
        </div>
      </form>

      {/* Resultado clínico inmediato */}
      {evaluation && (
        <div className={`triage-card ${evaluation.level}`}>
          <div className="triage-head">
            <span className="triage-status">
              {t('checkin.evalTitle')}:{' '}
              {evaluation.level === 'normal'
                ? t('checkin.statusNormal')
                : evaluation.level === 'caution'
                ? t('checkin.statusCaution')
                : t('checkin.statusCritical')}
            </span>
            <span className="triage-badge">✓ {t('checkin.savedBadge')}</span>
          </div>
          <ul>
            {evaluation.recommendations.length > 0 ? (
              evaluation.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)
            ) : (
              <li>{t('checkin.recNominal')}</li>
            )}
          </ul>
        </div>
      )}

      {/* Cola local en Dexie con el mismo estilo de filas de Sensors */}
      <div>
        <h2>{t('checkin.historyTitle')}</h2>
        {!recentCheckins || recentCheckins.length === 0 ? (
          <p className="muted">{t('checkin.historyEmpty')}</p>
        ) : (
          <ul className="sim-list">
            {recentCheckins.map((item) => (
              <li key={item.id} className="sim-row">
                <span className="sim-row-name">
                  <strong>{item.date}</strong> · {item.mood}/5 · {item.sleepHours}h ·{' '}
                  {item.stress}/5
                </span>
                <span className={`sync-tag ${item.syncStatus}`}>
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