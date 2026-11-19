export const ELEMENT_FILTERS = ["Tierra", "Fuego", "Aire", "Agua", "Energía"];

const SLUGS_BY_ELEMENT = {
  Tierra: [
    "Armashelt", "Boon Doc", "Bubbaleone", "Crystalyd", "Diggrix", "Dirt Urchin",
    "Frightgeist", "Geoshard", "Grenuke", "Lariat", "Rammstone", "Sand Angler",
    "Slyren", "Speedstinger", "Thresher", "Tormato", "Vinedrill", "Xmitter"
  ],
  Fuego: [
    "Blastipede", "Firenzar", "Flaringo", "Forgesmelter", "Hop Rock",
    "Infurnus", "Lavalynx", "Rammstone", "Thresher"
  ],
  Aire: [
    "Air Elemental", "Flatulorhinkus", "Gazzer", "Hoverbug", "Hypnogrif",
    "Polero", "Slyren", "Tormato"
  ],
  Agua: [
    "AquaBeek", "Bubbaleone", "Jellyish", "Lariat", "Neotox"
  ],
  Energía: [
    "Arachnet", "Boon Doc", "Enigmo", "Fandango", "Frightgeist", "Grimmstone",
    "Hop Rock", "Negashade", "Phosphoro", "Pieper Slugs", "Tazerling", "Thugglet"
  ]
};

const SLUG_ALIASES = new Map([
  ["aracnired", "arachnet"],
  ["boondoc", "boon doc"],
  ["grenuker", "grenuke"],
  ["infierno", "infurnus"],
  ["lavalyx", "lavalynx"],
  ["pieper", "pieper slugs"],
  ["supterra", "subterra"]
]);

export const CURATED_SLUG_TITLES = [...new Set(Object.values(SLUGS_BY_ELEMENT).flat())];

export function slugIdentity(title) {
  const key = String(title || "")
    .trim()
    .replace(/\s+\((?:green|white)\)$/i, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
  return SLUG_ALIASES.get(key) || key;
}

const CURATED_MEMBERSHIPS = new Map(
  ELEMENT_FILTERS.map((element) => [
    element,
    new Set(SLUGS_BY_ELEMENT[element].map(slugIdentity))
  ])
);

const SINGLE_ELEMENT_OVERRIDES = new Map([
  ["armashelt", ["Tierra"]],
  ["arachnet", ["Tierra"]],
  ["boon doc", ["Energía"]],
  ["bubbaleone", ["Agua"]],
  ["flopper", ["Tierra"]],
  ["frightgeist", ["Tierra"]],
  ["flatulorhinkus", ["Aire"]],
  ["grimmstone", ["Tierra"]],
  ["grenuke", ["Tierra"]],
  ["hop rock", ["Tierra"]],
  ["hypnogrif", ["Aire"]],
  ["lariat", ["Tierra"]],
  ["lavalynx", ["Fuego"]],
  ["neotox", ["Tierra"]],
  ["pieper slugs", ["Aire"]],
  ["rammstone", ["Tierra"]],
  ["slicksilver", ["Energía"]],
  ["slyren", ["Aire"]],
  ["thresher", ["Tierra"]],
  ["tormato", ["Aire"]]
]);

const ALL_ELEMENT_SLUGS = new Set(["universal slug"]);

const EXCLUDED_SLUGS = new Set([
  "Ashwing", "Bolo", "Blinker", "Furno", "Magma", "MakoBreaker", "Polaro",
  "Pyre", "Robo-Slug", "Seeker", "Sharkfin", "Sliquifier", "Subterra",
  "Torpedo", "Tornado", "Wingnut"
].map(slugIdentity));

const ELEMENT_GROUPS = new Map([
  ["aire", "Aire"],
  ["agua", "Agua"],
  ["energía", "Energía"],
  ["eléctrico", "Energía"],
  ["fuego", "Fuego"],
  ["hielo", "Agua"],
  ["impacto", "Tierra"],
  ["luz", "Energía"],
  ["planta", "Tierra"],
  ["psíquico", "Energía"],
  ["sombra", "Aire"],
  ["tierra", "Tierra"],
  ["tóxico", "Tierra"]
]);

export function groupElement(element) {
  const key = String(element || "").trim().toLocaleLowerCase("es");
  return ELEMENT_GROUPS.get(key) || "Por descubrir";
}

export function getSlugElementGroups(slug) {
  const identity = slugIdentity(slug?.title);
  if (ALL_ELEMENT_SLUGS.has(identity)) return [...ELEMENT_FILTERS];
  if (SINGLE_ELEMENT_OVERRIDES.has(identity)) return [...SINGLE_ELEMENT_OVERRIDES.get(identity)];
  const curated = ELEMENT_FILTERS.filter((element) => CURATED_MEMBERSHIPS.get(element).has(identity));
  const existing = groupElement(slug?.element);
  if (existing !== "Por descubrir" && !curated.includes(existing)) curated.push(existing);
  return curated;
}

export function appendCuratedSlugs(slugs) {
  const retainedSlugs = slugs.filter(({ title }) => !EXCLUDED_SLUGS.has(slugIdentity(title)));
  const known = new Set(retainedSlugs.map(({ title }) => slugIdentity(title)));
  const additions = CURATED_SLUG_TITLES
    .filter((title) => !known.has(slugIdentity(title)) && !EXCLUDED_SLUGS.has(slugIdentity(title)))
    .map((title) => ({ title, wikiTitle: title, element: "Por descubrir", image: null, stats: null }));
  return [...retainedSlugs, ...additions];
}
