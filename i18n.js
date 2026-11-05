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
    heatOpacity: 'Overall opacity', heatBlur: 'Softness', heatColors: 'Colours', heatShift: 'drift to', heatMotion: 'Motion', heatSpeed: 'Speed', heatSpin: 'Swirl', heatSpiral: 'Spiral outward',
    mapPanel: 'Map colours', mapDark: 'Dark', mapLight: 'Light', showOnMap: 'Show on map',
    mapKeys: { land: 'Land', water: 'Water', landuse: 'Land use', green: 'Parks & woods', building: 'Buildings', motorway: 'Motorways', major: 'Main roads', minor: 'Streets', path: 'Paths', rail: 'Rail', town: 'Town names', grid: 'Grid lines', shade: 'Edge shading' },
    chatPlaceholder: 'Ask anything about the venues…', chatSend: 'Send', chatEvents: 'Coming up at the venues:', chatNoEvents: 'No upcoming events announced right now.',
    chatQuiet: 'The quietest places open right now:', chatBusy: 'The busiest places right now:',
    chatFallback: 'I can help with: busy or quiet places, events, music, breakfast, cocktails, cheap food or drinks, or a venue by name. Here is my general pick:',
    recQDiscover: 'Where do you think I should be discovering now?', recQBreakfast: 'Where do you think is the most preferred venue for breakfast?',
    recQMusic: 'Where do you think is the best music?', recQCocktails: 'Where do you think are the best cocktails?',
    recQFood: 'Where do you think I should be going for the cheapest food?', recQDrinks: 'Where do you think I should be going for the cheapest drinks?',
    aDiscover: 'A few different ways to go right now:', aBreakfast: 'For breakfast, depending on what you are after:', aBreakfastLate: 'Breakfast time is over for today; for tomorrow morning:',
    aMusic: 'Music, from loud to laid-back:', aMusicDay: 'Most music starts in the evening; these are the picks for tonight.', aCocktails: 'Cocktails, by taste and by price:',
    aFood: 'Cheapest food, and one to splurge on:', aDrinks: 'Cheapest drinks, and the priciest for comparison:',
    recNone: 'Nothing fits right now.', recMadeUp: 'Ratings and prices are demo estimates, not real reviews.',
    tagGem: 'Hidden gem', tagBuzz: 'Most crowded', tagNew: 'Something different', tagLoved: 'Most preferred', tagQuiet: 'Quietest', tagCheap: 'Cheapest',
    tagPricey: 'Most expensive', tagLive: 'Best music tonight', tagDance: 'Busiest dance floor', tagChill: 'Laid-back', tagTopRated: 'Top rated',
    tagCheapOpen: 'Cheapest open now', tagValue: 'Best value', tagCheapCocktail: 'Cheapest cocktail',
    whyQuietNow: n => `Quiet right now, ${n} people`, whyQuietUsually: 'Usually calm', whyRated: r => `Rated ${r} / 5`, whyBusiest: n => `${n} people there now`,
    whyTry: k => `A ${k} you may not know yet`, whyGenre: g => `Plays ${g}`, whyBreakfast: r => `Breakfast rated ${r} / 5`, whyOpensAt: o => `Opens at ${o}`,
    whyMenemen: p => `Menemen ${p}`, whySerpme: p => `Breakfast spread for two ${p}`, whyCheapish: 'Low prices', whyPremium: 'Premium choice',
    whyMusic: r => `Music rated ${r} / 5`, whyLater: 'Fills up later tonight', whyCocktails: r => `Cocktails rated ${r} / 5`, whyCocktailPrice: p => `Cocktails around ${p}`,
    whyFoodAvg: p => `Plates around ${p}`, whyFrom: p => `From ${p}`, whyOpenNow: 'Open now', whySplurge: 'Worth it for a special night',
    whyBeer: p => `Draught beer 50 cl ${p}`, whyCoffee: p => `Coffee from ${p}`, whyRealPrice: 'Price from the café\'s own board', tagCheapCoffee: 'Cheapest coffee', whyRaki: p => `Rakı ${p}`,
    youAreHere: 'You are here', recRoute: 'Show route', routeGo: 'Go', routeCancel: 'Cancel route', routeFinding: 'Finding the walking route…',
    routeMeta: (d, m) => `${d} · ${m} walk`, routeStraight: d => `${d} km as the crow flies`, routeMeta2: (d, m, k) => `${d} · ${m} ${({ walk: 'on foot', bike: 'by bike', car: 'by car' })[k]}`, mode_walk: 'Walk', mode_bike: 'Bike', mode_car: 'Car',
    d3Panel: '3D map', d3Roads: 'Road shadows', d3Buildings: 'Building shadows', d3Light: 'Light', d3Length: 'Length', d3Dark: 'Darkness', d3Angle: 'Shadow direction', d3Persp: 'Perspective depth', d3Spin: 'Rotation',
    kitePanel: 'Kitesurfers', kiteEdit: 'Edit kitesurfers', kiteHint: 'Click the water to add one. Drag to move, double-click to remove.', kiteAnimate: 'Animate', kiteAdd: 'Add kitesurfer', kiteClearAsk: 'Remove all kitesurfers?', kiteCount: n => `${n} kitesurfers`,
    removeAll: 'Remove all', decorationSize: 'Size',
    seaPanel: 'Bay label & wind', seaDrag: 'Move on map (drag the name)', seaLat: 'Lat', seaLon: 'Lon', seaWind: 'Wind box', seaWindX: 'Left / right', seaWindY: 'Up / down', seaName: 'Name', seaSize: 'Size', hourShort: 'h', minShort: 'min',
    settingsTitle: 'Settings', setLanguage: 'Language', setMapTools: 'Map', setMapHint: 'Open the Heatmap once to change the map settings here.', setZoom: 'Zoom', setTilt: 'Map tilt', setAppearance: 'Appearance', setAuto: 'Auto', setLight: 'Light', setDark: 'Dark',
    setAutoNote: 'Auto switches to light at sunrise and dark at sunset in Akyaka.',
    menu: 'Menu', closeMenu: 'Close menu', recTitle: 'Recommendations', recQWhere: 'Where do you think I should be going?',
    recIntro: (c, part) => `It's ${c} ${part}. Going by what the cameras and counts say right now, here's where I'd go:`,
    recMorning: 'in the morning', recAfternoon: 'in the afternoon', recEvening: 'in the evening', recNight: 'at night', recLateNight: 'late at night',
    recLively: n => `Lively, ${n} people there now`, recQuiet: n => `Quiet, only ${n} people`, recPacked: n => `Packed, ${n} people`,
    recTonight: a => `${a} tonight`, recToday: a => `${a} today`, recOpenUntil: c => `Open until ${c}`, recOpen: 'Open venue', recOnMap: 'Show on map',
    recAllClosed: 'Everything is closed right now. These open first:', recNote: 'Based on the latest counts; demo venues use simulated numbers.',
    windToggle: 'Wind', windFrom: d => `from ${d}`, knots: 'knots', windGust: g => `gusts ${g}`, windSource: 'Current 10 m wind over Gökova bay · Open-Meteo', windStation: 'Measured at the Akyaka wind station · meteo.prokite.club (every 15 min) · forecast: Open-Meteo', windDrag: 'drag to move, double-click to reset',
    evTomorrow: 'Tomorrow', pastEvents: 'Past events', eventsHint: 'Announced by the venue. Upcoming first, past events below.', noUpcoming: 'No upcoming events announced yet.', ev_upcoming: 'Upcoming', ev_live: 'In progress', ev_past: 'Ended',
    menuIced: 'iced', eventYoga: 'Yoga class', eventShow: 'Live',
    levelsPanel: 'Occupancy levels', levelsNote: 'These bands are for about 1500 people out in town. With fewer people out they stretch up automatically (up to 3×), so only real outliers turn purple.',
    zoomPanel: 'Zoom limits', zoomNow: 'Current zoom', zoomMin: 'Min zoom', zoomMax: 'Max zoom',
    zoomSetMin: 'Use current as min', zoomSetMax: 'Use current as max', zoomReset: 'Reset to default',
    boundsPanel: 'Map boundaries', boundsOn: 'Limit panning', boundsHard: 'Hard edge', boundsPad: 'Extra room', boundsUseView: 'Use current view as boundary', boundsHint: 'Pan and zoom to the area you want, then use the current view. The blue dashed line shows the boundary while this panel is open.',
    mapAria: 'Occupancy map of Akyaka and Akçapınar',
    legendTitle: 'People in the latest frame',
    mapHint: "Each venue's glow takes its colour and size from the number of people in its latest frame whose time has come. Click a venue to open its dashboard.",
    busyAround: t => `Busy around ${t}`,
    hereNow: n => n === 1 ? 'person is here right now.' : 'people are here right now.',
    people: 'people', noFramesToday: 'No frames yet today', noCamera: 'No camera connected',
    cameraActive: 'Counter Online', noData: 'No data', noUpdates: 'No updates',
    soon: 'Soon to be added', soonCamera: 'Camera will be added soon',
    lastUpdate: ago => `Last update: ${ago}`, latestFrameAlt: name => `${name} latest camera frame`,
    logoAlt: name => `${name} logo`,
    agoNone: 'not yet', agoNow: 'just now', agoMin: n => `${n} min ago`, agoHour: n => `${n} h ago`, agoDay: n => `${n} d ago`,
    readError: 'Could not read the data. Open the page through a web server (see README).',
    back: '‹ Venues', day: 'Day', today: 'today', synthetic: 'Synthetic CCTV data',
    seasonTitle: 'All-time high by season', seasonHint: 'Busiest moment of every week since 2021, on the seasons. Dashed lines mark each season\'s high. Demo data.',
    seasonNames: ['Winter', 'Spring', 'Summer', 'Autumn'], athLabel: 'All-time high', weekOf: d => `Week of ${d}`, athOn: (d, n) => `Record ${n} · week of ${d}`,
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
    tabDensity: 'Density', tabCalendar: 'Activity calendar', tabWebsite: 'Website', tabMenu: 'Menu', getDirections: 'Get directions', menuTitle: 'Menu', menuHint: '', menuHot: 'Hot', menuIcedCol: 'Iced',
    tileLastMeasure: 'Latest measurement', tilePerM2: 'People per m² (est.)', perM2Meta: a => `estimated floor area ${a.toLocaleString('en')} m²`,
    lastHour: 'in the last hour', lastWeekShort: 'Last week', tileRecord: 'All-time high', recordShort: 'Record', avgShort: 'Average', todayVsRecord: 'today vs record', vsLastWeek: 'vs last week', noLastWeek: 'no data from last week',
    tilePopularity: 'Popularity', popularityMeta: 'from today’s peak and average',
    facesBlurred: 'Faces blurred', calendarTitle: 'Activity calendar', calendarHint: 'Busiest frame in each hour, day by day. Click a cell to open that moment.',
    programTitle: 'This week’s programme', programHint: 'A different artist every night (demo line-up).',
    programChartTitle: 'Expected crowd by artist, 21:00–01:00', programChartHint: 'Share of capacity through the night; hover to compare the line-up.',
    noEvent: 'No event', noProgram: 'No events planned for this venue.',
    noWebsite: 'No website added for this venue yet.', openSite: 'Open in new tab',
    rising: 'Getting busier', atPeak: 'At its peak', expectedAround: n => `Expected around ${n}`, closed: 'Closed', opensAt: t => `opens ${t}`, closingSoon: 'Closing soon', demoData: 'Counter Offline',
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
    heatOpacity: 'Genel opaklık', heatBlur: 'Yumuşaklık', heatColors: 'Renkler', heatShift: 'geçiş', heatMotion: 'Hareket', heatSpeed: 'Hız', heatSpin: 'Dönüş', heatSpiral: 'Dışa sarmal',
    mapPanel: 'Harita renkleri', mapDark: 'Koyu', mapLight: 'Açık', showOnMap: 'Haritada göster',
    mapKeys: { land: 'Kara', water: 'Su', landuse: 'Arazi kullanımı', green: 'Park ve orman', building: 'Binalar', motorway: 'Otoyollar', major: 'Ana yollar', minor: 'Sokaklar', path: 'Patikalar', rail: 'Demiryolu', town: 'Kasaba adları', grid: 'Grid çizgileri', shade: 'Kenar gölgesi' },
    chatPlaceholder: 'Mekânlarla ilgili bir şey sor…', chatSend: 'Gönder', chatEvents: 'Mekânlarda yaklaşanlar:', chatNoEvents: 'Şu an duyurulmuş yaklaşan etkinlik yok.',
    chatQuiet: 'Şu an açık en sakin yerler:', chatBusy: 'Şu an en kalabalık yerler:',
    chatFallback: 'Şunlarda yardımcı olabilirim: kalabalık ya da sakin yerler, etkinlikler, müzik, kahvaltı, kokteyl, ucuz yemek ya da içki veya mekân adı. Genel önerim:',
    recQDiscover: 'Sence şu an nereyi keşfetmeliyim?', recQBreakfast: 'Sence kahvaltı için en çok tercih edilen yer neresi?',
    recQMusic: 'Sence en iyi müzik nerede?', recQCocktails: 'Sence en iyi kokteyller nerede?',
    recQFood: 'Sence en ucuz yemek için nereye gitmeliyim?', recQDrinks: 'Sence en ucuz içki için nereye gitmeliyim?',
    aDiscover: 'Şu an için birkaç farklı seçenek:', aBreakfast: 'Kahvaltı için, ne aradığına göre:', aBreakfastLate: 'Bugünün kahvaltı saati geçti; yarın sabah için:',
    aMusic: 'Müzik, hareketliden sakine:', aMusicDay: 'Müzik genelde akşam başlar; bunlar bu gece için öneriler.', aCocktails: 'Kokteyller, lezzete ve fiyata göre:',
    aFood: 'En ucuz yemek ve bir de keyif için pahalısı:', aDrinks: 'En ucuz içkiler ve karşılaştırma için en pahalısı:',
    recNone: 'Şu an uygun bir yer yok.', recMadeUp: 'Puanlar ve fiyatlar demo tahminidir, gerçek yorum değildir.',
    tagGem: 'Gizli cevher', tagBuzz: 'En kalabalık', tagNew: 'Farklı bir şey', tagLoved: 'En çok tercih edilen', tagQuiet: 'En sakin', tagCheap: 'En ucuz',
    tagPricey: 'En pahalı', tagLive: 'Bu gece en iyi müzik', tagDance: 'En hareketli pist', tagChill: 'Sakin müzik', tagTopRated: 'En yüksek puan',
    tagCheapOpen: 'Şu an açık en ucuz', tagValue: 'Fiyat / performans', tagCheapCocktail: 'En ucuz kokteyl',
    whyQuietNow: n => `Şu an sakin, ${n} kişi`, whyQuietUsually: 'Genelde sakin', whyRated: r => `Puan ${r} / 5`, whyBusiest: n => `Şu an ${n} kişi var`,
    whyTry: k => `Henüz bilmediğin bir ${k}`, whyGenre: g => `${g} çalıyor`, whyBreakfast: r => `Kahvaltı puanı ${r} / 5`, whyOpensAt: o => `${o}'da açılıyor`,
    whyMenemen: p => `Menemen ${p}`, whySerpme: p => `2 kişilik serpme kahvaltı ${p}`, whyCheapish: 'Uygun fiyatlı', whyPremium: 'Seçkin bir tercih',
    whyMusic: r => `Müzik puanı ${r} / 5`, whyLater: 'Gece ilerledikçe doluyor', whyCocktails: r => `Kokteyl puanı ${r} / 5`, whyCocktailPrice: p => `Kokteyller ${p} civarı`,
    whyFoodAvg: p => `Tabaklar ${p} civarı`, whyFrom: p => `${p}'den başlıyor`, whyOpenNow: 'Şu an açık', whySplurge: 'Özel bir akşama değer',
    whyBeer: p => `Fıçı bira 50 cl ${p}`, whyCoffee: p => `Kahve ${p}'den başlıyor`, whyRealPrice: 'Fiyat kafenin kendi panosundan', tagCheapCoffee: 'En ucuz kahve', whyRaki: p => `Rakı ${p}`,
    youAreHere: 'Buradasın', recRoute: 'Rotayı göster', routeGo: 'Git', routeCancel: 'Rotayı kapat', routeFinding: 'Yürüme rotası bulunuyor…',
    routeMeta: (d, m) => `${d} · ${m} yürüyüş`, routeStraight: d => `kuş uçuşu ${d} km`, routeMeta2: (d, m, k) => `${d} · ${({ walk: 'yürüyerek', bike: 'bisikletle', car: 'arabayla' })[k]} ${m}`, mode_walk: 'Yürüyüş', mode_bike: 'Bisiklet', mode_car: 'Araba',
    d3Panel: '3D harita', d3Roads: 'Yol gölgeleri', d3Buildings: 'Bina gölgeleri', d3Light: 'Işık', d3Length: 'Uzunluk', d3Dark: 'Koyuluk', d3Angle: 'Gölge yönü', d3Persp: 'Perspektif derinliği', d3Spin: 'Döndürme',
    kitePanel: 'Kitesörfçüler', kiteEdit: 'Kitesörfçüleri düzenle', kiteHint: 'Eklemek için suya tıkla. Taşımak için sürükle, silmek için çift tıkla.', kiteAnimate: 'Hareketli', kiteAdd: 'Kitesörfçü ekle', kiteClearAsk: 'Tüm kitesörfçüler silinsin mi?', kiteCount: n => `${n} kitesörfçü`,
    removeAll: 'Hepsini sil', decorationSize: 'Boyut',
    seaPanel: 'Körfez yazısı & rüzgâr', seaDrag: 'Haritada taşı (yazıyı sürükle)', seaLat: 'Enlem', seaLon: 'Boylam', seaWind: 'Rüzgâr kutusu', seaWindX: 'Sol / sağ', seaWindY: 'Yukarı / aşağı', seaName: 'Yazı', seaSize: 'Boyut', hourShort: 'sa', minShort: 'dk',
    settingsTitle: 'Ayarlar', setLanguage: 'Dil', setMapTools: 'Harita', setMapHint: 'Harita ayarlarını burada değiştirmek için Heatmap\'i bir kez aç.', setZoom: 'Yakınlaştır', setTilt: 'Harita eğimi', setAppearance: 'Görünüm', setAuto: 'Otomatik', setLight: 'Açık', setDark: 'Koyu',
    setAutoNote: 'Otomatik: Akyaka\'da gün doğumunda açık, gün batımında koyu temaya geçer.',
    menu: 'Menü', closeMenu: 'Menüyü kapat', recTitle: 'Öneriler', recQWhere: 'Sence nereye gitmeliyim?',
    recIntro: (c, part) => `Saat ${c}, ${part}. Kameraların ve sayımların şu an söylediğine göre ben şuralara giderdim:`,
    recMorning: 'sabah', recAfternoon: 'öğleden sonra', recEvening: 'akşam', recNight: 'gece', recLateNight: 'gece geç saat',
    recLively: n => `Hareketli, şu an ${n} kişi var`, recQuiet: n => `Sakin, sadece ${n} kişi`, recPacked: n => `Çok kalabalık, ${n} kişi`,
    recTonight: a => `Bu akşam ${a}`, recToday: a => `Bugün ${a}`, recOpenUntil: c => `${c}'e kadar açık`, recOpen: 'Mekânı aç', recOnMap: 'Haritada göster',
    recAllClosed: 'Şu an her yer kapalı. İlk açılacaklar:', recNote: 'Son sayımlara göre; demo mekânlarda sayılar simüledir.',
    windToggle: 'Rüzgâr', windFrom: d => `${({N:'K',NE:'KD',E:'D',SE:'GD',S:'G',SW:'GB',W:'B',NW:'KB'})[d]} yönünden`, knots: 'knot', windGust: g => `hamle ${g}`, windSource: 'Gökova körfezinde 10 m anlık rüzgâr · Open-Meteo', windStation: 'Akyaka rüzgâr istasyonu ölçümü · meteo.prokite.club (15 dk\'da bir) · tahmin: Open-Meteo', windDrag: 'taşımak için sürükle, sıfırlamak için çift tıkla',
    evTomorrow: 'Yarın', pastEvents: 'Geçmiş etkinlikler', eventsHint: 'Mekânın duyurduğu etkinlikler. Önce yaklaşanlar, geçmişler altta.', noUpcoming: 'Henüz duyurulmuş yaklaşan etkinlik yok.', ev_upcoming: 'Yaklaşan', ev_live: 'Devam ediyor', ev_past: 'Bitti',
    menuIced: 'buzlu', eventYoga: 'Yoga dersi', eventShow: 'Canlı',
    levelsPanel: 'Doluluk seviyeleri', levelsNote: 'Bu aralıklar kasabada yaklaşık 1500 kişi için. Daha az kişi varken kendiliğinden genişler (en fazla 3×), böylece yalnızca gerçekten kalabalık yerler mor olur.',
    zoomPanel: 'Zoom sınırları', zoomNow: 'Şu anki zoom', zoomMin: 'En uzak (min)', zoomMax: 'En yakın (max)',
    zoomSetMin: 'Şu ankini min yap', zoomSetMax: 'Şu ankini max yap', zoomReset: 'Varsayılana dön',
    boundsPanel: 'Harita sınırları', boundsOn: 'Kaydırmayı sınırla', boundsHard: 'Sert kenar', boundsPad: 'Ek pay', boundsUseView: 'Şu anki görünümü sınır yap', boundsHint: 'İstediğin alana kaydırıp yakınlaştır, sonra şu anki görünümü sınır yap. Bu panel açıkken mavi kesikli çizgi sınırı gösterir.',
    mapAria: 'Akyaka ve Akçapınar doluluk haritası',
    legendTitle: 'Son karedeki kişi sayısı',
    mapHint: 'Her mekânın etrafındaki ışıma, saati gelmiş son karedeki kişi sayısına göre renklenir ve büyür. Mekâna tıklayınca paneli açılır.',
    busyAround: t => `${t} civarı yoğun`,
    hereNow: () => 'kişi şu an burada.',
    people: 'kişi', noFramesToday: 'Bugün henüz kare yok', noCamera: 'Kamera bağlı değil',
    cameraActive: 'Sayaç çevrimiçi', noData: 'Veri yok', noUpdates: 'Güncelleme yok',
    soon: 'Yakında eklenecek', soonCamera: 'Kamera yakında eklenecek',
    lastUpdate: ago => `Son güncelleme: ${ago}`, latestFrameAlt: name => `${name} son kamera karesi`,
    logoAlt: name => `${name} logosu`,
    agoNone: 'henüz yok', agoNow: 'az önce', agoMin: n => `${n} dk önce`, agoHour: n => `${n} sa önce`, agoDay: n => `${n} gün önce`,
    readError: 'Veri okunamadı. Sayfayı bir web sunucusu üzerinden açın (README).',
    back: '‹ Mekanlar', day: 'Gün', today: 'bugün', synthetic: 'Sentetik CCTV verisi',
    seasonTitle: 'Sezonlara göre tüm zamanların en yükseği', seasonHint: '2021\'den bu yana her haftanın en kalabalık anı, sezonlarla birlikte. Kesikli çizgiler her sezonun zirvesi. Demo veri.',
    seasonNames: ['Kış', 'İlkbahar', 'Yaz', 'Sonbahar'], athLabel: 'Rekor', weekOf: d => `${d} haftası`, athOn: (d, n) => `Rekor ${n} · ${d} haftası`,
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
    tabDensity: 'Yoğunluk', tabCalendar: 'Aktivite takvimi', tabWebsite: 'Web sitesi', tabMenu: 'Menü', getDirections: 'Yol tarifi al', menuTitle: 'Menü', menuHint: '', menuHot: 'Sıcak', menuIcedCol: 'Buzlu',
    tileLastMeasure: 'Son ölçüm', tilePerM2: 'm² başına kişi (tahmini)', perM2Meta: a => `tahmini alan ${a.toLocaleString('tr')} m²`,
    lastHour: 'son 1 saatte', lastWeekShort: 'Geçen hafta', tileRecord: 'Tüm zamanların en yükseği', recordShort: 'Rekor', avgShort: 'Ortalama', todayVsRecord: 'bugün rekora göre', vsLastWeek: 'geçen haftaya göre', noLastWeek: 'geçen haftadan veri yok',
    tilePopularity: 'Popülerlik', popularityMeta: 'bugünkü zirve ve ortalamaya göre',
    facesBlurred: 'Yüzler bulanıklaştırıldı', calendarTitle: 'Aktivite takvimi', calendarHint: 'Her saatin en kalabalık karesi, gün gün. Bir hücreye tıklayınca o an açılır.',
    programTitle: 'Bu haftanın programı', programHint: 'Her gece başka bir sanatçı (demo program).',
    programChartTitle: 'Sanatçıya göre beklenen kalabalık, 21:00–01:00', programChartHint: 'Kapasitenin yüzdesi; karşılaştırmak için grafiğin üzerine gelin.',
    noEvent: 'Etkinlik yok', noProgram: 'Bu mekân için planlanmış etkinlik yok.',
    noWebsite: 'Bu mekân için henüz web sitesi eklenmedi.', openSite: 'Yeni sekmede aç',
    rising: 'Yoğunlaşıyor', atPeak: 'Zirvede', expectedAround: n => `${n} civarı bekleniyor`, closed: 'Kapalı', opensAt: t => `${t}'de açılır`, closingSoon: 'Kapanıyor', demoData: 'Sayaç çevrimdışı',
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
  document.querySelectorAll('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
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
