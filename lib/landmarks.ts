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
    badge: { en: '1,750 m · Mudflow dam', ru: '1 750 м · Защита от селей', kk: '1 750 м · Селден қорғау' },
    desc: {
      en: 'World-famous mudflow barrier constructed across the Malaya Almatinka gorge to protect Almaty.',
      ru: 'Знаменитая селезащитная плотина в урочище Медеу, защищающая Алматы от разрушительных селей.',
      kk: 'Алматыны жойқын селдерден қорғау үшін Кіші Алматы шатқалында салынған әйгілі сел бөгеті.',
    },
    center: [77.059, 43.155],
    zoom: 13.5,
    pitch: 58,
    bearing: -22,
  },
  {
    id: 'kaindy',
    name: { en: 'Lake Kaindy', ru: 'Озеро Каинды', kk: 'Қайыңды көлі' },
    badge: { en: '1,867 m · Landslide dam', ru: '1 867 м · Обвальная плотина', kk: '1 867 м · Құлама бөгет' },
    desc: {
      en: 'Scenic sunken forest formed by a massive limestone rockslide triggered by the 1911 Chon-Kemin earthquake.',
      ru: 'Озеро с затопленным еловым лесом, возникшее из-за гигантского обвала при Кеминском землетрясении 1911 года.',
      kk: '1911 жылғы Кебін жер сілкінісі кезіндегі ірі тау құламасынан пайда болған көл.',
    },
    center: [78.468, 42.986],
    zoom: 13.2,
    pitch: 56,
    bearing: 38,
  },
  {
    id: 'bao',
    name: { en: 'Big Almaty Lake (BAO)', ru: 'Большое Алматинское озеро', kk: 'Үлкен Алматы көлі' },
    badge: { en: '2,511 m · Glacial lake', ru: '2 511 м · Ледниковое озеро', kk: '2 511 м · Мұздық көлі' },
    desc: {
      en: 'High-altitude reservoir in the Bolshaya Almatinka gorge surrounded by steep peaks and moraines.',
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
    badge: { en: '1,756 m · 1963 debris flow', ru: '1 756 м · Сель 1963 года', kk: '1 756 м · 1963 жылғы сел' },
    desc: {
      en: 'Ancient landslide-dammed lake catastrophically breached in July 1963 by a huge glacial mudflow.',
      ru: 'Древнее подпрудное озеро, частично разрушенное катастрофическим гляциальным селем в июле 1963 года.',
      kk: '1963 жылы шілдеде болған алапат мұздық селінен бұзылған көне бөгелген көл.',
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
      en: 'Highest peak of Kazakhstan, a massive marble pyramid on the Kyrgyz border with massive glaciers.',
      ru: 'Высочайшая вершина Казахстана (7 010 м), мраморная пирамида с мощными ледниками и лавинными склонами.',
      kk: 'Қазақстанның ең биік шыңы (7 010 м), қуатты мұздықтары бар мәрмәр пирамида.',
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
      en: 'Highest summit of the Trans-Ili Alatau, source of high-energy rockfalls and mudflows.',
      ru: 'Высшая точка Заилийского Алатау (4 979 м) с крутыми ледовыми цирками и истоками селевых рек.',
      kk: 'Іле Алатауының ең биік нүктесі (4 979 м), селді өзендердің бастауы.',
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
      en: 'Deep canyon carved through ancient sandstone with active seismic faults and precipitous cliff faces.',
      ru: 'Глубокий каньон в древних осадочных породах с крутыми уступами и следами сейсмических разломов.',
      kk: 'Ежелгі шөгінді жыныстардағы терең шатқал, тік құлама жартастар мен жарылымдар.',
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
