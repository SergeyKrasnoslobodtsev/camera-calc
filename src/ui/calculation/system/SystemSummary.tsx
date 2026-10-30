// Сводка системы: сколько типов проходит, вычислитель, загрузка GPU и сетевой поток. Нажатие открывает экран «Система».
import { STR, formatNumber, t, withUnit } from "../../../i18n/index.ts";
import { Meter } from "../../components/Meter.tsx";
import { useComputed } from "../../hooks/useComputed.ts";
import { typeStatus } from "../../lib/labels.ts";

const STATUSES = ["bad", "warn", "ok"] as const;

export function SystemSummary({ current }: { current: boolean }) {
  // system — null, если в параметрах системы или в цене карты ошибка: подбор GPU не выполнен
  const { results, system, totals } = useComputed();
  const { cameraCount, totalMbps, cameraCost, archiveDays, archiveTB } = totals;
  const chosen = system && system.liveResults.length ? system.chosen : null;
  const cost = cameraCost
    ? t("systemCameraCost", "$" + formatNumber(cameraCost, 0))
    : "";
  return (
    <a
      className="sum"
      id="systemKpis"
      href="#system"
      aria-label={t("summaryOpen")}
      aria-current={current ? "page" : undefined}
    >
      <div>
        <div className="small">{t("summaryTypes", cameraCount) + cost}</div>
        <div className="counts">
          {STATUSES.map((status) => (
            <span key={status}>
              <i className={`dot ${status}`} aria-hidden="true" />
              <b>
                {results.filter((item) => typeStatus(item) === status).length}
              </b>
              <em>{STR.typeCounts[status]}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="compute">
        <div className="small">
          {t("systemCompute")}
          {!system
            ? ` · ${t("tabError")}`
            : !system.liveResults.length
              ? ` · ${t("systemNoCameras")}`
              : ` · $${formatNumber(system.chosen.cost, 0)}${system.chosen.ok ? "" : " · " + t("insufficient")}`}
        </div>
        <div className="val">
          {chosen ? `${chosen.count} × ${chosen.gpu.name}` : "—"}
        </div>
      </div>
      <div className="meters">
        <Meter
          label={t("sheetInference")}
          load={chosen && chosen.inferenceLoad}
          limit={system?.maxLoad}
        />
        <Meter
          label={t("gaugeDecoder")}
          load={chosen && chosen.decodeLoad}
          limit={system?.maxLoad}
        />
        <Meter label={t("gaugeMemory")} load={chosen && chosen.memoryLoad} />
      </div>
      <div>
        <div className="small">
          {t("summaryStream")} ·{" "}
          {!(archiveDays >= 0)
            ? t("tabError")
            : archiveDays > 0
              ? t(
                  "summaryArchive",
                  t(
                    "networkArchiveValue",
                    formatNumber(archiveTB, 1),
                    formatNumber(archiveDays, 0),
                  ),
                )
              : t("summaryArchiveOff")}
        </div>
        <div className="val">
          {withUnit(formatNumber(totalMbps, 0), "mbps")}
        </div>
      </div>
    </a>
  );
}
