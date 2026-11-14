import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Activity, ShieldAlert, AlertTriangle } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

import { useSession } from '../auth/session.js'
import TrafficLight from '../components/TrafficLight.jsx'
import { db } from '../db/db.js'
import { classifyValue, effectiveThreshold, LEVEL, severityOf } from './crew/crewStatus.js'
import './SystemDetail.css'

const NASA_SYSTEMS_METADATA = {
  cardiovascular: {
    systemCode: 'cardiovascular',
    nameEs: 'Sistema Cardiovascular & Fluidos',
    nameEn: 'Cardiovascular & Fluid Dynamics',
    hazardEs: 'Microgravedad / Campos Gravitatorios',
    hazardEn: 'Gravity Fields / Microgravity',
    riskEs: 'Riesgo de desadaptación cardiovascular e intolerancia ortostática post-aterrizaje.',
    riskEn: 'Risk of Cardiovascular Adaptations & Orthostatic Intolerance.',
    descEs: 'Monitoreo de presión arterial, gasto cardíaco y redistribución cefálica de fluidos corporales.',
    descEn: 'Monitoring of arterial pressure, cardiac output, and headward fluid redistribution.',
  },
  musculoskeletal: {
    systemCode: 'musculoskeletal',
    nameEs: 'Sistema Óseo-Muscular & Carga Mecánica',
    nameEn: 'Musculoskeletal & Mechanical Loading',
    hazardEs: 'Descarga Gravitacional Progresiva',
    hazardEn: 'Progressive Gravitational Unloading',
    riskEs: 'Riesgo de pérdida de densidad mineral ósea (osteopenia) y atrofia muscular funcional.',
    riskEn: 'Risk of Bone Mineral Density Loss and Functional Muscle Atrophy.',
    descEs: 'Seguimiento de densidad ósea, biomarcadores de resorción (CTX) y masa muscular magra.',
    descEn: 'Tracking of bone density, resorption biomarkers (CTX), and functional lean muscle.',
  },
  immune: {
    systemCode: 'immune',
    nameEs: 'Sistema Inmune & Fisiológico',
    nameEn: 'Immune & Physiological System',
    hazardEs: 'Ambiente Cerrado Hostil y Microgravedad',
    hazardEn: 'Hostile Closed Environment & Microgravity',
    riskEs: 'Riesgo de desregulación inmune, reactivación viral y respuesta inflamatoria aumentada.',
    riskEn: 'Risk of Adverse Health Events Due to Altered Immune Response.',
    descEs: 'Medición de temperatura cutánea, reactivos inflamatorios (IL-6) y cortisol libre.',
    descEn: 'Measurement of skin temperature, inflammatory markers (IL-6), and salivary cortisol.',
  },
  behavioral: {
    systemCode: 'behavioral',
    nameEs: 'Sistema Neurocognitivo & Conductual',
    nameEn: 'Neurocognitive & Behavioral System',
    hazardEs: 'Aislamiento, Confinamiento y Fatiga Circadiana',
    hazardEn: 'Isolation, Confinement & Circadian Fatigue',
    riskEs: 'Riesgo de condiciones cognitivas/conductuales adversas y trastornos del sueño.',
    riskEn: 'Risk of Adverse Cognitive/Behavioral Conditions and Sleep Disorders.',
    descEs: 'Evaluación de fatiga psicomotora (PVT), calidad del sueño y estabilidad neuroconductual.',
    descEn: 'Evaluation of psychomotor fatigue (PVT), sleep quality, and behavioral stability.',
  },
  radiation: {
    systemCode: 'radiation',
    nameEs: 'Exposición a Radiación & Dosimetría',
    nameEn: 'Space Radiation & Dosimetry',
    hazardEs: 'Radiación Cósmica Galáctica (GCR) & SPE',
    hazardEn: 'Galactic Cosmic Radiation (GCR) & SPE',
    riskEs: 'Riesgo de efectos tisulares agudos, daño degenerativo y límites de dosis de misión.',
    riskEn: 'Risk of Acute Radiation Syndromes and Cumulative Mission Exposure.',
    descEs: 'Monitorización de tasa de dosis diaria absorbida (mSv/d) y blindaje biológico.',
    descEn: 'Daily absorbed dose monitoring (mSv/d) and biological shielding integrity.',
  },
}

export default function SystemDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const session = useSession()

  // Match system by code or by UUID
  const systemKey = Object.keys(NASA_SYSTEMS_METADATA).find(
    (k) => k.toLowerCase() === id?.toLowerCase()
  ) || 'cardiovascular'
  const meta = NASA_SYSTEMS_METADATA[systemKey]

  const detailData = useLiveQuery(async () => {
    let userId = session?.userId
    if (!userId) {
      const demoAstronaut = await db.users.where('roleId').equals('00000000-0000-4000-8000-000000000101').first()
      userId = demoAstronaut?.id
    }
    if (!userId) return null

    const [bodySystems, indicators, thresholds, readings] = await Promise.all([
      db.bodySystems.toArray(),
      db.indicators.toArray(),
      db.thresholds.toArray(),
      db.readings.where('userId').equals(userId).toArray(),
    ])

    const currentSystem = bodySystems.find(
      (s) => s.code.toLowerCase() === systemKey.toLowerCase() || s.id === id
    )

    if (!currentSystem) return null

    const systemIndicators = indicators.filter((ind) => ind.bodySystemId === currentSystem.id)

    readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))

    const readingsByCode = new Map()
    for (const r of readings) {
      if (!readingsByCode.has(r.indicatorCode)) readingsByCode.set(r.indicatorCode, [])
      readingsByCode.get(r.indicatorCode).push(r)
    }

    const cards = systemIndicators.map((ind) => {
      const series = readingsByCode.get(ind.code) || []
      const latest = series.at(-1) || null
      const points = series.slice(-30).map((r) => ({
        time: new Date(r.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value: Number(r.value.toFixed(1)),
      }))

      let level = LEVEL.NORMAL
      let thresholdObj = null

      if (latest) {
        const { threshold } = effectiveThreshold(thresholds, userId, ind, series, latest)
        thresholdObj = threshold
        level = classifyValue(latest.value, threshold) ?? LEVEL.NORMAL
      }

      return {
        indicator: ind,
        latest,
        points,
        level,
        threshold: thresholdObj,
        unit: latest?.unit || (ind.code === 'HR' ? 'bpm' : ind.code === 'SPO2' ? '%' : ind.code === 'TSKIN' ? '°C' : 'mmHg'),
      }
    })

    cards.sort((a, b) => severityOf(b.level) - severityOf(a.level))
    const overallLevel = cards[0]?.level || LEVEL.NORMAL

    return { currentSystem, cards, overallLevel }
  }, [systemKey, session?.userId])

  return (
    <section className="system-detail-page">
      {/* Header with back navigation */}
      <header className="system-detail-header">
        <div className="system-detail-nav">
          <Link to="/" className="system-back-btn">
            <ArrowLeft size={16} />
            <span>{isEs ? 'Volver al Inicio' : 'Back to Home'}</span>
          </Link>
          <TrafficLight level={detailData?.overallLevel || LEVEL.NORMAL} />
        </div>

        <div className="system-title-row">
          <h1>{isEs ? meta.nameEs : meta.nameEn}</h1>
        </div>

        <div className="system-clinical-grid">
          <div className="system-hrp-card">
            <strong>{isEs ? 'Peligro HRP Asociado' : 'Associated HRP Hazard'}</strong>
            <p>{isEs ? meta.hazardEs : meta.hazardEn}</p>
          </div>
          <div className="system-hrp-card">
            <strong>{isEs ? 'Riesgo Oficial de Vuelo' : 'Official Flight Risk'}</strong>
            <p>{isEs ? meta.riskEs : meta.riskEn}</p>
          </div>
        </div>
      </header>

      {/* Indicators Trend Grid */}
      <div className="system-indicators-grid">
        {detailData?.cards?.map((card) => {
          const indName = isEs ? card.indicator.nameEs : card.indicator.nameEn
          const currentVal = card.latest ? card.latest.value.toFixed(1) : '--'

          return (
            <article key={card.indicator.code} className="vital-chart-card">
              <div className="vital-chart-card-header">
                <div>
                  <h3 className="vital-chart-heading">{indName}</h3>
                  <p className="vital-chart-sub">{card.indicator.code}</p>
                </div>
                <TrafficLight level={card.level} />
              </div>

              <div className="vital-chart-current">
                <span className="vital-current-val">{currentVal}</span>
                <span className="vital-current-unit">{card.unit}</span>
              </div>

              <div className="vital-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={card.points.length > 0 ? card.points : [{ time: '0', value: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111a2e',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#e2e8f0',
                      }}
                    />
                    {card.threshold?.minNormal != null && (
                      <ReferenceLine y={card.threshold.minNormal} stroke="#f59e0b" strokeDasharray="3 3" />
                    )}
                    {card.threshold?.maxNormal != null && (
                      <ReferenceLine y={card.threshold.maxNormal} stroke="#f59e0b" strokeDasharray="3 3" />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <footer className="vital-thresholds-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#22d3ee' }} />
                  <span>{isEs ? 'Tendencia' : 'Trend'}</span>
                </div>
                {card.threshold?.minNormal != null && (
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span>{`Min: ${card.threshold.minNormal}`}</span>
                  </div>
                )}
                {card.threshold?.maxNormal != null && (
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span>{`Max: ${card.threshold.maxNormal}`}</span>
                  </div>
                )}
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}
