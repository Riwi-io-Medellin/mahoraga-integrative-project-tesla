import { gameState } from "../state/gameState.js";
import { getMapByTechnology } from "../data/maps/mapsRegistry.js";
import { renderRoadmap } from "./roadmapRenderer.js";

export function initDashboardRenderer() {
  const techButtons = document.querySelectorAll(".tech-btn");
  if (!techButtons.length) return;

  techButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const tech = e.currentTarget.dataset.tech;
      if (!tech) return;

      setActiveTechnology(tech);
      renderRoadmap();
    });
  });

  updateTechnologyPercents();
  document.addEventListener("progress:updated", updateTechnologyPercents);
}

export function setActiveTechnology(techClass) {
  gameState.currentTechnology = techClass;

  document.querySelectorAll(".tech-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tech === techClass);
  });
}

export function updateTechnologyPercents() {
  document.querySelectorAll(".tech-btn").forEach((btn) => {
    const tech = btn.dataset.tech;
    const percentEl = btn.querySelector(".percent");
    if (!tech || !percentEl) return;

    const total = getMapByTechnology(tech).length;
    const completed = gameState.progress[tech]?.length || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    percentEl.textContent = `${percent}%`;
  });
}
