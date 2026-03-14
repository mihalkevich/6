// Package fashion provides a clothing-specific vocabulary dictionary
// for keyword generation, parsing, and classification.
package fashion

import "sync"

// TokenDimension identifies which vocabulary dimension a token belongs to.
type TokenDimension string

const (
	DimCategory TokenDimension = "category"
	DimMaterial TokenDimension = "material"
	DimStyle    TokenDimension = "style"
	DimSeason   TokenDimension = "season"
	DimColor    TokenDimension = "color"
	DimOccasion TokenDimension = "occasion"
	DimGender   TokenDimension = "gender"
	DimLength   TokenDimension = "length"
	DimFit      TokenDimension = "fit"
)

// Dictionary holds every fashion vocabulary dimension.
type Dictionary struct {
	Categories []string
	Materials  []string
	Styles     []string
	Seasons    []string
	Colors     []string
	Occasions  []string
	Genders    []string
	Lengths    []string
	Fits       []string
	Synonyms   map[string][]string

	once     sync.Once
	allTerms map[string]TokenDimension
}

// OccasionPrepositions maps occasion keywords to natural Russian prepositional phrases.
var OccasionPrepositions = map[string]string{
	"офис":      "для офиса",
	"свидание":  "на свидание",
	"прогулка":  "на прогулку",
	"вечеринка": "на вечеринку",
	"свадьба":   "на свадьбу",
	"пляж":      "на пляж",
	"отпуск":    "на отпуск",
	"выпускной": "на выпускной",
	"работа":    "на работу",
}

var defaultDict *Dictionary
var defaultOnce sync.Once

// DefaultDictionary returns the built-in clothing dictionary singleton.
func DefaultDictionary() *Dictionary {
	defaultOnce.Do(func() {
		defaultDict = &Dictionary{
			Categories: []string{
				"платье", "юбка", "брюки", "джинсы", "куртка", "пальто",
				"блузка", "рубашка", "топ", "футболка", "свитер", "кардиган",
				"жилет", "комбинезон", "костюм", "шорты", "леггинсы", "пиджак",
				"тренч", "худи", "толстовка", "боди", "сарафан", "ветровка",
				"плащ", "бомбер", "парка", "пуховик", "водолазка", "лонгслив",
				"туника", "корсет", "жакет", "кроп-топ", "майка",
			},
			Materials: []string{
				"хлопок", "лён", "шёлк", "полиэстер", "вискоза", "шерсть",
				"кашемир", "деним", "экокожа", "замша", "бархат", "атлас",
				"шифон", "трикотаж", "нейлон", "муслин", "твид", "флис",
				"софтшелл", "мембрана", "органза", "кружево", "сатин", "жаккард",
			},
			Styles: []string{
				"повседневный", "деловой", "спортивный", "вечерний", "пляжный",
				"бохо", "минимализм", "классический", "романтический", "гранж",
				"уличный", "streetwear", "casual", "офисный", "нарядный",
				"элегантный", "винтаж", "ретро", "авангард", "милитари",
			},
			Seasons: []string{
				"летний", "летнее", "летняя", "летние",
				"зимний", "зимнее", "зимняя", "зимние",
				"весенний", "весеннее", "весенняя", "весенние",
				"осенний", "осеннее", "осенняя", "осенние",
				"демисезонный", "демисезонное", "демисезонная",
				"утеплённый", "утепленный", "утеплённое", "утепленное",
				"лёгкий", "легкий", "лёгкое", "легкое",
			},
			Colors: []string{
				// Базовые (м/ж/ср формы)
				"чёрный", "чёрное", "чёрная", "черный", "черное", "черная",
				"белый", "белое", "белая",
				"красный", "красное", "красная",
				"синий", "синее", "синяя",
				"зелёный", "зеленый", "зелёное", "зеленое",
				"жёлтый", "желтый", "жёлтое", "желтое",
				"серый", "серое", "серая",
				"розовый", "розовое", "розовая",
				"голубой", "голубое", "голубая",
				"бежевый", "бежевое", "бежевая",
				"коричневый", "коричневое", "коричневая",
				"фиолетовый", "фиолетовое",
				"оранжевый", "оранжевое",
				"бордовый", "бордовое", "бордовая",
				"хаки", "молочный", "молочное", "кремовый", "кремовое",
				// Трендовые
				"терракотовый", "лавандовый", "мятный", "мятное",
				"коралловый", "изумрудный", "изумрудное",
				"горчичный", "горчичное", "пудровый", "пудровое",
				"персиковый", "персиковое", "сиреневый", "сиреневое",
				"бирюзовый", "бирюзовое", "графитовый", "графитовое",
				"индиго", "фуксия", "марсала", "тауп",
				// Принты
				"в цветочек", "в полоску", "в клетку", "в горошек",
				"леопардовый", "камуфляж", "однотонный", "однотонное", "с принтом",
			},
			Occasions: []string{
				"офис", "свидание", "прогулка", "вечеринка", "свадьба",
				"пляж", "отпуск", "выпускной", "работа",
			},
			Genders: []string{
				"женский", "женское", "женская", "женские",
				"мужской", "мужское", "мужская", "мужские",
				"унисекс",
				"детский", "детское", "детская", "детские",
			},
			Lengths: []string{
				"макси", "миди", "мини",
			},
			Fits: []string{
				"оверсайз", "oversize", "приталенный", "приталенное",
				"slim fit", "slim", "свободный", "свободное",
				"plus size", "большой размер", "облегающий", "облегающее",
			},
			Synonyms: map[string][]string{
				"платье":    {"сарафан"},
				"сарафан":   {"платье"},
				"брюки":     {"штаны"},
				"штаны":     {"брюки"},
				"куртка":    {"ветровка", "бомбер"},
				"ветровка":  {"куртка"},
				"бомбер":    {"куртка"},
				"футболка":  {"тишка"},
				"свитер":    {"джемпер", "пуловер"},
				"джемпер":   {"свитер"},
				"пуловер":   {"свитер"},
				"толстовка": {"свитшот"},
				"свитшот":   {"толстовка"},
				"леггинсы":  {"лосины", "тайтсы"},
				"лосины":    {"леггинсы"},
				"тайтсы":    {"леггинсы"},
				"пиджак":    {"жакет", "блейзер"},
				"жакет":     {"пиджак"},
				"блейзер":   {"пиджак"},
				"пальто":    {"шинель"},
				"худи":      {"худ", "кенгуру"},
				"водолазка": {"гольф"},
				"гольф":     {"водолазка"},
				"топ":       {"кроп-топ"},
			},
		}
	})
	return defaultDict
}

// AllTerms returns a flat index mapping every term to its dimension.
// The index is built once and cached for O(1) lookups.
func (d *Dictionary) AllTerms() map[string]TokenDimension {
	d.once.Do(func() {
		d.allTerms = make(map[string]TokenDimension)
		for _, t := range d.Categories {
			d.allTerms[t] = DimCategory
		}
		for _, t := range d.Materials {
			d.allTerms[t] = DimMaterial
		}
		for _, t := range d.Styles {
			d.allTerms[t] = DimStyle
		}
		for _, t := range d.Seasons {
			d.allTerms[t] = DimSeason
		}
		for _, t := range d.Colors {
			d.allTerms[t] = DimColor
		}
		for _, t := range d.Occasions {
			d.allTerms[t] = DimOccasion
		}
		for _, t := range d.Genders {
			d.allTerms[t] = DimGender
		}
		for _, t := range d.Lengths {
			d.allTerms[t] = DimLength
		}
		for _, t := range d.Fits {
			d.allTerms[t] = DimFit
		}
	})
	return d.allTerms
}

// SynonymsFor returns synonyms for a given term, or nil if none exist.
func (d *Dictionary) SynonymsFor(term string) []string {
	return d.Synonyms[term]
}

// LookupToken checks if a word matches any dictionary entry and returns its dimension.
func (d *Dictionary) LookupToken(word string) (TokenDimension, bool) {
	dim, ok := d.AllTerms()[word]
	return dim, ok
}
