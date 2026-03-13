import { pythonMap } from "../data/maps/pythonMap.js";
import { htmlMap } from "../data/maps/htmlMap.js";
import { cssMap } from "../data/maps/cssMap.js";
import { javascriptMap } from "../data/maps/javaScriptMap.js";
import { sqlMap } from "../data/maps/sqlMap.js";
import { gameState } from "../state/gameState.js";

const MAPS = {
  python: pythonMap,
  html: htmlMap,
  css: cssMap,
  javascript: javascriptMap,
  sql: sqlMap,
};

export function getTechnologyKeys() {
  return Object.keys(MAPS);
}

export function getTechnologyTotal(technology) {
  return MAPS[technology]?.length || 0;
}

export function getTechnologyProgressPercent(technology, progress = gameState.progress) {
  const map = MAPS[technology] || [];
  const total = map.length;
  const list = Array.isArray(progress?.[technology]) ? progress[technology] : [];
  const validIds = new Set(map.map((node) => node.id));
  const completed = new Set(list.filter((value) => validIds.has(Number(value)))).size;

  return total ? Math.round((completed / total) * 100) : 0;
}

export function getOverallProgressPercent(progress = gameState.progress) {
  const technologies = getTechnologyKeys();
  let total = 0;
  let completed = 0;

  technologies.forEach((technology) => {
    const map = MAPS[technology] || [];
    const list = Array.isArray(progress?.[technology]) ? progress[technology] : [];
    const validIds = new Set(map.map((node) => node.id));

    total += map.length;
    completed += new Set(list.filter((value) => validIds.has(Number(value)))).size;
  });

  return total ? Math.round((completed / total) * 100) : 0;
}
