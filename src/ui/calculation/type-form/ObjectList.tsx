// Объекты активного типа: карточки и добавление нового объекта.
import { useRef } from "react";
import { flushSync } from "react-dom";
import { t } from "../../../i18n/index.ts";
import { NEW_OBJECT } from "../../../app/examples.ts";
import { activeType, addObject, state } from "../../../app/store.ts";
import { useComputed } from "../../hooks/useComputed.ts";
import { ObjectCard } from "./ObjectCard.tsx";

export function ObjectList() {
  const { results } = useComputed();
  const type = activeType();
  const result = results[state.cameraTypes.indexOf(type)];
  const list = useRef<HTMLDivElement>(null);

  // новая карточка отрисовывается сразу, чтобы перевести фокус на выбор объекта детекции
  const addNew = () => {
    flushSync(() => addObject(NEW_OBJECT));
    list.current?.lastElementChild?.querySelector("select")?.focus();
  };

  return (
    <section className="panel col" aria-labelledby="objectsTitle">
      <div
        className="colhead"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <h2 id="objectsTitle">
          <span>{t("objectsTitle")}</span>
        </h2>
        <button
          type="button"
          className="ghost sm"
          id="addObject"
          onClick={addNew}
        >
          {t("addObject")}
        </button>
      </div>
      <div className="olist">
        <div
          id="objectList"
          ref={list}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {type.objects.map((object, i) => (
            <ObjectCard
              // у объектов нет id: карточка — по позиции в списке активного типа
              key={`${type.id}-${i}`}
              index={i}
              object={object}
              result={result.ok ? result.objects[i] : undefined}
            />
          ))}
        </div>
        <div className="presets">
          <a className="inlink" href="#tpl-objects">
            {t("addDetectionObjectLink")}
          </a>
          <a
            className="inlink"
            href="#tpl-models"
            style={{ marginLeft: "auto" }}
          >
            {t("addModelLink")}
          </a>
        </div>
      </div>
      <div className="colfoot">{t("objectsFooter")}</div>
    </section>
  );
}
