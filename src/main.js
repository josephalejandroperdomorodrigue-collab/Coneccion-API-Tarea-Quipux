import { loadCatalog, loadFallbackSlugs, loadSlugDetails } from "./api.js";
import { ELEMENT_FILTERS, getSlugElementGroups, groupElement } from "./elements.js";
import { createMemoryGame } from "./game.js";
import { slugDisplayName } from "./slug-names.js";
import { renderSlugDetails, renderSlugGrid } from "./ui.js";

const grid = document.querySelector("#slug-grid");
const detailPanel = document.querySelector("#detail-panel");
const detailDialog = document.querySelector("#detail-dialog");
const countLabel = document.querySelector("#catalog-count");
const discoveryCount = document.querySelector("#discovery-count");
const searchInput = document.querySelector("#search-input");
const elementFilter = document.querySelector("#element-filter");
const notice = document.querySelector("#api-notice");
const emptyState = document.querySelector("#empty-state");
const homeView = document.querySelector("#home-view");
const catalogView = document.querySelector("#catalog-view");
const gameView = document.querySelector("#game-view");
const navLinks = document.querySelectorAll(".nav-link");

let catalog = [];
let selectedSlug = null;
let detailRequest = null;
let detailSequence = 0;

function getVisibleSlugs() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const element = elementFilter.value;
  return catalog.filter((slug) => {
    const matchesText = [slug.title, slugDisplayName(slug)]
      .some((name) => name.toLocaleLowerCase("es").includes(query));
    const matchesElement = element === "all" || slug.filterGroups.includes(element);
    return matchesText && matchesElement;
  });
}

function updateGrid() {
  const visibleSlugs = getVisibleSlugs();
  grid.innerHTML = renderSlugGrid(visibleSlugs, selectedSlug?.title);
  emptyState.hidden = visibleSlugs.length > 0;
  countLabel.textContent = `${visibleSlugs.length} ${visibleSlugs.length === 1 ? "babosa" : "babosas"}`;
}

function populateElementFilter() {
  elementFilter.innerHTML = `<option value="all">Todos los elementos</option>${ELEMENT_FILTERS.map((element) => `<option value="${element}">${element}</option>`).join("")}`;
}

async function selectSlug(title) {
  selectedSlug = catalog.find((slug) => slug.title === title) || null;
  if (!selectedSlug) return;
  updateGrid();
  const fallback = selectedSlug;
  detailPanel.innerHTML = `<p class="detail-loading" role="status"><span class="loader"></span> Actualizando ficha desde la wiki…</p>${renderSlugDetails(fallback)}`;
  if (!detailDialog.open) detailDialog.showModal();
  detailRequest?.abort();
  detailRequest = new AbortController();
  const requestId = ++detailSequence;
  try {
    const details = await loadSlugDetails(fallback, { signal: detailRequest.signal });
    if (requestId !== detailSequence || selectedSlug?.title !== title) return;
    detailPanel.innerHTML = renderSlugDetails(fallback, details);
  } catch (error) {
    if (error.name === "AbortError" || requestId !== detailSequence) return;
    detailPanel.innerHTML = renderSlugDetails(fallback);
    notice.hidden = false;
    notice.textContent = "No se pudo cargar o traducir la ficha de la wiki. Mostramos los datos disponibles del archivo local.";
  }
}

function switchView(viewName) {
  const showHome = viewName === "home";
  const showCatalog = viewName === "catalog";
  const showGame = viewName === "game";
  homeView.hidden = !showHome;
  catalogView.hidden = !showCatalog;
  gameView.hidden = !showGame;
  homeView.classList.toggle("is-visible", showHome);
  catalogView.classList.toggle("is-visible", showCatalog);
  gameView.classList.toggle("is-visible", showGame);
  navLinks.forEach((link) => {
    const active = link.dataset.view === viewName;
    link.classList.toggle("is-active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });
  if (showGame) initializeGame();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initializeGame() {
  if (catalog.length && !gameView.dataset.initialized) {
    createMemoryGame(catalog);
    gameView.dataset.initialized = "true";
  }
}

grid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-slug]");
  if (card) selectSlug(card.dataset.slug);
});
function handleImageError(event) {
  if (event.target instanceof HTMLImageElement) {
    event.target.closest(".slug-art")?.classList.add("image-unavailable");
  }
}
grid.addEventListener("error", handleImageError, true);
detailPanel.addEventListener("error", handleImageError, true);
searchInput.addEventListener("input", updateGrid);
elementFilter.addEventListener("change", updateGrid);
document.querySelectorAll("[data-view]").forEach((link) => {
  link.addEventListener("click", () => switchView(link.dataset.view));
});
document.querySelector("#detail-close").addEventListener("click", () => detailDialog.close());
detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) detailDialog.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

async function initialize() {
  const [fallbackSlugs, liveResult] = await Promise.all([
    loadFallbackSlugs(),
    loadCatalog().then((result) => ({ result }), (error) => ({ error }))
  ]);
  if (liveResult.result) {
    const profiles = new Map(fallbackSlugs.map((slug) => [slug.title.toLocaleLowerCase("es"), slug]));
    catalog = liveResult.result.slugs.map((slug) => {
      const profile = profiles.get(slug.title.toLocaleLowerCase("es"));
      const baseElement = groupElement(slug.element && slug.element !== "Por descubrir" ? slug.element : profile?.element || slug.element);
      const merged = {
        ...profile,
        ...slug,
        description: profile?.description || slug.description,
        element: baseElement,
        stats: profile?.stats || slug.stats,
        emoji: profile?.emoji || slug.emoji,
        pageid: slug.pageid
      };
      const filterGroups = getSlugElementGroups(merged);
      return {
        ...merged,
        filterGroups,
        element: filterGroups.join(" · ") || "Por descubrir"
      };
    });
    if (liveResult.result.source === "cache") {
      notice.hidden = false;
      notice.textContent = "Mostrando el archivo guardado de la wiki. Se actualizará al vencer la caché.";
    } else if (liveResult.result.source === "stale-cache") {
      notice.hidden = false;
      notice.textContent = "No se pudo actualizar la wiki. Mostramos el catálogo guardado, incluidas las imágenes disponibles.";
    }
  } else {
    catalog = fallbackSlugs.map((slug) => {
      const filterGroups = getSlugElementGroups(slug);
      return { ...slug, filterGroups, element: filterGroups.join(" · ") || "Por descubrir" };
    });
    notice.hidden = false;
    notice.textContent = "La wiki no está disponible ahora. Mostramos las babosas y los datos del archivo local.";
  }
  populateElementFilter();
  updateGrid();
  discoveryCount.textContent = String(catalog.length).padStart(2, "0");
  initializeGame();
  if (liveResult.error) console.warn("No se pudo conectar con Slugterra Wiki:", liveResult.error);
}

initialize().catch((error) => {
  console.error("No se pudo iniciar el archivo:", error);
  countLabel.textContent = "No se pudo cargar la enciclopedia";
  notice.hidden = false;
  notice.textContent = "Hubo un problema al iniciar. Comprueba que ejecutas el sitio desde un servidor local.";
});
