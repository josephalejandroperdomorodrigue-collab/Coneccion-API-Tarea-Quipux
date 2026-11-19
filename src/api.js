import { appendCuratedSlugs, groupElement } from "./elements.js";

const API_URL = "https://slugterra.fandom.com/api.php";
const TRANSLATION_URL = "https://translate.googleapis.com/translate_a/single";
const FALLBACK_URL = new URL("../data/slugs.json", import.meta.url);
const CACHE_KEY = "bajoterra-slug-catalog-v4";
const DETAIL_CACHE_KEY = "bajoterra-slug-details-v1";
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
const DETAIL_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
const SLUGS_PAGE = "Slugs";
const ELEMENT_NAMES = {
  Air: "Aire",
  Earth: "Tierra",
  Electric: "Eléctrico",
  Energy: "Energía",
  Fire: "Fuego",
  Ice: "Hielo",
  Light: "Luz",
  Plant: "Planta",
  Psychic: "Psíquico",
  Shadow: "Sombra",
  Toxic: "Tóxico",
  Water: "Agua"
};
const ELEMENT_COLORS = {
  Aire: "#31D6C6",
  Agua: "#31D6C6",
  Energía: "#B76BFF",
  Fuego: "#FF8B43",
  Tierra: "#FF8B43",
  "Por descubrir": "#A4E846"
};
const DETAIL_FIELDS = {
  powers: {
    infobox: [/^(?:power type|powers?|abilities|skills?)$/i],
    sections: [/^(?:powers?(?: and abilities)?|abilities(?: and powers)?|skills?)(?:\[\])?$/i]
  },
  physicalCharacteristics: {
    infobox: [/^(?:physical appearance|physical characteristics|anatomy)$/i],
    sections: [/^(?:physical appearance|physical characteristics|appearance|anatomy)(?:\[\])?$/i]
  },
  transformation100MPH: {
    infobox: [/100\s*(?:mph|miles per hour)/i],
    sections: [/100\s*(?:mph|miles per hour)/i]
  },
  additionalInfo: {
    infobox: [/^(?:preferred habitat|habitat|trivia|history|personality|other information)$/i],
    sections: [/^(?:preferred habitat|habitat|trivia|history|personality|other information)(?:\[\])?$/i]
  }
};
const CATEGORY_NAMES = {
  "named slugs": "Babosas con nombre",
  "slug species": "Especies de babosas",
  "known breeds": "Especies conocidas",
  "100 mph slugs": "Babosas de 100 MPH"
};
const translatedTextCache = new Map();

async function request(params, signal) {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("origin", "*");
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`La wiki respondió con estado ${response.status}.`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.info || "La wiki devolvió un error.");
  return payload;
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Number.isFinite(cached.savedAt) && Array.isArray(cached.slugs)) return cached;
  } catch {
    // A blocked or malformed browser cache should not prevent loading the archive.
  }
  return null;
}

function plainText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll("br").forEach((node) => node.replaceWith(element.ownerDocument.createTextNode(" ")));
  copy.querySelectorAll("p, div, li, dt, dd").forEach((node) => node.append(" "));
  return copy.textContent.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

function findInfoboxValue(content, patterns) {
  for (const row of content.querySelectorAll("tr, .pi-item")) {
    const label = row.querySelector("th, .pi-data-label, dt");
    const value = row.querySelector("td, .pi-data-value, dd");
    if (label && value && patterns.some((pattern) => pattern.test(plainText(label)))) {
      const text = plainText(value);
      if (text) return text.slice(0, 900);
    }
  }
  return null;
}

function findSectionValue(content, patterns) {
  for (const heading of content.querySelectorAll("h2, h3, h4")) {
    if (heading.closest(".pi-item")) continue;
    if (!patterns.some((pattern) => pattern.test(plainText(heading)))) continue;
    const headingContainer = heading.parentElement?.classList.contains("mw-heading")
      ? heading.parentElement
      : heading;
    const paragraphs = [];
    let sibling = headingContainer.nextElementSibling;
    while (sibling && !/^H[2-4]$/.test(sibling.tagName) && !sibling.classList.contains("mw-heading")) {
      const text = plainText(sibling);
      if (text) paragraphs.push(text);
      sibling = sibling.nextElementSibling;
    }
    const text = paragraphs.join(" ").slice(0, 900).trim();
    if (text) return text;
  }
  return null;
}

function findDetailField(content, { infobox, sections }) {
  return findInfoboxValue(content, infobox) || findSectionValue(content, sections);
}

async function translateToSpanish(text, signal) {
  if (!text || translatedTextCache.has(text)) return translatedTextCache.get(text) || text;

  const url = new URL(TRANSLATION_URL);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "es");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`El servicio de traducción respondió con estado ${response.status}.`);

  const payload = await response.json();
  const translated = Array.isArray(payload[0])
    ? payload[0].map(([segment]) => segment || "").join("").trim()
    : "";
  if (!translated) throw new Error("El servicio de traducción no devolvió texto.");

  const refined = translated
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\blagos de lava y fogatas\b/gi, "Lagos de lava y fosas de fuego")
    .replace(/\bpoderosos poderes basados en el fuego\b/gi, "poderosas habilidades de fuego")
    .replace(/\btostado\b/gi, "beige");
  translatedTextCache.set(text, refined);
  return refined;
}

function translateCategory(category) {
  const name = category.replace(/^Category:/i, "").replaceAll("_", " ").trim();
  const known = CATEGORY_NAMES[name.toLocaleLowerCase("en")];
  if (known) return known;
  const elementCategory = name.match(/^(?:Elemental )?(Air|Earth|Electric|Energy|Fire|Ice|Light|Plant|Psychic|Shadow|Toxic|Water) Slugs$/i);
  if (elementCategory) {
    const element = Object.keys(ELEMENT_NAMES).find((key) => key.toLowerCase() === elementCategory[1].toLowerCase());
    return `Babosas de ${ELEMENT_NAMES[element].toLocaleLowerCase("es")}`;
  }
  return null;
}

function writeCache(slugs) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), slugs }));
  } catch {
    // The catalog remains usable when browser storage is unavailable or full.
  }
}

function getDetailCacheKey(slug) {
  return (slug.wikiTitle || slug.title).toLocaleLowerCase("en");
}

function readDetailCache(slug) {
  try {
    const cache = JSON.parse(localStorage.getItem(DETAIL_CACHE_KEY) || "{}");
    const entry = cache[getDetailCacheKey(slug)];
    if (entry && Date.now() - entry.savedAt < DETAIL_CACHE_MAX_AGE && entry.fields) return entry.fields;
  } catch {
    // A blocked or malformed browser cache should not prevent loading the wiki.
  }
  return null;
}

function writeDetailCache(slug, fields) {
  try {
    const cache = JSON.parse(localStorage.getItem(DETAIL_CACHE_KEY) || "{}");
    cache[getDetailCacheKey(slug)] = { savedAt: Date.now(), fields };
    localStorage.setItem(DETAIL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // The detail remains available when browser storage is unavailable or full.
  }
}

function getElement(categories = []) {
  const patterns = [
    /^Category:Elemental (Air|Earth|Electric|Energy|Fire|Ice|Light|Plant|Psychic|Shadow|Toxic|Water) Slugs$/i,
    /^Category:(Air|Earth|Electric|Energy|Fire|Ice|Light|Plant|Psychic|Shadow|Toxic|Water) Slugs$/i
  ];
  for (const pattern of patterns) {
    for (const category of categories) {
      const match = category.match(pattern);
      if (!match) continue;
      const key = Object.keys(ELEMENT_NAMES).find((name) => name.toLowerCase() === match[1].toLowerCase());
      return groupElement(ELEMENT_NAMES[key]);
    }
  }
  return "Por descubrir";
}

async function loadKnownBreeds(signal) {
  const { parse } = await request({
    action: "parse",
    page: SLUGS_PAGE,
    prop: "sections",
    format: "json"
  }, signal);
  const section = parse?.sections?.find(({ line }) => line === "Known Breeds");
  if (!section) throw new Error("No se encontró la sección de especies conocidas en la página Slugs.");

  const { parse: breedSection } = await request({
    action: "parse",
    page: SLUGS_PAGE,
    section: section.index,
    prop: "text",
    format: "json"
  }, signal);
  const html = breedSection?.text?.["*"];
  if (!html) throw new Error("La sección de especies conocidas está vacía.");

  const document = new DOMParser().parseFromString(html, "text/html");
  const breeds = [...document.querySelectorAll("ol a[title]")].map((link) => ({
    title: link.textContent.trim(),
    wikiTitle: link.title
  })).filter((slug) => slug.title && slug.wikiTitle);
  const uniqueBreeds = [...new Map(breeds.map((slug) => [slug.title, slug])).values()];
  if (!uniqueBreeds.length) throw new Error("No se pudieron leer especies conocidas desde la página Slugs.");
  return uniqueBreeds;
}

async function loadBreedBatch(batch, signal) {
  const payload = await request({
    action: "query",
    prop: "pageimages|categories",
    titles: batch.map(({ wikiTitle }) => wikiTitle).join("|"),
    piprop: "thumbnail",
    pithumbsize: "320",
    cllimit: "50",
    format: "json"
  }, signal);
  return Object.values(payload.query?.pages || {});
}

async function loadBreedMetadata(breeds, signal) {
  const batches = [];
  for (let start = 0; start < breeds.length; start += 10) {
    batches.push(breeds.slice(start, start + 10));
  }
  const pages = (await Promise.all(batches.map((batch) => loadBreedBatch(batch, signal)))).flat();
  const pageByTitle = new Map(pages.map((page) => [page.title.toLocaleLowerCase("en"), page]));

  return breeds.map((slug) => {
    const page = pageByTitle.get(slug.wikiTitle.toLocaleLowerCase("en"));
    const categories = (page?.categories || []).map(({ title }) => title);
    const element = getElement(categories);
    return {
      ...slug,
      pageid: page?.pageid,
      image: page?.thumbnail?.source || null,
      categories,
      element,
      color: ELEMENT_COLORS[element] || "#31D6C6",
      description: null,
      stats: null
    };
  });
}

export async function loadFallbackSlugs() {
  const response = await fetch(FALLBACK_URL);
  if (!response.ok) throw new Error("No se pudo cargar el archivo local de babosas.");
  return appendCuratedSlugs(await response.json());
}

export async function loadCatalog({ signal } = {}) {
  const cached = readCache();
  if (cached && Date.now() - cached.savedAt < CACHE_MAX_AGE) {
    return { slugs: cached.slugs, source: "cache" };
  }

  try {
    const breeds = appendCuratedSlugs(await loadKnownBreeds(signal))
      .map(({ title, wikiTitle }) => ({ title, wikiTitle: wikiTitle || title }));
    const slugs = await loadBreedMetadata(breeds, signal);
    writeCache(slugs);
    return { slugs, source: "wiki" };
  } catch (error) {
    if (cached) return { slugs: cached.slugs, source: "stale-cache", error };
    throw error;
  }
}

export async function loadSlugDetails(slug, { signal } = {}) {
  const cachedFields = readDetailCache(slug);
  if (cachedFields) {
    return {
      ...cachedFields,
      image: slug.image || null,
      categories: [...new Set((slug.categories || []).map(translateCategory).filter(Boolean))],
      element: slug.element === "Por descubrir" ? null : slug.element,
      pageUrl: `https://slugterra.fandom.com/wiki/${encodeURIComponent((slug.wikiTitle || slug.title).replaceAll(" ", "_"))}`
    };
  }

  const { parse } = await request({
    action: "parse",
    page: slug.wikiTitle || slug.title,
    prop: "text",
    format: "json"
  }, signal);
  const parsed = new DOMParser().parseFromString(parse?.text?.["*"] || "", "text/html");
  const content = parsed.querySelector(".mw-parser-output") || parsed.body;
  const details = Object.fromEntries(
    Object.entries(DETAIL_FIELDS).map(([field, patterns]) => [field, findDetailField(content, patterns)])
  );
  content.querySelectorAll("aside, table, style, script, .toc, .wds-tabber").forEach((node) => node.remove());
  const description = [...content.querySelectorAll("p")]
    .map(plainText)
    .find(Boolean);
  const untranslatedFields = { description: description || null, ...details };
  const translatedFields = Object.fromEntries(await Promise.all(
    Object.entries(untranslatedFields).map(async ([field, value]) => [
      field,
      value ? await translateToSpanish(value, signal) : null
    ])
  ));
  writeDetailCache(slug, translatedFields);
  return {
    ...translatedFields,
    image: slug.image || null,
    categories: [...new Set((slug.categories || []).map(translateCategory).filter(Boolean))],
    element: slug.element === "Por descubrir" ? null : slug.element,
    pageUrl: `https://slugterra.fandom.com/wiki/${encodeURIComponent((slug.wikiTitle || slug.title).replaceAll(" ", "_"))}`
  };
}
