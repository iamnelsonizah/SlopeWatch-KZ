import type { Lang } from './types';

export interface Landmark {
  id: string;
  name: { en: string; ru: string; kk: string };
  badge: { en: string; ru: string; kk: string };
  desc: { en: string; ru: string; kk: string };
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'medeu',
    name: { en: 'Medeu Dam', ru: 'Плотина Медеу', kk: 'Медеу бөгеті' },
    badge: { en: 'About 1,750 m · Mudflow dam', ru: 'Около 1 750 м · Защита от селей', kk: 'Шамамен 1 750 м · Селден қорғау' },
    desc: {
      en: 'Mudflow-protection dam across the Kishi (Malaya) Almatinka gorge above Almaty, built 1966–1972. It held the mudflow of 15 July 1973.',
      ru: 'Селезащитная плотина в ущелье Малой Алматинки над Алматы, построена в 1966–1972 годах. Задержала сель 15 июля 1973 года.',
      kk: 'Алматының үстіндегі Кіші Алматы шатқалындағы селден қорғау бөгеті, 1966–1972 жылдары салынған. 1973 жылғы 15 шілдедегі селді тоқтатты.',
    },
    center: [77.059, 43.155],
    zoom: 13.5,
    pitch: 58,
    bearing: -22,
  },
  {
    id: 'kaindy',
    name: { en: 'Lake Kaindy', ru: 'Озеро Каинды', kk: 'Қайыңды көлі' },
    badge: { en: 'About 1,900 m · Landslide dam', ru: 'Около 1 900 м · Обвальная плотина', kk: 'Шамамен 1 900 м · Құлама бөгет' },
    desc: {
      en: 'Lake with a drowned spruce forest behind a rockslide dam. Studies disagree on whether the 1889 Chilik or the 1911 Kemin earthquake caused the slide.',
      ru: 'Озеро с затопленным еловым лесом за обвальной плотиной. Исследования расходятся: обвал связывают с Чиликским (1889) или Кеминским (1911) землетрясением.',
      kk: 'Тау құламасы бөгеген, су астында шырша орманы қалған көл. Құламаны 1889 жылғы Шелек немесе 1911 жылғы Кебін жер сілкінісімен байланыстырады; зерттеулер келіспейді.',
    },
    center: [78.468, 42.986],
    zoom: 13.2,
    pitch: 56,
    bearing: 38,
  },
  {
    id: 'bao',
    name: { en: 'Big Almaty Lake (BAO)', ru: 'Большое Алматинское озеро', kk: 'Үлкен Алматы көлі' },
    badge: { en: '2,511 m · Mountain lake', ru: '2 511 м · Горное озеро', kk: '2 511 м · Тау көлі' },
    desc: {
      en: 'Natural lake in the Ulken (Bolshaya) Almatinka gorge, used as a reservoir for Almaty, with steep slopes and moraines above it.',
      ru: 'Высокогорное озеро и водохранилище в окружении крутых хребтов и морен Заилийского Алатау.',
      kk: 'Іле Алатауының тік жоталары мен мореналарымен қоршалған биік таудағы көл.',
    },
    center: [76.985, 43.051],
    zoom: 13.0,
    pitch: 54,
    bearing: -15,
  },
  {
    id: 'issyk',
    name: { en: 'Lake Issyk', ru: 'Озеро Иссык', kk: 'Есік көлі' },
    badge: { en: 'About 1,760 m · 1963 outburst', ru: 'Около 1 760 м · Прорыв 1963 года', kk: 'Шамамен 1 760 м · 1963 жылғы бұзылу' },
    desc: {
      en: 'Landslide-dammed lake whose natural dam was breached on 7 July 1963 when a debris flow entered it. The lake has since been partly restored.',
      ru: 'Завальное озеро, естественная плотина которого была прорвана 7 июля 1963 года вошедшим в него селем. Позднее озеро частично восстановлено.',
      kk: 'Табиғи бөгеті 1963 жылғы 7 шілдеде көлге құйылған селден бұзылған бөгелме көл. Кейін көл ішінара қалпына келтірілді.',
    },
    center: [77.485, 43.252],
    zoom: 13.2,
    pitch: 56,
    bearing: -12,
  },
  {
    id: 'khan-tengri',
    name: { en: 'Khan Tengri Peak', ru: 'Пик Хан-Тенгри', kk: 'Хан Тәңірі шыңы' },
    badge: { en: '7,010 m · Central Tian Shan', ru: '7 010 м · Центральный Тянь-Шань', kk: '7 010 м · Орталық Тянь-Шань' },
    desc: {
      en: 'Highest point of Kazakhstan, where the borders of Kazakhstan, Kyrgyzstan and China meet. 7,010 m includes the summit ice cap (6,995 m without it).',
      ru: 'Высшая точка Казахстана на стыке границ Казахстана, Киргизии и Китая. 7 010 м — с ледовой шапкой (6 995 м без неё).',
      kk: 'Қазақстанның ең биік нүктесі, Қазақстан, Қырғызстан және Қытай шекараларының түйіскен жері. 7 010 м — мұз қалпағымен (онсыз 6 995 м).',
    },
    center: [80.175, 42.215],
    zoom: 11.6,
    pitch: 62,
    bearing: -45,
  },
  {
    id: 'talgar',
    name: { en: 'Pik Talgar', ru: 'Пик Талгар', kk: 'Талғар шыңы' },
    badge: { en: '4,979 m · Trans-Ili Alatau', ru: '4 979 м · Заилийский Алатау', kk: '4 979 м · Іле Алатауы' },
    desc: {
      en: 'Highest summit of the Ile (Trans-Ili) Alatau. Glaciers on its flanks feed the Talgar and Esik rivers, both known for mudflows.',
      ru: 'Высшая точка Заилийского Алатау. Ледники на его склонах питают селеопасные реки Талгар и Есик.',
      kk: 'Іле Алатауының ең биік шыңы. Беткейлеріндегі мұздықтар сел қаупі бар Талғар және Есік өзендерін қоректендіреді.',
    },
    center: [77.337, 43.125],
    zoom: 12.2,
    pitch: 58,
    bearing: -10,
  },
  {
    id: 'charyn',
    name: { en: 'Charyn Canyon', ru: 'Чарынский каньон', kk: 'Шарын шатқалы' },
    badge: { en: 'Sedimentary canyon', ru: 'Осадочный каньон', kk: 'Шөгінді шатқал' },
    desc: {
      en: 'Canyon cut by the Sharyn River through layered sedimentary rock, with steep, rockfall-prone walls.',
      ru: 'Каньон реки Чарын в слоистых осадочных породах с крутыми, осыпающимися стенами.',
      kk: 'Шарын өзені қабатты шөгінді жыныстарда ойған шатқал; қабырғалары тік, тас құлауы жиі.',
    },
    center: [79.076, 43.355],
    zoom: 12.8,
    pitch: 52,
    bearing: 60,
  },
];

export function landmarkName(l: Landmark, lang: Lang): string {
  return l.name[lang] ?? l.name.en;
}

export function landmarkBadge(l: Landmark, lang: Lang): string {
  return l.badge[lang] ?? l.badge.en;
}

export function landmarkDesc(l: Landmark, lang: Lang): string {
  return l.desc[lang] ?? l.desc.en;
}
