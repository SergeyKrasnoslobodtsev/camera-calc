// Текстовый отчёт из результатов расчёта: его копирует кнопка «Копировать отчёт».
import { STR, displayName, formatNumber, t } from "../../i18n/index.ts";
import { feedText, modelPxText, sensorPxText } from "../../i18n/domain-text.ts";
import type { ValidObject } from "../../domain/compute-type/index.ts";
import { DEG } from "../../domain/angles.ts";
import type { Computed } from "../../app/store.ts";
import { cameraLabel, modelName } from "./labels.ts";

export function reportText({ results, system, totals }: Computed) {
  return [
    t("appTitle"),
    ...results.flatMap((result) =>
      !result.ok
        ? ["\n" + t("reportError", displayName(result.type), result.count)]
        : [
            `\n${displayName(result.type)} × ${result.count}`,
            t("reportCamera", {
              cameraLabel: cameraLabel(result),
              rotated: result.lens.rotated,
              sensorWidth: formatNumber(result.frame.sensorWidth, 2),
              focal: formatNumber(result.lens.f, 1),
              hfov: formatNumber(result.lens.hfov / DEG, 0),
              tilt: formatNumber(result.geometry.tilt / DEG, 0),
              overCenter: result.placement === "top",
              zoneStart: formatNumber(result.geometry.zoneStart, 2),
              cameraHeight: formatNumber(result.geometry.H, 2),
              zoneWidth: formatNumber(result.geometry.zoneWidth, 2),
              zoneDepth: formatNumber(result.geometry.zoneDepth, 2),
            }),
            ...result.objects
              .filter((item): item is ValidObject => item.valid)
              .map((item) =>
                t("reportObject", {
                  name: displayName(item.object),
                  model: modelName(item.object),
                  feed: feedText(item.feed),
                  sensorPx: sensorPxText(item),
                  modelPx: modelPxText(item),
                  requiredPx: formatNumber(item.requiredPx, 0),
                  status: STR.status[item.status],
                }),
              ),
            t(
              "reportStream",
              formatNumber(result.stream.bitrateMbps, 1),
              Math.ceil(result.shutterDenominator),
            ),
          ],
    ),
    "\n" +
      t(
        "reportSystem",
        totals.cameraCount,
        formatNumber(totals.totalMbps, 0),
        totals.cameraCost ? "$" + formatNumber(totals.cameraCost, 0) : "",
      ),
    !system
      ? t("reportComputeError")
      : system.liveResults.length
        ? t("reportCompute", {
            gpuCount: system.chosen.count,
            gpuName: system.chosen.gpu.name,
            cost: "$" + formatNumber(system.chosen.cost, 0),
            inferenceLoad: formatNumber(system.chosen.inferenceLoad * 100, 0),
            decodeLoad: formatNumber(system.chosen.decodeLoad * 100, 0),
            memoryUsed: formatNumber(system.chosen.memoryUseGB, 1),
            memoryCap: formatNumber(system.chosen.memoryCapGB, 0),
            optimum:
              system.optimum && system.optimum !== system.chosen
                ? `${system.optimum.count} × ${system.optimum.gpu.name}, $${formatNumber(system.optimum.cost, 0)}`
                : "",
          })
        : t("reportNoCompute"),
  ].join("\n");
}
