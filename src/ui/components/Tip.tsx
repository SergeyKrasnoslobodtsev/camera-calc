// Кнопка «?» у подписи поля: подсказку STR.tips[field] показывает Popover.
import { t } from "../../i18n/index.ts";
import {
  clickTip,
  enterTip,
  leaveTip,
  useOpenTip,
  type TipField,
} from "./Popover.tsx";

export function Tip({ field }: { field: TipField }) {
  const openTip = useOpenTip();
  return (
    <button
      type="button"
      className="tipbtn"
      data-key={field}
      aria-label={t("tipAria")}
      aria-expanded={openTip?.field === field}
      aria-describedby="popover"
      onClick={(event) => {
        // иначе щелчок дойдёт до document, и Popover закроет подсказку как щелчок мимо
        event.stopPropagation();
        clickTip(field, event.currentTarget);
      }}
      onMouseEnter={(event) => enterTip(field, event.currentTarget)}
      onMouseLeave={(event) => leaveTip(event.currentTarget)}
      onFocus={(event) => enterTip(field, event.currentTarget)}
      onBlur={(event) => leaveTip(event.currentTarget)}
    >
      ?
    </button>
  );
}
