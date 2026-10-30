// Верхняя строка экранов типа и системы на телефоне: возврат к обзору и смена типа или название экрана.
import { t } from "../../../i18n/index.ts";
import { TypeSwitcher } from "./TypeSwitcher.tsx";

export function ScreenBar({ screen }: { screen: "type" | "system" }) {
  return (
    <div className="phtop">
      <a className="btn icon" href="#" aria-label={t("backAria")}>
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path
            d="M12.5 4 6.5 10l6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
      {screen === "type" ? (
        <TypeSwitcher />
      ) : (
        <span className="phtitle">{t("systemTitle")}</span>
      )}
    </div>
  );
}
