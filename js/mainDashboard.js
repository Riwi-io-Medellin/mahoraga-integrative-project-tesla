import { activateTechnology } from "./ui/dashboardRenderer.js";
import { requireLoggedInUser } from "./services/sessionService.js";
import { initThemeManager } from "./ui/themeManager.js";
import { renderRoadmap } from "./ui/roadmapRenderer.js";
import { initDashboardViewManager, resetDetailPanel } from "./ui/viewManager.js";
import { gameState } from "./state/gameState.js";
import { initPhotoProfile } from "./data/profile/modalProfile.js";
import { initDashboardIdentity } from "./ui/userIdentity.js";

function initRoadmapDrag() {
  const container = document.querySelector(".roadmap-container");

  if (!container) {
    return;
  }

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  container.addEventListener("mousedown", (event) => {
    isDragging = true;
    container.classList.add("active");
    startX = event.pageX - container.offsetLeft;
    startY = event.pageY - container.offsetTop;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
  });

  ["mouseleave", "mouseup"].forEach((eventName) => {
    container.addEventListener(eventName, () => {
      isDragging = false;
      container.classList.remove("active");
    });
  });

  container.addEventListener("mousemove", (event) => {
    if (!isDragging) {
      return;
    }

    event.preventDefault();

    const currentX = event.pageX - container.offsetLeft;
    const currentY = event.pageY - container.offsetTop;
    const walkX = currentX - startX;
    const walkY = currentY - startY;

    container.scrollLeft = scrollLeft - walkX;
    container.scrollTop = scrollTop - walkY;
  });
}

function initTechnologySelector() {
  const technologyButtons = document.querySelectorAll(".tech-btn");

  technologyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const technology = button.dataset.tech;

      if (!technology) {
        return;
      }

      activateTechnology(technology);
      resetDetailPanel();
      renderRoadmap();

      console.log("Tecnologia actual:", gameState.currentTechnology);
    });
  });

  const initialTechnology =
    document.querySelector(".tech-btn.python")?.dataset.tech ||
    technologyButtons[0]?.dataset.tech;

  if (initialTechnology) {
    activateTechnology(initialTechnology);
    renderRoadmap();
  }
}

function initSidebarToggle() {
  const toggleButton = document.querySelector(".hamburger-toggle");
  const sidebar = document.querySelector(".sidebar");
  const roadmapContainer = document.querySelector(".roadmap-container");

  if (!toggleButton || !sidebar) {
    return;
  }

  toggleButton.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.toggle("collapsed");
    roadmapContainer?.classList.toggle("sidebar-collapsed", isCollapsed);

    const icon = toggleButton.querySelector(".icon-menu");

    if (icon) {
      icon.setAttribute("state", isCollapsed ? "out" : "in");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const user = requireLoggedInUser("../index.html");

  if (!user) {
    return;
  }

  initRoadmapDrag();
  initSidebarToggle();
  initDashboardIdentity();
  initPhotoProfile();
  initDashboardViewManager();
  initThemeManager();
  initTechnologySelector();
});
