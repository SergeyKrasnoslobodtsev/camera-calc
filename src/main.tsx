// Точка входа: запускает приложение и отрисовывает страницу.
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { start } from "./start.ts";
import { App } from "./ui/App.tsx";

start();
const root = createRoot(document.getElementById("root")!);
// первая отрисовка сразу, а не по частям в следующих задачах: страница готова, когда скрипт выполнен
flushSync(() =>
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
