// Результат типа: колонка на широком экране, на телефоне — шторка с вердиктом и тремя числами, открывается в полный результат.
import { useState, type CSSProperties } from "react";
import { formatNumber, t, withUnit } from "../../../i18n/index.ts";
import { verdictHeadline, verdictPill } from "../../../i18n/domain-text.ts";
import { activeResult } from "../../../app/store.ts";
import { useComputed } from "../../hooks/useComputed.ts";
import { useKeyboardInset } from "../../hooks/useKeyboardInset.ts";
import { percent } from "../../lib/labels.ts";
import { TypeResult } from "./TypeResult.tsx";

export function ResultPanel({ route }: { route: string }) {
  const { system } = useComputed();
  const result = activeResult();
  const [open, setOpen] = useState(false);
  const keyboardInset = useKeyboardInset();

  // переход на другой экран закрывает шторку
  const [openRoute, setOpenRoute] = useState(route);
  if (route !== openRoute) {
    setOpenRoute(route);
    setOpen(false);
  }

  const openObject = () => {
    setOpen(false);
    document
      .querySelector("#objectList .ores.bad")
      ?.closest(".ocard")
      ?.scrollIntoView();
  };

  const load =
    system && system.liveResults.length
      ? percent(system.chosen.inferenceLoad)
      : "—";
  return (
    <section
      className="panel res"
      aria-labelledby="resultTitle"
      id="typeResult"
      data-open={open}
      style={{ "--keyboard": `${keyboardInset}px` } as CSSProperties}
    >
      <button
        type="button"
        className="sheetbar"
        aria-expanded={open}
        aria-label={t(open ? "closeResultAria" : "openResultAria")}
        onClick={() => setOpen(!open)}
      >
        <span className="grip" aria-hidden="true" />
        {!open && (
          <>
            <span
              className={"sheethead " + (result.ok ? result.status : "bad")}
            >
              <span className="pill">
                {result.ok
                  ? verdictPill(result.verdict, result.notes)
                  : t("pillError")}
              </span>
              <span>
                {result.ok ? verdictHeadline(result.verdict) : t("inputError")}
              </span>
            </span>
            <span className="sheetnums">
              <span>
                <small>{t("sheetFocal")}</small>
                <b>
                  {result.ok
                    ? withUnit(formatNumber(result.lens.f, 1), "mm")
                    : "—"}
                </b>
              </span>
              <span>
                <small>{t("sheetFrame")}</small>
                <b>
                  {result.ok
                    ? withUnit(
                        formatNumber(result.geometry.frameWidthNear, 1) +
                          "–" +
                          formatNumber(result.geometry.frameWidthFar, 1),
                        "m",
                      )
                    : "—"}
                </b>
              </span>
              <span>
                <small>{t("sheetInference")}</small>
                <b>{load}</b>
              </span>
            </span>
          </>
        )}
      </button>
      <div className="resfull">
        <TypeResult
          action={
            result.ok && result.status === "bad" ? (
              <button type="button" className="openobject" onClick={openObject}>
                {t("openObject")}
              </button>
            ) : null
          }
        />
      </div>
    </section>
  );
}
