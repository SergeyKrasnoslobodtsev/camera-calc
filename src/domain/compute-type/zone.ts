import type { Placement } from "../entities/camera-type.ts";

// Зона контроля в вертикальной плоскости оси камеры.
// Hc — высота камеры над плоскостью объектов, м; x1, x2 — края зоны по полу от точки под камерой, м;
// tilt — наклон оси камеры вниз от горизонта, zoneAngle — угол, под которым видна зона, рад;
// minDepth — меньшая из глубин краёв зоны по оптической оси, м.
export type Zone = {
  x1: number;
  x2: number;
  tilt: number;
  zoneAngle: number;
  minDepth: number;
};

// камера над центром зоны смотрит на неё симметрично, сбоку — начиная с выноса zoneStart;
// ось камеры направлена в середину угла, под которым видна зона
export function zoneGeometry(
  placement: Placement,
  Hc: number,
  zoneStart: number,
  zoneDepth: number,
): Zone {
  const x1 = placement === "top" ? -zoneDepth / 2 : zoneStart,
    x2 = x1 + zoneDepth;
  const phi1 = Math.atan2(Hc, x1),
    phi2 = Math.atan2(Hc, x2);
  const tilt = (phi1 + phi2) / 2;
  return {
    x1,
    x2,
    tilt,
    zoneAngle: phi1 - phi2,
    minDepth: Math.min(depthAt(Hc, tilt, x1), depthAt(Hc, tilt, x2)),
  };
}

// глубина точки пола x по оптической оси камеры, м
export const depthAt = (Hc: number, tilt: number, x: number) =>
  x * Math.cos(tilt) + Hc * Math.sin(tilt);
