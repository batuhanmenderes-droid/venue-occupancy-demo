// Demo menu (made-up items and prices in Turkish lira), shown on the venue page's Menu tab.
// Sections a venue gets depend on its type; prices shift a little per venue so menus differ.
// Item names and descriptions: [Turkish, English]; base prices are typical Akyaka bar/restaurant prices.

const MENU_SECTIONS = {
  cocktails: { tr: 'Kokteyller', en: 'Cocktails', items: [
    [['Aperol Spritz', 'Aperol Spritz'], ['Aperol, prosecco, soda', 'Aperol, prosecco, soda'], 620],
    [['Negroni', 'Negroni'], ['Cin, Campari, vermut', 'Gin, Campari, vermouth'], 680],
    [['Mojito', 'Mojito'], ['Beyaz rom, nane, lime, soda', 'White rum, mint, lime, soda'], 640],
    [['Margarita', 'Margarita'], ['Tekila, triple sec, lime', 'Tequila, triple sec, lime'], 660],
    [['Gökova Sunset', 'Gökova Sunset'], ['Votka, çarkıfelek, portakal, nar şurubu', 'Vodka, passion fruit, orange, grenadine'], 700],
    [['Espresso Martini', 'Espresso Martini'], ['Votka, kahve likörü, espresso', 'Vodka, coffee liqueur, espresso'], 690],
  ] },
  beer: { tr: 'Biralar', en: 'Beer', items: [
    [['Fıçı bira 50 cl', 'Draught beer 50 cl'], ['Efes Pilsen', 'Efes Pilsen'], 280],
    [['Fıçı bira 33 cl', 'Draught beer 33 cl'], ['Efes Pilsen', 'Efes Pilsen'], 210],
    [['Şişe bira', 'Bottled beer'], ['Tuborg Gold / Carlsberg', 'Tuborg Gold / Carlsberg'], 260],
    [['Craft IPA', 'Craft IPA'], ['Yerel bira, 33 cl', 'Local brew, 33 cl'], 340],
    [['Bomonti Filtresiz', 'Bomonti Unfiltered'], ['50 cl', '50 cl'], 300],
  ] },
  raki: { tr: 'Rakı & şarap', en: 'Rakı & wine', items: [
    [['Rakı tek', 'Rakı, single'], ['Yeni Rakı, 4 cl', 'Yeni Rakı, 4 cl'], 260],
    [['Rakı duble', 'Rakı, double'], ['Yeni Rakı, 8 cl', 'Yeni Rakı, 8 cl'], 450],
    [['Rakı 35 cl', 'Rakı, 35 cl bottle'], ['Yeni Rakı', 'Yeni Rakı'], 1450],
    [['Rakı 70 cl', 'Rakı, 70 cl bottle'], ['Yeni Rakı', 'Yeni Rakı'], 2600],
    [['Kadeh şarap', 'Glass of wine'], ['Beyaz / kırmızı / roze, ev şarabı', 'White / red / rosé, house wine'], 380],
    [['Şişe şarap', 'Bottle of wine'], ['Kayra / Sevilen, yerel üzüm', 'Kayra / Sevilen, local grapes'], 1650],
  ] },
  spirits: { tr: 'Sert içkiler & shotlar', en: 'Spirits & shots', items: [
    [['Viski', 'Whisky'], ['Jameson / Johnnie Walker Black, 5 cl', 'Jameson / Johnnie Walker Black, 5 cl'], 520],
    [['Cin tonik', 'Gin & tonic'], ['Bombay Sapphire, tonik', 'Bombay Sapphire, tonic'], 560],
    [['Votka', 'Vodka'], ['Absolut, 5 cl', 'Absolut, 5 cl'], 480],
    [['Tekila shot', 'Tequila shot'], ['Olmeca', 'Olmeca'], 280],
    [['Jäger shot', 'Jäger shot'], ['Jägermeister', 'Jägermeister'], 300],
  ] },
  softs: { tr: 'Alkolsüz', en: 'Soft drinks', items: [
    [['Taze limonata', 'Fresh lemonade'], ['Nane ile', 'With mint'], 180],
    [['Soda / kola', 'Soda / cola'], ['', ''], 110],
    [['Türk kahvesi', 'Turkish coffee'], ['', ''], 140],
    [['Filtre kahve', 'Filter coffee'], ['', ''], 160],
  ] },
  meze: { tr: 'Mezeler', en: 'Meze', items: [
    [['Haydari', 'Haydari'], ['Süzme yoğurt, nane, sarımsak', 'Strained yoghurt, mint, garlic'], 190],
    [['Atom', 'Atom'], ['Yoğurt, kuru biber, tereyağı', 'Yoghurt, dried chilli, butter'], 210],
    [['Deniz börülcesi', 'Samphire'], ['Zeytinyağı, limon, sarımsak', 'Olive oil, lemon, garlic'], 230],
    [['Patlıcan ezme', 'Smoky aubergine'], ['Közlenmiş patlıcan, tahin', 'Charred aubergine, tahini'], 210],
    [['Ahtapot salatası', 'Octopus salad'], ['Gökova ahtapotu, kapari', 'Gökova octopus, capers'], 480],
    [['Beyaz peynir & kavun', 'Feta & melon'], ['Mevsiminde', 'In season'], 320],
  ] },
  mains: { tr: 'Ana yemekler', en: 'Mains', items: [
    [['Izgara levrek', 'Grilled sea bass'], ['Roka, közlenmiş sebze', 'Rocket, charred vegetables'], 780],
    [['Kalamar tava', 'Fried calamari'], ['Tarator sos', 'Tarator sauce'], 560],
    [['Köfte', 'Köfte'], ['Piyaz, közlenmiş biber', 'Bean salad, charred pepper'], 520],
    [['Tavuk şiş', 'Chicken skewer'], ['Bulgur pilavı, cacık', 'Bulgur pilaf, cacık'], 480],
    [['Mantar risotto', 'Mushroom risotto'], ['Parmesan, trüf yağı', 'Parmesan, truffle oil'], 540],
  ] },
  bites: { tr: 'Atıştırmalıklar', en: 'Bar bites', items: [
    [['Patates kızartması', 'French fries'], ['Cheddar sos', 'Cheddar sauce'], 220],
    [['Çıtır tavuk', 'Crispy chicken'], ['Acılı mayonez', 'Spicy mayo'], 360],
    [['Nachos', 'Nachos'], ['Guacamole, salsa, ekşi krema', 'Guacamole, salsa, sour cream'], 340],
    [['Karışık kuruyemiş', 'Mixed nuts'], ['', ''], 200],
    [['Burger', 'Burger'], ['Dana köfte, cheddar, karamelize soğan', 'Beef patty, cheddar, caramelised onion'], 520],
  ] },
  breakfast: { tr: 'Kahvaltı & tatlı', en: 'Breakfast & sweets', items: [
    [['Serpme kahvaltı (2 kişilik)', 'Turkish breakfast for two'], ['', ''], 1100],
    [['Menemen', 'Menemen'], ['', ''], 280],
    [['Kaşarlı tost', 'Cheese toastie'], ['', ''], 220],
    [['Sufle', 'Chocolate soufflé'], ['Dondurma ile', 'With ice cream'], 290],
  ] },
};

// Sections per venue type, in the order they are shown.
const MENU_BY_TYPE = {
  Kulüp: ['cocktails', 'spirits', 'beer', 'softs', 'bites'],
  Bar: ['cocktails', 'beer', 'spirits', 'softs', 'bites'],
  Pub: ['beer', 'cocktails', 'spirits', 'softs', 'bites'],
  Meyhane: ['raki', 'meze', 'mains', 'beer', 'softs'],
  Restoran: ['mains', 'meze', 'raki', 'beer', 'softs'],
  Kafe: ['breakfast', 'bites', 'softs', 'beer', 'cocktails'],
  Otel: ['cocktails', 'mains', 'beer', 'raki', 'softs'],
  Plaj: ['beer', 'cocktails', 'bites', 'softs'],
  Spor: ['softs'],
};

// Real menus, read from the venue's own price board, replace the demo menu for that venue.
// Items: [[tr, en], [desc tr, desc en], price, icedPrice?]
const VENUE_MENUS = {
  'lemongrass-cafe': { source: { tr: 'Lemongrass\'ın fiyat panosundan', en: 'From Lemongrass\'s price board' }, sections: [
    { tr: 'Kahveler', en: 'Coffee', items: [
      [['Filtre kahve', 'Filter coffee'], ['', ''], 220, 230], [['Espresso', 'Espresso'], ['', ''], 220], [['Americano', 'Americano'], ['', ''], 230, 250],
      [['Cortado', 'Cortado'], ['', ''], 250], [['Flat white', 'Flat white'], ['', ''], 260, 280], [['Latte', 'Latte'], ['', ''], 270, 290],
      [['Cappuccino', 'Cappuccino'], ['', ''], 270], [['Cold drip', 'Cold drip'], ['', ''], 290], [['Karamel latte', 'Caramel latte'], ['', ''], 330, 350],
      [['Vanilya latte', 'Vanilla latte'], ['', ''], 330, 350], [['Matcha latte', 'Matcha latte'], ['', ''], 350, 370], [['Golden milk', 'Golden milk'], ['Zerdeçallı süt', 'Turmeric milk'], 290],
    ] },
    { tr: 'Çaylar & soğuk içecekler', en: 'Teas & cold drinks', items: [
      [['Bitki çayları', 'Herbal teas'], ['', ''], 250], [['Lemongrass limonata', 'Lemongrass lemonade'], ['', ''], 290], [['Hibiscus ice tea', 'Hibiscus iced tea'], ['', ''], 260],
      [['Ice tea', 'Iced tea'], ['', ''], 260], [['Kombucha', 'Kombucha'], ['', ''], 350], [['Soda', 'Sparkling water'], ['', ''], 120], [['Su', 'Water'], ['', ''], 70],
    ] },
    { tr: 'Ekstralar', en: 'Extras', items: [ [['Vegan süt', 'Plant milk'], ['Her içeceğe eklenebilir', 'Add to any drink'], 60] ] },
  ] },
};

function venueMenu(v) {
  const real = VENUE_MENUS[v.id];
  if (!real) return demoMenu(v);
  return real.sections.map(sec => ({
    title: LANG === 'tr' ? sec.tr : sec.en, real: true,
    items: sec.items.map(([names, desc, price, iced]) => ({
      name: LANG === 'tr' ? names[0] : names[1], desc: LANG === 'tr' ? desc[0] : desc[1], price, iced: iced || null,
    })),
  }));
}
// Demo menu by venue type (made-up items and prices).
function demoMenu(v) {
  // A per-venue factor (±12%) and price endings in 10 TL steps keep menus distinct but plausible.
  const seed = [...v.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const factor = 0.88 + (seed % 25) / 100;
  return (MENU_BY_TYPE[v.type] || MENU_BY_TYPE.Bar).map(key => {
    const sec = MENU_SECTIONS[key];
    return {
      title: LANG === 'tr' ? sec.tr : sec.en,
      items: sec.items.map(([names, desc, price], i) => ({
        name: LANG === 'tr' ? names[0] : names[1],
        desc: LANG === 'tr' ? desc[0] : desc[1],
        price: Math.round(price * factor * (1 + (((seed >> (i % 16)) & 7) - 3) / 100) / 10) * 10,
      })),
    };
  });
}
