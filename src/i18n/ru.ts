// ---------- тексты интерфейса (правила — docs/ui-text-rules.md)
// Значение — строка или функция от параметров. Статичная разметка ссылается на ключи атрибутами
// data-t (текст), data-ta (aria-label), data-tt (title), data-tp (placeholder).
// Значение параметра текста: число или уже отформатированная строка
type Value = string | number;

export const RU = {
  // шапка
  docTitle: "Калькулятор камер",
  appTitle: "Калькулятор камер и вычислителя",
  themeLight: "Светлая тема",
  themeDark: "Тёмная тема",
  langBtn: "EN",
  langAria: "English",
  templatesBtn: "Шаблоны",
  resetBtn: "Загрузить пример",
  copyBtn: "Копировать отчёт",
  tabsAria: "Типы камер",
  // нагрузка
  loadTitle: "Нагрузка на GPU",
  addGpuLink: "+ Свой GPU",
  gpu: "GPU",
  gpuCount: "Количество",
  auto: "Авто",
  gpuAuto: "Авто: минимальная цена",
  gpuCustomMark: " (свой)",
  donutAria: "Загрузка инференса",
  donutCaption: "инференс",
  donutAriaValue: (load: Value, threshold: Value) =>
    `Загрузка инференса ${load}, порог ${threshold}`,
  bottleneckInference: "инференс",
  bottleneckDecoder: "декодирование",
  bottleneckMemory: "видеопамять",
  optimum: "оптимум по цене",
  manual: "выбрано вручную",
  insufficient: "недостаточно",
  headroom: (percent: Value) => `запас ${percent}`,
  bottleneck: (resource: Value) => `узкое место: ${resource}`,
  otherRuns: (count: Value) => `Другие запуски: ${count}`,
  free: "Свободно",
  freeSubtitle: (threshold: Value) =>
    `Порог ${threshold} отмечен риской на кольце`,
  noLoad: "Добавьте камеры и объекты с моделями.",
  gaugeDecoder: "Декодер",
  gaugeMemory: "Видеопамять",
  gaugeDecoderSubtitle: (used: Value, capacity: Value) =>
    `${used} из ${capacity} потоков`,
  gaugeMemorySubtitle: (used: Value, capacity: Value) =>
    `${used} из ${capacity} ГБ`,
  noCandidates:
    "Ни один GPU не отмечен для подбора. Отметьте GPU в «Шаблонах».",
  systemInputError:
    "Не удалось подобрать GPU: в параметрах системы или в цене GPU недопустимое значение. Проверьте коэффициент реальности, запас под рост, глубину архива и цены в «Шаблонах».",
  noFit:
    "Нагрузку не выдерживает ни один GPU даже в количестве 4. Уменьшите частоту для аналитики, используйте вырез зоны вместо тайлов, выберите модель легче или распределите камеры по нескольким серверам.",
  // результат
  resultTitle: "Результат",
  resultTitleOf: (name: Value) => `Результат · ${name}`,
  untitled: "Без названия",
  sideFigure: "Вид сбоку",
  legendFov: "Поле зрения",
  legendAxis: "Ось",
  legendZone: "Зона",
  sideAria: "Схема: камера, поле зрения и зона контроля, вид сбоку",
  pillError: "Ошибка ввода",
  inputError:
    "Проверьте исходные данные: обязательные поля заполнены, числа не меньше нуля, количество камер целое, высота камеры больше высоты плоскости интереса, размеры зоны и матрицы больше нуля.",
  kpiFocal: "Фокусное расстояние",
  kpiFocalLimit: "предел объектива",
  kpiFocalAuto: "подобрано",
  kpiFocalSet: "задано",
  kpiRotated: ", кадр повёрнут на 90°",
  kpiAngleRotated: "Угол поперёк × вдоль",
  kpiAngle: "HFOV × VFOV",
  kpiTilt: "Наклон",
  kpiTiltDown: "строго вниз",
  kpiTiltHorizon: "вниз от горизонта",
  kpiFrame: "Ширина кадра",
  kpiFrameSubtitle: "у ближнего и дальнего края",
  objectInvalid: "Укажите габариты и порог в пикселях.",
  objectAtModel: (modelPx: Value, requiredPx: Value) =>
    `на входе модели ${modelPx}, порог ${requiredPx}`,
  objectAtSensor: (sensorPx: Value, feed: Value) =>
    `на матрице ${sensorPx} · ${feed}`,
  densityHeader: "Плотность, px/м",
  across: "Поперёк",
  depth: "Вглубь",
  edgeBack: "Край зоны (назад)",
  edgeForward: "Край зоны (вперёд)",
  edgeNear: "Ближний край",
  edgeFar: "Дальний край",
  dori: ["обнаружение", "наблюдение", "распознавание", "идентификация"],
  doriBelow: "ниже обнаружения",
  exposure: "Выдержка не длиннее",
  camera: "Камера",
  status: { ok: "достаточно", warn: "на грани", bad: "недостаточно" },
  tabError: "Ошибка в исходных данных",
  tabObjects: (status: Value) => `Объекты: ${status}`,
  addType: "+ Тип камеры",
  newType: (number: Value) => `Камера ${number}`,
  // вердикт типа
  feedTiles: (count: Value, columns: Value, rows: Value, inputSize: Value) =>
    `тайлов: ${count} (${columns} × ${rows}) по ${inputSize} px`,
  feedRoi: (width: Value, height: Value, inputSize: Value) =>
    `вырез ${width} × ${height} → ${inputSize} px`,
  feedFull: (width: Value, height: Value, inputSize: Value) =>
    `кадр ${width} × ${height} → ${inputSize} px`,
  noteZoneWidth: (frameWidth: Value, zoneWidth: Value) =>
    `Зона не помещается по ширине: у ближнего края ширина кадра ${frameWidth} м, ширина зоны ${zoneWidth} м.`,
  noteZoneDepth: (requiredAngle: Value, availableAngle: Value) =>
    `Зона не помещается по глубине: требуется ${requiredAngle}° по вертикали, доступно ${availableAngle}°.`,
  noteFocalMax: (requiredFocal: Value, maxFocal: Value) =>
    `Для зоны требуется фокусное расстояние ≈ ${requiredFocal} мм, максимум объектива — ${maxFocal} мм. Расчёт выполнен для ${maxFocal} мм: кадр шире зоны, пикселей на объекте меньше.`,
  noteFocalMin: (requiredFocal: Value, minFocal: Value) =>
    `Для зоны требуется фокусное расстояние ≈ ${requiredFocal} мм, минимум объектива — ${minFocal} мм. Расчёт выполнен для ${minFocal} мм: зона не помещается в кадр целиком. Поднимите камеру, уменьшите зону или выберите объектив с большим углом обзора.`,
  noteFocalOutOfRange: (focal: Value, range: Value) =>
    `Фокусное расстояние ${focal} мм вне диапазона объектива камеры (${range} мм).`,
  noteWideAngle: (hfov: Value) =>
    `HFOV ${hfov}°: такие объективы заметно сжимают края кадра (бочкообразная дисторсия), расчёт этого не учитывает. Уменьшите коэффициент качества или поднимите камеру.`,
  noteTopView:
    "Вид сверху: детали в ячейках видны торцами, это удобно для подсчёта. Человек виден сверху (голова и плечи), действия рук различаются хуже.",
  noteLowRay: (angle: Value) =>
    `Луч на дальний край зоны идёт под углом ${angle}° к плоскости: объекты будут перекрывать друг друга. Поднимите камеру или уменьшите вынос.`,
  noteAnalyticsFps: (analyticsFps: Value, streamFps: Value) =>
    `Частота для аналитики (${analyticsFps} кадр/с) больше частоты потока (${streamFps} кадр/с). В расчёте использовано ${streamFps} кадр/с.`,
  pillNoObjects: "Нет объектов",
  pillBad: "Недостаточно",
  pillWarn: "На грани",
  pillOk: "Достаточно",
  pillCheck: "Есть замечания",
  verdictNoObjects:
    "Добавьте объект с габаритами и моделью, чтобы проверить его различимость.",
  verdictItem: (name: Value, modelPx: Value, requiredPx: Value) =>
    `${name} — ${modelPx} при пороге ${requiredPx}`,
  verdictBad: (list: Value) =>
    `Недостаточно пикселей на входе модели: ${list}.`,
  verdictWarn: (list: Value) => `На грани на входе модели: ${list}.`,
  verdictOk: (name: Value, modelPx: Value) =>
    `Все объекты различимы на входе модели. Самый мелкий: ${name} — ${modelPx}.`,
  noteDownscale: (
    name: Value,
    sensorPx: Value,
    inputSize: Value,
    advice: Value,
    neededInputSize: Value,
  ) =>
    `«${name}»: на матрице ${sensorPx}, пиксели теряются при уменьшении до входа ${inputSize} px. ${advice} или увеличьте вход до ≈ ${neededInputSize} px.`,
  adviceFull: "Выберите подачу «Вырез зоны» или «Тайлы»",
  adviceRoi: "Выберите подачу «Тайлы»",
  adviceTiles: "Проверьте размер входа",
  noteResolution: (name: Value, requiredWidthPx: Value, resolution: Value) =>
    `Для «${name}» требуется не меньше ${requiredWidthPx} px по горизонтали (${resolution}) при том же угле обзора.`,
  noteResolutionNone: (name: Value, requiredWidthPx: Value) =>
    `Для «${name}» требуется ${requiredWidthPx} px по горизонтали — больше, чем у любого разрешения из списка. Установите отдельную камеру ближе к объекту или выберите объектив с меньшим углом обзора.`,
  objDefault: "Объект",
  // система
  systemCameras: "Камеры",
  systemTypes: (count: Value, names?: Value) =>
    `Типов: ${count}${names ? ` (${names})` : ""}`,
  systemCameraCost: (cost: Value) => ` · стоимость камер ${cost}`,
  systemObjects: "Объекты различимы",
  systemOfTotal: (okCount: Value, total: Value) => `${okCount} из ${total}`,
  systemSmallest: (name: Value, modelPx: Value) =>
    `Самый мелкий: ${name}, ${modelPx} px`,
  systemNoObjects: "Нет объектов",
  systemCompute: "Вычислитель",
  systemNoCameras: "Нет камер",
  systemNetwork: "Сетевой поток",
  systemPort: (port: Value, poeWatts: Value) =>
    `Порт ${port} · PoE ≈ ${poeWatts} Вт`,
  // сеть и допущения
  networkTitle: "Сеть и хранение",
  archiveDays: "Глубина архива, дн.",
  networkType: "Тип камеры",
  networkCameras: "Камеры",
  networkResolution: "Разрешение",
  networkFps: "Кадр/с",
  networkPerCamera: "На камеру",
  networkAll: "Всего",
  networkTotal: "Итого",
  networkArchive: "Архив",
  networkArchiveValue: (terabytes: Value, days: Value) =>
    `≈ ${terabytes} ТБ за ${days} дн.`,
  networkArchiveOff: "Не ведётся",
  assumptionsTitle: "Допущения",
  assumptions: (efficiency: Value) => [
    `Коэффициент реальности ${efficiency} к замеренной скорости`,
    "Модели из каталога: замеры Ultralytics на T4",
    "Декодер: производительность NVDEC по поколению GPU",
    "Стоимость сервера для GPU не учитывается",
  ],
  formulas: "Все формулы",
  systemTitle: "Система",
  // параметры типа
  parametersTitle: "Параметры типа",
  typeName: "Название",
  typeCount: "Количество камер",
  sectionGeometry: "Геометрия",
  cameraHeight: "Высота камеры, м",
  planeHeight: "Высота плоскости интереса, м",
  zoneStart: "Вынос до зоны, м",
  margin: "Запас кадра, %",
  zoneDepth: "Глубина зоны, м",
  zoneWidth: "Ширина зоны, м",
  placement: "Положение камеры",
  placementSide: "Сбоку, под углом",
  placementTop: "Над центром",
  summarySide: "сбоку",
  summaryTop: "сверху",
  sectionCamera: "Матрица и объектив",
  cameraSelect: "Камера",
  addCameraLink: "+ Своя камера",
  cameraManual: "Ручная настройка матрицы",
  resolution: "Разрешение",
  sensor: "Формат матрицы",
  sensorWidth: "Ширина матрицы, мм",
  pixelPitch: "Размер пикселя, мкм",
  sensorByPixelPitch: "По размеру пикселя",
  sensorCustom: "Своя ширина",
  orientation: "Ориентация кадра",
  orientationLandscape: "Длинная сторона поперёк взгляда",
  orientationPortrait: "Поворот на 90°",
  lensMode: "Объектив",
  lensModeAria: "Режим объектива",
  lensModeAuto: "Подбор",
  lensModeFocal: "Фокусное расстояние",
  lensModeAngle: "Угол HFOV",
  focalLength: "Фокусное расстояние, мм",
  hfov: "HFOV, °",
  sectionStream: "Поток и качество",
  fps: "Частота кадров потока, кадр/с",
  analyticsFps: "Частота для аналитики, кадр/с",
  codec: "Кодек",
  scene: "Движение в сцене",
  sceneLow: "Спокойное",
  sceneMid: "Обычное",
  sceneHigh: "Активное",
  lensFactor: "Коэффициент качества",
  speed: "Скорость движения, м/с",
  blurPx: "Допустимый смаз, px",
  duplicateTypeBtn: "Дублировать тип",
  deleteTypeBtn: "Удалить тип",
  deleteTypeConfirm: "Подтвердить удаление",
  copySuffix: " (копия)",
  // объекты
  objectsTitle: "Объекты и модели",
  addObject: "+ Объект",
  presets: "Шаблоны:",
  addDetectorLink: "+ Свой детектор",
  objectsFooter:
    "Объекты с одной моделью и одной подачей считаются одним запуском.",
  objectName: "Название объекта",
  objectDelete: "Удалить объект",
  objectWidth: "Ширина, см",
  objectLength: "Длина, см",
  objectHeight: "Высота, см",
  objectRequiredPx: "Порог, px",
  objectModel: "Модель",
  objectFeed: "Подача",
  objectInput: "Вход модели, px",
  objectOverlap: "Перекрытие, %",
  ultralytics: "Каталог Ultralytics",
  customDetectors: "Свои детекторы",
  feeds: { roi: "Вырез зоны", tiles: "Тайлы", full: "Весь кадр" },
  feedsShort: { roi: "вырез", tiles: "тайлы", full: "весь кадр" },
  presetNames: [
    "Человек",
    "Кисть руки",
    "Ячейка ложемента",
    "Деталь",
    "Гайка M8",
  ],
  typeNames: ["Рабочее место", "Тележка"],
  // справочники
  units: {
    m: "м",
    mm: "мм",
    s: "с",
    fps: "кадр/с",
    pxm: "px/м",
    mbps: "Мбит/с",
    gbps: "Гбит/с",
    gb: "ГБ",
    w: "Вт",
  },
  megapixels: (megapixels: Value) => `${megapixels} Мп`,
  sensorFormat: (format: Value, widthMm: Value) => `${format} ≈ ${widthMm} мм`,
  builtinCameraNames: {
    k4: "Типовая 4 Мп · 1/2.7″ · 2,8–12 мм",
    k8: "Типовая 8 Мп · 1/1.8″ · 2,8–12 мм",
  },
  gpuNotes: {
    5090: "Уличная цена на октябрь 2026. Рекомендованная цена NVIDIA — $1 999.",
    pro6000:
      "FP16 dense оценён как 4 PFLOPS FP4 / 8 по соотношению у RTX 5090.",
    agx: "Отдельный модуль. Память общая с CPU, для моделей доступно 60%. FP16 оценён как 16 SM × 2048 FLOP/такт × 1,3 ГГц.",
  },
  decoderStreams: (count: Value) => `потоков: ${count}`,
  // шаблоны
  back: "← К расчёту",
  toCalculation: "К расчёту",
  templatesTitle: "Шаблоны",
  templatesNav: "Разделы шаблонов",
  templateTabGpus: "GPU",
  templateTabCameras: "Камеры",
  templateTabDetectors: "Детекторы",
  exportBtn: "Экспорт",
  exportTitle: "Сохранить шаблоны, цены и расчёт в файл",
  importBtn: "Импорт",
  importTitle: "Заменить все данные содержимым файла",
  importConfirm: "Заменить все данные",
  catalogTitle: (count: Value) => `Каталог GPU · ${count}`,
  catalogTitleNoCount: "Каталог GPU",
  catalogNote: "Характеристики из даташитов NVIDIA",
  efficiency: "Коэффициент реальности",
  reserve: "Запас под рост, %",
  gpuTableHeader: [
    "GPU",
    "FP16, TFLOPS",
    "Декодер",
    "Память",
    "TDP",
    "Цена, $",
    "В подборе",
  ],
  gpuJetson: "Модуль Jetson",
  gpuCustom: "свой",
  gpuPriceAria: (name: Value) => `Цена ${name}, $`,
  gpuEnabledAria: (name: Value) => `${name} участвует в подборе`,
  deleteBtn: "Удалить",
  deleteAria: (name: Value) => `Удалить ${name}`,
  customGpusTitle: (count: Value) => `Свои GPU · ${count}`,
  customGpusTitleNoCount: "Свои GPU",
  customGpusEmpty:
    "Своих GPU нет. Добавленный GPU появится здесь, в списке «GPU» и в автоподборе.",
  gpuFormTitle: "Новый GPU",
  gpuFormName: "Название",
  gpuFormNamePlaceholder: "Например, RTX 6000 Ada",
  gpuFormArchitecture: "Архитектура",
  gpuFormJetson: "Jetson или свой декодер",
  gpuFormTflops: "FP16 Tensor, TFLOPS",
  gpuFormTflopsPlaceholder: "Без sparsity",
  gpuFormDecoders: "Число NVDEC",
  gpuFormDecoderStreams: "Потоки 1080p30 H.265",
  gpuFormMemory: "Память, ГБ",
  gpuFormTdp: "TDP, Вт",
  gpuFormPrice: "Цена, $",
  gpuFormPricePlaceholder: "Цена поставщика",
  gpuFormEnabled: "Участвует в автоподборе",
  hintWhere: "Где взять значения",
  gpuFormHint1:
    "FP16 Tensor: значение из даташита NVIDIA без sparsity. Значение со звёздочкой (with sparsity) разделите на 2. Для GeForce используйте FP16 с FP32-накоплением.",
  gpuFormHint2:
    "NVDEC: число аппаратных декодеров. Для Jetson укажите число потоков 1080p30 H.265 из спецификации.",
  addGpuBtn: "Добавить GPU",
  gpuFormError: (fields: Value) => `Заполните поля: ${fields}.`,
  errorName: "название",
  errorTflops: "FP16 Tensor",
  errorDecoderStreams: "потоки декодера",
  errorDecoders: "число NVDEC",
  errorMemory: "память",
  errorTdp: "TDP",
  errorPrice: "цена (нужна для сравнения в подборе)",
  gpuAdded: (name: Value) => `«${name}» добавлен`,
  gpuDeleted: "GPU удалён",
  camerasTitle: (count: Value) => `Камеры · ${count}`,
  camerasTitleNoCount: "Камеры",
  camerasNote: "Выбираются в параметрах типа, раздел «Матрица и объектив»",
  cameraTableHeader: [
    "Камера",
    "Кадр",
    "Матрица",
    "Объектив",
    "Цена",
    "В системе",
  ],
  cameraCustom: "Своя",
  cameraBuiltin: "Типовая, пример",
  cameraAnyLens: "Любой",
  cameraFormTitle: "Новая камера",
  cameraFormNamePlaceholder: "Модель из каталога производителя",
  cameraFormWidth: "Ширина кадра, px",
  cameraFormHeight: "Высота кадра, px",
  cameraFormSensorWidth: "Ширина матрицы, мм",
  cameraFormPixelPitch: "Размер пикселя, мкм",
  cameraFormFocalMin: "Фокусное расстояние от, мм",
  cameraFormFocalMax: "Фокусное расстояние до, мм",
  cameraFormPrice: "Цена, $",
  optional: "Необязательно",
  cameraFormHint1:
    "Ширина матрицы: ширина активной области сенсора из даташита. Если её нет, укажите размер пикселя — ширина будет рассчитана как размер пикселя × ширина кадра.",
  cameraFormHint2:
    "Для объектива с фиксированным фокусным расстоянием укажите одно значение в обоих полях. Если поля пустые, фокусное расстояние подбирается без ограничений.",
  addCameraBtn: "Добавить камеру",
  cameraFormError: (fields: Value) => `Укажите: ${fields}.`,
  errorFrame: "размер кадра в пикселях",
  errorSensorWidth: "ширину матрицы или размер пикселя",
  errorFocal: "фокусное расстояние",
  errorFocalRange: "фокусное расстояние «от» не больше «до»",
  errorCameraPrice: "цену",
  cameraAdded: (name: Value) => `«${name}» добавлена`,
  cameraDeleted: "Камера удалена",
  detectorsTitle: (count: Value) => `Детекторы · ${count}`,
  detectorsTitleNoCount: "Детекторы",
  detectorsNote: "Выбираются в карточке объекта, поле «Модель»",
  detectorTableHeader: ["Модель", "Вход", "GFLOPs", "Скорость", "Объекты"],
  detectorCustom: "Свой",
  detectorCatalog: "Каталог Ultralytics",
  detectorSpeed: (fps: Value, gpuName: Value) => `${fps} кадр/с на ${gpuName}`,
  detectorsEmpty:
    "Своих детекторов нет. Добавьте детектор в форме «Новый детектор».",
  detectorFormTitle: "Новый детектор",
  detectorFormNamePlaceholder: "Например, детектор деталей v2",
  detectorFormFps: "Замер, кадр/с",
  detectorFormFpsPlaceholder: "На одном GPU",
  detectorFormInput: "Вход модели, px",
  detectorFormRefGpu: "GPU замера",
  detectorFormGflops: "GFLOPs на кадр",
  detectorFormGflopsPlaceholder: "Необязательно, для оценки памяти",
  hintHow: "Как выполнить замер",
  detectorFormHint1:
    "Измерьте число кадров в секунду на одном GPU в TensorRT с той же точностью и batch, что и в эксплуатации: trtexec, DeepStream perf или собственный бенчмарк.",
  detectorFormHint2:
    "Для других GPU замер пересчитывается по FP16, для другого входа — по квадрату его стороны.",
  addDetectorBtn: "Добавить детектор",
  errorFps: "замер",
  errorGflops: "GFLOPs на кадр",
  detectorAdded: (name: Value) => `«${name}» добавлен`,
  detectorDeleted: "Детектор удалён",
  // отчёт
  reportError: (name: Value, count: Value) =>
    `${name} × ${count}: ошибка в исходных данных`,
  reportCamera: (params: {
    cameraLabel: string;
    rotated: boolean;
    sensorWidth: Value;
    focal: Value;
    hfov: Value;
    tilt: Value;
    overCenter: boolean;
    zoneStart: Value;
    cameraHeight: Value;
    zoneWidth: Value;
    zoneDepth: Value;
  }) =>
    `  Камера: ${params.cameraLabel}${params.rotated ? " (повёрнута на 90°)" : ""}, матрица ${params.sensorWidth} мм, f ${params.focal} мм, HFOV ${params.hfov}°, наклон ${params.tilt}°, ${params.overCenter ? "над центром зоны" : `вынос ${params.zoneStart} м`}, высота ${params.cameraHeight} м, зона ${params.zoneWidth} × ${params.zoneDepth} м`,
  reportObject: (params: {
    name: string;
    model: string;
    feed: string;
    sensorPx: string;
    modelPx: string;
    requiredPx: Value;
    status: string;
  }) =>
    `  ${params.name}: ${params.model}, ${params.feed}; на матрице ${params.sensorPx}, на входе модели ${params.modelPx}, порог ${params.requiredPx}: ${params.status}`,
  reportStream: (mbps: Value, shutterDenominator: Value) =>
    `  Поток ${mbps} Мбит/с на камеру, выдержка не длиннее 1/${shutterDenominator} с`,
  reportSystem: (cameraCount: Value, mbps: Value, cost: Value) =>
    `Система: камер ${cameraCount}, ${mbps} Мбит/с${cost ? `, стоимость камер ${cost}` : ""}`,
  reportCompute: (params: {
    gpuCount: Value;
    gpuName: string;
    cost: Value;
    inferenceLoad: Value;
    decodeLoad: Value;
    memoryUsed: Value;
    memoryCap: Value;
    optimum: string;
  }) =>
    `Вычислитель (оценка): ${params.gpuCount} × ${params.gpuName}, ${params.cost}; инференс ${params.inferenceLoad}%, декодер ${params.decodeLoad}%, видеопамять ${params.memoryUsed}/${params.memoryCap} ГБ${params.optimum ? `; оптимум по цене: ${params.optimum}` : ""}`,
  reportNoCompute: "Вычислитель: нет данных",
  reportComputeError: "Вычислитель: ошибка в исходных данных",
  // уведомления
  stale: "Данные изменены в другой вкладке. Обновите страницу.",
  typeCopied: "Тип скопирован",
  typeDeleted: "Тип удалён",
  lastType: "Должен остаться хотя бы один тип камеры.",
  exampleLoaded: "Загружен пример. Свои шаблоны сохранены.",
  reportCopied: "Отчёт скопирован",
  copyFail:
    "Не удалось скопировать отчёт: браузер запретил доступ к буферу обмена.",
  badFile: "Файл не является сохранением калькулятора.",
  saveFail: "Не удалось сохранить данные: браузер запретил запись.",
  readFail: "Не удалось прочитать файл.",
  tipAria: "Подсказка",
  // схема
  diagramZone: (depth: Value) => `Зона контроля ${depth} м`,
  diagramFrame: (width: Value) => `Кадр ${width} м`,
  diagramTilt: (degrees: Value) => `Наклон ${degrees}°`,
  diagramLength: (length: Value) => `${length} м`,
  diagramOffset: (offset: Value) => `Вынос ${offset} м`,
  diagramDepth: (depth: Value) => `Глубина зоны ${depth} м`,
  diagramOverCenter: "Камера над центром зоны",
  diagramOverZone: "Камера над зоной",
  diagramCameraHeight: (height: Value) => `H ${height} м`,
  diagramPlaneHeight: (height: Value) => `h ${height} м`,
  diagramAria: (params: {
    H: Value;
    tilt: Value;
    vfov: Value;
    x1: Value;
    x2: Value;
    h: Value;
    frameWidthNear: Value | false;
    frameWidthFar: Value;
  }) =>
    `Вид сбоку: камера на высоте ${params.H} м, наклон ${params.tilt}°, VFOV ${params.vfov}°, зона от ${params.x1} до ${params.x2} м на высоте ${params.h} м` +
    (params.frameWidthNear
      ? `, ширина кадра ${params.frameWidthNear}–${params.frameWidthFar} м`
      : ""),
  // подсказки «?»
  tips: {
    typeName:
      "Название типа камеры, например «Рабочее место» или «Тележка». Тип — группа одинаковых камер с одной задачей: общие геометрия, матрица, поток и объекты.",
    typeCount:
      "Количество камер этого типа в системе. Влияет на сетевой поток, декодирование и нагрузку на GPU, но не на пиксели на объекте.",
    camera:
      "Камера из «Шаблонов»: разрешение и матрица берутся из неё, а требуемое фокусное расстояние проверяется по диапазону её объектива. «Ручная настройка матрицы» — разрешение и матрица задаются вручную.",
    gpuFormTflops:
      "FP16 Tensor из даташита NVIDIA без sparsity. Если значение отмечено звёздочкой «with sparsity», разделите его на 2. Для GeForce используйте FP16 с FP32-накоплением: оно вдвое меньше FP16-накопления.",
    gpuFormArchitecture:
      "Архитектура задаёт производительность одного аппаратного декодера NVDEC. Для Jetson выберите «Jetson или свой декодер» и укажите число потоков 1080p30 из спецификации.",
    detectorFormFps:
      "Число кадров в секунду, которое модель обрабатывает на одном GPU в TensorRT с той же точностью и batch, что и в эксплуатации.",
    cameraFormSensorWidth:
      "Ширина активной области сенсора из даташита. Если её нет, оставьте поле пустым и укажите размер пикселя.",
    cameraHeight:
      "Высота объектива над полом. Измерьте лазерным дальномером от пола до точки крепления. Чем выше камера, тем меньше перекрытий объектов, но ниже плотность пикселей.",
    planeHeight:
      "Высота поверхности, на которой находятся объекты контроля: столешница ≈ 0,85–0,9 м, верх ложемента тележки. Для рук работника — ≈ 1,0–1,2 м. Весь расчёт выполняется для этой плоскости.",
    placement:
      "Сбоку — камера направлена под углом, видны и человек, и объекты. Над центром — камера направлена строго вниз: лучший вид на ячейки тележки, но человек виден сверху и действия рук различаются хуже.",
    zoneStart:
      "Расстояние по полу от точки под камерой до ближнего края зоны. Отрицательное значение — камера находится над частью зоны.",
    zoneDepth:
      "Размер зоны вдоль направления взгляда камеры, от ближнего края до дальнего.",
    zoneWidth: "Размер зоны поперёк направления взгляда камеры.",
    orientation:
      "Камеру можно повернуть на 90°, чтобы длинная сторона кадра совпала с длинной стороной зоны. «Авто» выбирает вариант, при котором на метр зоны приходится больше пикселей. Поворот поддерживают многие корпусные камеры (режим «коридор»). Для купольных камер проверьте возможность поворота модуля.",
    margin:
      "Запас, чтобы зона не доходила до краёв кадра: там ниже резкость и сильнее дисторсия, а при монтаже камера может сместиться. Типичное значение — 10–20%.",
    resolution:
      "Разрешение потока, который обрабатывает аналитика. Если модель получает субпоток, укажите разрешение субпотока.",
    sensor:
      "Дюймовый формат матрицы условный, у разных производителей размеры отличаются. Точнее всего — режим «По размеру пикселя» с данными из даташита сенсора.",
    sensorWidth:
      "Ширина области матрицы, которая формирует видео в выбранном разрешении. В даташите сенсора — effective или active area.",
    pixelPitch:
      "Размер пикселя из даташита сенсора (pixel size, мкм), например 2,0 мкм у IMX334. Ширина матрицы = размер пикселя × число пикселей по горизонтали.",
    lensMode:
      "«Подбор» — калькулятор подбирает угол обзора под зону. «Фокусное расстояние» или «Угол HFOV» — проверка конкретной камеры из каталога.",
    focalLength:
      "Фокусное расстояние объектива из даташита камеры. Для вариофокального объектива проверьте оба конца диапазона.",
    hfov: "Горизонтальный угол обзора из даташита. Не путайте его с диагональным (DFOV): диагональный больше и часто указан крупнее.",
    objects:
      "Карточка для каждого объекта: габариты (ширина поперёк взгляда камеры, длина вдоль, высота), модель, которая его обнаруживает, подача кадра в модель, размер входа и порог в пикселях на меньшую сторону объекта. Результат отображается в карточке. Объекты с одной моделью и одной подачей считаются одним запуском: нагрузка не удваивается.",
    lensFactor:
      "Доля номинального разрешения, которая доходит до модели после сжатия, оптики и дисторсии. 0,7 — качественная камера с высоким битрейтом, 0,6 — типичное значение, 0,5 — широкоугольный объектив или вид сверху.",
    speed:
      "Скорость самого быстрого движения, которое должно быть видно без смаза: руки при работе ≈ 1 м/с, идущий человек ≈ 1,5 м/с.",
    blurPx:
      "Допустимый смаз в пикселях. Для детекции — 1–2 px, для чтения маркировки — не больше 0,5–1 px.",
    fps: "Частота кадров потока для аналитики. Для фиксации событий с точностью ≈ 1 с достаточно 5–10 кадр/с, для отслеживания действий рук — 10–15 кадр/с.",
    codec:
      "H.265 даёт примерно вдвое меньший поток при том же качестве. H.264 используйте, если декодер сервера не поддерживает H.265.",
    scene:
      "Битрейт растёт с движением в кадре. Спокойная сцена — пустой склад, обычная — рабочее место, активная — проходы с большим числом людей и техники.",
    analyticsFps:
      "Число кадров в секунду с каждой камеры, которое проходит через модели. Присутствие человека — 2–5 кадр/с, учёт деталей и такта — 5–10 кадр/с. Не больше частоты кадров потока.",
    efficiency:
      "Доля замеренной скорости, которая сохраняется в реальной системе с учётом декодирования, пред- и постобработки, трекинга, записи в БД и пиков нагрузки. 0,7 — отлаженный DeepStream/TensorRT, 0,5–0,6 — типичное значение, 0,4 — Python-пайплайн без оптимизации.",
    gpu: "«Авто» перебирает все отмеченные GPU в количестве от 1 до 4 и выбирает самую дешёвую конфигурацию, которая выдерживает нагрузку с запасом и помещается в видеопамять. Список GPU, цены и свои GPU — в «Шаблонах».",
    gpuCount:
      "Количество GPU. «Авто» — минимальное количество, которое выдерживает нагрузку. Два недорогих GPU часто выгоднее одного дорогого.",
    reserve:
      "Доля мощности, которая остаётся свободной под рост: новые камеры, вторая модель, пики нагрузки. При 20% загрузка инференса и декодера не превышает ≈ 83%.",
    archiveDays:
      "Сколько дней хранить видео. 0 — видео не записывается, хранятся только события аналитики.",
  },
};

export type Dictionary = typeof RU;
