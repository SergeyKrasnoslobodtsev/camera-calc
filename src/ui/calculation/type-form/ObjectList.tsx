// Объекты активного типа: карточки, добавление нового объекта и объектов-пресетов.
import { useRef } from "react";
import { flushSync } from "react-dom";
import { displayName, t } from "../../../i18n/index.ts";
import { NEW_OBJECT, OBJECT_PRESETS } from "../../../app/examples.ts";
import { activeType, addObject, state } from "../../../app/store.ts";
import { useComputed } from "../../hooks/useComputed.ts";
import { ObjectCard } from "./ObjectCard.tsx";

export function ObjectList() {
  const { results } = useComputed();
  const type = activeType();
  const result = results[state.cameraTypes.indexOf(type)];
  const list = useRef<HTMLDivElement>(null);

  // новая карточка отрисовывается сразу, чтобы выделить её название для ввода
  const addNew = () => {
    flushSync(() => addObject(NEW_OBJECT));
    const name = list.current?.lastElementChild?.querySelector("input");
    name?.focus();
    name?.select();
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
          className="primary sm"
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
          <span>{t("presets")}</span>
          {OBJECT_PRESETS.map((preset) => (
            <button
              key={preset.nameKey}
              type="button"
              className="chip"
              onClick={() => addObject(preset)}
            >
              {displayName(preset)}
            </button>
          ))}
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
