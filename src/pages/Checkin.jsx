import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { getSession } from '../auth/session.js'
import { CheckinNotAllowedError, saveDailyCheckin } from '../data/checkins.js'
import { DEMO_ASTRONAUT_ID } from '../data/demoUser.js'
import catalogs from '../data/seed/catalogs.json'
import { db, seedIfEmpty } from '../db/db.js'
import { createReading } from '../models/reading.js'
import { evaluateReading, recommendationText } from '../rules/engine.js'
import './Checkin.css'

/** indicator code -> unit symbol, from the local catalog. */
async function getUnitByIndicatorCode() {
  const [indicators, units] = await Promise.all([db.indicators.toArray(), db.units.toArray()])
  const symbolByUnitId = Object.fromEntries(units.map((unit) => [unit.id, unit.symbol]))
  return Object.fromEntries(indicators.map((indicator) => [indicator.code, symbolByUnitId[indicator.unitId] ?? '']))
}

/** Same lookup as the engine: the recommendation for the exact direction, else the generic one. */
async function findRecommendation(indicatorCode, levelCode, direction) {
  const [indicator, alertLevels] = await Promise.all([
    db.indicators.where('code').equals(indicatorCode).first(),
    db.alertLevels.toArray(),
  ])
  const alertLevel = alertLevels.find((row) => row.code === levelCode)
  if (!indicator || !alertLevel) return null
  const rows = await db.recommendations
    .where('[indicatorId+alertLevelId]')
    .equals([indicator.id, alertLevel.id])
    .toArray()
  return rows.find((row) => row.direction === direction) ?? rows.find((row) => row.direction == null) ?? null
}

export default function Checkin() {
  const { t, i18n } = useTranslation()
  const session = getSession()
  const userId = session?.userId ?? DEMO_ASTRONAUT_ID
  const isEnglish = i18n.language?.startsWith('en')
  const lang = isEnglish ? 'en' : 'es'

  const [mood, setMood] = useState(4)
  const [sleepHours, setSleepHours] = useState(7.5)
  const [stress, setStress] = useState(2)
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [notes, setNotes] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [saveErrorKey, setSaveErrorKey] = useState(null)

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

  /**
   * Runs the check-in readings through the rules engine (same thresholds, levels,
   * high/low recommendations, de-duplication and critical notification as the
   * rest of the app) and collects the advice to show on screen.
   */
  const evaluateWithEngine = async (readings) => {
    let overallLevel = 'normal'
    const findings = []

    for (const reading of readings) {
      const { level, direction, alert } = await evaluateReading(reading)
      if (!level || level === 'normal') continue

      if (level === 'critical') overallLevel = 'critical'
      else if (overallLevel === 'normal') overallLevel = 'caution'

      // The engine skips a repeated alert within its cooldown: look the advice up anyway.
      const recommendation = alert?.recommendationId
        ? await db.recommendations.get(alert.recommendationId)
        : await findRecommendation(reading.indicatorCode, level, direction)
      const text =
        recommendationText(recommendation, reading, lang) ||
        t(`checkin.recs.REC_${reading.indicatorCode}_${level.toUpperCase()}`, { value: reading.value })
      findings.push({ text })
    }

    return { level: overallLevel, findings }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nowIso = new Date().toISOString()
    const dateUtc = nowIso.split('T')[0]
    const pvtTag = pvtMs !== null ? `[PVT: ${pvtMs} ms]` : ''
    const cleanNotes = notes.trim()
    const combinedNotes = [cleanNotes, pvtTag].filter(Boolean).join(' ') || null

    const units = await getUnitByIndicatorCode()
    const reading = (indicatorCode, value) => ({
      ...createReading({ userId, indicatorCode, value, unit: units[indicatorCode] ?? '', source: 'simulated' }),
      measuredAt: nowIso,
    })
    const readingRows = [reading('SLEEP_H', sleepHours), reading('MOOD', mood), reading('STRESS', stress)]
    if (pvtMs !== null) readingRows.push(reading('PVT', pvtMs))

    // The data layer rejects check-ins from (or for) a flight surgeon.
    try {
      await saveDailyCheckin({
        userId,
        date: dateUtc,
        mood,
        sleepHours,
        stress,
        notes: combinedNotes,
        symptomIds: selectedSymptoms,
        readings: readingRows,
      })
      setSaveErrorKey(null)
    } catch (error) {
      console.error('[Checkin] Could not save the check-in', error)
      setEvaluation(null)
      setSaveErrorKey(error instanceof CheckinNotAllowedError ? 'checkin.notAllowed' : 'checkin.saveError')
      return
    }

    // After saving: the rules engine evaluates each reading and stores the alerts.
    const result = await evaluateWithEngine(readingRows)
    setEvaluation({
      level: result.level,
      recommendations: result.findings.map((f) => f.text),
    })
  }

  /** Exporta todos los chequeos locales del astronauta a un archivo CSV descargable */
  const handleExportCsv = async () => {
    const allCheckins = await db.dailyCheckins
      .where('[userId+date]')
      .between([userId, ''], [userId, '\uffff'])
      .toArray()

    if (allCheckins.length === 0) return

    const allLinks = await db.checkinSymptoms.toArray()
    const symMap = Object.fromEntries(
      symptomsList.map((s) => [s.id, isEnglish ? s.nameEn : s.nameEs])
    )

    const headers = ['date_utc', 'mood_1_5', 'sleep_hours', 'stress_1_5', 'symptoms', 'notes', 'sync_status']
    const rows = allCheckins.map((c) => {
      const syms = allLinks
        .filter((l) => l.checkinId === c.id)
        .map((l) => symMap[l.symptomId] || l.symptomId)
        .join('; ')

      return [c.date, c.mood, c.sleepHours, c.stress, syms, c.notes || '', c.syncStatus]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `astrosalud_checkin_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const pvtButtonLabel = {
    idle: t('checkin.pvtStart'),
    waiting: t('checkin.pvtWait'),
    ready: t('checkin.pvtTapNow'),
    early: t('checkin.pvtEarly'),
    done: t('checkin.pvtRetry'),
  }[pvtState]

  const sleepStatusClass =
    sleepHours >= 6.5 && sleepHours <= 9 ? 'is-nominal' : 'is-warn'

  return (
    <section className="checkin-page">
      <header className="checkin-top">
        <h1>{t('checkin.title')}</h1>
        <p className="muted">{t('checkin.subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit} className="checkin-grid">
        {/* Columna izquierda: Estado psicofisiológico */}
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
      {saveErrorKey && (
        <p className="checkin-save-error" role="alert">
          ⚠ {t(saveErrorKey)}
        </p>
      )}

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

      {/* Cola local en Dexie + Exportación CSV */}
      <div>
        <div className="history-head">
          <h2>{t('checkin.historyTitle')}</h2>
          {recentCheckins && recentCheckins.length > 0 && (
            <button type="button" className="csv-btn" onClick={handleExportCsv}>
              ↓ {isEnglish ? 'Export CSV' : 'Exportar CSV'}
            </button>
          )}
        </div>

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