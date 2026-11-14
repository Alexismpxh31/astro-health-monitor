import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Activity,
  Heart,
  Brain,
  Dumbbell,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Thermometer,
  Wind,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

import { useSession } from '../auth/session.js'
import AstronautModel3D from '../components/AstronautModel3D.jsx'
import TrafficLight from '../components/TrafficLight.jsx'
import { defaultUserId } from '../data/demoUser.js'
import { db } from '../db/db.js'
import { classifyValue, effectiveThreshold, LEVEL, severityOf } from './crew/crewStatus.js'
import './Home.css'

const NASA_HRP_SYSTEMS = {
  cardiovascular: {
    id: 'cardiovascular',
    zoneCode: 'cardio',
    nameEs: 'Cardiovascular & Fluidos',
    nameEn: 'Cardiovascular & Fluids',
    icon: Heart,
    hazardEs: 'Microgravedad / Campos Gravitatorios',
    hazardEn: 'Gravity Fields / Microgravity',
    riskEs: 'Riesgo de desadaptación cardiovascular e intolerancia ortostática post-aterrizaje.',
    riskEn: 'Risk of Cardiovascular Adaptations & Orthostatic Intolerance.',
    descEs: 'Monitoreo de presión arterial, gasto cardíaco y redistribución cefálica de fluidos corporales.',
    descEn: 'Monitoring of arterial pressure, cardiac output, and headward fluid redistribution.',
    primaryCodes: ['HR', 'SPO2', 'SBP', 'DBP', 'RR'],
  },
  behavioral: {
    id: 'behavioral',
    zoneCode: 'neuro',
    nameEs: 'Neurocognitivo & Conductual',
    nameEn: 'Neurocognitive & Behavioral',
    icon: Brain,
    hazardEs: 'Aislamiento, Confinamiento y Fatiga Circadiana',
    hazardEn: 'Isolation, Confinement & Circadian Fatigue',
    riskEs: 'Riesgo de condiciones cognitivas/conductuales adversas y trastornos del sueño.',
    riskEn: 'Risk of Adverse Cognitive/Behavioral Conditions and Sleep Disorders.',
    descEs: 'Evaluación de fatiga psicomotora (PVT), calidad del sueño y estabilidad neuroconductual.',
    descEn: 'Evaluation of psychomotor fatigue (PVT), sleep quality, and behavioral stability.',
    primaryCodes: ['SLEEP_H', 'MOOD', 'STRESS', 'PVT'],
  },
  musculoskeletal: {
    id: 'musculoskeletal',
    zoneCode: 'musculo',
    nameEs: 'Óseo-Muscular & Carga',
    nameEn: 'Musculoskeletal & Loading',
    icon: Dumbbell,
    hazardEs: 'Descarga Gravitacional Progresiva',
    hazardEn: 'Progressive Gravitational Unloading',
    riskEs: 'Riesgo de pérdida de densidad mineral ósea (osteopenia) y atrofia muscular funcional.',
    riskEn: 'Risk of Bone Mineral Density Loss and Functional Muscle Atrophy.',
    descEs: 'Seguimiento de densidad ósea, biomarcadores de resorción (CTX) y masa muscular magra.',
    descEn: 'Tracking of bone density, resorption biomarkers (CTX), and functional lean muscle.',
    primaryCodes: ['BMD', 'CTX', 'MUSCLE'],
  },
  radiation: {
    id: 'radiation',
    zoneCode: 'radiation',
    nameEs: 'Dosimetría & Radiación',
    nameEn: 'Dosimetry & Radiation',
    icon: Radio,
    hazardEs: 'Radiación Cósmica Galáctica (GCR) & SPE',
    hazardEn: 'Galactic Cosmic Radiation (GCR) & SPE',
    riskEs: 'Riesgo de efectos tisulares agudos, daño degenerativo y límites de dosis de misión.',
    riskEn: 'Risk of Acute Radiation Syndromes and Cumulative Mission Exposure.',
    descEs: 'Monitorización de tasa de dosis diaria absorbida (mSv/d) y blindaje biológico.',
    descEn: 'Daily absorbed dose monitoring (mSv/d) and biological shielding integrity.',
    primaryCodes: ['RAD_D', 'RAD_DOSE'],
  },
  immune: {
    id: 'immune',
    zoneCode: 'metabolic',
    nameEs: 'Inmune & Fisiológico',
    nameEn: 'Immune & Physiological',
    icon: ShieldCheck,
    hazardEs: 'Ambiente Cerrado Hostil y Microgravedad',
    hazardEn: 'Hostile Closed Environment & Microgravity',
    riskEs: 'Riesgo de desregulación inmune, reactivación viral y respuesta inflamatoria aumentada.',
    riskEn: 'Risk of Adverse Health Events Due to Altered Immune Response.',
    descEs: 'Medición de temperatura cutánea, reactivos inflamatorios (IL-6) y cortisol libre.',
    descEn: 'Measurement of skin temperature, inflammatory markers (IL-6), and salivary cortisol.',
    primaryCodes: ['TSKIN', 'WBC', 'IL6', 'CORTISOL'],
  },
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const session = useSession()
  const [selectedSystemId, setSelectedSystemId] = useState('cardiovascular')

  // Reactive Dexie query for current astronaut's readings, catalogs and thresholds
  const dbData = useLiveQuery(async () => {
    // Resolve target user: logged in user or default demo astronaut
    const userId = defaultUserId()
    if (!userId) return null

    const [user, indicators, thresholds, readings] = await Promise.all([
      db.users.get(userId),
      db.indicators.toArray(),
      db.thresholds.toArray(),
      db.readings.where('userId').equals(userId).toArray(),
    ])

    readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))

    const readingsByCode = new Map()
    for (const r of readings) {
      if (!readingsByCode.has(r.indicatorCode)) readingsByCode.set(r.indicatorCode, [])
      readingsByCode.get(r.indicatorCode).push(r)
    }

    const latestByCode = {}
    const levelByCode = {}

    for (const ind of indicators) {
      const series = readingsByCode.get(ind.code)
      if (series && series.length > 0) {
        const latest = series.at(-1)
        latestByCode[ind.code] = latest
        const { threshold } = effectiveThreshold(thresholds, userId, ind, series, latest)
        levelByCode[ind.code] = classifyValue(latest.value, threshold) ?? LEVEL.NORMAL
      }
    }

    // Evaluate roll-up level per body system
    const systemLevels = {}
    for (const [sysKey, sysDef] of Object.entries(NASA_HRP_SYSTEMS)) {
      const relevantLevels = sysDef.primaryCodes
        .map((code) => levelByCode[code])
        .filter(Boolean)
      if (relevantLevels.length === 0) {
        systemLevels[sysKey] = LEVEL.NORMAL
      } else {
        relevantLevels.sort((a, b) => severityOf(b) - severityOf(a))
        systemLevels[sysKey] = relevantLevels[0]
      }
    }

    return { user, latestByCode, levelByCode, systemLevels }
  }, [session?.userId])

  const activeSystem = NASA_HRP_SYSTEMS[selectedSystemId] || NASA_HRP_SYSTEMS.cardiovascular
  const activeLevel = dbData?.systemLevels?.[selectedSystemId] || LEVEL.NORMAL

  const handleSelectSubsystem = (sysId) => {
    setSelectedSystemId(sysId)
  }

  const handleSelectZoneFrom3D = (zoneData) => {
    if (zoneData?.id && NASA_HRP_SYSTEMS[zoneData.id]) {
      setSelectedSystemId(zoneData.id)
    } else if (zoneData?.zoneCode) {
      const found = Object.values(NASA_HRP_SYSTEMS).find((s) => s.zoneCode === zoneData.zoneCode)
      if (found) setSelectedSystemId(found.id)
    }
  }

  // Primary top vital cards data
  const hrReading = dbData?.latestByCode?.HR?.value ?? 74
  const sbpReading = dbData?.latestByCode?.SBP?.value ?? 118
  const dbpReading = dbData?.latestByCode?.DBP?.value ?? 78
  const spo2Reading = dbData?.latestByCode?.SPO2?.value ?? 98
  const tskinReading = dbData?.latestByCode?.TSKIN?.value ?? 36.6
  const radReading = dbData?.latestByCode?.RAD_D?.value ?? 0.35

  const hrLevel = dbData?.levelByCode?.HR ?? LEVEL.NORMAL
  const spo2Level = dbData?.levelByCode?.SPO2 ?? LEVEL.NORMAL
  const bpLevel = dbData?.levelByCode?.SBP ?? LEVEL.NORMAL

  return (
    <section className="astro-home">
      {/* Top Banner Header */}
      <header className="home-header">
        <div className="home-header-titles">
          <span className="home-header-subtitle">NASA Space Medical Systems · Flight Medical Telemetry</span>
          <h1>{isEs ? 'Panel Principal de Monitoreo del Astronauta' : 'Astronaut Medical Overview'}</h1>
        </div>
        <div className="home-header-meta">
          <div className="met-badge">
            <Activity size={14} color="#22d3ee" />
            <span>MET: 042d 14h 22m</span>
          </div>
        </div>
      </header>

      {/* Top 3 Primary Vital Telemetry Cards */}
      <div className="top-vitals-grid">
        {/* Card 1: Blood Pressure & Heart Rate */}
        <article className="vital-metric-card">
          <div className="vital-metric-left">
            <div className="vital-icon-box">
              <Heart size={22} />
            </div>
            <div className="vital-metric-info">
              <span className="vital-metric-name">{isEs ? 'Presión Arterial / Pulso' : 'Blood Pressure / Pulse'}</span>
              <div className="vital-metric-reading">
                <span className="vital-metric-value">{`${Math.round(sbpReading)}/${Math.round(dbpReading)}`}</span>
                <span className="vital-metric-unit">mmHg · {Math.round(hrReading)} bpm</span>
              </div>
            </div>
          </div>
          <div className="vital-metric-status">
            <TrafficLight level={bpLevel !== LEVEL.NORMAL ? bpLevel : hrLevel} />
            <svg className="vital-ecg-svg" viewBox="0 0 60 24" preserveAspectRatio="none">
              <path d="M0,12 L16,12 L20,4 L24,20 L28,8 L32,16 L36,12 L60,12" />
            </svg>
          </div>
        </article>

        {/* Card 2: Blood Oxygen SpO2 */}
        <article className="vital-metric-card">
          <div className="vital-metric-left">
            <div className="vital-icon-box">
              <Wind size={22} />
            </div>
            <div className="vital-metric-info">
              <span className="vital-metric-name">{isEs ? 'Oxígeno en Sangre' : 'Blood Oxygen (SpO₂)'}</span>
              <div className="vital-metric-reading">
                <span className="vital-metric-value">{spo2Reading.toFixed(1)}</span>
                <span className="vital-metric-unit">% Sat</span>
              </div>
            </div>
          </div>
          <div className="vital-metric-status">
            <TrafficLight level={spo2Level} />
          </div>
        </article>

        {/* Card 3: Body Temperature & Radiation */}
        <article className="vital-metric-card">
          <div className="vital-metric-left">
            <div className="vital-icon-box">
              <Thermometer size={22} />
            </div>
            <div className="vital-metric-info">
              <span className="vital-metric-name">{isEs ? 'Temperatura / Dosis' : 'Skin Temp / Radiation'}</span>
              <div className="vital-metric-reading">
                <span className="vital-metric-value">{tskinReading.toFixed(1)}</span>
                <span className="vital-metric-unit">°C · {radReading.toFixed(2)} mSv/d</span>
              </div>
            </div>
          </div>
          <div className="vital-metric-status">
            <TrafficLight level={LEVEL.NORMAL} />
          </div>
        </article>
      </div>

      {/* 3-Column Aerospace Workspace */}
      <div className="home-workspace">
        {/* Left Column: Subsystems Navigation List */}
        <aside className="subsystems-panel">
          <h2 className="panel-header-title">{isEs ? 'Subsistemas de Monitoreo' : 'Body Subsystems'}</h2>
          <div className="subsystem-list">
            {Object.values(NASA_HRP_SYSTEMS).map((sys) => {
              const IconComponent = sys.icon
              const isActive = sys.id === selectedSystemId
              const sysLevel = dbData?.systemLevels?.[sys.id] || LEVEL.NORMAL

              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => handleSelectSubsystem(sys.id)}
                  className={`subsystem-item-btn ${isActive ? 'is-active' : ''}`}
                >
                  <div className="subsystem-item-left">
                    <div className="subsystem-item-icon">
                      <IconComponent size={18} />
                    </div>
                    <span className="subsystem-item-name">{isEs ? sys.nameEs : sys.nameEn}</span>
                  </div>
                  <TrafficLight level={sysLevel} />
                </button>
              )
            })}
          </div>
        </aside>

        {/* Center Column: 3D Holographic Astronaut Viewport */}
        <div className="astronaut-viewport">
          <div className="viewport-badge">
            <Activity size={13} />
            <span>{isEs ? 'Modelo EVA PBR 3D Interactivo' : 'Interactive 3D EVA Twin'}</span>
          </div>
          <AstronautModel3D
            embedded={true}
            theme="dark"
            selectedZone={activeSystem.zoneCode}
            onSelectZone={handleSelectZoneFrom3D}
            height="530px"
          />
        </div>

        {/* Right Column: NASA Clinical File Card */}
        <aside className="clinical-file-panel">
          <div>
            <div className="clinical-header">
              <span className="panel-header-title">{isEs ? 'Ficha Clínica NASA' : 'NASA Clinical File'}</span>
              <TrafficLight level={activeLevel} />
            </div>

            <h3 className="clinical-system-title">{isEs ? activeSystem.nameEs : activeSystem.nameEn}</h3>

            <div className="clinical-risk-box">
              <div className="risk-item">
                <ShieldAlert className="risk-item-icon" size={18} />
                <div className="risk-item-content">
                  <strong>{isEs ? 'Peligro HRP' : 'HRP Hazard'}</strong>
                  <span>{isEs ? activeSystem.hazardEs : activeSystem.hazardEn}</span>
                </div>
              </div>

              <div className="risk-item">
                <AlertTriangle className="risk-item-icon" size={18} />
                <div className="risk-item-content">
                  <strong>{isEs ? 'Riesgo Oficial' : 'Official Risk'}</strong>
                  <span>{isEs ? activeSystem.riskEs : activeSystem.riskEn}</span>
                </div>
              </div>
            </div>

            <p className="clinical-desc">{isEs ? activeSystem.descEs : activeSystem.descEn}</p>

            <div className="clinical-metrics-table">
              {activeSystem.primaryCodes.map((code) => {
                const reading = dbData?.latestByCode?.[code]
                return (
                  <div key={code} className="clinical-metric-row">
                    <span className="clinical-metric-label">{code}</span>
                    <span className="clinical-metric-val">
                      {reading ? `${reading.value} ${reading.unit}` : isEs ? 'En espera…' : 'Awaiting…'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <Link to={`/system/${selectedSystemId}`} className="clinical-action-btn">
            <span>{isEs ? 'Ver Detalle del Sistema' : 'View System Details'}</span>
            <ChevronRight size={18} />
          </Link>
        </aside>
      </div>
    </section>
  )
}
