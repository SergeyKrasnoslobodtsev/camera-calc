// Итоги системы: камеры, объекты, вычислитель, сеть.
import type { ReactNode } from "react";
import { displayName, formatNumber, t, withUnit } from "../../../i18n/index.ts";
import { portText } from "../../../i18n/domain-text.ts";
import type { ValidObject } from "../../../domain/compute-type/index.ts";
import { useComputed } from "../../hooks/useComputed.ts";

export function SystemPanel() {
  // system — null, если в параметрах системы или в цене карты ошибка: подбор GPU не выполнен
  const { results, system, totals } = useComputed();
  const { cameraCount, totalMbps, cameraCost } = totals;
  const percent = (share: number) => formatNumber(share * 100, 0) + "%";
  const allObjects = results.flatMap((result) =>
      result.ok
        ? result.objects.filter((item): item is ValidObject => item.valid)
        : [],
    ),
    okObjects = allObjects.filter((obj) => obj.status === "ok").length;
  const worstStatus = results.some(
    (result) => !result.ok || result.status === "bad",
  )
    ? "bad"
    : results.some((result) => result.ok && result.status === "warn")
      ? "warn"
      : "ok";
  const smallest = allObjects.length
    ? allObjects.reduce((a, b) => (a.modelPx < b.modelPx ? a : b))
    : null;
  const kpis: [string, ReactNode, string][] = [
    [
      t("systemCameras"),
      `${cameraCount}`,
      cameraCost
        ? t("systemTypes", results.length) +
          t("systemCameraCost", "$" + formatNumber(cameraCost, 0))
        : t(
            "systemTypes",
            results.length,
            results.map((result) => displayName(result.type)).join(", "),
          ),
    ],
    [
      t("systemObjects"),
      <>
        <span className={"dot " + worstStatus} aria-hidden="true"></span>
        {t("systemOfTotal", okObjects, allObjects.length)}
      </>,
      smallest
        ? t(
            "systemSmallest",
            displayName(smallest.object),
            formatNumber(
              Math.min(smallest.widthPx, smallest.heightPx) *
                smallest.feed.modelScale,
              1,
            ),
          )
        : t("systemNoObjects"),
    ],
    [
      t("systemCompute"),
      system && system.liveResults.length
        ? `${system.chosen.count} × ${system.chosen.gpu.name}`
        : "—",
      !system
        ? t("tabError")
        : system.liveResults.length
          ? `$${formatNumber(system.chosen.cost, 0)} · ${system.chosen.ok ? t(system.chosen === system.optimum ? "optimum" : "manual") + " · " + t("headroom", percent(Math.max(0, 1 - system.chosen.worstLoad))) : t("insufficient")}`
          : t("systemNoCameras"),
    ],
    [
      t("systemNetwork"),
      withUnit(formatNumber(totalMbps, 0), "mbps"),
      t("systemPort", portText(totals.port), formatNumber(totals.poeW, 0)),
    ],
  ];
  return (
    <>
      <h2 id="systemTitle">{t("systemTitle")}</h2>
      <div className="sys" id="systemKpis">
        {kpis.map(([label, value, extra]) => (
          <div className="sk" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em>{extra}</em>
          </div>
        ))}
      </div>
    </>
  );
}
