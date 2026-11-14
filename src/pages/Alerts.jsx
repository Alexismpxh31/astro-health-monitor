import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck, Check } from 'lucide-react'

import { useSession } from '../auth/session.js'
import TrafficLight from '../components/TrafficLight.jsx'
import { defaultUserId } from '../data/demoUser.js'
import { db } from '../db/db.js'
import { recommendationText } from '../rules/engine.js'
import { LEVEL } from './crew/crewStatus.js'
import { localName } from './crew/display.js'
import './Alerts.css'

const LEGACY_DEMO_USER_ID = '00000000-0000-4000-8000-000000000901'

export default function Alerts() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const session = useSession()
  const [filter, setFilter] = useState('open') // 'open' | 'all' | 'attended'

  const alertsData = useLiveQuery(async () => {
    const userId = defaultUserId()

    const [alerts, levels, indicators] = await Promise.all([
      db.alerts.orderBy('generatedAt').reverse().limit(150).toArray(),
      db.alertLevels.toArray(),
      db.indicators.toArray(),
    ])

    const indByCode = new Map(indicators.map((i) => [i.code, i]))
    const indById = new Map(indicators.map((i) => [i.id, i]))

    const fullAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const reading = await db.readings.get(alert.readingId)
        if (userId && reading?.userId && reading.userId !== userId && reading.userId !== LEGACY_DEMO_USER_ID) {
          return null
        }

        const level = levels.find((l) => l.id === alert.alertLevelId)
        const rec = alert.recommendationId ? await db.recommendations.get(alert.recommendationId) : null
        const ind = (reading && indByCode.get(reading.indicatorCode)) || (rec && indById.get(rec.indicatorId)) || null
        const levelCode = (level?.code ?? 'caution').toLowerCase() === 'critical' ? LEVEL.CRITICAL : LEVEL.WARNING

        const advice = recommendationText(rec, reading, lang)

        return {
          id: alert.id,
          alert,
          reading,
          indicator: ind,
          level,
          levelCode,
          severity: level?.code || 'caution',
          advice,
          generatedAt: alert.generatedAt,
          attendedAt: alert.attendedAt,
          isAttended: Boolean(alert.attendedAt),
        }
      })
    )

    return fullAlerts.filter(Boolean)
  }, [session?.userId, lang])

  const handleMarkDone = async (alertId) => {
    try {
      await db.alerts.update(alertId, {
        attendedAt: new Date().toISOString(),
        syncStatus: 'pending',
      })
    } catch (err) {
      console.error('[alerts] Error marking alert as attended:', err)
    }
  }

  const filteredAlerts = (alertsData || []).filter((item) => {
    if (filter === 'open') return !item.isAttended
    if (filter === 'attended') return item.isAttended
    return true
  })

  const FILTERS = [
    { key: 'open', label: t('astronaut.pending') },
    { key: 'all', label: t('astronaut.all') },
    { key: 'attended', label: t('astronaut.attended') },
  ]
  const timeFormat = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })

  return (
    <section className="alerts-page">
      <header className="alerts-header">
        <div className="alerts-header-titles">
          <span className="alerts-header-sub">{t('astronaut.alertsEyebrow')}</span>
          <h1>{t('astronaut.alertsTitle')}</h1>
        </div>
        <div className="alerts-filters" role="group">
          {FILTERS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`filter-btn ${filter === entry.key ? 'is-active' : ''}`}
              aria-pressed={filter === entry.key}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty">
            <CheckCircle2 size={44} style={{ margin: '0 auto 0.75rem', color: 'var(--ok)' }} />
            <p>{filter === 'open' ? t('astronaut.noAlerts') : t('astronaut.noneInCategory')}</p>
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const isCrit = item.severity === 'critical'
            const indName = item.indicator ? localName(item.indicator, lang) : item.reading?.indicatorCode || t('pages.alerts')
            const timeStr = new Date(item.generatedAt).toLocaleString(lang, {
              dateStyle: 'short',
              timeStyle: 'medium',
            })

            return (
              <article
                key={item.id}
                className={`alert-card ${isCrit ? 'is-critical' : 'is-caution'} ${item.isAttended ? 'is-attended' : ''}`}
              >
                <div className="alert-card-header">
                  <div className="alert-card-title-box">
                    <div className="alert-icon-wrap">
                      {isCrit ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h3 className="alert-card-heading">{indName}</h3>
                      <span className="alert-card-time">{timeStr}</span>
                    </div>
                  </div>
                  <TrafficLight level={item.levelCode} />
                </div>

                {item.reading && (
                  <div className="alert-details-row">
                    <span>{t('astronaut.anomalousValue')}</span>
                    <span className="alert-reading-pill">{`${item.reading.value} ${item.reading.unit}`}</span>
                  </div>
                )}

                <div className="alert-recommendation-box">
                  <ShieldCheck className="rec-icon" size={20} />
                  <div className="rec-content">
                    <strong>{t('astronaut.recommendedAction')}</strong>
                    <p>{item.advice}</p>
                  </div>
                </div>

                <footer className="alert-card-footer">
                  {item.isAttended ? (
                    <div className="alert-attended-badge">
                      <CheckCircle2 size={16} />
                      <span>{t('astronaut.attendedAt', { time: timeFormat.format(new Date(item.attendedAt)) })}</span>
                    </div>
                  ) : (
                    <button type="button" onClick={() => handleMarkDone(item.id)} className="alert-done-btn">
                      <Check size={16} />
                      <span>{t('astronaut.markDone')}</span>
                    </button>
                  )}
                </footer>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
