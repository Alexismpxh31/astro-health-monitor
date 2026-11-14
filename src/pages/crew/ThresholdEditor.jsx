import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../../db/db.js'
import { isBaselineThreshold } from '../../rules/baseline.js'
import { parseThresholdForm, THRESHOLD_FIELDS as FIELDS } from './thresholdForm.js'

function toInput(value) {
  return value == null ? '' : String(value)
}

/**
 * Form to set a personal threshold for one indicator of one crew member.
 * Saves to db.thresholds with userId set; the personal row wins over the general one.
 *
 * @param {Object} props
 * @param {Object} props.indicator
 * @param {string} props.userId - Crew member the threshold applies to.
 * @param {string|null} props.surgeonId - Who makes the change (updatedBy).
 * @param {Object|null} props.threshold - Threshold currently applied (personal or general).
 * @param {string} props.unit
 * @param {() => void} props.onClose
 */
export default function ThresholdEditor({ indicator, userId, surgeonId, threshold, unit, onClose }) {
  const { t } = useTranslation()
  const formId = useId()
  const personal = threshold?.userId === userId ? threshold : null
  const [form, setForm] = useState(() =>
    Object.fromEntries(FIELDS.map((field) => [field, toInput(threshold?.[field])])),
  )
  const [errorKey, setErrorKey] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  async function run(action) {
    setIsSaving(true)
    try {
      await action()
      onClose()
    } catch (error) {
      console.error('[crew] Could not update the threshold', error)
      setErrorKey('crewDetail.threshold.saveError')
      setIsSaving(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const result = parseThresholdForm(form)
    if (result.errorKey) {
      setErrorKey(result.errorKey)
      return
    }
    run(() =>
      db.thresholds.put({
        id: personal?.id ?? crypto.randomUUID(),
        indicatorId: indicator.id,
        userId,
        ...result.values,
        // Keep personal-baseline thresholds relative: the values are deviations.
        ...(isBaselineThreshold(threshold) ? { mode: threshold.mode } : {}),
        updatedBy: surgeonId,
        validFrom: new Date().toISOString(),
        // TODO(sync): thresholds are not in SYNCABLE_TABLES yet; the server should win on conflicts.
        syncStatus: 'pending',
      }),
    )
  }

  return (
    <form className="threshold-editor" onSubmit={handleSubmit} noValidate>
      <p className="threshold-editor-hint muted">
        {t(isBaselineThreshold(threshold) ? 'crewDetail.threshold.hintBaseline' : 'crewDetail.threshold.hint', { unit })}
      </p>
      <div className="threshold-editor-grid">
        {FIELDS.map((field) => (
          <label key={field} htmlFor={`${formId}-${field}`} className={`threshold-field is-${field}`}>
            <span>{t(`crewDetail.threshold.${field}`)}</span>
            <input
              id={`${formId}-${field}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form[field]}
              onChange={(event) => {
                setForm((current) => ({ ...current, [field]: event.target.value }))
                setErrorKey(null)
              }}
            />
          </label>
        ))}
      </div>

      {errorKey && (
        <p className="threshold-editor-error" role="alert">
          {t(errorKey)}
        </p>
      )}

      <div className="threshold-editor-actions">
        <button type="submit" className="is-primary" disabled={isSaving}>
          {t('crewDetail.threshold.save')}
        </button>
        <button type="button" onClick={onClose} disabled={isSaving}>
          {t('crewDetail.threshold.cancel')}
        </button>
        {personal && (
          <button type="button" onClick={() => run(() => db.thresholds.delete(personal.id))} disabled={isSaving}>
            {t('crewDetail.threshold.reset')}
          </button>
        )}
      </div>
    </form>
  )
}
