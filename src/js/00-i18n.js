// ---------- тексты интерфейса (правила — docs/ui-text-rules.md)
// Значение — строка или функция от параметров. Статичная разметка ссылается на ключи атрибутами
// data-t (текст), data-ta (aria-label), data-tt (title), data-tp (placeholder).
const RU = {
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
  donutAriaValue: (load, threshold) =>
    `Загрузка инференса ${load}, порог ${threshold}`,
  bottleneckInference: "инференс",
  bottleneckDecoder: "декодирование",
  bottleneckMemory: "видеопамять",
  optimum: "оптимум по цене",
  manual: "выбрано вручную",
  insufficient: "недостаточно",
  headroom: (percent) => `запас ${percent}`,
  bottleneck: (resource) => `узкое место: ${resource}`,
  otherRuns: (count) => `Другие запуски: ${count}`,
  free: "Свободно",
  freeSubtitle: (threshold) => `Порог ${threshold} отмечен риской на кольце`,
  noLoad: "Добавьте камеры и объекты с моделями.",
  gaugeDecoder: "Декодер",
  gaugeMemory: "Видеопамять",
  gaugeDecoderSubtitle: (used, capacity) => `${used} из ${capacity} потоков`,
  gaugeMemorySubtitle: (used, capacity) => `${used} из ${capacity} ГБ`,
  noCandidates:
    "Ни один GPU не отмечен для подбора. Отметьте GPU в «Шаблонах».",
  noFit:
    "Нагрузку не выдерживает ни один GPU даже в количестве 4. Уменьшите частоту для аналитики, используйте вырез зоны вместо тайлов, выберите модель легче или распределите камеры по нескольким серверам.",
  // результат
  resultTitle: "Результат",
  resultTitleOf: (name) => `Результат · ${name}`,
  untitled: "Без названия",
  sideFigure: "Вид сбоку",
  legendFov: "Поле зрения",
  legendAxis: "Ось",
  legendZone: "Зона",
  sideAria: "Схема: камера, поле зрения и зона контроля, вид сбоку",
  pillError: "Ошибка ввода",
  inputError:
    "Проверьте исходные данные: высота камеры должна быть больше высоты плоскости интереса, а размеры зоны и матрицы — больше нуля.",
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
  objectAtModel: (modelPx, requiredPx) =>
    `на входе модели ${modelPx}, порог ${requiredPx}`,
  objectAtSensor: (sensorPx, feed) => `на матрице ${sensorPx} · ${feed}`,
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
  tabObjects: (status) => `Объекты: ${status}`,
  addType: "+ Тип камеры",
  newType: (number) => `Камера ${number}`,
  // вердикт типа
  feedTiles: (count, columns, rows, inputSize) =>
    `тайлов: ${count} (${columns} × ${rows}) по ${inputSize} px`,
  feedRoi: (width, height, inputSize) =>
    `вырез ${width} × ${height} → ${inputSize} px`,
  feedFull: (width, height, inputSize) =>
    `кадр ${width} × ${height} → ${inputSize} px`,
  noteZoneWidth: (frameWidth, zoneWidth) =>
    `Зона не помещается по ширине: у ближнего края ширина кадра ${frameWidth} м, ширина зоны ${zoneWidth} м.`,
  noteZoneDepth: (requiredAngle, availableAngle) =>
    `Зона не помещается по глубине: требуется ${requiredAngle}° по вертикали, доступно ${availableAngle}°.`,
  noteFocalMax: (requiredFocal, maxFocal) =>
    `Для зоны требуется фокусное расстояние ≈ ${requiredFocal} мм, максимум объектива — ${maxFocal} мм. Расчёт выполнен для ${maxFocal} мм: кадр шире зоны, пикселей на объекте меньше.`,
  noteFocalMin: (requiredFocal, minFocal) =>
    `Для зоны требуется фокусное расстояние ≈ ${requiredFocal} мм, минимум объектива — ${minFocal} мм. Расчёт выполнен для ${minFocal} мм: зона не помещается в кадр целиком. Поднимите камеру, уменьшите зону или выберите объектив с большим углом обзора.`,
  noteFocalOutOfRange: (focal, range) =>
    `Фокусное расстояние ${focal} мм вне диапазона объектива камеры (${range} мм).`,
  noteWideAngle: (hfov) =>
    `HFOV ${hfov}°: такие объективы заметно сжимают края кадра (бочкообразная дисторсия), расчёт этого не учитывает. Уменьшите коэффициент качества или поднимите камеру.`,
  noteTopView:
    "Вид сверху: детали в ячейках видны торцами, это удобно для подсчёта. Человек виден сверху (голова и плечи), действия рук различаются хуже.",
  noteLowRay: (angle) =>
    `Луч на дальний край зоны идёт под углом ${angle}° к плоскости: объекты будут перекрывать друг друга. Поднимите камеру или уменьшите вынос.`,
  noteAnalyticsFps: (analyticsFps, streamFps) =>
    `Частота для аналитики (${analyticsFps} кадр/с) больше частоты потока (${streamFps} кадр/с). В расчёте использовано ${streamFps} кадр/с.`,
  pillNoObjects: "Нет объектов",
  pillBad: "Недостаточно",
  pillWarn: "На грани",
  pillOk: "Достаточно",
  pillCheck: "Есть замечания",
  verdictNoObjects:
    "Добавьте объект с габаритами и моделью, чтобы проверить его различимость.",
  verdictItem: (name, modelPx, requiredPx) =>
    `${name} — ${modelPx} при пороге ${requiredPx}`,
  verdictBad: (list) => `Недостаточно пикселей на входе модели: ${list}.`,
  verdictWarn: (list) => `На грани на входе модели: ${list}.`,
  verdictOk: (name, modelPx) =>
    `Все объекты различимы на входе модели. Самый мелкий: ${name} — ${modelPx}.`,
  noteDownscale: (name, sensorPx, inputSize, advice, neededInputSize) =>
    `«${name}»: на матрице ${sensorPx}, пиксели теряются при уменьшении до входа ${inputSize} px. ${advice} или увеличьте вход до ≈ ${neededInputSize} px.`,
  adviceFull: "Выберите подачу «Вырез зоны» или «Тайлы»",
  adviceRoi: "Выберите подачу «Тайлы»",
  adviceTiles: "Проверьте размер входа",
  noteResolution: (name, requiredWidthPx, resolution) =>
    `Для «${name}» требуется не меньше ${requiredWidthPx} px по горизонтали (${resolution}) при том же угле обзора.`,
  noteResolutionNone: (name, requiredWidthPx) =>
    `Для «${name}» требуется ${requiredWidthPx} px по горизонтали — больше, чем у любого разрешения из списка. Установите отдельную камеру ближе к объекту или выберите объектив с меньшим углом обзора.`,
  objDefault: "Объект",
  // система
  systemCameras: "Камеры",
  systemTypes: (count, names) => `Типов: ${count}${names ? ` (${names})` : ""}`,
  systemCameraCost: (cost) => ` · стоимость камер ${cost}`,
  systemObjects: "Объекты различимы",
  systemOfTotal: (okCount, total) => `${okCount} из ${total}`,
  systemSmallest: (name, modelPx) => `Самый мелкий: ${name}, ${modelPx} px`,
  systemNoObjects: "Нет объектов",
  systemCompute: "Вычислитель",
  systemNoCameras: "Нет камер",
  systemNetwork: "Сетевой поток",
  systemPort: (port, poeWatts) => `Порт ${port} · PoE ≈ ${poeWatts} Вт`,
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
  networkArchiveValue: (terabytes, days) => `≈ ${terabytes} ТБ за ${days} дн.`,
  networkArchiveOff: "Не ведётся",
  assumptionsTitle: "Допущения",
  assumptions: (efficiency) => [
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
  megapixels: (megapixels) => `${megapixels} Мп`,
  sensorFormat: (format, widthMm) => `${format} ≈ ${widthMm} мм`,
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
  decoderStreams: (count) => `потоков: ${count}`,
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
  catalogTitle: (count) => `Каталог GPU · ${count}`,
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
  gpuPriceAria: (name) => `Цена ${name}, $`,
  gpuEnabledAria: (name) => `${name} участвует в подборе`,
  deleteBtn: "Удалить",
  deleteAria: (name) => `Удалить ${name}`,
  customGpusTitle: (count) => `Свои GPU · ${count}`,
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
  gpuFormError: (fields) => `Заполните поля: ${fields}.`,
  errorName: "название",
  errorTflops: "FP16 Tensor",
  errorDecoderStreams: "потоки декодера",
  errorDecoders: "число NVDEC",
  errorMemory: "память",
  errorPrice: "цена (нужна для сравнения в подборе)",
  gpuAdded: (name) => `«${name}» добавлен`,
  gpuDeleted: "GPU удалён",
  camerasTitle: (count) => `Камеры · ${count}`,
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
  cameraFormError: (fields) => `Укажите: ${fields}.`,
  errorFrame: "размер кадра в пикселях",
  errorSensorWidth: "ширину матрицы или размер пикселя",
  errorFocalRange: "фокусное расстояние «от» не больше «до»",
  cameraAdded: (name) => `«${name}» добавлена`,
  cameraDeleted: "Камера удалена",
  detectorsTitle: (count) => `Детекторы · ${count}`,
  detectorsTitleNoCount: "Детекторы",
  detectorsNote: "Выбираются в карточке объекта, поле «Модель»",
  detectorTableHeader: ["Модель", "Вход", "GFLOPs", "Скорость", "Объекты"],
  detectorCustom: "Свой",
  detectorCatalog: "Каталог Ultralytics",
  detectorSpeed: (fps, gpuName) => `${fps} кадр/с на ${gpuName}`,
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
  detectorAdded: (name) => `«${name}» добавлен`,
  detectorDeleted: "Детектор удалён",
  // отчёт
  reportError: (name, count) => `${name} × ${count}: ошибка в исходных данных`,
  reportCamera: (params) =>
    `  Камера: ${params.cameraLabel}${params.rotated ? " (повёрнута на 90°)" : ""}, матрица ${params.sensorWidth} мм, f ${params.focal} мм, HFOV ${params.hfov}°, наклон ${params.tilt}°, ${params.overCenter ? "над центром зоны" : `вынос ${params.zoneStart} м`}, высота ${params.cameraHeight} м, зона ${params.zoneWidth} × ${params.zoneDepth} м`,
  reportObject: (params) =>
    `  ${params.name}: ${params.model}, ${params.feed}; на матрице ${params.sensorPx}, на входе модели ${params.modelPx}, порог ${params.requiredPx}: ${params.status}`,
  reportStream: (mbps, shutterDenominator) =>
    `  Поток ${mbps} Мбит/с на камеру, выдержка не длиннее 1/${shutterDenominator} с`,
  reportSystem: (cameraCount, mbps, cost) =>
    `Система: камер ${cameraCount}, ${mbps} Мбит/с${cost ? `, стоимость камер ${cost}` : ""}`,
  reportCompute: (params) =>
    `Вычислитель (оценка): ${params.gpuCount} × ${params.gpuName}, ${params.cost}; инференс ${params.inferenceLoad}%, декодер ${params.decodeLoad}%, видеопамять ${params.memoryUsed}/${params.memoryCap} ГБ${params.optimum ? `; оптимум по цене: ${params.optimum}` : ""}`,
  reportNoCompute: "Вычислитель: нет данных",
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
  diagramZone: (depth) => `Зона контроля ${depth} м`,
  diagramFrame: (width) => `Кадр ${width} м`,
  diagramTilt: (degrees) => `Наклон ${degrees}°`,
  diagramLength: (length) => `${length} м`,
  diagramOffset: (offset) => `Вынос ${offset} м`,
  diagramDepth: (depth) => `Глубина зоны ${depth} м`,
  diagramOverCenter: "Камера над центром зоны",
  diagramOverZone: "Камера над зоной",
  diagramCameraHeight: (height) => `H ${height} м`,
  diagramPlaneHeight: (height) => `h ${height} м`,
  diagramAria: (params) =>
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
const EN = {
  // шапка
  docTitle: "Camera calculator",
  appTitle: "Camera and compute calculator",
  themeLight: "Light theme",
  themeDark: "Dark theme",
  langBtn: "RU",
  langAria: "Русский",
  templatesBtn: "Templates",
  resetBtn: "Load example",
  copyBtn: "Copy report",
  tabsAria: "Camera types",
  // нагрузка
  loadTitle: "GPU load",
  addGpuLink: "+ Custom GPU",
  gpu: "GPU",
  gpuCount: "Count",
  auto: "Auto",
  gpuAuto: "Auto: lowest price",
  gpuCustomMark: " (custom)",
  donutAria: "Inference load",
  donutCaption: "inference",
  donutAriaValue: (load, threshold) =>
    `Inference load ${load}, threshold ${threshold}`,
  bottleneckInference: "inference",
  bottleneckDecoder: "decoding",
  bottleneckMemory: "GPU memory",
  optimum: "best price",
  manual: "manual selection",
  insufficient: "insufficient",
  headroom: (percent) => `headroom ${percent}`,
  bottleneck: (resource) => `bottleneck: ${resource}`,
  otherRuns: (count) => `Other inference runs: ${count}`,
  free: "Free",
  freeSubtitle: (threshold) => `Threshold ${threshold} is marked on the ring`,
  noLoad: "Add cameras and objects with models.",
  gaugeDecoder: "Decoder",
  gaugeMemory: "GPU memory",
  gaugeDecoderSubtitle: (used, capacity) => `${used} of ${capacity} streams`,
  gaugeMemorySubtitle: (used, capacity) => `${used} of ${capacity} GB`,
  noCandidates:
    'No GPU is selected for auto-selection. Select GPUs in "Templates".',
  noFit:
    "No GPU can handle the load, even 4 of them. Lower the analytics frame rate, use zone crop instead of tiles, choose a lighter model, or split the cameras across several servers.",
  // результат
  resultTitle: "Result",
  resultTitleOf: (name) => `Result · ${name}`,
  untitled: "Untitled",
  sideFigure: "Side view",
  legendFov: "Field of view",
  legendAxis: "Axis",
  legendZone: "Zone",
  sideAria: "Diagram: camera, field of view, and monitored zone, side view",
  pillError: "Input error",
  inputError:
    "Check the input data: the camera height must be greater than the target plane height, and the zone and sensor sizes must be greater than zero.",
  kpiFocal: "Focal length",
  kpiFocalLimit: "lens limit",
  kpiFocalAuto: "selected",
  kpiFocalSet: "set",
  kpiRotated: ", frame rotated 90°",
  kpiAngleRotated: "Angle across × along",
  kpiAngle: "HFOV × VFOV",
  kpiTilt: "Tilt",
  kpiTiltDown: "straight down",
  kpiTiltHorizon: "below horizontal",
  kpiFrame: "Frame width",
  kpiFrameSubtitle: "at the near and far edge",
  objectInvalid: "Enter the dimensions and the threshold in pixels.",
  objectAtModel: (modelPx, requiredPx) =>
    `at model input ${modelPx}, threshold ${requiredPx}`,
  objectAtSensor: (sensorPx, feed) => `on sensor ${sensorPx} · ${feed}`,
  densityHeader: "Density, px/m",
  across: "Across",
  depth: "In depth",
  edgeBack: "Zone edge (back)",
  edgeForward: "Zone edge (front)",
  edgeNear: "Near edge",
  edgeFar: "Far edge",
  dori: ["detection", "observation", "recognition", "identification"],
  doriBelow: "below detection",
  exposure: "Exposure time up to",
  camera: "Camera",
  status: { ok: "OK", warn: "marginal", bad: "insufficient" },
  tabError: "Input data error",
  tabObjects: (status) => `Objects: ${status}`,
  addType: "+ Camera type",
  newType: (number) => `Camera ${number}`,
  // вердикт типа
  feedTiles: (count, columns, rows, inputSize) =>
    `tiles: ${count} (${columns} × ${rows}) of ${inputSize} px`,
  feedRoi: (width, height, inputSize) =>
    `crop ${width} × ${height} → ${inputSize} px`,
  feedFull: (width, height, inputSize) =>
    `frame ${width} × ${height} → ${inputSize} px`,
  noteZoneWidth: (frameWidth, zoneWidth) =>
    `Zone doesn't fit horizontally: at the near edge the frame width is ${frameWidth} m, the zone width is ${zoneWidth} m.`,
  noteZoneDepth: (requiredAngle, availableAngle) =>
    `Zone doesn't fit in depth: ${requiredAngle}° vertical is required, ${availableAngle}° is available.`,
  noteFocalMax: (requiredFocal, maxFocal) =>
    `The zone requires a focal length of ≈ ${requiredFocal} mm, the lens maximum is ${maxFocal} mm. Calculated for ${maxFocal} mm: the frame is wider than the zone, and objects get fewer pixels.`,
  noteFocalMin: (requiredFocal, minFocal) =>
    `The zone requires a focal length of ≈ ${requiredFocal} mm, the lens minimum is ${minFocal} mm. Calculated for ${minFocal} mm: the zone doesn't fit in the frame entirely. Raise the camera, reduce the zone, or choose a lens with a wider field of view.`,
  noteFocalOutOfRange: (focal, range) =>
    `Focal length ${focal} mm is outside the camera lens range (${range} mm).`,
  noteWideAngle: (hfov) =>
    `HFOV ${hfov}°: such lenses noticeably compress the frame edges (barrel distortion), and the calculation doesn't account for it. Lower the quality factor or raise the camera.`,
  noteTopView:
    "Overhead view: parts in cells are seen end-on, which is convenient for counting. A person is seen from above (head and shoulders), and hand actions are harder to tell apart.",
  noteLowRay: (angle) =>
    `The ray to the far zone edge meets the plane at ${angle}°: objects will occlude each other. Raise the camera or reduce the zone offset.`,
  noteAnalyticsFps: (analyticsFps, streamFps) =>
    `Analytics frame rate (${analyticsFps} fps) is higher than the stream frame rate (${streamFps} fps). The calculation uses ${streamFps} fps.`,
  pillNoObjects: "No objects",
  pillBad: "Insufficient",
  pillWarn: "Marginal",
  pillOk: "OK",
  pillCheck: "Has warnings",
  verdictNoObjects:
    "Add an object with dimensions and a model to check whether it can be detected.",
  verdictItem: (name, modelPx, requiredPx) =>
    `${name} — ${modelPx} at threshold ${requiredPx}`,
  verdictBad: (list) => `Not enough pixels at model input: ${list}.`,
  verdictWarn: (list) => `Marginal at model input: ${list}.`,
  verdictOk: (name, modelPx) =>
    `All objects are detectable at model input. Smallest: ${name} — ${modelPx}.`,
  noteDownscale: (name, sensorPx, inputSize, advice, neededInputSize) =>
    `"${name}": ${sensorPx} on the sensor, pixels are lost when downscaling to the ${inputSize} px input. ${advice} or increase the input to ≈ ${neededInputSize} px.`,
  adviceFull: 'Choose the "Zone crop" or "Tiles" input mode',
  adviceRoi: 'Choose the "Tiles" input mode',
  adviceTiles: "Check the input size",
  noteResolution: (name, requiredWidthPx, resolution) =>
    `"${name}" requires at least ${requiredWidthPx} px horizontally (${resolution}) at the same field of view.`,
  noteResolutionNone: (name, requiredWidthPx) =>
    `"${name}" requires ${requiredWidthPx} px horizontally, more than any resolution in the list. Install a separate camera closer to the object or choose a lens with a narrower field of view.`,
  objDefault: "Object",
  // система
  systemCameras: "Cameras",
  systemTypes: (count, names) => `Types: ${count}${names ? ` (${names})` : ""}`,
  systemCameraCost: (cost) => ` · camera cost ${cost}`,
  systemObjects: "Objects detectable",
  systemOfTotal: (okCount, total) => `${okCount} of ${total}`,
  systemSmallest: (name, modelPx) => `Smallest: ${name}, ${modelPx} px`,
  systemNoObjects: "No objects",
  systemCompute: "Compute node",
  systemNoCameras: "No cameras",
  systemNetwork: "Network traffic",
  systemPort: (port, poeWatts) => `Port ${port} · PoE ≈ ${poeWatts} W`,
  // сеть и допущения
  networkTitle: "Network and storage",
  archiveDays: "Archive retention, days",
  networkType: "Camera type",
  networkCameras: "Cameras",
  networkResolution: "Resolution",
  networkFps: "fps",
  networkPerCamera: "Per camera",
  networkAll: "Total",
  networkTotal: "Total",
  networkArchive: "Archive",
  networkArchiveValue: (terabytes, days) =>
    `≈ ${terabytes} TB for ${days} days`,
  networkArchiveOff: "Not recorded",
  assumptionsTitle: "Assumptions",
  assumptions: (efficiency) => [
    `Derating factor ${efficiency} applied to the measured speed`,
    "Catalog models: Ultralytics benchmarks on T4",
    "Decoder: NVDEC performance by GPU generation",
    "Server cost for the GPUs isn't included",
  ],
  formulas: "All formulas",
  systemTitle: "System",
  // параметры типа
  parametersTitle: "Type parameters",
  typeName: "Name",
  typeCount: "Number of cameras",
  sectionGeometry: "Geometry",
  cameraHeight: "Camera height, m",
  planeHeight: "Target plane height, m",
  zoneStart: "Zone offset, m",
  margin: "Frame margin, %",
  zoneDepth: "Zone depth, m",
  zoneWidth: "Zone width, m",
  placement: "Mounting",
  placementSide: "Side, at an angle",
  placementTop: "Overhead",
  summarySide: "side",
  summaryTop: "overhead",
  sectionCamera: "Sensor and lens",
  cameraSelect: "Camera",
  addCameraLink: "+ Custom camera",
  cameraManual: "Manual sensor setup",
  resolution: "Resolution",
  sensor: "Sensor format",
  sensorWidth: "Sensor width, mm",
  pixelPitch: "Pixel size, µm",
  sensorByPixelPitch: "From pixel size",
  sensorCustom: "Custom width",
  orientation: "Frame orientation",
  orientationLandscape: "Long side across the view",
  orientationPortrait: "Rotated 90°",
  lensMode: "Lens",
  lensModeAria: "Lens mode",
  lensModeAuto: "Auto",
  lensModeFocal: "Focal length",
  lensModeAngle: "HFOV angle",
  focalLength: "Focal length, mm",
  hfov: "HFOV, °",
  sectionStream: "Stream and quality",
  fps: "Stream frame rate, fps",
  analyticsFps: "Analytics frame rate, fps",
  codec: "Codec",
  scene: "Scene activity",
  sceneLow: "Low",
  sceneMid: "Normal",
  sceneHigh: "High",
  lensFactor: "Quality factor",
  speed: "Motion speed, m/s",
  blurPx: "Allowed motion blur, px",
  duplicateTypeBtn: "Duplicate type",
  deleteTypeBtn: "Delete type",
  deleteTypeConfirm: "Confirm deletion",
  copySuffix: " (copy)",
  // объекты
  objectsTitle: "Objects and models",
  addObject: "+ Object",
  presets: "Templates:",
  addDetectorLink: "+ Custom detector",
  objectsFooter:
    "Objects with the same model and input mode count as one inference run.",
  objectName: "Object name",
  objectDelete: "Delete object",
  objectWidth: "Width, cm",
  objectLength: "Length, cm",
  objectHeight: "Height, cm",
  objectRequiredPx: "Threshold, px",
  objectModel: "Model",
  objectFeed: "Input mode",
  objectInput: "Model input, px",
  objectOverlap: "Overlap, %",
  ultralytics: "Ultralytics catalog",
  customDetectors: "Custom detectors",
  feeds: { roi: "Zone crop", tiles: "Tiles", full: "Full frame" },
  feedsShort: { roi: "crop", tiles: "tiles", full: "full frame" },
  presetNames: ["Person", "Hand", "Tray cell", "Part", "M8 nut"],
  typeNames: ["Workstation", "Cart"],
  // справочники
  units: {
    m: "m",
    mm: "mm",
    s: "s",
    fps: "fps",
    pxm: "px/m",
    mbps: "Mbps",
    gbps: "Gbps",
    gb: "GB",
    w: "W",
  },
  megapixels: (megapixels) => `${megapixels} MP`,
  sensorFormat: (format, widthMm) => `${format} ≈ ${widthMm} mm`,
  builtinCameraNames: {
    k4: "Generic 4 MP · 1/2.7″ · 2.8–12 mm",
    k8: "Generic 8 MP · 1/1.8″ · 2.8–12 mm",
  },
  gpuNotes: {
    5090: "Street price as of October 2026. NVIDIA MSRP is $1,999.",
    pro6000:
      "FP16 dense is estimated as 4 PFLOPS FP4 / 8, based on the RTX 5090 ratio.",
    agx: "Standalone module. Memory is shared with the CPU, 60% is available for models. FP16 is estimated as 16 SM × 2048 FLOP/cycle × 1.3 GHz.",
  },
  decoderStreams: (count) => `streams: ${count}`,
  // шаблоны
  back: "← Back to calculator",
  toCalculation: "Back to calculator",
  templatesTitle: "Templates",
  templatesNav: "Template sections",
  templateTabGpus: "GPUs",
  templateTabCameras: "Cameras",
  templateTabDetectors: "Detectors",
  exportBtn: "Export",
  exportTitle: "Save templates, prices, and the calculation to a file",
  importBtn: "Import",
  importTitle: "Replace all data with the file contents",
  importConfirm: "Replace all data",
  catalogTitle: (count) => `GPU catalog · ${count}`,
  catalogTitleNoCount: "GPU catalog",
  catalogNote: "Specs from NVIDIA datasheets",
  efficiency: "Derating factor",
  reserve: "Growth headroom, %",
  gpuTableHeader: [
    "GPU",
    "FP16, TFLOPS",
    "Decoder",
    "Memory",
    "TDP",
    "Price, $",
    "In auto-selection",
  ],
  gpuJetson: "Jetson module",
  gpuCustom: "custom",
  gpuPriceAria: (name) => `${name} price, $`,
  gpuEnabledAria: (name) => `${name} is included in auto-selection`,
  deleteBtn: "Delete",
  deleteAria: (name) => `Delete ${name}`,
  customGpusTitle: (count) => `Custom GPUs · ${count}`,
  customGpusTitleNoCount: "Custom GPUs",
  customGpusEmpty:
    'No custom GPUs. An added GPU appears here, in the "GPU" list, and in auto-selection.',
  gpuFormTitle: "New GPU",
  gpuFormName: "Name",
  gpuFormNamePlaceholder: "For example, RTX 6000 Ada",
  gpuFormArchitecture: "Architecture",
  gpuFormJetson: "Jetson or custom decoder",
  gpuFormTflops: "FP16 Tensor, TFLOPS",
  gpuFormTflopsPlaceholder: "Without sparsity",
  gpuFormDecoders: "NVDEC count",
  gpuFormDecoderStreams: "1080p30 H.265 streams",
  gpuFormMemory: "Memory, GB",
  gpuFormTdp: "TDP, W",
  gpuFormPrice: "Price, $",
  gpuFormPricePlaceholder: "Supplier price",
  gpuFormEnabled: "Included in auto-selection",
  hintWhere: "Where to find the values",
  gpuFormHint1:
    "FP16 Tensor: the value from the NVIDIA datasheet without sparsity. Divide a value marked with an asterisk (with sparsity) by 2. For GeForce, use FP16 with FP32 accumulate.",
  gpuFormHint2:
    "NVDEC: the number of hardware decoders. For Jetson, enter the number of 1080p30 H.265 streams from the specification.",
  addGpuBtn: "Add GPU",
  gpuFormError: (fields) => `Fill in the fields: ${fields}.`,
  errorName: "name",
  errorTflops: "FP16 Tensor",
  errorDecoderStreams: "decoder streams",
  errorDecoders: "NVDEC count",
  errorMemory: "memory",
  errorPrice: "price (needed for comparison in auto-selection)",
  gpuAdded: (name) => `"${name}" added`,
  gpuDeleted: "GPU deleted",
  camerasTitle: (count) => `Cameras · ${count}`,
  camerasTitleNoCount: "Cameras",
  camerasNote: 'Selected in the type parameters, "Sensor and lens" section',
  cameraTableHeader: [
    "Camera",
    "Frame",
    "Sensor",
    "Lens",
    "Price",
    "In system",
  ],
  cameraCustom: "Custom",
  cameraBuiltin: "Generic, example",
  cameraAnyLens: "Any",
  cameraFormTitle: "New camera",
  cameraFormNamePlaceholder: "Model from the manufacturer catalog",
  cameraFormWidth: "Frame width, px",
  cameraFormHeight: "Frame height, px",
  cameraFormSensorWidth: "Sensor width, mm",
  cameraFormPixelPitch: "Pixel size, µm",
  cameraFormFocalMin: "Focal length from, mm",
  cameraFormFocalMax: "Focal length to, mm",
  cameraFormPrice: "Price, $",
  optional: "Optional",
  cameraFormHint1:
    "Sensor width: the width of the sensor active area from the datasheet. If it isn't listed, enter the pixel size, and the width is calculated as pixel size × frame width.",
  cameraFormHint2:
    "For a fixed focal length lens, enter the same value in both fields. If the fields are empty, the focal length is selected without limits.",
  addCameraBtn: "Add camera",
  cameraFormError: (fields) => `Enter: ${fields}.`,
  errorFrame: "frame size in pixels",
  errorSensorWidth: "sensor width or pixel size",
  errorFocalRange: 'focal length "from" not greater than "to"',
  cameraAdded: (name) => `"${name}" added`,
  cameraDeleted: "Camera deleted",
  detectorsTitle: (count) => `Detectors · ${count}`,
  detectorsTitleNoCount: "Detectors",
  detectorsNote: 'Selected in the object card, "Model" field',
  detectorTableHeader: ["Model", "Input", "GFLOPs", "Speed", "Objects"],
  detectorCustom: "Custom",
  detectorCatalog: "Ultralytics catalog",
  detectorSpeed: (fps, gpuName) => `${fps} fps on ${gpuName}`,
  detectorsEmpty:
    'No custom detectors. Add a detector in the "New detector" form.',
  detectorFormTitle: "New detector",
  detectorFormNamePlaceholder: "For example, parts detector v2",
  detectorFormFps: "Benchmark, fps",
  detectorFormFpsPlaceholder: "On one GPU",
  detectorFormInput: "Model input, px",
  detectorFormRefGpu: "Benchmark GPU",
  detectorFormGflops: "GFLOPs per frame",
  detectorFormGflopsPlaceholder: "Optional, for the memory estimate",
  hintHow: "How to benchmark",
  detectorFormHint1:
    "Measure frames per second on one GPU in TensorRT with the same precision and batch as in production: trtexec, DeepStream perf, or your own benchmark.",
  detectorFormHint2:
    "For other GPUs the benchmark is scaled by FP16, for another input size by the square of its side.",
  addDetectorBtn: "Add detector",
  errorFps: "benchmark",
  detectorAdded: (name) => `"${name}" added`,
  detectorDeleted: "Detector deleted",
  // отчёт
  reportError: (name, count) => `${name} × ${count}: input data error`,
  reportCamera: (params) =>
    `  Camera: ${params.cameraLabel}${params.rotated ? " (rotated 90°)" : ""}, sensor ${params.sensorWidth} mm, f ${params.focal} mm, HFOV ${params.hfov}°, tilt ${params.tilt}°, ${params.overCenter ? "overhead" : `zone offset ${params.zoneStart} m`}, height ${params.cameraHeight} m, zone ${params.zoneWidth} × ${params.zoneDepth} m`,
  reportObject: (params) =>
    `  ${params.name}: ${params.model}, ${params.feed}; on sensor ${params.sensorPx}, at model input ${params.modelPx}, threshold ${params.requiredPx}: ${params.status}`,
  reportStream: (mbps, shutterDenominator) =>
    `  Stream ${mbps} Mbps per camera, exposure time up to 1/${shutterDenominator} s`,
  reportSystem: (cameraCount, mbps, cost) =>
    `System: ${cameraCount} cameras, ${mbps} Mbps${cost ? `, camera cost ${cost}` : ""}`,
  reportCompute: (params) =>
    `Compute node (estimate): ${params.gpuCount} × ${params.gpuName}, ${params.cost}; inference ${params.inferenceLoad}%, decoder ${params.decodeLoad}%, GPU memory ${params.memoryUsed}/${params.memoryCap} GB${params.optimum ? `; best price: ${params.optimum}` : ""}`,
  reportNoCompute: "Compute node: no data",
  // уведомления
  stale: "The data was changed in another tab. Reload the page.",
  typeCopied: "Type copied",
  typeDeleted: "Type deleted",
  lastType: "At least one camera type must remain.",
  exampleLoaded: "Example loaded. Your templates are kept.",
  reportCopied: "Report copied",
  copyFail: "Couldn't copy the report: the browser denied clipboard access.",
  badFile: "The file isn't a calculator save.",
  saveFail: "Couldn't save the data: the browser denied storage access.",
  readFail: "Couldn't read the file.",
  tipAria: "Hint",
  // схема
  diagramZone: (depth) => `Monitored zone ${depth} m`,
  diagramFrame: (width) => `Frame ${width} m`,
  diagramTilt: (degrees) => `Tilt ${degrees}°`,
  diagramLength: (length) => `${length} m`,
  diagramOffset: (offset) => `Offset ${offset} m`,
  diagramDepth: (depth) => `Zone depth ${depth} m`,
  diagramOverCenter: "Camera above the zone center",
  diagramOverZone: "Camera above the zone",
  diagramCameraHeight: (height) => `H ${height} m`,
  diagramPlaneHeight: (height) => `h ${height} m`,
  diagramAria: (params) =>
    `Side view: camera at ${params.H} m, tilt ${params.tilt}°, VFOV ${params.vfov}°, zone from ${params.x1} to ${params.x2} m at ${params.h} m height` +
    (params.frameWidthNear
      ? `, frame width ${params.frameWidthNear}–${params.frameWidthFar} m`
      : ""),
  // подсказки «?»
  tips: {
    typeName:
      'Camera type name, for example "Workstation" or "Cart". A type is a group of identical cameras with one task: shared geometry, sensor, stream, and objects.',
    typeCount:
      "Number of cameras of this type in the system. Affects network traffic, decoding, and GPU load, but not the pixels on the object.",
    camera:
      'Camera from "Templates": the resolution and sensor are taken from it, and the required focal length is checked against its lens range. "Manual sensor setup": the resolution and sensor are set manually.',
    gpuFormTflops:
      'FP16 Tensor from the NVIDIA datasheet without sparsity. If the value is marked with an asterisk "with sparsity", divide it by 2. For GeForce, use FP16 with FP32 accumulate: it\'s half of FP16 accumulate.',
    gpuFormArchitecture:
      'The architecture defines the performance of one NVDEC hardware decoder. For Jetson, choose "Jetson or custom decoder" and enter the number of 1080p30 streams from the specification.',
    detectorFormFps:
      "Frames per second the model processes on one GPU in TensorRT with the same precision and batch as in production.",
    cameraFormSensorWidth:
      "Width of the sensor active area from the datasheet. If it isn't listed, leave the field empty and enter the pixel size.",
    cameraHeight:
      "Height of the lens above the floor. Measure with a laser rangefinder from the floor to the mounting point. The higher the camera, the less objects occlude each other, but the lower the pixel density.",
    planeHeight:
      "Height of the surface the monitored objects are on: tabletop ≈ 0.85–0.9 m, top of a cart tray. For a worker's hands, ≈ 1.0–1.2 m. The whole calculation is done for this plane.",
    placement:
      "Side: the camera looks at an angle, and both the person and the objects are visible. Overhead: the camera looks straight down, which gives the best view of cart cells, but the person is seen from above and hand actions are harder to tell apart.",
    zoneStart:
      "Floor distance from the point below the camera to the near edge of the zone. A negative value means the camera is above part of the zone.",
    zoneDepth:
      "Zone size along the camera view direction, from the near edge to the far edge.",
    zoneWidth: "Zone size across the camera view direction.",
    orientation:
      'The camera can be rotated 90° so that the long side of the frame matches the long side of the zone. "Auto" chooses the option that gives more pixels per meter of the zone. Many box cameras support rotation (corridor mode). For dome cameras, check whether the module can be rotated.',
    margin:
      "Margin that keeps the zone away from the frame edges: sharpness is lower and distortion is stronger there, and the camera can shift during installation. Typical value is 10–20%.",
    resolution:
      "Resolution of the stream the analytics processes. If the model receives a substream, enter the substream resolution.",
    sensor:
      'The inch sensor format is nominal, and actual sizes differ between manufacturers. The most accurate option is "From pixel size" with data from the sensor datasheet.',
    sensorWidth:
      "Width of the sensor area that forms the video at the selected resolution. In the sensor datasheet, it's the effective or active area.",
    pixelPitch:
      "Pixel size from the sensor datasheet, for example 2.0 µm for IMX334. Sensor width = pixel size × number of horizontal pixels.",
    lensMode:
      '"Auto": the calculator selects the field of view for the zone. "Focal length" or "HFOV angle": checks a specific camera from a catalog.',
    focalLength:
      "Lens focal length from the camera datasheet. For a varifocal lens, check both ends of the range.",
    hfov: "Horizontal field of view from the datasheet. Don't confuse it with the diagonal one (DFOV): the diagonal one is larger and is often shown more prominently.",
    objects:
      "A card for each object: dimensions (width across the camera view, length along it, height), the model that detects it, the input mode, the input size, and the threshold in pixels for the smaller side of the object. The result is shown in the card. Objects with the same model and input mode count as one inference run: the load isn't doubled.",
    lensFactor:
      "Fraction of the nominal resolution that reaches the model after compression, optics, and distortion. 0.7 is a high-quality camera with a high bitrate, 0.6 is typical, 0.5 is a wide-angle lens or an overhead view.",
    speed:
      "Speed of the fastest motion that must be visible without blur: hands at work ≈ 1 m/s, a walking person ≈ 1.5 m/s.",
    blurPx:
      "Allowed motion blur in pixels. For detection, 1–2 pixels. For reading markings, no more than 0.5–1 pixel.",
    fps: "Stream frame rate for analytics. To record events with ≈ 1 s accuracy, 5–10 fps is enough. To track hand actions, use 10–15 fps.",
    codec:
      "H.265 gives roughly half the bitrate at the same quality. Use H.264 if the server decoder doesn't support H.265.",
    scene:
      "Bitrate grows with motion in the frame. Low: an empty warehouse. Normal: a workstation. High: aisles with many people and vehicles.",
    analyticsFps:
      "Frames per second from each camera that go through the models. Person presence: 2–5 fps. Counting parts and cycles: 5–10 fps. Not higher than the stream frame rate.",
    efficiency:
      "Fraction of the measured speed that remains in a real system, accounting for decoding, pre- and post-processing, tracking, database writes, and load peaks. 0.7 is a tuned DeepStream/TensorRT pipeline, 0.5–0.6 is typical, 0.4 is an unoptimized Python pipeline.",
    gpu: '"Auto" tries all selected GPUs in counts from 1 to 4 and picks the cheapest configuration that handles the load with headroom and fits in GPU memory. The GPU list, prices, and custom GPUs are in "Templates".',
    gpuCount:
      'Number of GPUs. "Auto" is the minimum number that handles the load. Two inexpensive GPUs are often cheaper than one expensive GPU.',
    reserve:
      "Fraction of capacity that stays free for growth: new cameras, a second model, load peaks. At 20%, inference and decoder load don't exceed ≈ 83%.",
    archiveDays:
      "How many days to keep video. 0 means video isn't recorded, and only analytics events are stored.",
  },
};
// язык: выбор из localStorage, иначе язык браузера
const LANG_KEY = "camcalc-lang";
const LANG = (() => {
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch (error) {}
  return saved === "ru" || saved === "en"
    ? saved
    : /^ru\b/i.test(navigator.language || "")
      ? "ru"
      : "en";
})();
const STR = LANG === "en" ? EN : RU;
// \u0447\u0438\u0441\u043b\u043e \u0438 \u0435\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f \u0447\u0435\u0440\u0435\u0437 \u043d\u0435\u0440\u0430\u0437\u0440\u044b\u0432\u043d\u044b\u0439 \u043f\u0440\u043e\u0431\u0435\u043b; unit \u2014 \u043a\u043b\u044e\u0447 \u0441\u043b\u043e\u0432\u0430\u0440\u044f STR.units
const withUnit = (value, unit) => value + "\u00a0" + STR.units[unit];
// t \u2014 \u0442\u0435\u043a\u0441\u0442 \u043f\u043e \u043a\u043b\u044e\u0447\u0443 \u0441\u043b\u043e\u0432\u0430\u0440\u044f; \u0435\u0441\u043b\u0438 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u2014 \u0444\u0443\u043d\u043a\u0446\u0438\u044f, \u0432\u044b\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u0441 params
const t = (key, ...params) => {
  const text = STR[key];
  return typeof text === "function" ? text(...params) : text;
};
function applyTranslations() {
  document.documentElement.lang = LANG;
  document.title = t("docTitle");
  document
    .querySelectorAll("#formulas>[lang]")
    .forEach((block) => (block.hidden = block.lang !== LANG));
  document
    .querySelectorAll("[data-t]")
    .forEach((element) => (element.textContent = t(element.dataset.t)));
  [
    ["ta", "aria-label"],
    ["tt", "title"],
    ["tp", "placeholder"],
  ].forEach(([dataKey, attr]) =>
    document
      .querySelectorAll(`[data-${dataKey}]`)
      .forEach((element) =>
        element.setAttribute(attr, t(element.dataset[dataKey])),
      ),
  );
}
applyTranslations();
