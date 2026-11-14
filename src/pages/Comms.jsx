import { useTranslation } from 'react-i18next'

// Placeholder page: replace with the real screen.
export default function Comms() {
  const { t } = useTranslation()

  return (
    <section className="page">
      <h1>{t('pages.comms')}</h1>
      <p className="muted">{t('common.underConstruction')}</p>
    </section>
  )
}
