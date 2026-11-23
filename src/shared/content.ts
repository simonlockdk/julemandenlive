/** Fast tekstindhold: julefakta, nissenavne og rensdyrregistret. */

export const NISSE_NAMES = [
  'Pjok', 'Tulle', 'Gnidrik', 'Pusling', 'Tøffe', 'Klokke-Karl', 'Nora Nissefar', 'Fidus',
  'Hvirvel', 'Snorre', 'Mille Mus', 'Bjelle-Bent', 'Pebernød-Per', 'Kanel-Kamma', 'Vims',
  'Grød-Gustav', 'Snefnug-Sofie', 'Lune', 'Knap', 'Trille',
];

export const JULEFAKTA: string[] = [
  'Den første danske julekalender i tv blev sendt i 1962. Siden er det blevet en fast tradition hver december.',
  'Adventskransen stammer fra Tyskland i 1800-tallet. Den første havde faktisk 24 lys – ét for hver dag!',
  'I Danmark danser man om juletræet og synger salmer og sange, mens man holder hinanden i hånden.',
  'Mandelgaven til den, der finder den hele mandel i risalamanden, er en tradition, der går mere end 100 år tilbage.',
  'Julemærket blev opfundet af en dansk postmester, Einar Holbøll, i 1904. Det var det første i verden.',
  'Nisser i gamle danske folkesagn boede på gårdene og hjalp til – hvis de fik risengrød med smør juleaften.',
  'Kravlenisser blev populære i Danmark i 1940’erne og bliver stadig klippet og hængt op i mange hjem.',
  'Det er en gammel tradition at stille et neg ud til fuglene juleaften, så de også får julemad.',
  'I Island kommer der hele 13 julesvende – én om dagen i de sidste 13 dage før jul.',
  'Juletræet blev almindeligt i danske hjem i 1800-tallet. Før det pyntede man ofte med grønne grene.',
  'Pebernødder hedder sådan, fordi man i gamle dage krydrede dem med peber.',
  'Julehjerter i flettet papir menes at stamme fra Danmark. H.C. Andersen klippede et af de ældste kendte.',
  'Den 13. december fejres Lucia med lys i håret og hvide kjoler – en tradition, der kom fra Sverige.',
  'I Norge gemmer mange familier deres koste juleaften. Det siges at holde hekse fra at flyve af sted med dem.',
  'På Grønland er det mørkt næsten hele døgnet i december, så julelys og papirstjerner pynter overalt.',
  'Æbleskiver blev oprindeligt lavet med æblestykker indeni – deraf navnet.',
  'Julerosen blomstrer om vinteren, selv når der ligger sne. Den kaldes også "sneroser".',
  'I Japan har det udviklet sig til en populær tradition at spise jordbærkage til jul.',
  'I Australien falder julen midt i sommeren, og mange holder julefrokost på stranden.',
  'De første elektriske julelys blev sat på et juletræ i New York i 1882.',
  'Brunkager er en dansk klassiker, og dejen bliver ofte lavet flere dage før, den bages.',
  'Rensdyr kan se ultraviolet lys. Det hjælper dem med at finde mad i det hvide snelandskab.',
  'Rensdyrenes hove ændrer sig med årstiden: om vinteren bliver de hårde og skarpe, så de kan grave i sneen.',
  'Både han- og hunrensdyr har gevir. Hunnerne beholder ofte deres hele vinteren.',
  'Juleaften er den største aften i Danmark – det er her, gaverne pakkes op, ikke juledag.',
  'Ordet "jul" kommer fra oldnordisk "jól", en vinterfest, der blev holdt længe før kristendommen.',
  'Glaskugler til juletræet blev først lavet i den tyske by Lauscha i 1800-tallet.',
  'Mistelten hænges op, og står to under den, siger traditionen, at de skal give hinanden et kys.',
  'Den korteste dag på året, vintersolhverv, ligger omkring den 21. december.',
  'I Finland er det tradition at gå i sauna juleaften.',
  'Fra København til Nordpolen er der cirka 3.800 kilometer i fugleflugt. Med rensdyr tager det ingen tid.',
];

export interface Reindeer {
  id: string;
  name: string;
  role: string;
  position: string;
  personality: string;
  favoriteSnack: string;
  funFact: string;
  /** Farvenuance til illustrationen */
  hue: number;
  stats: { speed: number; navigation: number; stamina: number; mischief: number };
}

/**
 * Julemandens rensdyr. De otte klassiske navne kommer fra det gamle digt
 * "A Visit from St. Nicholas" (1823, frit tilgængeligt) i danske versioner.
 * Rudolf med den røde næse fører an, og Stjerneskud er portalens eget, originale rensdyr.
 */
export const REINDEER: Reindeer[] = [
  {
    id: 'rudolf', name: 'Rudolf', role: 'Forreste rensdyr og navigatør', position: 'Forrest',
    personality: 'Modig, nysgerrig og altid den første, der ser et julelys i mørket.',
    favoriteSnack: 'Gulerødder med lidt honning',
    funFact: 'Rudolfs røde næse lyser som en lille lygte, når det bliver tåget. Så kan hele spandet finde vej.',
    hue: 18, stats: { speed: 8, navigation: 10, stamina: 8, mischief: 6 },
  },
  {
    id: 'lynfod', name: 'Lynfod', role: 'Fartspecialist', position: 'Venstre, 1. række',
    personality: 'Utålmodig og hurtig. Kan ikke lide at stå stille i køen ved fodertruget.',
    favoriteSnack: 'Sprøde æbleskiver (uden syltetøj)',
    funFact: 'Har rekorden i 100 meter sneløb på Nordpolens træningsbane.',
    hue: 30, stats: { speed: 10, navigation: 6, stamina: 7, mischief: 7 },
  },
  {
    id: 'danser', name: 'Danser', role: 'Takt og rytme', position: 'Højre, 1. række',
    personality: 'Glad og musikalsk. Danser altid lidt, når julemusikken spiller i stalden.',
    favoriteSnack: 'Havrekiks',
    funFact: 'Holder takten for hele spandet, så alle hove lander samtidig på tagene.',
    hue: 26, stats: { speed: 7, navigation: 7, stamina: 8, mischief: 8 },
  },
  {
    id: 'springer', name: 'Springer', role: 'Landingsekspert', position: 'Venstre, 2. række',
    personality: 'Elegant og præcis. Kan lande på det mindste skorstenstag.',
    favoriteSnack: 'Tørret tranebær',
    funFact: 'Øver præcisionslandinger på en skammel i stalden hver morgen.',
    hue: 34, stats: { speed: 7, navigation: 8, stamina: 7, mischief: 4 },
  },
  {
    id: 'rap', name: 'Rap', role: 'Spejder', position: 'Højre, 2. række',
    personality: 'Snu og opmærksom. Opdager alt – også de nisser, der sniger sig til småkagerne.',
    favoriteSnack: 'Pebernødder (i hemmelighed)',
    funFact: 'Rap kan høre en kravlenisse liste over et gulv tre rum væk.',
    hue: 14, stats: { speed: 8, navigation: 8, stamina: 6, mischief: 9 },
  },
  {
    id: 'komet', name: 'Komet', role: 'Nattenavigatør', position: 'Venstre, 3. række',
    personality: 'Drømmende. Kender alle stjernebilleder på himlen.',
    favoriteSnack: 'Lav – en særlig stjernemos fra fjeldene',
    funFact: 'Komet kan finde vej hjem bare ved at kigge på Nordstjernen.',
    hue: 40, stats: { speed: 8, navigation: 9, stamina: 8, mischief: 3 },
  },
  {
    id: 'amor', name: 'Amor', role: 'Holdets hjerte', position: 'Højre, 3. række',
    personality: 'Venlig og omsorgsfuld. Trøster de andre, når de er trætte.',
    favoriteSnack: 'Rødbeder (overraskende nok)',
    funFact: 'Sørger for, at alle rensdyr får et godnatknus efter træningen.',
    hue: 8, stats: { speed: 6, navigation: 7, stamina: 9, mischief: 2 },
  },
  {
    id: 'torden', name: 'Torden', role: 'Kraftkarl', position: 'Venstre, bagerst',
    personality: 'Stærk og rolig. Trækker, når kanen er allermest fuld.',
    favoriteSnack: 'En hel spand havre',
    funFact: 'Når Torden stamper med hoven, rasler alle julekuglerne i værkstedet.',
    hue: 22, stats: { speed: 6, navigation: 6, stamina: 10, mischief: 3 },
  },
  {
    id: 'lyn', name: 'Lyn', role: 'Bremsemester', position: 'Højre, bagerst',
    personality: 'Hurtig i hovedet og i hovene. Holder styr på bremserne ved landing.',
    favoriteSnack: 'Iskolde grankogler',
    funFact: 'Lyn og Torden er tvillinger, men Lyn er tre minutter ældre – og siger det tit.',
    hue: 36, stats: { speed: 9, navigation: 6, stamina: 8, mischief: 6 },
  },
  {
    id: 'stjerneskud', name: 'Stjerneskud', role: 'Elev og reserve', position: 'Træner stadig',
    personality: 'Ung, ivrig og lidt klodset. Drømmer om at flyve med juleaften.',
    favoriteSnack: 'Alt, hvad de andre ikke spiser',
    funFact: 'Stjerneskud faldt i julegrøden sidste år og havde ris i pelsen i en uge.',
    hue: 44, stats: { speed: 7, navigation: 4, stamina: 6, mischief: 10 },
  },
];
