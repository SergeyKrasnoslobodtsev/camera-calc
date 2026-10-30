// Экран «Все формулы»: справка по расчёту на языке страницы.
import { LANG, t } from "../../i18n/index.ts";
import formulasEn from "../../formulas.en.html?raw";
import formulasRu from "../../formulas.html?raw";

// формулы — статичный текст из src/formulas*.html, без данных пользователя
const FORMULAS = LANG === "en" ? formulasEn : formulasRu;

export function FormulasPage({ hidden }: { hidden: boolean }) {
  return (
    <section
      className="panel formulas-page"
      id="viewFormulas"
      hidden={hidden}
      aria-labelledby="formulasTitle"
    >
      <h2 id="formulasTitle" className="h2big" style={{ fontSize: 22 }}>
        {t("formulas")}
      </h2>
      <div className="formulas" id="formulas">
        <div lang={LANG} dangerouslySetInnerHTML={{ __html: FORMULAS }} />
      </div>
    </section>
  );
}
