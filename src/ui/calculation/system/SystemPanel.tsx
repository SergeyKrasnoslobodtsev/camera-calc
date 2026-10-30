// Итоги системы: камеры, вычислитель, сеть. Различимость объектов — в вердикте и на вкладках типов.
import type { ReactNode } from "react";
import { displayName, formatNumber, t, withUnit } from "../../../i18n/index.ts";
import { portText } from "../../../i18n/domain-text.ts";
import { useComputed } from "../../hooks/useComputed.ts";

export function SystemPanel() {
  // system — null, если в параметрах системы или в цене карты ошибка: подбор GPU не выполнен
  const { results, system, totals } = useComputed();
  const { cameraCount, totalMbps, cameraCost } = totals;
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
      t("systemCompute"),
      system && system.liveResults.length
        ? `${system.chosen.count} × ${system.chosen.gpu.name}`
        : "—",
      !system
        ? t("tabError")
        : system.liveResults.length
          ? `$${formatNumber(system.chosen.cost, 0)}${system.chosen.ok ? "" : " · " + t("insufficient")}`
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
