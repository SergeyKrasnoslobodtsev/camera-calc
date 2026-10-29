// Допущения расчёта: пункты списка с текущим КПД.
import { formatNumber, t } from "../../../i18n/index.ts";
import { useComputed } from "../../hooks/useComputed.ts";

export function Assumptions() {
  const { system } = useComputed();
  return t(
    "assumptions",
    system ? formatNumber(system.efficiency, 2) : "—",
  ).map((item, i) => <li key={i}>{item}</li>);
}
