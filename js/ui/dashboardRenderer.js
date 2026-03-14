import { gameState } from "../state/gameState.js";
import { renderRoadmap } from "./roadmapRenderer.js";
import {
  getOverallProgressPercent,
  getTechnologyProgressPercent,
} from "../services/dashboardService.js";

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

  updateDashboardProgress();
  document.addEventListener("progress:updated", updateDashboardProgress);
}

export function setActiveTechnology(techClass) {
  gameState.currentTechnology = techClass;

  document.querySelectorAll(".tech-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tech === techClass);
  });
}

export function updateDashboardProgress() {
  document.querySelectorAll(".tech-btn").forEach((btn) => {
    const tech = btn.dataset.tech;
    if (!tech) return;

    const percent = getTechnologyProgressPercent(tech);
    const label = btn.querySelector(".percent");
    if (label) {
      label.textContent = `${percent}%`;
    }
  });

  const totalPercent = getOverallProgressPercent();
  const totalFill = document.querySelector(".total-process .load");
  const totalLabel = document.querySelector(".total-process .load p");
  if (totalFill) {
    totalFill.style.width = `${totalPercent}%`;
    totalFill.style.background = buildProgressGradient(totalPercent);
  }
  if (totalLabel) {
    totalLabel.textContent = `${totalPercent}%`;
  }
}

function buildProgressGradient(percent) {
  const blue = getCssColor("--accent-secondary", "#60a5fa");
  const yellow = getCssColor("--accent-warning", "#d6c12f");
  const green = getCssColor("--accent-primary", "#2ecc71");

  if (percent <= 25) {
    return `linear-gradient(135deg, ${blue}, ${blue})`;
  }

  if (percent <= 50) {
    const mix = (percent - 25) / 25;
    const mid = mixColors(blue, yellow, mix);
    return `linear-gradient(135deg, ${blue}, ${mid})`;
  }

  if (percent <= 75) {
    return `linear-gradient(135deg, ${yellow}, ${yellow})`;
  }

  if (percent <= 93) {
    const mix = (percent - 75) / 18;
    const mid = mixColors(yellow, green, mix);
    return `linear-gradient(135deg, ${yellow}, ${mid})`;
  }

  return `linear-gradient(135deg, ${green}, ${green})`;
}

function getCssColor(varName, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return value ? value.trim() : fallback;
}

function mixColors(hexA, hexB, ratio) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * ratio);
  const g = Math.round(a.g + (b.g - a.g) * ratio);
  const bl = Math.round(a.b + (b.b - a.b) * ratio);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}
