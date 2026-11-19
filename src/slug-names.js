const DISPLAY_NAMES = new Map([
  ["air elemental", "Elemental de aire"],
  ["arachnet", "Aracnired"],
  ["armashelt", "Torpedo"],
  ["dirt urchin", "Erizo de tierra"],
  ["earth elemental", "Elemental de tierra"],
  ["energy elemental", "Elemental de energía"],
  ["enigmo", "Enigma"],
  ["fire elemental", "Elemental de fuego"],
  ["flaringo", "Bengala"],
  ["flatulorhinkus", "Flatulorinca"],
  ["flopper", "Estropeada"],
  ["forgesmelter", "Fraguadora"],
  ["frightgeist", "Terror"],
  ["frostcrawler", "Hielo"],
  ["geoshard", "Cristálida"],
  ["grenuke", "Granada"],
  ["hop rock", "Demoledora"],
  ["infurnus", "Infierno"],
  ["jellyish", "Gelatinosa"],
  ["rammstone", "Carnero"],
  ["speedstinger", "Punzante"],
  ["tazerling", "Electroshock"],
  ["thresher", "Trilladora"],
  ["vinedrill", "Perforavides"],
  ["water elemental", "Elemental de agua"]
]);

export function slugDisplayName(slug) {
  const originalName = slug?.title || "";
  const key = originalName.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return DISPLAY_NAMES.get(key) || originalName;
}
