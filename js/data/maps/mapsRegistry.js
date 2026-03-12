import { pythonMap } from "./pythonMap.js";
import { htmlMap } from "./htmlMap.js";
import { cssMap } from "./cssMap.js";
import { javascriptMap } from "./javaScriptMap.js";
import { sqlMap } from "./sqlMap.js";

export const MAPS = {
  python: pythonMap,
  html: htmlMap,
  css: cssMap,
  javascript: javascriptMap,
  sql: sqlMap,
};

export function getMapByTechnology(technology) {
  return MAPS[technology] || [];
}
