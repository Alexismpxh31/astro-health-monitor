import { useTranslation } from 'react-i18next'

// Placeholder page: replace with the real screen.
export default function SystemDetail() {
  const { t } = useTranslation()

  return (
    <section className="page">
      <h1>{t('pages.systemDetail')}</h1>
      <p className="muted">{t('common.underConstruction')}</p>
    </section>
  )
}
