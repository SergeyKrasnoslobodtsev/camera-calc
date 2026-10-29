// Сеть: поток по типам камер, итог и архив.
import { displayName, formatNumber, t, withUnit } from "../../../i18n/index.ts";
import { state, updateSystem } from "../../../app/store.ts";
import { Tip } from "../../components/Tip.tsx";
import { useComputed } from "../../hooks/useComputed.ts";

const HEADERS = [
  "networkType",
  "networkCameras",
  "networkResolution",
  "networkFps",
  "networkPerCamera",
  "networkAll",
] as const;

export function NetworkPanel() {
  const { results, totals } = useComputed();
  const { cameraCount, totalMbps, archiveDays, archiveTB } = totals;
  return (
    <>
      <div className="rowhead">
        <h2 id="networkTitle">{t("networkTitle")}</h2>
        <div className="f">
          <div className="lrow">
            <label htmlFor="archiveDays">{t("archiveDays")}</label>
            <Tip field="archiveDays" />
          </div>
          <input
            id="archiveDays"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={state.system.archiveDays}
            onChange={(event) =>
              updateSystem("archiveDays", event.target.value)
            }
          />
        </div>
      </div>
      <div className="tbl">
        <table id="networkTable">
          <tbody>
            <tr>
              {HEADERS.map((key) => (
                <th key={key}>{t(key)}</th>
              ))}
            </tr>
            {results.map((result) => (
              <tr key={result.type.id}>
                <td className="txt">{displayName(result.type)}</td>
                <td>{result.count}</td>
                {result.ok ? (
                  <>
                    <td>
                      {result.frame.width} × {result.frame.height}
                    </td>
                    <td>{formatNumber(result.stream.fps, 0)}</td>
                    <td>
                      {withUnit(
                        formatNumber(result.stream.bitrateMbps, 1),
                        "mbps",
                      )}
                    </td>
                    <td>
                      {withUnit(
                        formatNumber(
                          result.stream.bitrateMbps * result.count,
                          0,
                        ),
                        "mbps",
                      )}
                    </td>
                  </>
                ) : (
                  <td colSpan={4} className="dim" style={{ textAlign: "left" }}>
                    {t("tabError")}
                  </td>
                )}
              </tr>
            ))}
            <tr className="total">
              <td className="txt">{t("networkTotal")}</td>
              <td>{cameraCount}</td>
              <td></td>
              <td></td>
              <td></td>
              <td>{withUnit(formatNumber(totalMbps, 0), "mbps")}</td>
            </tr>
            <tr>
              <td className="txt dim">{t("networkArchive")}</td>
              <td colSpan={5} className="dim">
                {!(archiveDays >= 0)
                  ? t("tabError")
                  : archiveDays > 0
                    ? t(
                        "networkArchiveValue",
                        formatNumber(archiveTB, 1),
                        formatNumber(archiveDays, 0),
                      )
                    : t("networkArchiveOff")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
