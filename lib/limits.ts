import type { LayerId } from './layers';
import type { Lang } from './types';
import { t } from './i18n';

export interface Limit {
  id: string;
  title: string;
  /** one sentence for compact spots (legend, list footer) */
  short: string;
  text: string;
  /** wording for general users (no maintainer instructions) */
  publicText: string;
  layers: LayerId[];
  audience: 'everyone' | 'maintainers';
}

export function getLimits(c: { faultsInside: number | null; faultsNear: number | null; events: number }, lang: Lang = 'en'): Limit[] {
  const faultText = c.faultsInside == null || c.faultsNear == null
    ? t(lang, 'Fault coverage count unavailable because the fault dataset did not load.')
    : t(lang, 'The global active-fault database maps {inside} traces inside Kazakhstan and {near} more within 150 km. Coverage is concentrated in the southeast and east, and some known faults near Almaty are missing. A blank area is not evidence of safety.', { inside: c.faultsInside, near: c.faultsNear });
  return [
    {
      id: 'faults', title: t(lang, 'Fault coverage'), layers: ['faults', 'folds', 'susc'], audience: 'everyone',
      short: t(lang, 'Fault map is incomplete: some well-known Almaty-area faults are missing.'),
      text: `${faultText} ${t(lang, 'Fault distances and the screening score inherit this gap.')}`,
      publicText: faultText,
    },
    {
      id: 'inventory', title: t(lang, 'Landslide records'), layers: [], audience: 'everyone',
      short: t(lang, 'Only a few cited landmarks and report points; the national landslide inventory is unavailable.'),
      text: t(lang, 'The atlas shows {events} cited records, mostly near Almaty. They include earthquakes, lakes and protection structures as well as landslides. This is not a national inventory. Some locations are approximate; source links and reported accuracy appear in each popup. No marker does not mean no event occurred.', { events: c.events }),
      publicText: t(lang, 'The atlas shows {events} cited records, mostly near Almaty. They include earthquakes, lakes and protection structures as well as landslides. This is not a national inventory. Some locations are approximate; source links and reported accuracy appear in each popup. No marker does not mean no event occurred.', { events: c.events }),
    },
    {
      id: 'heuristics', title: t(lang, 'Screening scores'), layers: ['susc', 'triggers'], audience: 'everyone',
      short: t(lang, 'Susceptibility and rain thresholds are heuristics, not validated against landslide records.'),
      text: t(lang, 'The slope, fault-distance and wetness score has not been checked against a complete landslide inventory. Rain thresholds are reference values, not local warning thresholds. Neither gives a probability or an official hazard assessment.'),
      publicText: t(lang, 'The slope, fault-distance and wetness score has not been checked against a complete landslide inventory. Rain thresholds are reference values, not local warning thresholds. Neither gives a probability or an official hazard assessment.'),
    },
    {
      id: 'storage', title: t(lang, 'Community report storage'), layers: ['reports'], audience: 'maintainers',
      short: t(lang, 'Reports are stored in a JSON file and an uploads folder on the server. This setup is not persistent on serverless hosting.'),
      text: t(lang, 'Reports are stored in a JSON file and an uploads folder on the server. This setup is not persistent on serverless hosting.'),
      publicText: t(lang, 'Community reports are public and unverified unless a moderator has upgraded them.'),
    },
  ];
}
