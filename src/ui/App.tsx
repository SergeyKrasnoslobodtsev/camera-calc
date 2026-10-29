// Корень страницы: шапка, экран расчёта или шаблонов по адресу после #, уведомление и подсказка.
import { useEffect } from "react";
import { CalculationPage } from "./calculation/CalculationPage.tsx";
import { Popover } from "./components/Popover.tsx";
import { Toast } from "./components/Toast.tsx";
import { Header } from "./header/Header.tsx";
import { useHashRoute } from "./hooks/useHashRoute.ts";
import { TemplatesPage, isTemplateRoute } from "./templates/TemplatesPage.tsx";

export function App() {
  const route = useHashRoute();
  // tpl-* — экран шаблонов, любой другой адрес — расчёт
  const templatePage = isTemplateRoute(route) ? route : null;

  // новый экран открывается с начала
  useEffect(() => window.scrollTo(0, 0), [route]);

  return (
    <>
      <Header />
      <CalculationPage hidden={templatePage !== null} />
      <TemplatesPage page={templatePage} />
      <Toast />
      <Popover />
    </>
  );
}
