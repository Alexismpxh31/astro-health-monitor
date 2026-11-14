import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router-dom'
import TrafficLight from '../components/TrafficLight.jsx'
import { ensureDemoCrew } from '../data/demoCrew.js'
import BodyView from './crew/BodyView.jsx'
import { localName } from './crew/display.js'
import { csvFileName, downloadCsv, readingsToCsv } from './crew/exportCsv.js'
import IndicatorTrend from './crew/IndicatorTrend.jsx'
import LiveDemoToggle from './crew/LiveDemoToggle.jsx'
import { loadMemberData } from './crew/memberData.js'
import NotesPanel from './crew/NotesPanel.jsx'
import ThresholdEditor from './crew/ThresholdEditor.jsx'
import { useCanManageCrew } from './crew/useCrewAccess.js'
import './CrewMember.css'

// Flight surgeon view of one crew member: trends per indicator, personal thresholds,
// notes to the astronaut and CSV export.
export default function CrewMember() {
  const { userId } = useParams()
  // "Send note" on a crew alert opens this page with a prefilled note.
  const noteDraft = useLocation().state?.noteDraft ?? ''
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const data = useLiveQuery(() => loadMemberData(userId), [userId])
  const [editingIndicatorId, setEditingIndicatorId] = useState(null)
  const [systemCode, setSystemCode] = useState(null)
  const canManage = useCanManageCrew()

  useEffect(() => {
    ensureDemoCrew().catch((error) => console.error('[crew] Could not prepare the demo crew', error))
  }, [])

  const backLink = (
    <Link to="/crew" className="crew-detail-back">
      ← {t('crewDetail.back')}
    </Link>
  )

  if (data === undefined) {
    return (
      <section className="page">
        {backLink}
        <p className="muted">{t('crew.loading')}</p>
      </section>
    )
  }

  if (data === null) {
    return (
      <section className="page">
        {backLink}
        <h1>{t('pages.crewMember')}</h1>
        <p className="muted">{t('crewDetail.notFound')}</p>
      </section>
    )
  }

  const { user, surgeonId, overall, items, exportRows, notes, hasSimulatedData } = data
  const visibleItems = systemCode ? items.filter((item) => item.system?.code === systemCode) : items
  const selectedSystem = visibleItems[0]?.system ?? null

  function handleExport() {
    downloadCsv(csvFileName(user.name), readingsToCsv(exportRows))
  }

  return (
    <section className="page crew-detail">
      {backLink}

      <header className="crew-detail-header">
        <div className="crew-detail-title">
          <h1>{user.name}</h1>
          <TrafficLight level={overall} />
        </div>
        <div className="crew-detail-actions">
          {canManage && <LiveDemoToggle />}
          <button type="button" onClick={handleExport} disabled={exportRows.length === 0}>
            {t('crewDetail.exportCsv')}
          </button>
        </div>
      </header>

      {hasSimulatedData && <p className="crew-detail-note">{t('crew.simulatedNote')}</p>}

      <BodyView items={items} lang={lang} selectedCode={systemCode} onSelect={setSystemCode} />

      <div className="crew-detail-layout">
        <div className="crew-detail-main">
          <h2>
            {systemCode && selectedSystem
              ? t('bodyView.indicatorsOf', { system: localName(selectedSystem, lang) })
              : t('crewDetail.indicators')}
          </h2>
          {items.length === 0 ? (
            <p className="crew-detail-empty muted">{t('crewDetail.noReadings')}</p>
          ) : (
            <div className="indicator-grid">
              {visibleItems.map((item) => {
                const isEditing = editingIndicatorId === item.indicator.id
                return (
                  <IndicatorTrend
                    key={item.indicator.id}
                    item={item}
                    lang={lang}
                    isEditing={isEditing}
                    onEdit={canManage ? () => setEditingIndicatorId(isEditing ? null : item.indicator.id) : undefined}
                  >
                    {canManage && isEditing && (
                      <ThresholdEditor
                        indicator={item.indicator}
                        userId={user.id}
                        surgeonId={surgeonId}
                        threshold={item.rule}
                        unit={item.unit}
                        onClose={() => setEditingIndicatorId(null)}
                      />
                    )}
                  </IndicatorTrend>
                )
              })}
            </div>
          )}
        </div>

        <aside className="crew-detail-side">
          {canManage ? (
            <NotesPanel
              key={user.id}
              recipientId={user.id}
              senderId={surgeonId}
              notes={notes}
              lang={lang}
              initialDraft={noteDraft}
            />
          ) : (
            <p className="crew-readonly-note">{t('crew.officerView')}</p>
          )}
        </aside>
      </div>
    </section>
  )
}
