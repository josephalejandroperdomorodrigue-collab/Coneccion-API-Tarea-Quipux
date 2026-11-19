import { renderMemoryCard } from "./ui.js";
import { slugDisplayName } from "./slug-names.js";

const CARD_COUNT = 12;

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function createMemoryGame(slugs) {
  const grid = document.querySelector("#memory-grid");
  const movesOutput = document.querySelector("#moves-count");
  const pairsOutput = document.querySelector("#pairs-count");
  const timerOutput = document.querySelector("#timer-count");
  const messageOutput = document.querySelector("#game-message");
  const restartButton = document.querySelector("#restart-button");
  const victoryPanel = document.querySelector("#victory-panel");
  const victorySummary = document.querySelector("#victory-summary");
  const victoryRestart = document.querySelector("#victory-restart");
  let deck = [];
  let flipped = [];
  let matched = new Set();
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let locked = false;
  let round = 0;

  function updateStats() {
    movesOutput.textContent = String(moves).padStart(2, "0");
    pairsOutput.innerHTML = `${String(matched.size / 2).padStart(2, "0")} <small>/ 06</small>`;
    timerOutput.textContent = formatTime(seconds);
  }

  function startTimer() {
    if (timer) return;
    timer = window.setInterval(() => {
      seconds += 1;
      timerOutput.textContent = formatTime(seconds);
    }, 1000);
  }

  function finishGame() {
    window.clearInterval(timer);
    timer = null;
    messageOutput.textContent = "Todas las parejas sincronizadas.";
    victorySummary.textContent = `Completaste la misión en ${moves} movimientos y ${formatTime(seconds)}.`;
    victoryPanel.hidden = false;
    grid.classList.add("is-complete");
  }

  function reset() {
    round += 1;
    window.clearInterval(timer);
    timer = null;
    const available = slugs.filter((slug) => slug.stats).length >= 6 ? slugs.filter((slug) => slug.stats) : slugs;
    const chosen = shuffle(available).slice(0, CARD_COUNT / 2);
    deck = shuffle(chosen.flatMap((slug, pairId) => [
      { ...slug, pairId },
      { ...slug, pairId }
    ]));
    flipped = [];
    matched = new Set();
    moves = 0;
    seconds = 0;
    locked = false;
    victoryPanel.hidden = true;
    grid.classList.remove("is-complete");
    grid.innerHTML = deck.map((slug, index) => renderMemoryCard(slug, index)).join("");
    messageOutput.textContent = "La caverna aguarda. Encuentra las parejas.";
    updateStats();
  }

  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".memory-card");
    if (!card || locked) return;
    const index = Number(card.dataset.cardIndex);
    if (matched.has(index) || flipped.includes(index)) return;

    startTimer();
    card.classList.add("is-flipped");
    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", `${slugDisplayName(deck[index])}, carta revelada`);
    flipped.push(index);
    if (flipped.length < 2) return;

    moves += 1;
    updateStats();
    const [first, second] = flipped;
    if (deck[first].pairId === deck[second].pairId) {
      matched.add(first);
      matched.add(second);
      grid.querySelectorAll(`[data-card-index="${first}"], [data-card-index="${second}"]`).forEach((matchedCard) => {
        matchedCard.classList.add("is-matched");
        matchedCard.disabled = true;
        matchedCard.setAttribute("aria-label", `${slugDisplayName(deck[Number(matchedCard.dataset.cardIndex)])}, pareja encontrada`);
      });
      flipped = [];
      updateStats();
      if (matched.size === CARD_COUNT) finishGame();
      else messageOutput.textContent = "¡Pareja encontrada! Sigue buscando.";
      return;
    }

    locked = true;
    messageOutput.textContent = "No forman una pareja. ¡Inténtalo de nuevo!";
    const currentRound = round;
    window.setTimeout(() => {
      if (currentRound !== round) return;
      for (const cardIndex of flipped) {
        const flippedCard = grid.querySelector(`[data-card-index="${cardIndex}"]`);
        flippedCard?.classList.remove("is-flipped");
        flippedCard?.setAttribute("aria-pressed", "false");
        flippedCard?.setAttribute("aria-label", `Carta ${cardIndex + 1}, oculta`);
      }
      flipped = [];
      locked = false;
    }, 850);
  });

  restartButton.addEventListener("click", reset);
  victoryRestart.addEventListener("click", reset);
  reset();
}
