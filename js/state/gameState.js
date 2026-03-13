export const gameState = {
  currentTechnology: "",

  progress: {
    python: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
    html: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
    css: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
    javascript: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
    sql: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]
  },
};

const STORAGE_KEY = "roadmapProgress";

export function loadProgress(userId) {
  const key = buildStorageKey(userId);
  const raw = localStorage.getItem(key);

  if (!raw) {
    return gameState.progress;
  }

  try {
    const parsed = JSON.parse(raw);
    gameState.progress = normalizeProgress(parsed);
  } catch {
    gameState.progress = normalizeProgress({});
  }

  return gameState.progress;
}

export function saveProgress(userId) {
  const key = buildStorageKey(userId);
  const payload = JSON.stringify(normalizeProgress(gameState.progress));
  localStorage.setItem(key, payload);
  if (typeof document !== "undefined") {
    document.dispatchEvent(
      new CustomEvent("progress:updated", {
        detail: {
          progress: gameState.progress,
        },
      }),
    );
  }
}

export function markNodeCompleted(technology, nodeId, userId) {
  if (!technology || !Number.isFinite(Number(nodeId))) {
    return gameState.progress[technology] || [];
  }

  const key = String(technology);
  const value = Number(nodeId);
  const list = Array.isArray(gameState.progress[key]) ? gameState.progress[key] : [];

  if (!list.includes(value)) {
    list.push(value);
    list.sort((a, b) => a - b);
  }

  gameState.progress[key] = list;
  saveProgress(userId);
  return list;
}

function normalizeProgress(input) {
  const base = {
    python: [],
    html: [],
    css: [],
    javascript: [],
    sql: [],
  };

  if (!input || typeof input !== "object") {
    return base;
  }

  Object.keys(base).forEach((key) => {
    const list = Array.isArray(input[key]) ? input[key] : [];
    base[key] = Array.from(
      new Set(list.map((value) => Number(value)).filter((value) => Number.isFinite(value))),
    ).sort((a, b) => a - b);
  });

  return base;
}

function buildStorageKey(userId) {
  const suffix = userId ? String(userId) : "guest";
  return `${STORAGE_KEY}:${suffix}`;
}
