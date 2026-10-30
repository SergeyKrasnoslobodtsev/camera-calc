// Корень страницы: шапка, экран расчёта, шаблонов или формул по адресу после #, уведомление и подсказка.
import { useEffect } from "react";
import { CalculationPage } from "./calculation/CalculationPage.tsx";
import { Popover } from "./components/Popover.tsx";
import { Toast } from "./components/Toast.tsx";
import { FormulasPage } from "./formulas/FormulasPage.tsx";
import { Header } from "./header/Header.tsx";
import { useHashRoute } from "./hooks/useHashRoute.ts";
import { TemplatesPage, isTemplateRoute } from "./templates/TemplatesPage.tsx";

export function App() {
  const route = useHashRoute();
  // tpl-* — экран шаблонов, formulas — формулы, любой другой адрес — расчёт
  const templatePage = isTemplateRoute(route) ? route : null;
  const formulas = route === "formulas";

  // новый экран открывается с начала; эффект ничего не возвращает: scrollTo в Chrome возвращает Promise,
  // а React принял бы его за функцию очистки
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <>
      <Header />
      <CalculationPage hidden={templatePage !== null || formulas} />
      <FormulasPage hidden={!formulas} />
      <TemplatesPage page={templatePage} />
      <Toast />
      <Popover />
    </>
  );
}
