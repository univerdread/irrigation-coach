import { t, type Locale } from '../i18n/i18n';

interface Props {
  locale: Locale;
  onLocale: (l: Locale) => void;
  onChoose: (mode: 'mine' | 'demo') => void;
}

export function Welcome({ locale, onLocale, onChoose }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-mark" aria-hidden="true">💧</div>
      <h1>{t(locale, 'app.title')}</h1>
      <p className="lede">{t(locale, 'welcome.lede')}</p>
      <div className="seg" role="radiogroup" aria-label="Language / Lugha">
        <button role="radio" aria-checked={locale === 'sw'} className={locale === 'sw' ? 'seg-btn on' : 'seg-btn'} onClick={() => onLocale('sw')}>Kiswahili</button>
        <button role="radio" aria-checked={locale === 'en'} className={locale === 'en' ? 'seg-btn on' : 'seg-btn'} onClick={() => onLocale('en')}>English</button>
      </div>
      <button className="primary" onClick={() => onChoose('mine')}>{t(locale, 'welcome.setup')}</button>
      <button className="ghost" onClick={() => onChoose('demo')}>{t(locale, 'welcome.demo')}</button>
      <ul className="promises">
        <li>📴 {t(locale, 'welcome.offline')}</li>
        <li>🔒 {t(locale, 'welcome.private')}</li>
        <li>📱 {t(locale, 'welcome.basic_phone')}</li>
      </ul>
    </div>
  );
}
