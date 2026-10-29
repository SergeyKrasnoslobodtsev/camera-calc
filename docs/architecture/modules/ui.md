# Модуль ui

Всё, что работает с DOM: форма типа камер, карточки объектов, результат, вкладки, панель системы, экраны шаблонов, схема SVG, текстовый отчёт, подсказки, уведомления, тема, язык и маршрутизация. Состояние модуль берёт из `app` и меняет только через его действия. Тексты берёт из `i18n`, справочники и функции разбора — из `domain`. Решения — в [`../decisions/ui.md`](../decisions/ui.md).

## Раскладка

Целевая раскладка `src/ui/` после перехода на React (#65). Папки — по частям экрана, общие компоненты, хуки и функции без React — отдельно. Каждый шаг перехода кладёт новые компоненты на их место и удаляет старый файл; файлы на `innerHTML` до переписывания остаются в корне `src/ui/`.

```
src/ui/
├── App.tsx                  корень: шапка, «расчёт» или «шаблоны» по адресу
├── header/                  Header.tsx — тема, язык, шаблоны, пример, отчёт; file-actions.ts
├── calculation/
│   ├── TypeTabs.tsx         вкладки типов камер
│   ├── type-form/           TypeForm.tsx, ObjectCard.tsx
│   ├── type-result/         TypeResult.tsx, SideDiagram.tsx
│   └── system/              SystemPanel.tsx, GpuLoad.tsx
├── templates/               TemplatesPage.tsx, GpuTemplates.tsx, CameraTemplates.tsx,
│                            DetectorTemplates.tsx, form-errors.ts
├── components/              общие компоненты: Toast.tsx, Tip.tsx (подсказка «?»)
├── hooks/                   useComputed.ts, useHashRoute.ts
└── lib/                     функции без React: report.ts, labels.ts
```

`render.ts`, `translations.ts` и `dom.ts` после перехода не нужны: отрисовку по состоянию делает React, тексты компоненты берут из `t()`.

## Состав

Файлы сейчас.

| Файл | Что внутри |
|---|---|
| `dom.ts` | `byId` — элемент по id с типом элемента, `escapeHtml`, тип поля формы `Field` |
| `labels.ts` | Подписи, общие для результата, панели системы и отчёта: название модели объекта, камера типа |
| `type-form.ts` | Форма типа камер: `writeForm` (тип → поля), `readForm` (поля → действие `updateActiveType`), кнопки «копия» и «удалить тип» |
| `object-cards.ts` | Список камер в форме (`buildCameraSelect`), карточки объектов и их результат, `syncFormUI` — видимость полей и сводка над формой, кнопки добавления объекта |
| `type-result.ts` | Результат активного типа: вердикт, показатели, плотность, DORI, схема |
| `side-diagram.ts` | Схема «вид сбоку» в SVG по геометрии из `domain` |
| `calculation/TypeTabs.tsx` | Компонент `TypeTabs`: вкладки типов камер и кнопка нового типа |
| `hooks/useComputed.ts` | Хук `useComputed`: результаты расчёта из `store`, компонент перерисовывается после каждого действия |
| `system-panel.ts` | Параметры системы (`writeSystemForm`, список GPU `buildGpuSelect`), итоги системы, сеть, нагрузка на GPU: кольцо и шкалы |
| `templates-gpus.ts`, `templates-cameras.ts`, `templates-detectors.ts` | Экраны шаблонов: таблицы и формы своей карты, камеры, детектора |
| `form-errors.ts` | Текст ошибки формы шаблона по ошибкам разбора из `domain` |
| `report.ts` | `reportText(computed)` — текстовый отчёт, кнопка «Копировать отчёт» |
| `render.ts` | `renderResults` — подписчик `store`: результат, панель системы, тема |
| `router.ts` | `route` — расчёт или экран шаблонов по адресу после `#` |
| `translations.ts` | `applyTranslations` — тексты статичной разметки, кнопка языка |
| `theme.ts`, `toast.ts`, `popover.ts` | Тема, уведомление, подсказки «?» у полей |
| `file-actions.ts` | Пример вместо текущих типов, экспорт и импорт файла |

Точка входа `src/main.tsx` подключает `renderResults` и сохранение к `store`, загружает сохранение, заполняет формы и монтирует компоненты React.

```mermaid
flowchart LR
    main[main.tsx] --> render[render.ts]
    main --> tabs[calculation/TypeTabs.tsx]
    main --> router[router.ts]
    main --> actions[file-actions.ts]
    main --> report[report.ts]
    render --> result[type-result.ts]
    render --> panel[system-panel.ts]
    result --> cards[object-cards.ts]
    result --> diagram[side-diagram.ts]
    tabs --> form[type-form.ts]
    form --> cards
    router --> templates[templates-*.ts]
    router --> form
    templates --> panel
    templates --> cards
    actions --> panel
    actions --> form
```

На схеме нет общих файлов (`dom.ts`, `labels.ts`, `toast.ts`, `form-errors.ts`): их импортируют многие. Круговых импортов внутри `ui` нет.

## Отрисовка

```mermaid
sequenceDiagram
    participant E as обработчик события
    participant S as app/store
    participant R as render.ts
    participant C as компоненты React
    E->>S: действие, например updateObject(0, "width", "12")
    S->>S: пересчёт computed
    S-->>R: уведомление
    R->>R: syncFormUI, renderType, renderSystem, applyTheme
    S-->>C: уведомление через useComputed
    C->>C: перерисовка компонента
```

Подписчик `renderResults` перерисовывает результаты, а значения полей не трогает, чтобы не сбить ввод. Исключение одно: ширину матрицы, взятую из камеры или по формату, `syncFormUI` показывает в поле, которое в этом случае только для чтения. Поля целиком перезаписываются при смене данных: другой тип (`writeForm`), пример, загрузка, удаление шаблона.

Интерфейс переходит на компоненты React (#65, решение — в [`../decisions/ui.md`](../decisions/ui.md#интерфейс-на-react)). На время перехода компонент монтируется в свой контейнер из `index.html` (`createRoot` в `main.tsx`) и читает результаты через `useComputed`. Сейчас на React — вкладки (`TypeTabs` в `#tabs`). Обработчики событий компонента задаются в JSX, а не навешиваются после отрисовки.

Остальная разметка собирается шаблонными строками в `innerHTML`. Значения пользователя (названия) проходят через `escapeHtml`. Четыре функции пересоздают разметку вместе с обработчиками: `renderObjects`, `renderGpuView`, `renderCamView`, `renderDetView`. Их вызывают при добавлении, удалении и смене типа, но не при вводе в поле.

## Соглашения

- **Состояние только через действия.** `ui` читает `state` и `computed` и вызывает действия `store`. Поля `state` в `ui` не присваиваются.
- **Обработчики статичной разметки навешиваются при импорте модуля.** Порядок задают импорты в `main.tsx`. `popover.ts` импортируется последним: он перестраивает подписи полей, когда разметка уже готова.
- **Элемент по id с типом.** `byId<HTMLInputElement>("typeName")` возвращает элемент нужного типа. Есть ли элемент с таким id в `index.html`, `tsc` не проверяет. Если его нет, код падает при выполнении, и тест страницы ловит это на тех путях, которые проходит.
- **Тексты через `i18n`.** Ключ для `t()` проверяет `tsc`. Ключ из разметки или таблицы кодов имеет тип `TextKey` — ключ текста без параметров.
- **Отчёт по нажатию.** `reportText` строится из `computed` при нажатии «Копировать отчёт». Между нажатиями текст отчёта нигде не хранится.

## Проверки

| Проверка | Что проверяет |
|---|---|
| `tsc` | Типы `ui`: поля результатов `domain`, параметры действий `store`, ключи и параметры `t()` |
| `tests/smoke.test.js` | Страница в jsdom: отчёт, шаблоны, формы, импорт и экспорт, язык; каждый ключ словаря используется в `src/` или разметке |
| `tests/golden.test.js` | Результаты расчёта на странице совпадают с `tests/golden.txt` |

Отсутствие присваиваний полям состояния в `ui` проверяется поиском:

```bash
grep -rnE "(state|type|obj|object|detector|gpu|camera|inputs)(\.[A-Za-z_]+|\[[^]]+\])+ *(=[^=>]|\+\+|--|\+=|-=)|\.(push|splice|pop|shift|unshift|sort|reverse)\(|delete [a-z]" src/ui src/main.tsx
```

Он находит только сортировку и `push` локальных массивов при отрисовке кольца в `system-panel.ts`.
