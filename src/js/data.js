import { STR, formatNumber, t } from "../i18n/index.ts";
import { parseNum } from "../domain/parse-num.ts";
import { GPU_CATALOG } from "../domain/references/gpu-catalog.ts";
import { store } from "./store.js";
export const byId = (id) => document.getElementById(id);
export const escapeHtml = (text) =>
  String(text ?? "").replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );
export const uid = () => Math.random().toString(36).slice(2, 9);

// ---------- GPU: каталог и свои карты, правки цен и участие в подборе
export const allGpus = () => [...GPU_CATALOG, ...store.customGpus];
export const gpuById = (id) => allGpus().find((gpu) => gpu.id === id);
export const priceOf = (gpu) => {
  const price = parseNum(store.gpuPrices[gpu.id]);
  return price > 0 ? price : gpu.price;
};
export const isOn = (gpu) => store.gpuEnabled[gpu.id] !== false;
export const decText = (gpu) =>
  gpu.decodeStreams
    ? t("decoderStreams", formatNumber(gpu.decodeStreams.h265, 0))
    : `${gpu.nvdec} NVDEC`;
export const FEEDS = STR.feeds,
  FEED_SHORT = STR.feedsShort;
export const INPUTS = [320, 416, 512, 640, 768, 960, 1024, 1280];
