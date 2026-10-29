// Действие, которое выполняется по второму нажатию в течение 3 с: первое нажатие просит подтвердить.
import { useEffect, useRef, useState } from "react";

const CONFIRM_MS = 3000;

export function useConfirm(action: () => void) {
  const [confirming, setConfirming] = useState(false);
  // таймер, а не confirming, решает, ждём ли подтверждения: два нажатия подряд приходят до перерисовки
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const click = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      setConfirming(false);
      action();
      return;
    }
    setConfirming(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setConfirming(false);
    }, CONFIRM_MS);
  };
  return { confirming, click };
}
