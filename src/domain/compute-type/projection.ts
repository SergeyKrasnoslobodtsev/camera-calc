import type { Zone } from "./zone.ts";

// Камера-обскура над плоскостью объектов: Hc — высота над плоскостью, м; tilt — наклон оси, рад;
// fpx — фокусное расстояние в пикселях. Точка задаётся по полу: x — вдоль взгляда от точки под
// камерой, y — поперёк от оси, height — над плоскостью, м.
export type View = { Hc: number; tilt: number; fpx: number };
type Point = [number, number]; // координаты в кадре от центра, px
export type Size = { width: number; height: number };

// шагов по зоне при поиске минимума плотности и худшего положения объекта
export const ZONE_STEPS = 40;
// верх коробки не выше этой доли Hc, иначе точка окажется у самой камеры
const MAX_TOP_SHARE = 0.98;
// точка ближе этой глубины по оси (м) считается позади камеры
const MIN_DEPTH_M = 1e-6;

// Плотность пикселей (px/м) в точке пола x: across — поперёк взгляда, depth — вглубь.
// phi — угол луча к плоскости, D — расстояние до точки, z — глубина по оптической оси.
export type Density = {
  x: number;
  D: number;
  z: number;
  phi: number;
  across: number;
  depth: number;
};

export function densityAt({ Hc, tilt, fpx }: View, x: number): Density {
  const phi = Math.atan2(Hc, x),
    D = Math.hypot(Hc, x),
    delta = phi - tilt, // угол луча к оптической оси
    z = D * Math.cos(delta);
  return {
    x,
    D,
    z,
    phi,
    across: fpx / z,
    depth: (fpx * Math.sin(phi)) / (D * Math.cos(delta) ** 2),
  };
}

// near и far — плотность на краях зоны; минимумы и максимум — по ZONE_STEPS + 1 точкам
export type DensityProfile = {
  near: Density;
  far: Density;
  minAcross: number;
  minDepth: number;
  max: number;
};

export function densityProfile(view: View, { x1, x2 }: Zone): DensityProfile {
  const samples: Density[] = [];
  for (let i = 0; i <= ZONE_STEPS; i++)
    samples.push(densityAt(view, x1 + ((x2 - x1) * i) / ZONE_STEPS));
  return {
    near: densityAt(view, x1),
    far: densityAt(view, x2),
    minAcross: Math.min(...samples.map((sample) => sample.across)),
    minDepth: Math.min(...samples.map((sample) => sample.depth)),
    max: Math.max(
      ...samples.map((sample) => Math.max(sample.across, sample.depth)),
    ),
  };
}

// точка → координаты в кадре [u, v] от центра, px; null — точка позади камеры
export function projectPoint(
  { Hc, tilt, fpx }: View,
  x: number,
  y: number,
  height: number,
): Point | null {
  const cosTilt = Math.cos(tilt),
    sinTilt = Math.sin(tilt);
  const dh = height - Hc,
    z = x * cosTilt - dh * sinTilt;
  if (z <= MIN_DEPTH_M) return null;
  return [(fpx * y) / z, (fpx * (x * sinTilt + dh * cosTilt)) / z];
}

// рамка вокруг точек кадра; у пустого списка размеры отрицательные
function boundingBox(points: Point[]): Size {
  let uMin = 1e9,
    uMax = -1e9,
    vMin = 1e9,
    vMax = -1e9;
  for (const point of points) {
    uMin = Math.min(uMin, point[0]);
    uMax = Math.max(uMax, point[0]);
    vMin = Math.min(vMin, point[1]);
    vMax = Math.max(vMax, point[1]);
  }
  return { width: uMax - uMin, height: vMax - vMin };
}

// размер в кадре коробки width × length × height (м), стоящей на плоскости по центру кадра
// с ближним краем в x0; k — доля разрешения, которая доходит до модели
export function boxSizePx(
  view: View,
  k: number,
  x0: number,
  width: number,
  length: number,
  height: number,
): { widthPx: number; heightPx: number } | null {
  const topHeight = Math.min(height, view.Hc * MAX_TOP_SHARE);
  const corners: Point[] = [];
  for (const x of [x0, x0 + length])
    for (const y of [-width / 2, width / 2])
      for (const pointHeight of [0, topHeight]) {
        const point = projectPoint(view, x, y, pointHeight);
        if (!point) return null; // угол коробки позади камеры
        corners.push(point);
      }
  const box = boundingBox(corners);
  return { widthPx: box.width * k, heightPx: box.height * k };
}

// область зоны в кадре (ROI), px; не больше кадра frame
export function zoneRoiPx(
  view: View,
  { x1, x2 }: Zone,
  zoneWidth: number,
  frame: Size,
): Size {
  const corners: Point[] = [];
  for (const x of [x1, x2])
    for (const y of [-zoneWidth / 2, zoneWidth / 2]) {
      const point = projectPoint(view, x, y, 0);
      if (point) corners.push(point);
    }
  const box = boundingBox(corners);
  return {
    width: Math.min(frame.width, box.width),
    height: Math.min(frame.height, box.height),
  };
}
