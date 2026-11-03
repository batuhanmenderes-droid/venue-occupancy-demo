// UI language (English by default) with a TR / EN switch in the top-right corner.
// Static text uses data-i18n="key" (text) and data-i18n-aria="key" (aria-label); scripts call t(key, ...args).
const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'tr' || q === 'en') return q;
  try { const s = localStorage.getItem('lang'); if (s === 'tr' || s === 'en') return s; } catch {}
  return 'en';
})();
document.documentElement.lang = LANG;

const STRINGS = {
  en: {
    venues: 'Venues', occupancy: 'Occupancy', loading: 'loading…',
    listSub: (n, clock) => `Occupancy dashboard · ${n} venues · as of ${clock}`,
    tabList: 'List view', tabMap: 'Heatmap',
    heatPanel: 'Heat clouds', heatSize: 'Size', heatBaseM: 'Base radius', heatPerPersonM: 'Per person',
    heatBasePx: 'Min on screen', heatPerPersonPx: 'Min per person', heatPriority: 'Priority',
    heatMinStrength: 'Quiet venue strength', heatFullAt: 'Full strength at (people)', heatCurve: 'Curve (higher = busy wins)',
    heatOpacity: 'Overall opacity', heatBlur: 'Softness', heatColors: 'Colours', heatShift: 'drift to',
    zoomPanel: 'Zoom limits', zoomNow: 'Current zoom', zoomMin: 'Min zoom', zoomMax: 'Max zoom',
    zoomSetMin: 'Use current as min', zoomSetMax: 'Use current as max', zoomReset: 'Reset to default',
    mapAria: 'Occupancy map of Akyaka and Akçapınar',
    legendTitle: 'People in the latest frame',
    mapHint: "Each venue's glow takes its colour and size from the number of people in its latest frame whose time has come. Click a venue to open its dashboard.",
    people: 'people', noFramesToday: 'No frames yet today', noCamera: 'No camera connected',
    cameraActive: 'Camera active', noData: 'No data', noUpdates: 'No updates',
    soon: 'Soon to be added', soonCamera: 'Camera will be added soon',
    lastUpdate: ago => `Last update: ${ago}`, latestFrameAlt: name => `${name} latest camera frame`,
    logoAlt: name => `${name} logo`,
    agoNone: 'not yet', agoNow: 'just now', agoMin: n => `${n} min ago`, agoHour: n => `${n} h ago`, agoDay: n => `${n} d ago`,
    readError: 'Could not read the data. Open the page through a web server (see README).',
    back: '‹ Venues', day: 'Day', today: 'today', synthetic: 'Synthetic CCTV data',
    chartTitle: 'People over the day', chartHint: 'Each point is a camera frame. Hover for details, click to open the frame.',
    chartAria: 'Line chart of people over the day',
    selectedFrame: 'Selected frame', prev: '‹ Previous', next: 'Next ›', prevAria: 'Previous frame', nextAria: 'Next frame',
    allFrames: 'All frames', allFramesHint: 'Click a frame to check its count.',
    tableView: 'Table view', thTime: 'Time', thPeople: 'People', thNote: 'Note',
    tileLast: 'Latest frame', tilePeak: 'Busiest', tileAvg: 'Average', tileCount: 'Analysed',
    perFrame: 'people / frame', perFrameSoFar: 'people / frame · so far', frames: 'frames',
    notConnected: 'no camera connected', soonPlaceholder: "Soon to be added: this venue's camera is coming soon.",
    noFramesVenue: 'No camera frames for this venue yet.', framesWillAppear: 'Frames will appear here once a camera is connected.',
    noFramesYet: 'No frames yet.', noFramesDay: 'No frames for this day yet.',
    noAnalysedDay: 'No analysed frames for this day yet',
    analysedHourly: updated => `Frames are analysed hourly as their time comes and added here · ${updated}`,
    lastAnalysis: t => `last analysis ${t}`, noAnalysis: 'no analysis yet',
    asOf: clock => `as of ${clock}`, frameAlt: t => `${t} camera frame`,
    source: 'People are counted by looking at each frame; the time is read from the stamp at the bottom of the frame. Frames are analysed hourly as their time comes.',
    types: { Pub: 'Pub', Bar: 'Bar', Kulüp: 'Night club', Kafe: 'Cafe', Plaj: 'Beach', Meyhane: 'Tavern', Otel: 'Hotel', Restoran: 'Restaurant', Spor: 'Gym' },
    sortAria: 'Sort', sortBusy: 'Busiest first', sortQuiet: 'Quietest first', sortName: 'Name A–Z',
    filterAll: 'All', filterFun: 'Entertainment', filterFood: 'Food', filterActivity: 'Activity', filterAria: 'Category',
    rising: 'Getting busier', closed: 'Closed', opensAt: t => `opens ${t}`, closingSoon: 'Closing soon', demoData: 'Demo data',
    settingsFor: name => `Settings for ${name}`, settingsHint: 'Opening hours and a short description. Saved in this browser.',
    alwaysOpen: 'Open 24 hours', opens: 'Opens', closes: 'Closes', description: 'Description',
    descPlaceholder: 'What is this place like?', cancel: 'Cancel', save: 'Save',
    hoursLine: (o, c) => `Open ${o}–${c}`, alwaysLine: 'Open 24 hours', demoNote: 'Demo data: counts are made up and change every 40 minutes.',
    levels: ['Quiet', 'Normal', 'Busy', 'Crowded', 'Very crowded'],
  },
  tr: {
    venues: 'Mekanlar', occupancy: 'Doluluk', loading: 'yükleniyor…',
    listSub: (n, clock) => `Doluluk paneli · ${n} mekân · saat ${clock} itibarıyla`,
    tabList: 'Liste Görünümü', tabMap: 'Heatmap',
    heatPanel: 'Isı bulutları', heatSize: 'Boyut', heatBaseM: 'Temel yarıçap', heatPerPersonM: 'Kişi başı',
    heatBasePx: 'Ekranda en az', heatPerPersonPx: 'Kişi başı en az', heatPriority: 'Öncelik',
    heatMinStrength: 'Sakin mekân gücü', heatFullAt: 'Tam güç (kişi)', heatCurve: 'Eğri (yüksek = kalabalık baskın)',
    heatOpacity: 'Genel opaklık', heatBlur: 'Yumuşaklık', heatColors: 'Renkler', heatShift: 'geçiş',
    zoomPanel: 'Zoom sınırları', zoomNow: 'Şu anki zoom', zoomMin: 'En uzak (min)', zoomMax: 'En yakın (max)',
    zoomSetMin: 'Şu ankini min yap', zoomSetMax: 'Şu ankini max yap', zoomReset: 'Varsayılana dön',
    mapAria: 'Akyaka ve Akçapınar doluluk haritası',
    legendTitle: 'Son karedeki kişi sayısı',
    mapHint: 'Her mekânın etrafındaki ışıma, saati gelmiş son karedeki kişi sayısına göre renklenir ve büyür. Mekâna tıklayınca paneli açılır.',
    people: 'kişi', noFramesToday: 'Bugün henüz kare yok', noCamera: 'Kamera bağlı değil',
    cameraActive: 'Kamera aktif', noData: 'Veri yok', noUpdates: 'Güncelleme yok',
    soon: 'Yakında eklenecek', soonCamera: 'Kamera yakında eklenecek',
    lastUpdate: ago => `Son güncelleme: ${ago}`, latestFrameAlt: name => `${name} son kamera karesi`,
    logoAlt: name => `${name} logosu`,
    agoNone: 'henüz yok', agoNow: 'az önce', agoMin: n => `${n} dk önce`, agoHour: n => `${n} sa önce`, agoDay: n => `${n} gün önce`,
    readError: 'Veri okunamadı. Sayfayı bir web sunucusu üzerinden açın (README).',
    back: '‹ Mekanlar', day: 'Gün', today: 'bugün', synthetic: 'Sentetik CCTV verisi',
    chartTitle: 'Gün boyu kişi sayısı', chartHint: 'Her nokta bir kamera karesi. Üzerine gelin, kareyi açmak için tıklayın.',
    chartAria: 'Gün boyu kişi sayısı çizgi grafiği',
    selectedFrame: 'Seçili kare', prev: '‹ Önceki', next: 'Sonraki ›', prevAria: 'Önceki kare', nextAria: 'Sonraki kare',
    allFrames: 'Tüm kareler', allFramesHint: 'Sayının doğruluğunu kontrol etmek için kareye tıklayın.',
    tableView: 'Tablo görünümü', thTime: 'Zaman', thPeople: 'Kişi', thNote: 'Not',
    tileLast: 'Son kare', tilePeak: 'En yoğun', tileAvg: 'Ortalama', tileCount: 'Analiz edilen',
    perFrame: 'kişi / kare', perFrameSoFar: 'kişi / kare · şu ana kadar', frames: 'kare',
    notConnected: 'kamera bağlı değil', soonPlaceholder: 'Yakında eklenecek: bu mekânın kamerası yakında bağlanacak.',
    noFramesVenue: 'Bu mekân için henüz kamera karesi yok.', framesWillAppear: 'Kamera bağlandığında kareler burada görünecek.',
    noFramesYet: 'Henüz kare yok.', noFramesDay: 'Bu gün için henüz kare yok.',
    noAnalysedDay: 'Bu gün için henüz analiz edilmiş kare yok',
    analysedHourly: updated => `Kareler saati geldikçe saatte bir analiz edilip buraya eklenir · ${updated}`,
    lastAnalysis: t => `son analiz ${t}`, noAnalysis: 'henüz analiz yok',
    asOf: clock => `saat ${clock} itibarıyla`, frameAlt: t => `${t} kamera karesi`,
    source: 'Kişi sayıları her kare görsel olarak incelenerek sayılır; zaman damgası karenin altındaki yazıdan okunur. Kareler saati geldikçe saatte bir analiz edilip eklenir.',
    types: { Pub: 'Pub', Bar: 'Bar', Kulüp: 'Gece kulübü', Kafe: 'Kafe', Plaj: 'Plaj', Meyhane: 'Meyhane', Otel: 'Otel', Restoran: 'Restoran', Spor: 'Spor salonu' },
    sortAria: 'Sırala', sortBusy: 'En kalabalık önce', sortQuiet: 'En sakin önce', sortName: 'İsme göre A–Z',
    filterAll: 'Tümü', filterFun: 'Eğlence', filterFood: 'Yemek', filterActivity: 'Aktivite', filterAria: 'Kategori',
    rising: 'Yoğunlaşıyor', closed: 'Kapalı', opensAt: t => `${t}'de açılır`, closingSoon: 'Kapanıyor', demoData: 'Demo verisi',
    settingsFor: name => `${name} ayarları`, settingsHint: 'Açılış-kapanış saatleri ve kısa bir açıklama. Bu tarayıcıda saklanır.',
    alwaysOpen: '24 saat açık', opens: 'Açılış', closes: 'Kapanış', description: 'Açıklama',
    descPlaceholder: 'Burası nasıl bir yer?', cancel: 'Vazgeç', save: 'Kaydet',
    hoursLine: (o, c) => `Açık ${o}–${c}`, alwaysLine: '24 saat açık', demoNote: 'Demo verisi: sayılar uydurmadır ve 40 dakikada bir değişir.',
    levels: ['Sakin', 'Normal', 'Hareketli', 'Kalabalık', 'Çok kalabalık'],
  },
};

function t(key, ...args) {
  const v = STRINGS[LANG][key] ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
const typeName = type => STRINGS[LANG].types[type] || type;
// Frame notes and venue rules are stored in Turkish with an optional English twin (`note_en`, `count_rule_en`).
const localized = (obj, field) => (LANG === 'en' && obj[`${field}_en`]) || obj[field] || '';
const decimal = x => LANG === 'tr' ? String(x).replace('.', ',') : String(x);

function applyStaticText() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)));
}

function addLangSwitch() {
  const css = `.langswitch { position: fixed; top: 14px; right: 16px; z-index: 1000; display: inline-flex; padding: 3px; gap: 2px;
    border: 1px solid var(--border); border-radius: 9px; background: var(--surface); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  .langswitch button { font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink-2);
    background: transparent; border: 0; border-radius: 6px; padding: 6px 9px; cursor: pointer; letter-spacing: .04em; }
  .langswitch button[aria-pressed="true"] { background: var(--grid); color: var(--ink); }
  @media (max-width: 640px) { .langswitch { top: 8px; right: 8px; } }
  header .actions { margin-right: 84px; }`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  const box = document.createElement('div');
  box.className = 'langswitch';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Language');
  box.innerHTML = ['tr', 'en'].map(l => `<button data-lang="${l}" aria-pressed="${l === LANG}">${l === 'tr' ? 'TR' : 'EN'}</button>`).join('');
  box.onclick = e => {
    const l = e.target.closest('button')?.dataset.lang;
    if (!l || l === LANG) return;
    try { localStorage.setItem('lang', l); } catch {}
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    location.href = u.toString();
  };
  document.body.appendChild(box);
}

document.addEventListener('DOMContentLoaded', () => { applyStaticText(); addLangSwitch(); });
