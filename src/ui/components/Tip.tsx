// Кнопка «?» у подписи поля: подсказку STR.tips[field] показывает popover.ts.
import { STR, t } from "../../i18n/index.ts";
import { clickTip, enterTip, leaveTip } from "../popover.ts";

export function Tip({ field }: { field: keyof typeof STR.tips }) {
  return (
    <button
      type="button"
      className="tipbtn"
      data-key={field}
      aria-label={t("tipAria")}
      aria-expanded="false"
      aria-describedby="popover"
      onClick={(event) => {
        event.stopPropagation();
        clickTip(event.currentTarget);
      }}
      onMouseEnter={(event) => enterTip(event.currentTarget)}
      onMouseLeave={(event) => leaveTip(event.currentTarget)}
      onFocus={(event) => enterTip(event.currentTarget)}
      onBlur={(event) => leaveTip(event.currentTarget)}
    >
      ?
    </button>
  );
}
