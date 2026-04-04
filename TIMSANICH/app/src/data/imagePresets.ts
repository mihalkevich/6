import { ImagePreset, ImagePrompt } from '../types/imagePresets';

// =============================================================================
// Preset 1: Magic Princess
// =============================================================================

const princessPrompts: ImagePrompt[] = [
  {
    id: 'princess_1',
    prompt: 'A little girl wearing a sparkling pink princess gown standing at the grand entrance of a fairy-tale castle, golden crown on her head, soft sunset light',
    promptRu: 'Маленькая девочка в сверкающем розовом платье принцессы стоит у парадного входа в сказочный замок, золотая корона на голове, мягкий закатный свет',
    styleTags: ['fantasy', 'princess', 'castle', 'golden_hour'],
    poseHint: 'Standing tall with one hand gently touching the crown',
    poseHintRu: 'Стоит прямо, одной рукой нежно касаясь короны',
    order: 1,
  },
  {
    id: 'princess_2',
    prompt: 'A young princess sitting on a velvet throne in a grand ballroom, crystal chandelier above, rose petals scattered on the marble floor',
    promptRu: 'Юная принцесса сидит на бархатном троне в парадном бальном зале, хрустальная люстра наверху, лепестки роз рассыпаны по мраморному полу',
    styleTags: ['royal', 'ballroom', 'elegant', 'chandelier'],
    poseHint: 'Sitting gracefully with hands folded in lap',
    poseHintRu: 'Сидит грациозно, сложив руки на коленях',
    order: 2,
  },
  {
    id: 'princess_3',
    prompt: 'A princess twirling in a glittering ball gown in a moonlit castle garden, fireflies glowing around her, tiara sparkling',
    promptRu: 'Принцесса кружится в сверкающем бальном платье в залитом лунным светом замковом саду, светлячки мерцают вокруг неё, тиара сверкает',
    styleTags: ['dance', 'moonlight', 'garden', 'magical'],
    poseHint: 'Mid-twirl with dress flowing outward',
    poseHintRu: 'В кружении, платье развевается',
    order: 3,
  },
  {
    id: 'princess_4',
    prompt: 'A little princess reading a golden storybook in a tower room with arched windows overlooking a kingdom, plush cushions everywhere',
    promptRu: 'Маленькая принцесса читает золотую книгу сказок в башенной комнате с арочными окнами с видом на королевство, повсюду мягкие подушки',
    styleTags: ['cozy', 'tower', 'storybook', 'kingdom_view'],
    poseHint: 'Sitting cross-legged with the book open on her lap',
    poseHintRu: 'Сидит по-турецки с открытой книгой на коленях',
    order: 4,
  },
  {
    id: 'princess_5',
    prompt: 'A princess waving from a decorated royal carriage pulled by white horses, confetti in the air, cheering crowd in the background',
    promptRu: 'Принцесса машет рукой из украшенной королевской кареты, запряжённой белыми лошадьми, конфетти в воздухе, ликующая толпа на заднем плане',
    styleTags: ['parade', 'carriage', 'celebration', 'royal'],
    poseHint: 'Waving gracefully with a big smile',
    poseHintRu: 'Грациозно машет рукой с широкой улыбкой',
    order: 5,
  },
  {
    id: 'princess_6',
    prompt: 'A young princess having a tea party with stuffed animal friends on a castle balcony, tiny porcelain cups, flower garlands draped around',
    promptRu: 'Юная принцесса устраивает чаепитие с плюшевыми друзьями-зверятами на балконе замка, крошечные фарфоровые чашечки, цветочные гирлянды вокруг',
    styleTags: ['tea_party', 'balcony', 'cute', 'whimsical'],
    poseHint: 'Lifting a tiny cup as if making a toast',
    poseHintRu: 'Поднимает крошечную чашечку, будто произнося тост',
    order: 6,
  },
  {
    id: 'princess_7',
    prompt: 'A princess standing before a magic mirror in a jewel-encrusted frame, her reflection wearing a different colored gown, sparkles emanating from the glass',
    promptRu: 'Принцесса стоит перед волшебным зеркалом в украшенной драгоценностями раме, её отражение в платье другого цвета, искры исходят от стекла',
    styleTags: ['magic', 'mirror', 'sparkle', 'mysterious'],
    poseHint: 'One hand reaching toward the mirror surface',
    poseHintRu: 'Одна рука тянется к поверхности зеркала',
    order: 7,
  },
  {
    id: 'princess_8',
    prompt: 'A princess dancing with a friendly dragon in a castle courtyard under a sky full of stars, dragon breathing gentle golden sparks',
    promptRu: 'Принцесса танцует с дружелюбным драконом во дворе замка под небом, полным звёзд, дракон выдыхает нежные золотые искры',
    styleTags: ['dragon', 'dance', 'starry_night', 'fantasy'],
    poseHint: 'Dancing hand-in-hand with the dragon, laughing',
    poseHintRu: 'Танцует, держа дракона за лапу, смеётся',
    order: 8,
  },
];

const magicPrincessPreset: ImagePreset = {
  id: 'magic_princess',
  name: 'Magic Princess',
  nameRu: 'Волшебная принцесса',
  description: 'A royal photo session in a fairy-tale castle with crowns, gowns, and magical moments',
  descriptionRu: 'Королевская фотосессия в сказочном замке с коронами, платьями и волшебными моментами',
  category: 'princess',
  emoji: '👸',
  accentColor: '#FF69B4',
  author: 'NanaBanana',
  difficulty: 'easy',
  photoCount: 8,
  prompts: princessPrompts,
  isPremium: false,
  tags: ['princess', 'castle', 'crown', 'royal', 'fairy-tale', 'gown', 'magic'],
  ageMin: 3,
  ageMax: 8,
};

// =============================================================================
// Preset 2: Flower Fairy
// =============================================================================

const flowerFairyPrompts: ImagePrompt[] = [
  {
    id: 'fairy_1',
    prompt: 'A little girl with translucent butterfly wings standing in a sunlit meadow full of wildflowers, pollen dust sparkling in the air',
    promptRu: 'Маленькая девочка с прозрачными крылышками бабочки стоит на солнечном лугу, полном полевых цветов, пыльца сверкает в воздухе',
    styleTags: ['fairy', 'meadow', 'wildflowers', 'sunlight'],
    poseHint: 'Standing with arms slightly open, palms up, catching pollen',
    poseHintRu: 'Стоит с слегка разведёнными руками, ладонями вверх, ловит пыльцу',
    order: 1,
  },
  {
    id: 'fairy_2',
    prompt: 'A flower fairy sleeping inside a giant rose bloom, soft morning dew on the petals, tiny ladybugs nearby',
    promptRu: 'Цветочная фея спит внутри гигантского бутона розы, мягкая утренняя роса на лепестках, крошечные божьи коровки рядом',
    styleTags: ['sleeping', 'rose', 'dew', 'miniature'],
    poseHint: 'Curled up peacefully inside the flower',
    poseHintRu: 'Свернувшись калачиком мирно внутри цветка',
    order: 2,
  },
  {
    id: 'fairy_3',
    prompt: 'A fairy girl flying above a colorful tulip garden, iridescent wings catching rainbow light, trailing sparkle dust behind her',
    promptRu: 'Девочка-фея летит над разноцветным садом тюльпанов, радужные крылья ловят свет, за ней вьётся блестящая пыльца',
    styleTags: ['flying', 'tulips', 'rainbow', 'sparkle'],
    poseHint: 'Arms stretched forward in graceful flight',
    poseHintRu: 'Руки вытянуты вперёд в грациозном полёте',
    order: 3,
  },
  {
    id: 'fairy_4',
    prompt: 'A little fairy sitting on a mushroom cap in an enchanted garden, painting flowers with a tiny magic wand that leaves trails of color',
    promptRu: 'Маленькая фея сидит на шляпке гриба в волшебном саду, раскрашивает цветы крошечной волшебной палочкой, оставляющей следы цвета',
    styleTags: ['mushroom', 'magic_wand', 'painting', 'enchanted'],
    poseHint: 'Sitting on the mushroom, leaning forward with the wand',
    poseHintRu: 'Сидит на грибе, наклонившись вперёд с палочкой',
    order: 4,
  },
  {
    id: 'fairy_5',
    prompt: 'A fairy girl weaving a flower crown from daisies and lavender while sitting beside a babbling brook, dragonflies hovering nearby',
    promptRu: 'Девочка-фея плетёт цветочный венок из ромашек и лаванды, сидя у журчащего ручья, стрекозы парят рядом',
    styleTags: ['flower_crown', 'brook', 'crafting', 'peaceful'],
    poseHint: 'Sitting with legs to one side, fingers delicately weaving flowers',
    poseHintRu: 'Сидит, ножки в сторону, пальцы нежно плетут цветы',
    order: 5,
  },
  {
    id: 'fairy_6',
    prompt: 'A fairy dancing with bumblebees in a sunflower field, wearing a dress made of petals, golden afternoon light',
    promptRu: 'Фея танцует с шмелями на подсолнечном поле, в платье из лепестков, золотой послеобеденный свет',
    styleTags: ['dance', 'bumblebees', 'sunflowers', 'petal_dress'],
    poseHint: 'Spinning with arms out, bees circling playfully',
    poseHintRu: 'Кружится с раскинутыми руками, шмели весело кружат вокруг',
    order: 6,
  },
  {
    id: 'fairy_7',
    prompt: 'A fairy girl holding a glowing lantern in a garden at twilight, fireflies gathering around her, tiny fairy houses visible among the flowers',
    promptRu: 'Девочка-фея держит светящийся фонарик в саду в сумерках, светлячки собираются вокруг неё, среди цветов видны крошечные домики фей',
    styleTags: ['twilight', 'lantern', 'fireflies', 'fairy_houses'],
    poseHint: 'Holding lantern at chest height, looking down at the fairy village',
    poseHintRu: 'Держит фонарик на уровне груди, смотрит вниз на деревню фей',
    order: 7,
  },
];

const flowerFairyPreset: ImagePreset = {
  id: 'flower_fairy',
  name: 'Flower Fairy',
  nameRu: 'Цветочная фея',
  description: 'A magical garden adventure with butterfly wings, enchanted flowers, and fairy dust',
  descriptionRu: 'Волшебное приключение в саду с крылышками бабочки, заколдованными цветами и пыльцой фей',
  category: 'fairy_tale',
  emoji: '🧚',
  accentColor: '#7BC67E',
  author: 'NanaBanana',
  difficulty: 'easy',
  photoCount: 7,
  prompts: flowerFairyPrompts,
  isPremium: false,
  tags: ['fairy', 'flowers', 'wings', 'garden', 'nature', 'magical', 'butterflies'],
  ageMin: 3,
  ageMax: 8,
};

// =============================================================================
// Preset 3: Underwater Kingdom
// =============================================================================

const underwaterPrompts: ImagePrompt[] = [
  {
    id: 'underwater_1',
    prompt: 'A little mermaid girl sitting on a giant seashell throne in an underwater palace, colorful coral pillars, bioluminescent fish swimming around',
    promptRu: 'Маленькая девочка-русалка сидит на троне из гигантской ракушки в подводном дворце, разноцветные коралловые колонны, биолюминесцентные рыбки плавают вокруг',
    styleTags: ['mermaid', 'seashell', 'palace', 'bioluminescent'],
    poseHint: 'Seated regally on the shell with tail draped elegantly',
    poseHintRu: 'Сидит величественно на ракушке, хвост элегантно свисает',
    order: 1,
  },
  {
    id: 'underwater_2',
    prompt: 'A mermaid girl swimming through a coral reef archway surrounded by tropical fish, sunlight filtering through the water surface above',
    promptRu: 'Девочка-русалка проплывает через арку кораллового рифа, окружённая тропическими рыбками, солнечный свет проникает сквозь поверхность воды сверху',
    styleTags: ['swimming', 'coral_reef', 'tropical_fish', 'sunrays'],
    poseHint: 'Arms forward in a graceful swimming pose',
    poseHintRu: 'Руки вперёд в грациозной позе плавания',
    order: 2,
  },
  {
    id: 'underwater_3',
    prompt: 'A young mermaid playing with a friendly dolphin near a sunken treasure chest overflowing with pearls and gems, kelp forest in the background',
    promptRu: 'Юная русалка играет с дружелюбным дельфином рядом с затонувшим сундуком сокровищ, полным жемчуга и драгоценностей, лес ламинарий на заднем плане',
    styleTags: ['dolphin', 'treasure', 'pearls', 'kelp_forest'],
    poseHint: 'Hugging the dolphin, both looking at the camera',
    poseHintRu: 'Обнимает дельфина, оба смотрят в камеру',
    order: 3,
  },
  {
    id: 'underwater_4',
    prompt: 'A mermaid girl brushing her hair with a pearl comb while sitting on a rock near a glowing underwater volcano, warm orange and blue tones',
    promptRu: 'Девочка-русалка расчёсывает волосы жемчужным гребнем, сидя на скале рядом со светящимся подводным вулканом, тёплые оранжево-голубые тона',
    styleTags: ['grooming', 'volcano', 'warm_tones', 'rock'],
    poseHint: 'Sitting sideways, combing long flowing hair',
    poseHintRu: 'Сидит боком, расчёсывая длинные развевающиеся волосы',
    order: 4,
  },
  {
    id: 'underwater_5',
    prompt: 'A little mermaid hosting a concert for sea creatures, singing into a spiral shell microphone, seahorses and starfish as the audience',
    promptRu: 'Маленькая русалка даёт концерт для морских обитателей, поёт в спиральную ракушку-микрофон, морские коньки и морские звёзды в качестве зрителей',
    styleTags: ['singing', 'concert', 'sea_creatures', 'shell'],
    poseHint: 'Holding shell near mouth, mouth open in song',
    poseHintRu: 'Держит ракушку у рта, рот открыт в пении',
    order: 5,
  },
  {
    id: 'underwater_6',
    prompt: 'A mermaid girl riding a giant sea turtle through an underwater garden of sea anemones and glowing jellyfish, peaceful and serene',
    promptRu: 'Девочка-русалка катается на гигантской морской черепахе через подводный сад актиний и светящихся медуз, спокойно и безмятежно',
    styleTags: ['sea_turtle', 'jellyfish', 'anemone', 'serene'],
    poseHint: 'Lying on the turtle shell, chin on hands, looking ahead',
    poseHintRu: 'Лежит на панцире черепахи, подбородок на руках, смотрит вперёд',
    order: 6,
  },
  {
    id: 'underwater_7',
    prompt: 'A mermaid collecting glowing pearls from giant oysters in a deep sea cave, walls covered in sparkling crystals, mysterious blue light',
    promptRu: 'Русалка собирает светящийся жемчуг из гигантских устриц в глубоководной пещере, стены покрыты сверкающими кристаллами, таинственный голубой свет',
    styleTags: ['cave', 'pearls', 'crystals', 'mysterious'],
    poseHint: 'Reaching into an oyster with wonder on her face',
    poseHintRu: 'Тянется к устрице с восхищением на лице',
    order: 7,
  },
  {
    id: 'underwater_8',
    prompt: 'A mermaid princess with a crown of coral and pearls waving to an underwater parade of whales, manta rays, and schools of rainbow fish',
    promptRu: 'Принцесса-русалка с короной из коралла и жемчуга машет подводному параду китов, мант и стай радужных рыбок',
    styleTags: ['parade', 'whales', 'crown', 'celebration'],
    poseHint: 'Floating upright, waving with a joyful expression',
    poseHintRu: 'Парит вертикально, машет с радостным выражением',
    order: 8,
  },
];

const underwaterKingdomPreset: ImagePreset = {
  id: 'underwater_kingdom',
  name: 'Underwater Kingdom',
  nameRu: 'Подводное царство',
  description: 'Dive into an ocean adventure with mermaids, dolphins, and sparkling coral reefs',
  descriptionRu: 'Погрузитесь в океанское приключение с русалками, дельфинами и сверкающими коралловыми рифами',
  category: 'underwater',
  emoji: '🧜‍♀️',
  accentColor: '#4FC3F7',
  author: 'NanaBanana',
  difficulty: 'medium',
  photoCount: 8,
  prompts: underwaterPrompts,
  isPremium: false,
  tags: ['mermaid', 'ocean', 'coral', 'fish', 'underwater', 'sea', 'dolphins'],
  ageMin: 3,
  ageMax: 8,
};

// =============================================================================
// Preset 4: Space Traveler
// =============================================================================

const spaceTravelerPrompts: ImagePrompt[] = [
  {
    id: 'space_1',
    prompt: 'A little girl astronaut floating in zero gravity inside a colorful spaceship, stars visible through the round window, stuffed animals floating around her',
    promptRu: 'Маленькая девочка-космонавт парит в невесомости внутри разноцветного космического корабля, звёзды видны через круглый иллюминатор, плюшевые игрушки парят вокруг неё',
    styleTags: ['astronaut', 'spaceship', 'zero_gravity', 'stars'],
    poseHint: 'Floating with arms spread, hair flowing upward in zero gravity',
    poseHintRu: 'Парит с раскинутыми руками, волосы поднимаются вверх в невесомости',
    order: 1,
  },
  {
    id: 'space_2',
    prompt: 'A girl in a sparkly space suit planting a glowing flower on the surface of the moon, Earth visible in the background, cosmic dust swirling',
    promptRu: 'Девочка в блестящем космическом костюме сажает светящийся цветок на поверхности Луны, Земля видна на заднем плане, космическая пыль кружится',
    styleTags: ['moon', 'planting', 'earth_view', 'cosmic'],
    poseHint: 'Kneeling on the moon surface, gently placing the flower',
    poseHintRu: 'На коленях на поверхности Луны, нежно сажает цветок',
    order: 2,
  },
  {
    id: 'space_3',
    prompt: 'A young space explorer riding a shooting star through a nebula of purple and blue clouds, trail of stardust behind her, galaxies in the distance',
    promptRu: 'Юная космическая путешественница мчится на падающей звезде через туманность из фиолетовых и голубых облаков, след звёздной пыли за ней, галактики вдали',
    styleTags: ['shooting_star', 'nebula', 'stardust', 'galaxies'],
    poseHint: 'Sitting on the star with arms raised in excitement',
    poseHintRu: 'Сидит на звезде с поднятыми руками от восторга',
    order: 3,
  },
  {
    id: 'space_4',
    prompt: 'A girl astronaut having a picnic on the rings of Saturn, colorful blanket spread on the icy ring, thermos of hot cocoa, planet looming beautifully behind',
    promptRu: 'Девочка-космонавт устраивает пикник на кольцах Сатурна, разноцветное одеяло на ледяном кольце, термос с горячим какао, планета величественно возвышается позади',
    styleTags: ['saturn', 'picnic', 'rings', 'whimsical'],
    poseHint: 'Sitting cross-legged on the blanket, holding a cup',
    poseHintRu: 'Сидит по-турецки на одеяле, держит чашку',
    order: 4,
  },
  {
    id: 'space_5',
    prompt: 'A little space traveler meeting friendly alien creatures on a planet with pink grass and two suns, alien flowers blooming, warm welcoming scene',
    promptRu: 'Маленькая космическая путешественница встречает дружелюбных инопланетных существ на планете с розовой травой и двумя солнцами, инопланетные цветы цветут, тёплая приветливая сцена',
    styleTags: ['aliens', 'alien_planet', 'friendly', 'two_suns'],
    poseHint: 'Shaking hands with a cute alien, both smiling',
    poseHintRu: 'Пожимает руку милому инопланетянину, оба улыбаются',
    order: 5,
  },
  {
    id: 'space_6',
    prompt: 'A girl space captain standing on the bridge of her starship, holographic star map glowing before her, constellation patterns on the ceiling, confident pose',
    promptRu: 'Девочка-капитан стоит на мостике своего звездолёта, голографическая карта звёзд светится перед ней, узоры созвездий на потолке, уверенная поза',
    styleTags: ['captain', 'starship', 'hologram', 'bridge'],
    poseHint: 'Standing with hands on hips, looking at the star map',
    poseHintRu: 'Стоит руки в боки, смотрит на карту звёзд',
    order: 6,
  },
];

const spaceTravelerPreset: ImagePreset = {
  id: 'space_traveler',
  name: 'Space Traveler',
  nameRu: 'Космическая путешественница',
  description: 'Blast off into space with stars, planets, and cosmic adventures beyond imagination',
  descriptionRu: 'Отправляйтесь в космос со звёздами, планетами и космическими приключениями за пределами воображения',
  category: 'space',
  emoji: '🚀',
  accentColor: '#AB47BC',
  author: 'NanaBanana',
  difficulty: 'creative',
  photoCount: 6,
  prompts: spaceTravelerPrompts,
  isPremium: true,
  tags: ['space', 'stars', 'planets', 'astronaut', 'cosmic', 'galaxy', 'moon'],
  ageMin: 3,
  ageMax: 8,
};

// =============================================================================
// Preset 5: Forest Tale
// =============================================================================

const forestTalePrompts: ImagePrompt[] = [
  {
    id: 'forest_1',
    prompt: 'A little girl in a woodland dress sitting under a giant ancient oak tree, friendly squirrels and rabbits gathered around her, dappled sunlight',
    promptRu: 'Маленькая девочка в лесном платье сидит под гигантским старинным дубом, дружелюбные белки и кролики собрались вокруг неё, пятнистый солнечный свет',
    styleTags: ['oak_tree', 'woodland', 'squirrels', 'dappled_light'],
    poseHint: 'Sitting at the base of the tree, a rabbit on her lap',
    poseHintRu: 'Сидит у подножия дерева, кролик на коленях',
    order: 1,
  },
  {
    id: 'forest_2',
    prompt: 'A girl discovering a tiny door at the base of a mossy tree trunk in an enchanted forest, glowing warm light spilling from inside, mushrooms lining the path',
    promptRu: 'Девочка обнаруживает крошечную дверь у основания поросшего мхом ствола дерева в заколдованном лесу, тёплый свет льётся изнутри, грибы вдоль тропинки',
    styleTags: ['discovery', 'fairy_door', 'mossy', 'enchanted'],
    poseHint: 'Kneeling down, peeking at the tiny door with wonder',
    poseHintRu: 'На коленях, с восхищением заглядывает в крошечную дверь',
    order: 2,
  },
  {
    id: 'forest_3',
    prompt: 'A woodland girl walking across a natural bridge made of a fallen log over a sparkling forest stream, wild berries and ferns on both sides',
    promptRu: 'Лесная девочка идёт по природному мостику из упавшего бревна через сверкающий лесной ручей, дикие ягоды и папоротники по обоим берегам',
    styleTags: ['bridge', 'stream', 'berries', 'ferns'],
    poseHint: 'Walking with arms out for balance, looking down at the water',
    poseHintRu: 'Идёт с руками в стороны для баланса, смотрит вниз на воду',
    order: 3,
  },
  {
    id: 'forest_4',
    prompt: 'A girl befriending a baby deer in a sunlit forest clearing, wildflowers blooming everywhere, butterflies in the air, soft warm atmosphere',
    promptRu: 'Девочка подружилась с оленёнком на солнечной лесной поляне, повсюду цветут полевые цветы, бабочки в воздухе, мягкая тёплая атмосфера',
    styleTags: ['deer', 'clearing', 'wildflowers', 'butterflies'],
    poseHint: 'Gently petting the baby deer, both looking at each other',
    poseHintRu: 'Нежно гладит оленёнка, оба смотрят друг на друга',
    order: 4,
  },
  {
    id: 'forest_5',
    prompt: 'A little girl sitting in a circle of colorful toadstools reading a map drawn on birch bark, a wise old owl perched on a branch above watching',
    promptRu: 'Маленькая девочка сидит в кругу разноцветных мухоморов, читая карту на бересте, мудрая старая сова сидит на ветке наверху и наблюдает',
    styleTags: ['toadstools', 'map', 'owl', 'birch'],
    poseHint: 'Cross-legged inside the mushroom circle, studying the map',
    poseHintRu: 'По-турецки внутри круга грибов, изучает карту',
    order: 5,
  },
  {
    id: 'forest_6',
    prompt: 'A forest girl building a tiny house from twigs and leaves for woodland fairies, miniature furniture visible inside, moss carpet on the floor',
    promptRu: 'Лесная девочка строит крошечный домик из веточек и листьев для лесных фей, внутри видна миниатюрная мебель, ковёр из мха на полу',
    styleTags: ['crafting', 'fairy_house', 'twigs', 'miniature'],
    poseHint: 'On her knees, carefully placing a tiny leaf roof',
    poseHintRu: 'На коленях, аккуратно устанавливает крошечную крышу из листка',
    order: 6,
  },
  {
    id: 'forest_7',
    prompt: 'A girl swinging on a vine over a carpet of autumn leaves, red and gold forest canopy above, a hedgehog watching from below with acorns',
    promptRu: 'Девочка качается на лиане над ковром осенних листьев, красно-золотой полог леса наверху, ёжик наблюдает снизу с жёлудями',
    styleTags: ['swinging', 'autumn', 'hedgehog', 'vine'],
    poseHint: 'Mid-swing, hair and dress flowing, laughing',
    poseHintRu: 'В полёте на качелях, волосы и платье развеваются, смеётся',
    order: 7,
  },
  {
    id: 'forest_8',
    prompt: 'A little girl following a trail of glowing mushrooms deeper into a magical twilight forest, fireflies lighting the way, ancient tree faces watching kindly',
    promptRu: 'Маленькая девочка идёт по тропинке из светящихся грибов вглубь волшебного сумеречного леса, светлячки освещают путь, древние лица на деревьях добро наблюдают',
    styleTags: ['glowing_mushrooms', 'twilight', 'fireflies', 'tree_faces'],
    poseHint: 'Walking forward with curiosity, one hand reaching toward a glowing mushroom',
    poseHintRu: 'Идёт вперёд с любопытством, одна рука тянется к светящемуся грибу',
    order: 8,
  },
  {
    id: 'forest_9',
    prompt: 'A girl playing a wooden flute on a tree stump stage, forest animals gathered as audience in a moonlit glade, stars twinkling through the branches',
    promptRu: 'Девочка играет на деревянной флейте на сцене из пня, лесные животные собрались в качестве зрителей на залитой лунным светом поляне, звёзды мерцают сквозь ветви',
    styleTags: ['music', 'flute', 'moonlit', 'animal_audience'],
    poseHint: 'Standing on the stump, playing flute with eyes closed',
    poseHintRu: 'Стоит на пне, играет на флейте с закрытыми глазами',
    order: 9,
  },
];

const forestTalePreset: ImagePreset = {
  id: 'forest_tale',
  name: 'Forest Tale',
  nameRu: 'Лесная сказка',
  description: 'An enchanted forest adventure with friendly animals, magical mushrooms, and ancient trees',
  descriptionRu: 'Волшебное лесное приключение с дружелюбными животными, магическими грибами и древними деревьями',
  category: 'nature',
  emoji: '🌲',
  accentColor: '#8D6E63',
  author: 'NanaBanana',
  difficulty: 'medium',
  photoCount: 9,
  prompts: forestTalePrompts,
  isPremium: true,
  tags: ['forest', 'animals', 'mushrooms', 'enchanted', 'woodland', 'nature', 'fairy-tale'],
  ageMin: 3,
  ageMax: 8,
};

// =============================================================================
// Preset 6: Fashion Show
// =============================================================================

const fashionShowPrompts: ImagePrompt[] = [
  {
    id: 'fashion_1',
    prompt: 'A little girl strutting down a sparkly pink runway in a tutu and tiara, spotlights beaming, confetti falling, audience silhouettes in the background',
    promptRu: 'Маленькая девочка шагает по сверкающему розовому подиуму в пачке и тиаре, прожекторы светят, конфетти падает, силуэты зрителей на заднем плане',
    styleTags: ['runway', 'tutu', 'spotlights', 'confetti'],
    poseHint: 'Walking confidently with one hand on hip',
    poseHintRu: 'Идёт уверенно, одна рука на бедре',
    order: 1,
  },
  {
    id: 'fashion_2',
    prompt: 'A young fashionista posing in front of a vintage full-length mirror wearing an oversized sun hat and colorful summer dress, flower bouquet in hand',
    promptRu: 'Юная модница позирует перед винтажным зеркалом в полный рост в огромной шляпе от солнца и разноцветном летнем платье, букет цветов в руке',
    styleTags: ['mirror', 'sun_hat', 'summer_dress', 'vintage'],
    poseHint: 'Turning slightly to see her reflection, bouquet held up',
    poseHintRu: 'Слегка поворачивается к отражению, букет поднят',
    order: 2,
  },
  {
    id: 'fashion_3',
    prompt: 'A girl designer sketching a dress on a large easel in a bright fashion studio, fabric swatches pinned to the wall, colorful threads and ribbons everywhere',
    promptRu: 'Девочка-дизайнер рисует платье на большом мольберте в светлой модной студии, образцы тканей на стене, разноцветные нитки и ленты повсюду',
    styleTags: ['designer', 'studio', 'sketching', 'creative'],
    poseHint: 'Standing at the easel with pencil in hand, concentrated expression',
    poseHintRu: 'Стоит у мольберта с карандашом, сосредоточенное выражение',
    order: 3,
  },
  {
    id: 'fashion_4',
    prompt: 'A little girl trying on sparkly shoes in a magical shoe closet with shelves reaching the ceiling, each pair more fantastical than the last, fairy lights twinkling',
    promptRu: 'Маленькая девочка примеряет блестящие туфельки в волшебном обувном шкафу с полками до потолка, каждая пара фантастичнее предыдущей, гирлянды мерцают',
    styleTags: ['shoes', 'closet', 'sparkly', 'fairy_lights'],
    poseHint: 'Sitting on a stool, one foot out trying a glass slipper',
    poseHintRu: 'Сидит на стульчике, одна ножка вытянута, примеряет хрустальную туфельку',
    order: 4,
  },
  {
    id: 'fashion_5',
    prompt: 'A girl posing on a red carpet at a movie premiere, wearing a glamorous evening gown with sequins, camera flashes all around, velvet rope barriers',
    promptRu: 'Девочка позирует на красной дорожке на кинопремьере в гламурном вечернем платье с пайетками, вспышки камер повсюду, бархатные ограждения',
    styleTags: ['red_carpet', 'premiere', 'glamour', 'sequins'],
    poseHint: 'Classic red carpet pose with slight turn and smile',
    poseHintRu: 'Классическая поза на красной дорожке с лёгким поворотом и улыбкой',
    order: 5,
  },
  {
    id: 'fashion_6',
    prompt: 'A young model in a raincoat and rain boots jumping in a puddle during a fashion photoshoot in the city, colorful umbrellas in the background, joyful splash',
    promptRu: 'Юная модель в дождевике и резиновых сапожках прыгает в лужу во время модной фотосессии в городе, разноцветные зонтики на фоне, радостный всплеск',
    styleTags: ['rain', 'puddle', 'raincoat', 'urban'],
    poseHint: 'Mid-jump into the puddle with big splash, arms up',
    poseHintRu: 'В прыжке в лужу с большим всплеском, руки вверх',
    order: 6,
  },
  {
    id: 'fashion_7',
    prompt: 'A girl wearing a flower crown and bohemian dress twirling in a lavender field, golden hour sunlight, flowing fabric catching the wind',
    promptRu: 'Девочка в цветочном венке и платье в стиле бохо кружится на лавандовом поле, солнечный свет золотого часа, развевающаяся ткань ловит ветер',
    styleTags: ['boho', 'lavender', 'golden_hour', 'flower_crown'],
    poseHint: 'Twirling with arms out, dress and hair flowing',
    poseHintRu: 'Кружится с раскинутыми руками, платье и волосы развеваются',
    order: 7,
  },
  {
    id: 'fashion_8',
    prompt: 'A little fashion editor sitting at a tiny desk covered in fashion magazines, big round glasses, pencil behind ear, miniature coffee cup, serious creative expression',
    promptRu: 'Маленький модный редактор сидит за крошечным столиком, заваленным модными журналами, большие круглые очки, карандаш за ухом, миниатюрная чашка кофе, серьёзное творческое выражение',
    styleTags: ['editor', 'magazines', 'glasses', 'desk'],
    poseHint: 'Chin resting on hand, studying a magazine spread',
    poseHintRu: 'Подбородок на руке, изучает разворот журнала',
    order: 8,
  },
  {
    id: 'fashion_9',
    prompt: 'A girl backstage at a fashion show getting her hair styled, surrounded by makeup palettes and brushes, mirror with light bulbs, excited anticipation',
    promptRu: 'Девочка за кулисами модного показа, ей делают причёску, вокруг палитры для макияжа и кисти, зеркало с лампочками, радостное предвкушение',
    styleTags: ['backstage', 'makeup', 'hairstyle', 'preparation'],
    poseHint: 'Sitting in the makeup chair, looking at herself in the lit mirror',
    poseHintRu: 'Сидит в кресле для макияжа, смотрит на себя в освещённое зеркало',
    order: 9,
  },
  {
    id: 'fashion_10',
    prompt: 'A group finale on the runway with a girl in the center wearing a showstopping rainbow gown, other outfit silhouettes around her, standing ovation moment, dramatic lighting',
    promptRu: 'Групповой финал на подиуме с девочкой в центре в потрясающем радужном платье, силуэты других нарядов вокруг неё, момент стоячей овации, драматическое освещение',
    styleTags: ['finale', 'rainbow', 'ovation', 'dramatic'],
    poseHint: 'Standing center stage, arms slightly open, triumphant smile',
    poseHintRu: 'Стоит в центре сцены, руки слегка разведены, торжествующая улыбка',
    order: 10,
  },
];

const fashionShowPreset: ImagePreset = {
  id: 'fashion_show',
  name: 'Fashion Show',
  nameRu: 'Модный показ',
  description: 'A glamorous fashion adventure with runway walks, designer studios, and fabulous outfits',
  descriptionRu: 'Гламурное модное приключение с подиумными выходами, дизайнерскими студиями и потрясающими нарядами',
  category: 'fashion',
  emoji: '👗',
  accentColor: '#EF5350',
  author: 'NanaBanana',
  difficulty: 'creative',
  photoCount: 10,
  prompts: fashionShowPrompts,
  isPremium: true,
  tags: ['fashion', 'runway', 'outfits', 'glamour', 'designer', 'style', 'modeling'],
  ageMin: 3,
  ageMax: 8,
};

// =============================================================================
// Exports
// =============================================================================

export const IMAGE_PRESETS: ImagePreset[] = [
  magicPrincessPreset,
  flowerFairyPreset,
  underwaterKingdomPreset,
  spaceTravelerPreset,
  forestTalePreset,
  fashionShowPreset,
];

export function getPresetById(id: string): ImagePreset | undefined {
  return IMAGE_PRESETS.find((preset) => preset.id === id);
}

export function getPresetsByCategory(category: string): ImagePreset[] {
  return IMAGE_PRESETS.filter((preset) => preset.category === category);
}

export function getFreePresets(): ImagePreset[] {
  return IMAGE_PRESETS.filter((preset) => !preset.isPremium);
}

export function getPremiumPresets(): ImagePreset[] {
  return IMAGE_PRESETS.filter((preset) => preset.isPremium);
}
