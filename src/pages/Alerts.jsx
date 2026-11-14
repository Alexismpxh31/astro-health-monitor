import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck, Check } from 'lucide-react'

import { useSession } from '../auth/session.js'
import TrafficLight from '../components/TrafficLight.jsx'
import { db } from '../db/db.js'
import { recommendationText } from '../rules/engine.js'
import { LEVEL } from './crew/crewStatus.js'
import './Alerts.css'

const LEGACY_DEMO_USER_ID = '00000000-0000-4000-8000-000000000901'

export default function Alerts() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || 'es'
  const isEs = lang.startsWith('es')
  const session = useSession()
  const [filter, setFilter] = useState('open') // 'open' | 'all' | 'attended'

  const alertsData = useLiveQuery(async () => {
    let userId = session?.userId
    if (!userId) {
      const demoAstronaut = await db.users.where('roleId').equals('00000000-0000-4000-8000-000000000101').first()
      userId = demoAstronaut?.id
    }

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

  return (
    <section className="alerts-page">
      {/* Header Banner with filters */}
      <header className="alerts-header">
        <div className="alerts-header-titles">
          <span className="alerts-header-sub">NASA Space Flight Health Protocols</span>
          <h1>{isEs ? 'Alertas Médicas y Acciones Requeridas' : 'Medical Alerts & Action Protocols'}</h1>
        </div>
        <div className="alerts-filters">
          <button
            type="button"
            className={`filter-btn ${filter === 'open' ? 'is-active' : ''}`}
            onClick={() => setFilter('open')}
          >
            {isEs ? 'Sin atender' : 'Pending'}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {isEs ? 'Todas' : 'All'}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'attended' ? 'is-active' : ''}`}
            onClick={() => setFilter('attended')}
          >
            {isEs ? 'Atendidas' : 'Attended'}
          </button>
        </div>
      </header>

      {/* Alerts Feed */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty">
            <CheckCircle2 size={44} color="#22c55e" style={{ margin: '0 auto 0.75rem' }} />
            <p>
              {filter === 'open'
                ? isEs
                  ? 'No hay alertas médicas pendientes. Todos los parámetros fisiológicos se encuentran en rango seguro.'
                  : 'No pending medical alerts. All physiological indicators are currently in safe range.'
                : isEs
                ? 'No se encontraron alertas en esta categoría.'
                : 'No alerts found in this category.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const isCrit = item.severity === 'critical'
            const indName = item.indicator
              ? isEs
                ? item.indicator.nameEs
                : item.indicator.nameEn
              : item.reading?.indicatorCode || 'Alerta'
            const timeStr = new Date(item.generatedAt).toLocaleString([], {
              dateStyle: 'short',
              timeStyle: 'medium',
            })

            return (
              <article
                key={item.id}
                className={`alert-card ${isCrit ? 'is-critical' : 'is-caution'} ${
                  item.isAttended ? 'is-attended' : ''
                }`}
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
                    <span>{isEs ? 'Valor anómalo detectado:' : 'Anomalous value recorded:'}</span>
                    <span className="alert-reading-pill">{`${item.reading.value} ${item.reading.unit}`}</span>
                  </div>
                )}

                <div className="alert-recommendation-box">
                  <ShieldCheck className="rec-icon" size={20} />
                  <div className="rec-content">
                    <strong>{isEs ? 'Acción Médica Recomendada (Protocolo NASA)' : 'Recommended Action (NASA Protocol)'}</strong>
                    <p>{item.advice}</p>
                  </div>
                </div>

                <footer className="alert-card-footer">
                  {item.isAttended ? (
                    <div className="alert-attended-badge">
                      <CheckCircle2 size={16} />
                      <span>
                        {isEs
                          ? `Atendida a las ${new Date(item.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : `Attended at ${new Date(item.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkDone(item.id)}
                      className="alert-done-btn"
                    >
                      <Check size={16} />
                      <span>{isEs ? 'Hecho / Marcar Atendida' : 'Mark as Done'}</span>
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
