import { slugDisplayName } from "./slug-names.js";

const STAT_LABELS = {
  experiencia: "Experiencia",
  poder: "Poder",
  agilidad: "Agilidad",
  velocidad: "Velocidad",
  fuerza: "Fuerza",
  inteligencia: "Inteligencia"
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function slugIcon(slug, className = "") {
  const color = slug.color || "#A4E846";
  if (slug.image) {
    return `<span class="slug-art ${className}" style="--slug-color:${color}"><img src="${escapeHtml(slug.image)}" alt="" loading="lazy" decoding="async" /></span>`;
  }
  return `<span class="slug-art ${className} image-unavailable" style="--slug-color:${color}"><span class="slug-emoji" aria-hidden="true">${escapeHtml(slug.emoji || "✦")}</span></span>`;
}

export function renderSlugGrid(slugs, selectedTitle = "") {
  return slugs.map((slug, index) => {
    const element = slug.element && slug.element !== "Por descubrir" ? slug.element : "Elemento por descubrir";
    return `
      <button class="slug-card${slug.title === selectedTitle ? " is-selected" : ""}" type="button"
      data-slug="${escapeHtml(slug.title)}" aria-pressed="${slug.title === selectedTitle}"
      style="--card-delay:${Math.min(index, 18) * 35}ms;--element-color:${slug.color || "#31D6C6"}">
      <span class="slug-card-art">${slugIcon(slug, "slug-art--card")}</span>
      <span class="slug-card-info">
        <span class="slug-discovery"><i></i>${slug.image ? "REGISTRO ILUSTRADO" : "REGISTRO DE CAMPO"}</span>
        <strong>${escapeHtml(slugDisplayName(slug))}</strong>
        <small>${escapeHtml(element)}</small>
      </span>
      <span class="card-arrow" aria-hidden="true">↗</span>
      </button>
    `;
  }).join("");
}

export function renderSlugDetails(slug, remote = null) {
  if (!slug) return "";
  const cachedPlaceholder = "Consulta la ficha para conocer la información disponible en Slugterra Wiki.";
  const localDescription = slug.description === cachedPlaceholder ? null : slug.description;
  const description = localDescription || remote?.description || "Información por descubrir.";
  const element = remote?.element || (slug.element && slug.element !== "Por descubrir" ? slug.element : "Elemento por descubrir");
  const stats = slug.stats;
  const detailFields = [
    ["Poderes y habilidades", remote?.powers || slug.powers],
    ["Características físicas", remote?.physicalCharacteristics || slug.physicalCharacteristics],
    ["Transformación a 100 MPH", remote?.transformation100MPH || slug.transformation100MPH],
    ["Información adicional", remote?.additionalInfo || slug.additionalInfo]
  ];
  const detailMarkup = detailFields.map(([label, value]) => `
    <section class="detail-section${value ? "" : " is-undiscovered"}">
      <span class="detail-field-mark" aria-hidden="true">${value ? "✦" : "·"}</span>
      <div>
        <h4>${label}</h4>
        <p>${escapeHtml(value || "Aún no registrado en la fuente disponible.")}</p>
      </div>
    </section>
  `).join("");
  const statMarkup = stats
    ? Object.entries(STAT_LABELS).map(([key, label]) => {
      const value = Number(stats[key]) || 0;
      return `<div class="stat-row"><div class="stat-copy"><span>${label}</span><strong>${value}<small>/100</small></strong></div><div class="stat-track"><span style="--stat-value:${Math.min(100, Math.max(0, value))}%"></span></div></div>`;
    }).join("")
    : `<p class="stats-empty">No hay atributos de juego registrados para esta ficha.</p>`;
  const categories = remote?.categories?.length
    ? `<div class="category-tags">${remote.categories.slice(0, 5).map((category) => `<span>${escapeHtml(category)}</span>`).join("")}</div>`
    : "";
  const image = remote?.image ? { ...slug, image: remote.image } : slug;

  return `
    <div class="detail-layout" style="--element-color:${slug.color || "#31D6C6"}">
      <div class="detail-portrait">
        <span class="portrait-coordinate">IDENTIFICACIÓN · ${escapeHtml(String(slug.pageid || "99C"))}</span>
        ${slugIcon(image, "detail-art")}
        <span class="portrait-caption">${escapeHtml(element)} · ${slug.image ? "ILUSTRACIÓN DE WIKI" : "IMAGEN NO DISPONIBLE"}</span>
      </div>
      <div class="detail-content">
        <div class="detail-heading">
          <div>
            <p class="eyebrow"><span class="status-dot"></span> DOSSIER DE CRIATURA</p>
            <h3>${escapeHtml(slugDisplayName(slug))}</h3>
            <span class="element-tag">${escapeHtml(element)}</span>
          </div>
          <span class="detail-index">#${escapeHtml(String(slug.pageid || "99C"))}</span>
        </div>
        <section class="detail-overview">
          <h4>DESCRIPCIÓN</h4>
          <p class="detail-description">${escapeHtml(description)}</p>
        </section>
        ${categories}
        <div class="detail-sections">${detailMarkup}</div>
        <div class="detail-columns">
          <section class="detail-stats" aria-label="Valoraciones de juego estimadas">
            <div class="detail-subheading"><h4>ATRIBUTOS DE JUEGO</h4><span>ESTIMACIONES LOCALES</span></div>
            ${statMarkup}
          </section>
          <div class="detail-wiki">
            <span class="wiki-seal" aria-hidden="true">↗</span>
            <p>Los atributos son estimaciones locales; las demás características proceden de los datos disponibles.</p>
            ${remote?.pageUrl ? `<a href="${escapeHtml(remote.pageUrl)}" target="_blank" rel="noreferrer">ABRIR FUENTE EN SLUGTERRA WIKI</a>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderMemoryCard(slug, index) {
  return `
    <button class="memory-card" type="button" data-card-index="${index}" aria-label="Carta ${index + 1}, oculta" aria-pressed="false">
      <span class="memory-card-inner">
        <span class="memory-back" aria-hidden="true"><span class="card-mark">S<span>.</span></span><small>CRISTAL · 99C</small></span>
        <span class="memory-front" aria-hidden="true">${slugIcon(slug)}<strong>${escapeHtml(slugDisplayName(slug))}</strong></span>
      </span>
    </button>
  `;
}
