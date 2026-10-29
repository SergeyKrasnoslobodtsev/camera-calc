import { STR, formatNumber, t } from "../i18n/index.ts";
export const byId = (id) => document.getElementById(id);
export const escapeHtml = (text) =>
  String(text ?? "").replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );

// ---------- GPU
export const decText = (gpu) =>
  gpu.decodeStreams
    ? t("decoderStreams", formatNumber(gpu.decodeStreams.h265, 0))
    : `${gpu.nvdec} NVDEC`;
export const FEEDS = STR.feeds,
  FEED_SHORT = STR.feedsShort;
export const INPUTS = [320, 416, 512, 640, 768, 960, 1024, 1280];
