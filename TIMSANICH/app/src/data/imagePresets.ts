import type { ImagePreset } from '../types/imagePresets';

const princessPreset: ImagePreset = {
  id: 'princess',
  name: 'Magic Princess',
  nameRu: 'Волшебная принцесса',
  description: 'Royal photo session with crowns, castles and magic',
  descriptionRu: 'Королевская фотосессия с коронами, замками и волшебством',
  category: 'princess',
  emoji: '👸',
  accentColor: '#FF69B4',
  author: 'NanaBanana',
  difficulty: 'easy',
  photoCount: 8,
  isPremium: false,
  tags: ['princess', 'castle', 'crown', 'dress'],
  ageMin: 3,
  ageMax: 8,
  prompts: [
    { id: 'princess_1', prompt: 'A little girl wearing a sparkling diamond tiara and a fluffy pink ball gown, standing in front of a grand castle entrance at golden hour', promptRu: 'Маленькая девочка в сверкающей бриллиантовой тиаре и пышном розовом бальном платье стоит перед входом в величественный замок на закате', styleTags: ['royal', 'golden_hour', 'sparkle', 'pink'], poseHint: 'Standing tall with hands gently holding the dress skirt', poseHintRu: 'Стоит ровно, нежно придерживая юбку платья', order: 1 },
    { id: 'princess_2', prompt: 'A young princess waving a glowing magic wand with golden sparks flying around her in a moonlit garden', promptRu: 'Юная принцесса взмахивает светящейся волшебной палочкой, вокруг неё летят золотые искры в лунном саду', styleTags: ['magic', 'moonlit', 'golden', 'sparkle'], order: 2 },
    { id: 'princess_3', prompt: 'A girl in a silver dress carefully walking up a crystal glass staircase that glows with soft blue light', promptRu: 'Девочка в серебряном платье осторожно поднимается по хрустальной лестнице, которая светится мягким голубым светом', styleTags: ['crystal', 'silver', 'glow', 'elegant'], poseHint: 'One hand on the railing, looking up gracefully', poseHintRu: 'Одна рука на перилах, грациозно смотрит вверх', order: 3 },
    { id: 'princess_4', prompt: 'A little princess sitting on a golden throne surrounded by blooming roses of every color in a secret garden', promptRu: 'Маленькая принцесса сидит на золотом троне в окружении цветущих роз всех цветов в тайном саду', styleTags: ['royal', 'roses', 'garden', 'golden'], order: 4 },
    { id: 'princess_5', prompt: 'A girl stepping into a crystal carriage pulled by white unicorns under a sky full of stars', promptRu: 'Девочка садится в хрустальную карету, запряжённую белыми единорогами под звёздным небом', styleTags: ['fantasy', 'crystal', 'unicorn', 'starry'], poseHint: 'Reaching one hand toward the carriage door', poseHintRu: 'Протягивает руку к дверце кареты', order: 5 },
    { id: 'princess_6', prompt: 'A princess standing on a castle balcony watching shooting stars cross the velvet night sky', promptRu: 'Принцесса стоит на балконе замка и наблюдает за падающими звёздами на бархатном ночном небе', styleTags: ['night', 'starry', 'romantic', 'balcony'], order: 6 },
    { id: 'princess_7', prompt: 'A girl looking into an enchanted mirror that shows her reflection wearing a glowing crown of flowers', promptRu: 'Девочка смотрит в зачарованное зеркало, которое показывает её отражение в светящейся цветочной короне', styleTags: ['magic', 'mirror', 'flowers', 'glow'], poseHint: 'One hand touching the mirror surface', poseHintRu: 'Одна рука касается поверхности зеркала', order: 7 },
    { id: 'princess_8', prompt: 'A princess hosting an elegant tea party with her stuffed animal friends at a table set with golden cups and cupcakes', promptRu: 'Принцесса устраивает изысканное чаепитие с друзьями-мягкими игрушками за столиком с золотыми чашками и капкейками', styleTags: ['tea_party', 'cute', 'golden', 'cozy'], order: 8 },
  ],
};

const flowerFairyPreset: ImagePreset = {
  id: 'flower_fairy',
  name: 'Flower Fairy',
  nameRu: 'Цветочная фея',
  description: 'Enchanted garden sessions with petals, wings and magic flowers',
  descriptionRu: 'Волшебные сессии в саду с лепестками, крыльями и магическими цветами',
  category: 'fairy_tale',
  emoji: '🧚',
  accentColor: '#7BC67E',
  author: 'NanaBanana',
  difficulty: 'easy',
  photoCount: 7,
  isPremium: false,
  tags: ['fairy', 'flowers', 'garden', 'wings'],
  ageMin: 3,
  ageMax: 8,
  prompts: [
    { id: 'fairy_1', prompt: 'A tiny fairy girl with iridescent petal wings standing in a sunrise garden among giant sunflowers', promptRu: 'Маленькая фея с переливающимися крыльями из лепестков стоит в утреннем саду среди гигантских подсолнухов', styleTags: ['sunrise', 'petals', 'wings', 'garden'], poseHint: 'Wings spread wide, arms slightly raised', poseHintRu: 'Крылья широко расправлены, руки слегка подняты', order: 1 },
    { id: 'fairy_2', prompt: 'A fairy sitting on a large leaf covered in sparkling morning dewdrops, combing her hair with a tiny flower comb', promptRu: 'Фея сидит на большом листке, покрытом сверкающими утренними капельками росы, расчёсывая волосы маленьким цветочным гребешком', styleTags: ['morning', 'dewdrop', 'delicate', 'nature'], order: 2 },
    { id: 'fairy_3', prompt: 'A girl blowing on a giant dandelion, its seeds turning into tiny glowing fairies as they float away', promptRu: 'Девочка дует на гигантский одуванчик, его семена превращаются в крошечных светящихся фей, улетая вдаль', styleTags: ['dandelion', 'magical', 'glow', 'whimsical'], poseHint: 'Leaning slightly forward, lips pursed to blow', poseHintRu: 'Слегка наклонилась вперёд, губы сложены, чтобы дуть', order: 3 },
    { id: 'fairy_4', prompt: 'A fairy queen sitting on a throne made of intertwined tulips in a secret meadow with butterflies all around', promptRu: 'Королева фей сидит на троне из переплетённых тюльпанов на тайной полянке, вокруг порхают бабочки', styleTags: ['tulips', 'throne', 'butterflies', 'meadow'], order: 4 },
    { id: 'fairy_5', prompt: 'A girl wearing a crown of living butterflies that gently open and close their wings on her head', promptRu: 'Девочка в короне из живых бабочек, которые нежно раскрывают и закрывают крылышки на её голове', styleTags: ['butterflies', 'crown', 'living', 'gentle'], order: 5 },
    { id: 'fairy_6', prompt: 'A fairy dancing on the surface of a moonlit pond, her feet creating ripples of silver light', promptRu: 'Фея танцует на поверхности лунного пруда, её ножки создают рябь серебристого света', styleTags: ['moonlit', 'pond', 'silver', 'dance'], poseHint: 'One foot pointed on the water, arms in ballet pose', poseHintRu: 'Одна ножка на воде, руки в балетной позе', order: 6 },
    { id: 'fairy_7', prompt: 'A fairy flying through endless fields of lavender at sunset, leaving a trail of sparkling dust behind her', promptRu: 'Фея летит через бескрайние лавандовые поля на закате, оставляя за собой след из сверкающей пыльцы', styleTags: ['lavender', 'sunset', 'flying', 'sparkle'], order: 7 },
  ],
};

const underwaterPreset: ImagePreset = {
  id: 'underwater',
  name: 'Underwater Kingdom',
  nameRu: 'Подводное царство',
  description: 'Dive into the ocean with mermaids, corals and sea creatures',
  descriptionRu: 'Погружение в океан с русалками, кораллами и морскими обитателями',
  category: 'underwater',
  emoji: '🧜‍♀️',
  accentColor: '#4FC3F7',
  author: 'NanaBanana',
  difficulty: 'medium',
  photoCount: 8,
  isPremium: false,
  tags: ['mermaid', 'ocean', 'coral', 'fish'],
  ageMin: 3,
  ageMax: 8,
  prompts: [
    { id: 'underwater_1', prompt: 'A young mermaid with a shimmering turquoise tail resting on a vibrant coral reef surrounded by colorful tropical fish', promptRu: 'Юная русалка с переливающимся бирюзовым хвостом отдыхает на ярком коралловом рифе в окружении разноцветных тропических рыбок', styleTags: ['mermaid', 'coral', 'turquoise', 'tropical'], poseHint: 'Sitting on coral, tail curled elegantly', poseHintRu: 'Сидит на коралле, хвост элегантно изогнут', order: 1 },
    { id: 'underwater_2', prompt: 'A girl discovering an ancient treasure cave filled with glowing pearls and golden coins, light streaming through the water above', promptRu: 'Девочка обнаруживает древнюю пещеру сокровищ, полную светящихся жемчужин и золотых монет, свет проникает сквозь воду сверху', styleTags: ['treasure', 'pearls', 'cave', 'golden'], order: 2 },
    { id: 'underwater_3', prompt: 'A mermaid girl riding on the back of a friendly dolphin through crystal clear blue waters', promptRu: 'Русалочка мчится верхом на дружелюбном дельфине сквозь кристально чистые голубые воды', styleTags: ['dolphin', 'riding', 'blue', 'adventure'], poseHint: 'Arms around the dolphin, hair flowing behind', poseHintRu: 'Обнимает дельфина руками, волосы развеваются', order: 3 },
    { id: 'underwater_4', prompt: 'A girl wearing a magnificent crown made of seashells and starfish, sitting on an underwater rock', promptRu: 'Девочка в великолепной короне из морских раковин и морских звёзд сидит на подводной скале', styleTags: ['crown', 'seashells', 'starfish', 'royal'], order: 4 },
    { id: 'underwater_5', prompt: 'A mermaid swimming among giant bioluminescent jellyfish that glow in purple and blue in the deep ocean', promptRu: 'Русалка плывёт среди гигантских биолюминесцентных медуз, светящихся фиолетовым и голубым в глубинах океана', styleTags: ['jellyfish', 'bioluminescent', 'deep_sea', 'glow'], poseHint: 'Reaching one hand toward a jellyfish', poseHintRu: 'Протягивает руку к медузе', order: 5 },
    { id: 'underwater_6', prompt: 'A girl exploring a sunken ancient palace with marble columns covered in coral and sea anemones', promptRu: 'Девочка исследует затонувший древний дворец с мраморными колоннами, покрытыми кораллами и морскими анемонами', styleTags: ['palace', 'ancient', 'marble', 'exploration'], order: 6 },
    { id: 'underwater_7', prompt: 'A mermaid traveling on the back of a gentle giant sea turtle through a kelp forest', promptRu: 'Русалка путешествует верхом на огромной нежной морской черепахе через лес из ламинарий', styleTags: ['sea_turtle', 'kelp', 'journey', 'gentle'], order: 7 },
    { id: 'underwater_8', prompt: 'A mermaid girl floating at the ocean surface under a full moon, her tail reflecting moonlight like diamonds', promptRu: 'Русалочка плывёт по поверхности океана под полной луной, её хвост отражает лунный свет как бриллианты', styleTags: ['moonlit', 'surface', 'diamonds', 'night'], poseHint: 'Floating on back, face toward the moon', poseHintRu: 'Лежит на спине, лицо обращено к луне', order: 8 },
  ],
};

const spaceGirlPreset: ImagePreset = {
  id: 'space_girl',
  name: 'Space Traveler',
  nameRu: 'Космическая путешественница',
  description: 'Adventures among stars, planets and nebulas',
  descriptionRu: 'Приключения среди звёзд, планет и туманностей',
  category: 'space',
  emoji: '🚀',
  accentColor: '#AB47BC',
  author: 'NanaBanana',
  difficulty: 'creative',
  photoCount: 6,
  isPremium: true,
  tags: ['space', 'stars', 'planets', 'astronaut'],
  ageMin: 4,
  ageMax: 8,
  prompts: [
    { id: 'space_1', prompt: 'A girl in a cute pink spacesuit floating among thousands of twinkling stars, Earth visible in the background', promptRu: 'Девочка в милом розовом скафандре парит среди тысяч мерцающих звёзд, Земля видна на заднем плане', styleTags: ['astronaut', 'stars', 'earth', 'pink'], poseHint: 'Floating freely with arms spread wide', poseHintRu: 'Свободно парит с широко раскинутыми руками', order: 1 },
    { id: 'space_2', prompt: 'A girl walking along the glowing rings of Saturn, leaving footprints of stardust behind her', promptRu: 'Девочка идёт по светящимся кольцам Сатурна, оставляя за собой следы из звёздной пыли', styleTags: ['saturn', 'rings', 'stardust', 'walking'], order: 2 },
    { id: 'space_3', prompt: 'A young astronaut girl painting a colorful nebula with a giant cosmic paintbrush, swirls of purple and gold', promptRu: 'Юная девочка-космонавт рисует разноцветную туманность гигантской космической кистью, завитки фиолетового и золотого', styleTags: ['nebula', 'painting', 'creative', 'colorful'], poseHint: 'Arm extended with brush, painting in mid-air', poseHintRu: 'Рука вытянута с кистью, рисует в воздухе', order: 3 },
    { id: 'space_4', prompt: 'A girl tending a magical garden inside a space station dome, flowers and plants growing in zero gravity', promptRu: 'Девочка ухаживает за волшебным садом внутри купола космической станции, цветы и растения растут в невесомости', styleTags: ['space_station', 'garden', 'zero_gravity', 'botanical'], order: 4 },
    { id: 'space_5', prompt: 'A brave girl surfing on the tail of a bright comet streaking across a galaxy of swirling colors', promptRu: 'Смелая девочка сёрфит на хвосте яркой кометы, летящей через галактику закрученных цветов', styleTags: ['comet', 'surfing', 'galaxy', 'adventure'], order: 5 },
    { id: 'space_6', prompt: 'A girl having a tea party with friendly colorful aliens on a planet with two pink moons', promptRu: 'Девочка устраивает чаепитие с дружелюбными разноцветными инопланетянами на планете с двумя розовыми лунами', styleTags: ['aliens', 'tea_party', 'planet', 'whimsical'], poseHint: 'Sitting cross-legged, holding a space teacup', poseHintRu: 'Сидит скрестив ноги, держит космическую чашку', order: 6 },
  ],
};

const forestTalePreset: ImagePreset = {
  id: 'forest_tale',
  name: 'Forest Tale',
  nameRu: 'Лесная сказка',
  description: 'Magical forest adventures with woodland creatures',
  descriptionRu: 'Волшебные лесные приключения с лесными обитателями',
  category: 'nature',
  emoji: '🌲',
  accentColor: '#8D6E63',
  author: 'NanaBanana',
  difficulty: 'medium',
  photoCount: 9,
  isPremium: true,
  tags: ['forest', 'animals', 'mushrooms', 'nature'],
  ageMin: 3,
  ageMax: 8,
  prompts: [
    { id: 'forest_1', prompt: 'A girl peeking out of a cozy little house built inside a giant red-capped mushroom in a mossy forest', promptRu: 'Девочка выглядывает из уютного домика внутри гигантского гриба с красной шляпкой во мшистом лесу', styleTags: ['mushroom', 'cozy', 'forest', 'fairy_tale'], poseHint: 'Peeking through a round window, smiling', poseHintRu: 'Выглядывает через круглое окошко, улыбаясь', order: 1 },
    { id: 'forest_2', prompt: 'A girl gently petting a baby deer in a sun-dappled forest clearing with wildflowers all around', promptRu: 'Девочка нежно гладит оленёнка на солнечной лесной поляне, усеянной полевыми цветами', styleTags: ['deer', 'gentle', 'sunlight', 'meadow'], order: 2 },
    { id: 'forest_3', prompt: 'A girl holding a jar filled with glowing fireflies, illuminating a dark enchanted forest path', promptRu: 'Девочка держит банку, полную светящихся светлячков, освещающих тёмную тропинку волшебного леса', styleTags: ['fireflies', 'glow', 'night', 'magical'], poseHint: 'Holding jar at chest height, face lit by soft glow', poseHintRu: 'Держит банку на уровне груди, лицо освещено мягким свечением', order: 3 },
    { id: 'forest_4', prompt: 'A girl sitting in a treehouse library high in an ancient oak tree, surrounded by books and hanging lanterns', promptRu: 'Девочка сидит в библиотеке-домике на дереве высоко на старом дубе, окружённая книгами и подвесными фонариками', styleTags: ['treehouse', 'books', 'lanterns', 'cozy'], order: 4 },
    { id: 'forest_5', prompt: 'A girl picking wild berries into a woven basket, surrounded by friendly forest rabbits and squirrels', promptRu: 'Девочка собирает лесные ягоды в плетёную корзинку, вокруг неё дружелюбные зайчики и белочки', styleTags: ['berries', 'basket', 'animals', 'foraging'], poseHint: 'Kneeling, one hand reaching for berries', poseHintRu: 'Стоит на коленях, одна рука тянется к ягодам', order: 5 },
    { id: 'forest_6', prompt: 'A girl wearing a crown woven from autumn leaves, acorns and tiny woodland flowers', promptRu: 'Девочка в короне, сплетённой из осенних листьев, желудей и крошечных лесных цветов', styleTags: ['crown', 'autumn', 'woodland', 'natural'], order: 6 },
    { id: 'forest_7', prompt: 'A girl receiving a tiny scroll message from a wise owl perched on a branch in misty morning light', promptRu: 'Девочка получает крошечное письмо-свиток от мудрой совы, сидящей на ветке в утреннем тумане', styleTags: ['owl', 'message', 'misty', 'morning'], poseHint: 'Hand outstretched, owl landing on wrist', poseHintRu: 'Рука протянута, сова садится на запястье', order: 7 },
    { id: 'forest_8', prompt: 'A girl sheltering under a giant leaf during a gentle rain, watching rainbow droplets fall around her', promptRu: 'Девочка прячется под гигантским листом во время тёплого дождика, наблюдая за радужными каплями вокруг', styleTags: ['rain', 'shelter', 'rainbow', 'cozy'], order: 8 },
    { id: 'forest_9', prompt: 'A girl dancing with swirling autumn leaves in a golden forest, leaves forming magical spiral patterns around her', promptRu: 'Девочка танцует с кружащимися осенними листьями в золотом лесу, листья образуют волшебные спиральные узоры вокруг неё', styleTags: ['autumn', 'dance', 'golden', 'leaves'], poseHint: 'Spinning with arms out, leaves swirling around', poseHintRu: 'Кружится с раскинутыми руками, листья вихрятся вокруг', order: 9 },
  ],
};

const fashionShowPreset: ImagePreset = {
  id: 'fashion_show',
  name: 'Fashion Show',
  nameRu: 'Модный показ',
  description: 'Runway-ready photo sessions with stylish outfits and accessories',
  descriptionRu: 'Фотосессии в стиле подиума с модными нарядами и аксессуарами',
  category: 'fashion',
  emoji: '👗',
  accentColor: '#EF5350',
  author: 'NanaBanana',
  difficulty: 'creative',
  photoCount: 10,
  isPremium: true,
  tags: ['fashion', 'runway', 'style', 'design'],
  ageMin: 5,
  ageMax: 8,
  prompts: [
    { id: 'fashion_1', prompt: 'A confident girl making a grand entrance on a pink glitter runway with spotlights and camera flashes', promptRu: 'Уверенная девочка делает эффектный выход на розовый блестящий подиум в лучах прожекторов и вспышках камер', styleTags: ['runway', 'pink', 'glitter', 'spotlight'], poseHint: 'Walking forward with one hand on hip', poseHintRu: 'Идёт вперёд, одна рука на бедре', order: 1 },
    { id: 'fashion_2', prompt: 'A girl trying on an amazing collection of fancy hats in a vintage boutique with ornate mirrors', promptRu: 'Девочка примеряет потрясающую коллекцию нарядных шляпок в винтажном бутике с витиеватыми зеркалами', styleTags: ['hats', 'vintage', 'boutique', 'mirrors'], order: 2 },
    { id: 'fashion_3', prompt: 'A girl spinning in a dress covered in thousands of tiny sparkles, creating a shower of light around her', promptRu: 'Девочка кружится в платье, покрытом тысячами крошечных блёсток, создавая дождь из света вокруг себя', styleTags: ['sparkle', 'spinning', 'dress', 'light'], poseHint: 'Mid-spin with dress flaring out', poseHintRu: 'В момент кружения, платье расходится веером', order: 3 },
    { id: 'fashion_4', prompt: 'A young designer girl working at a colorful fabric studio, surrounded by ribbons, buttons and sewing machines', promptRu: 'Юная девочка-дизайнер работает в красочной мастерской тканей, окружённая лентами, пуговицами и швейными машинками', styleTags: ['designer', 'studio', 'colorful', 'creative'], order: 4 },
    { id: 'fashion_5', prompt: 'A girl crafting handmade jewelry and accessories at a magical workshop table with glowing gems', promptRu: 'Девочка мастерит украшения и аксессуары ручной работы за волшебным рабочим столом со светящимися камнями', styleTags: ['jewelry', 'workshop', 'handmade', 'gems'], poseHint: 'Focused on crafting, holding tiny tweezers', poseHintRu: 'Сосредоточена на работе, держит маленький пинцет', order: 5 },
    { id: 'fashion_6', prompt: 'A girl posing in a beautiful summer dress in a sunflower garden for a magazine cover photo', promptRu: 'Девочка позирует в красивом летнем платье в подсолнуховом саду для обложки журнала', styleTags: ['summer', 'sunflowers', 'photoshoot', 'magazine'], order: 6 },
    { id: 'fashion_7', prompt: 'A girl modeling a cozy winter collection with a fluffy white coat, sparkly boots and a beret in falling snow', promptRu: 'Девочка демонстрирует уютную зимнюю коллекцию в пушистом белом пальто, блестящих сапожках и берете под падающим снегом', styleTags: ['winter', 'cozy', 'snow', 'boots'], poseHint: 'Catching snowflakes with open palms', poseHintRu: 'Ловит снежинки раскрытыми ладонями', order: 7 },
    { id: 'fashion_8', prompt: 'A girl in a flowing bohemian outfit dancing at a colorful outdoor festival with flower garlands and lanterns', promptRu: 'Девочка в струящемся наряде бохо танцует на красочном уличном фестивале с цветочными гирляндами и фонариками', styleTags: ['bohemian', 'festival', 'dance', 'flowers'], order: 8 },
    { id: 'fashion_9', prompt: 'A girl in a chic yellow raincoat and polka-dot rain boots splashing happily in puddles on a rainy city street', promptRu: 'Девочка в шикарном жёлтом дождевике и резиновых сапожках в горошек весело прыгает по лужам на дождливой городской улице', styleTags: ['rain', 'yellow', 'city', 'playful'], poseHint: 'Mid-jump into a puddle, arms up in joy', poseHintRu: 'В прыжке в лужу, руки подняты от радости', order: 9 },
    { id: 'fashion_10', prompt: 'A girl taking a final bow on a flower-covered runway stage, confetti and petals falling all around her', promptRu: 'Девочка делает финальный поклон на подиуме, украшенном цветами, вокруг летят конфетти и лепестки', styleTags: ['finale', 'bow', 'confetti', 'celebration'], order: 10 },
  ],
};

export const IMAGE_PRESETS: ImagePreset[] = [
  princessPreset,
  flowerFairyPreset,
  underwaterPreset,
  spaceGirlPreset,
  forestTalePreset,
  fashionShowPreset,
];

export function getPresetById(id: string): ImagePreset | undefined {
  return IMAGE_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: string): ImagePreset[] {
  return IMAGE_PRESETS.filter((p) => p.category === category);
}

export function getFreePresets(): ImagePreset[] {
  return IMAGE_PRESETS.filter((p) => !p.isPremium);
}

export function getPremiumPresets(): ImagePreset[] {
  return IMAGE_PRESETS.filter((p) => p.isPremium);
}
