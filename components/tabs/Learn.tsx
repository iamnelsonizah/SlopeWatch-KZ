'use client';

import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function Learn({ lang }: { lang: Lang }) {
  return (
    <section className="page">
      <h2>{t(lang, 'Understand the hazards')}</h2>
      <p className="lede">{t(lang, 'Plain-language notes on what the layers show and how to stay safe. This is general guidance, not a substitute for advice from the national emergency and geological services.')}</p>

      <h3>{t(lang, 'The hazards')}</h3>
      <div className="stat-grid">
        <div className="stat-card"><h3>{t(lang, 'Landslides and rockslides')}</h3><p>{t(lang, 'Rock, soil or debris moving down a slope. Steep ground, weak or fractured rock, and shaking or saturation make failures more likely. Large rockslides can dam valleys and create lakes, as at Kaindy.')}</p></div>
        <div className="stat-card"><h3>{t(lang, 'Mudflows and debris flows')}</h3><p>{t(lang, 'Fast, water-saturated flows that run down mountain channels, often after intense rain, rapid snowmelt or the failure of a dammed lake. Almaty sits at the foot of such valleys, which is why it has protection structures such as the Medeu dam.')}</p></div>
        <div className="stat-card"><h3>{t(lang, 'Earthquakes and faults')}</h3><p>{t(lang, 'Active faults are where the crust is still moving. The Tien Shan and Dzungar Alatau in the southeast are Kazakhstan’s most active zone. Strong shaking can trigger many slope failures at once, as in the 1889 and 1911 events.')}</p></div>
        <div className="stat-card"><h3>{t(lang, 'Glacial and dammed lakes')}</h3><p>{t(lang, 'Lakes held back by ice, moraine or landslide material can drain suddenly if the dam fails, sending a flood or mudflow downstream.')}</p></div>
      </div>

      <h3>{t(lang, 'Warning signs on a slope')}</h3>
      <ul>
        <li>{t(lang, 'New cracks in the ground, pavements, walls or retaining walls.')}</li>
        <li>{t(lang, 'Tilting trees, poles or fences, or doors and windows that suddenly jam.')}</li>
        <li>{t(lang, 'Springs, seepage or muddy water appearing where there was none.')}</li>
        <li>{t(lang, 'A stream that suddenly turns muddy or drops in flow, which can mean a blockage upstream.')}</li>
        <li>{t(lang, 'Rumbling, cracking or the sound of boulders moving.')}</li>
      </ul>
      <h3>{t(lang, 'If you see them')}</h3>
      <ul>
        <li>{t(lang, 'Move away at once, to higher ground at the side of the channel, not along it.')}</li>
        <li>{t(lang, 'Stay out of gullies and stream beds during heavy rain or fast melt in the mountains.')}</li>
        <li>{t(lang, 'Call your national emergency number (112) and warn neighbours. Do not return until authorities say it is safe.')}</li>
        <li>{t(lang, 'Use the Community tab to report what you saw once everyone is safe.')}</li>
      </ul>

      <h3>{t(lang, 'How to read this atlas')}</h3>
      <ul>
        <li><b>{t(lang, 'Active faults')}</b> {t(lang, 'are traces from the GEM Global Active Faults database. Colour shows slip type and thickness shows slip rate where known. Kazakhstan is only partly mapped in this database.')}</li>
        <li><b>{t(lang, 'Slope angle')}</b> {t(lang, 'is computed from open elevation data. Most landslides start on slopes steeper than about 15 to 20 degrees, but the angle alone does not predict failure.')}</li>
        <li><b>{t(lang, 'Susceptibility screening')}</b> {t(lang, 'combines slope, fault proximity and a wet-conditions scenario with weights you can change. It is a first-pass filter for where to look, not a probability or a hazard map.')}</li>
        <li><b>{t(lang, 'Rain triggers')}</b> {t(lang, 'compare recent and forecast rain with generic thresholds. Local thresholds differ widely.')}</li>
        <li><b>{t(lang, 'Verification levels')}</b>: {t(lang, 'A well documented, B details approximate, C unverified or substantially approximate; confirm before use.')}</li>
      </ul>
      <p className="callout">{t(lang, 'For land-use, engineering or insurance decisions, use official hazard maps and site-specific geotechnical studies.')}</p>
    </section>
  );
}
