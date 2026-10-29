import type { DetectionObject } from "../entities/detection-object.ts";

// встроенные объекты детекции; название — в словаре i18n по nameKey. Габариты, см; порог, px
export const BUILTIN_DETECTION_OBJECTS: readonly DetectionObject[] = [
  {
    id: "person",
    nameKey: "builtinObjectNames.person",
    width: 50,
    length: 30,
    height: 170,
    requiredPx: 32,
  },
  {
    id: "hand",
    nameKey: "builtinObjectNames.hand",
    width: 9,
    length: 18,
    height: 4,
    requiredPx: 20,
  },
  {
    id: "car",
    nameKey: "builtinObjectNames.car",
    width: 180,
    length: 450,
    height: 150,
    requiredPx: 32,
  },
  {
    id: "nutM8",
    nameKey: "builtinObjectNames.nutM8",
    width: 1.3,
    length: 1.3,
    height: 0.7,
    requiredPx: 10,
  },
];
