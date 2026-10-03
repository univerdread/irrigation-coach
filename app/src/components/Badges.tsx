import type { Provenance } from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';

/** Simulated, self-reported and measured values must look visibly different (build addendum). */
export function ProvenanceBadge({ p, locale }: { p: Provenance; locale: Locale }) {
  return <span className={`badge prov-${p}`}>{t(locale, `prov.${p}`)}</span>;
}

export function SimulatedBanner({ locale }: { locale: Locale }) {
  return (
    <div className="sim-banner" role="note">
      {t(locale, 'banner.simulated')}
    </div>
  );
}
