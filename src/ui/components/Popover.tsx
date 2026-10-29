// Подсказка к полю: кнопка «?» (Tip) открывает её наведением или фокусом, щелчок закрепляет.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { STR } from "../../i18n/index.ts";

export type TipField = keyof typeof STR.tips;
// открытая подсказка: поле, кнопка «?» у него и закреплена ли подсказка щелчком
type OpenTip = { field: TipField; anchor: HTMLElement; pinned: boolean };

let openTip: OpenTip | null = null;
const listeners = new Set<() => void>();

function setOpenTip(next: OpenTip | null) {
  openTip = next;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useOpenTip = () => useSyncExternalStore(subscribe, () => openTip);

// щелчок закрепляет подсказку или закрывает закреплённую; наведение и фокус показывают, пока нет закреплённой
export function clickTip(field: TipField, anchor: HTMLElement) {
  setOpenTip(
    openTip?.anchor === anchor && openTip.pinned
      ? null
      : { field, anchor, pinned: true },
  );
}
export function enterTip(field: TipField, anchor: HTMLElement) {
  if (!openTip?.pinned) setOpenTip({ field, anchor, pinned: false });
}
export function leaveTip(anchor: HTMLElement) {
  if (openTip && !openTip.pinned && openTip.anchor === anchor) setOpenTip(null);
}
const closeTip = () => setOpenTip(null);

const EDGE = 12; // отступ от краёв окна, px
const GAP = 8; // от кнопки до подсказки, px

// под кнопкой по центру; если снизу не помещается, а сверху помещается, — над кнопкой
function placeNear(anchor: HTMLElement, popover: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = popover;
  const left = Math.min(
    Math.max(EDGE, rect.left + rect.width / 2 - width / 2),
    document.documentElement.clientWidth - width - EDGE,
  );
  const below = rect.bottom + GAP;
  const fitsBelow = below + height <= window.innerHeight - EDGE;
  const fitsAbove = rect.top - height - GAP > EDGE;
  return {
    left,
    top: !fitsBelow && fitsAbove ? rect.top - height - GAP : below,
  };
}

export function Popover() {
  const tip = useOpenTip();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>();

  // размер подсказки известен только после отрисовки текста: место считается до показа на экране
  useLayoutEffect(() => {
    if (tip && ref.current) setPosition(placeNear(tip.anchor, ref.current));
  }, [tip]);

  useEffect(() => {
    if (!tip) return;
    const closeOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) closeTip();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTip();
    };
    document.addEventListener("click", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeTip, { passive: true });
    window.addEventListener("resize", closeTip);
    return () => {
      document.removeEventListener("click", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeTip);
      window.removeEventListener("resize", closeTip);
    };
  }, [tip]);

  return createPortal(
    <div
      ref={ref}
      className="pop"
      id="popover"
      role="tooltip"
      hidden={!tip}
      style={position}
    >
      {tip && STR.tips[tip.field]}
    </div>,
    document.body,
  );
}
