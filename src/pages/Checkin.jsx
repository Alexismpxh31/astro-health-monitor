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
  const isEnglish = i18n.language?.startsWith('en')
  const lang = isEnglish ? 'en' : 'es'

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
   * Evalúa cada indicador contra db.thresholds y obtiene la recomendación oficial
   * desde db.recommendations (con respaldo en i18n si aún no se ha sembrado).
   */
  const evaluateWithDatabase = async (metrics) => {
    const [indicators, thresholds, alertLevels, recommendations, units] = await Promise.all([
      db.indicators.toArray(),
      db.thresholds.toArray(),
      db.alertLevels.toArray(),
      db.recommendations.toArray(),
      db.units.toArray(),
    ])

    const indByCode = Object.fromEntries(indicators.map((i) => [i.code, i]))
    const levelByCode = Object.fromEntries(alertLevels.map((l) => [l.code, l]))
    const unitById = Object.fromEntries(units.map((u) => [u.id, u.symbol]))

    let overallLevel = 'normal'
    const findings = []

    for (const { code, value, readingId } of metrics) {
      if (value === null || value === undefined) continue
      const indicator = indByCode[code]
      if (!indicator) continue

      // Priorizar umbral personal del astronauta si el médico de vuelo lo ajustó
      const threshold =
        thresholds.find((th) => th.indicatorId === indicator.id && th.userId === userId) ||
        thresholds.find((th) => th.indicatorId === indicator.id && th.userId == null)

      if (!threshold) continue

      let levelCode = 'normal'
      let direction = null

      if (value < threshold.minCritical) {
        levelCode = 'critical'
        direction = 'low'
      } else if (value > threshold.maxCritical) {
        levelCode = 'critical'
        direction = 'high'
      } else if (value < threshold.minNormal) {
        levelCode = 'caution'
        direction = 'low'
      } else if (value > threshold.maxNormal) {
        levelCode = 'caution'
        direction = 'high'
      }

      if (levelCode === 'normal') continue

      if (levelCode === 'critical') overallLevel = 'critical'
      else if (levelCode === 'caution' && overallLevel === 'normal') overallLevel = 'caution'

      const levelObj = levelByCode[levelCode]
      const rec = recommendations.find(
        (r) =>
          r.indicatorId === indicator.id &&
          r.alertLevelId === levelObj?.id &&
          (r.direction === direction || r.direction == null)
      )

      const unitSymbol = unitById[indicator.unitId] || ''
      const rawText = rec?.text?.[lang] || rec?.text?.es
      const formattedText = rawText
        ? rawText.replace(/%value%/g, String(value)).replace(/%unit%/g, unitSymbol)
        : t(`checkin.recs.REC_${code}_${levelCode.toUpperCase()}`, { value })

      findings.push({
        text: formattedText,
        readingId,
        recommendationId: rec?.id ?? null,
      })
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

    let checkinId = crypto.randomUUID()
    const sleepReadingId = crypto.randomUUID()
    const moodReadingId = crypto.randomUUID()
    const stressReadingId = crypto.randomUUID()
    const pvtReadingId = pvtMs !== null ? crypto.randomUUID() : null

    const result = await evaluateWithDatabase([
      { code: 'SLEEP_H', value: sleepHours, readingId: sleepReadingId },
      { code: 'MOOD', value: mood, readingId: moodReadingId },
      { code: 'STRESS', value: stress, readingId: stressReadingId },
      { code: 'PVT', value: pvtMs, readingId: pvtReadingId },
    ])

    await db.transaction(
      'rw',
      db.dailyCheckins,
      db.checkinSymptoms,
      db.readings,
      db.alerts,
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

        // Registrar también las lecturas en db.readings para gráficas y motor de alertas
        const readingRows = [
          {
            id: sleepReadingId,
            userId,
            indicatorCode: 'SLEEP_H',
            value: sleepHours,
            measuredAt: nowIso,
            source: 'simulated',
            syncStatus: 'pending',
          },
          {
            id: moodReadingId,
            userId,
            indicatorCode: 'MOOD',
            value: mood,
            measuredAt: nowIso,
            source: 'simulated',
            syncStatus: 'pending',
          },
          {
            id: stressReadingId,
            userId,
            indicatorCode: 'STRESS',
            value: stress,
            measuredAt: nowIso,
            source: 'simulated',
            syncStatus: 'pending',
          },
        ]

        if (pvtMs !== null && pvtReadingId) {
          readingRows.push({
            id: pvtReadingId,
            userId,
            indicatorCode: 'PVT',
            value: pvtMs,
            measuredAt: nowIso,
            source: 'simulated',
            syncStatus: 'pending',
          })
        }

        await db.readings.bulkPut(readingRows)

        // Si hubo hallazgos fuera de rango, generar alertas clínicas locales
        if (result.findings.length > 0) {
          await db.alerts.bulkPut(
            result.findings.map((f) => ({
              id: crypto.randomUUID(),
              readingId: f.readingId,
              recommendationId: f.recommendationId,
              generatedAt: nowIso,
              attendedAt: null,
              syncStatus: 'pending',
            }))
          )
        }
      }
    )

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