import { formatNumber, t } from "../../../i18n/index.ts";
import { DEG } from "../../../domain/angles.ts";
import type { Placement } from "../../../domain/entities/camera-type.ts";
// Схема «вид сбоку» (SVG). Обозначения как в domain/compute-type:
//   H — высота камеры, h — высота плоскости объектов, Hc = H − h — высота камеры над плоскостью, м;
//   x1 и x2 — края зоны по полу от точки под камерой, м.
// Переменные с окончанием X/Y — координаты на схеме, px.
export function SideDiagram({
  H,
  h,
  x1,
  x2,
  tilt,
  vfov,
  Hc,
  placement,
  frameWidthNear,
  frameWidthFar,
}: {
  H: number;
  h: number;
  x1: number;
  x2: number;
  tilt: number;
  vfov: number;
  Hc: number;
  placement: Placement;
  frameWidthNear: number;
  frameWidthFar: number;
}) {
  const viewWidth = 680,
    viewHeight = 510,
    marginLeft = 64,
    marginRight = 60,
    marginTop = 28,
    marginBottom = 74;
  // углы краёв поля зрения ниже горизонта: ближний круче, дальний положе
  const nearEdgeAngle = tilt + vfov / 2,
    farEdgeAngle = tilt - vfov / 2;
  const planeHitX = (angle: number) =>
    angle > 0.02 && angle < Math.PI - 0.02 ? Hc / Math.tan(angle) : NaN;
  const forwardHit = planeHitX(farEdgeAngle),
    backHit = planeHitX(nearEdgeAngle);
  const xMax = Math.max(
    x2 + 0.3,
    isFinite(forwardHit)
      ? Math.min(forwardHit, x2 + Math.abs(x2 - x1) * 0.6) + 0.3
      : x2 * 1.6 + 0.3,
  );
  const xMin = Math.min(
    -0.3,
    x1 - 0.3,
    isFinite(backHit) && backHit < 0
      ? Math.max(backHit, x1 - Math.abs(x2 - x1) * 0.6) - 0.3
      : -0.3,
  );
  // px на метр
  const scale = Math.min(
    (viewWidth - marginLeft - marginRight) / (xMax - xMin),
    (viewHeight - marginTop - marginBottom) / (H * 1.04),
  );
  const offsetX =
    marginLeft +
    (viewWidth - marginLeft - marginRight - (xMax - xMin) * scale) / 2;
  const toX = (x: number) => offsetX + (x - xMin) * scale,
    toY = (y: number) => viewHeight - marginBottom - y * scale;
  const coord = (value: number) => value.toFixed(1);
  const cameraX = toX(0),
    cameraY = toY(H),
    planeY = toY(h),
    floorY = toY(0),
    leftX = toX(xMin),
    rightX = toX(xMax);
  // конец луча: точка на плоскости или на краю схемы
  const rayEnd = (angle: number) => {
    const hit = planeHitX(angle);
    if (isFinite(hit) && hit >= xMin && hit <= xMax) return [toX(hit), planeY];
    const edge = Math.cos(angle) >= 0 ? xMax : xMin;
    return [toX(edge), toY(H - edge * Math.tan(angle))];
  };
  const [nearRayX, nearRayY] = rayEnd(nearEdgeAngle),
    [farRayX, farRayY] = rayEnd(farEdgeAngle),
    [axisX, axisY] = rayEnd(tilt);
  // сетка с шагом 1/2/5 м
  const gridStep = [0.5, 1, 2, 5, 10].find((step) => step * scale >= 45) || 10;
  const gridX: number[] = [],
    gridY: number[] = [];
  for (
    let x = Math.ceil(xMin / gridStep) * gridStep;
    x <= xMax + 1e-9;
    x += gridStep
  )
    gridX.push(toX(x));
  for (let y = gridStep; y <= H * 1.04 + 1e-9; y += gridStep)
    gridY.push(toY(y));
  // зона
  const zoneStartX = toX(x1),
    zoneEndX = toX(x2),
    zoneWidthPx = zoneEndX - zoneStartX;
  const hasRoomBelow = floorY - planeY >= 40;
  const zoneLabelY = hasRoomBelow ? planeY - 16 : planeY - 40,
    frameLabelY = hasRoomBelow ? planeY + 28 : planeY - 18;
  const isNarrow = zoneWidthPx < 240;
  // углы
  const axisLength = (planeY - cameraY) / Math.max(Math.sin(tilt), 0.05);
  const fovArcRadius = Math.max(40, Math.min(150, axisLength * 0.55)),
    tiltArcRadius = Math.max(28, Math.min(70, fovArcRadius * 0.47));
  const pointAt = (radius: number, angle: number) => [
    cameraX + radius * Math.cos(angle),
    cameraY + radius * Math.sin(angle),
  ];
  const [tiltArcEndX, tiltArcEndY] = pointAt(tiltArcRadius, tilt);
  const [tiltLabelX, tiltLabelY] = pointAt(tiltArcRadius + 10, tilt / 2);
  const [fovArcStartX, fovArcStartY] = pointAt(fovArcRadius, farEdgeAngle),
    [fovArcEndX, fovArcEndY] = pointAt(fovArcRadius, nearEdgeAngle);
  const [fovLabelX, fovLabelY] = pointAt(fovArcRadius + 12, tilt);
  // H слева, h справа
  const heightDimX = Math.min(cameraX, leftX) - 30;
  const planeDimX = rightX + 22,
    planeDimMidY = (planeY + floorY) / 2;
  // размеры по полу
  const dimLineY = floorY + 26,
    dimTextY = floorY + 47;
  const dimension = (startX: number, endX: number, label: string) => (
    <>
      <line
        x1={coord(startX)}
        y1={coord(dimLineY)}
        x2={coord(endX)}
        y2={coord(dimLineY)}
        stroke="var(--muted)"
      />
      <line
        x1={coord(startX)}
        y1={coord(dimLineY - 6)}
        x2={coord(startX)}
        y2={coord(dimLineY + 6)}
        stroke="var(--muted)"
      />
      <line
        x1={coord(endX)}
        y1={coord(dimLineY - 6)}
        x2={coord(endX)}
        y2={coord(dimLineY + 6)}
        stroke="var(--muted)"
      />
      <text
        x={coord((startX + endX) / 2)}
        y={coord(dimTextY)}
        textAnchor="middle"
      >
        {label}
      </text>
    </>
  );
  return (
    <svg
      id="side"
      viewBox="0 0 680 510"
      role="img"
      aria-label={t("diagramAria", {
        H: formatNumber(H, 1),
        tilt: formatNumber(tilt / DEG, 0),
        vfov: formatNumber(vfov / DEG, 0),
        x1: formatNumber(x1, 1),
        x2: formatNumber(x2, 1),
        h: formatNumber(h, 2),
        frameWidthNear:
          isFinite(frameWidthNear) && formatNumber(frameWidthNear, 1),
        frameWidthFar: formatNumber(frameWidthFar, 1),
      })}
    >
      {gridX.map((x, i) => (
        <line
          key={i}
          x1={coord(x)}
          y1={coord(toY(H * 1.04))}
          x2={coord(x)}
          y2={coord(floorY)}
          stroke="var(--grid)"
        />
      ))}
      {gridY.map((y, i) => (
        <line
          key={i}
          x1={coord(leftX)}
          y1={coord(y)}
          x2={coord(rightX)}
          y2={coord(y)}
          stroke="var(--grid)"
        />
      ))}
      {/* пол и плоскость интереса */}
      <line
        x1={coord(leftX - 24)}
        y1={coord(floorY)}
        x2={coord(rightX)}
        y2={coord(floorY)}
        stroke="var(--muted)"
        strokeWidth="2"
      />
      {h > 0.01 && (
        <line
          x1={coord(leftX)}
          y1={coord(planeY)}
          x2={coord(rightX)}
          y2={coord(planeY)}
          stroke="var(--dash)"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
      )}
      {/* поле зрения и ось */}
      <polygon
        points={`${coord(cameraX)},${coord(cameraY)} ${coord(nearRayX)},${coord(nearRayY)} ${coord(farRayX)},${coord(farRayY)}`}
        fill="var(--wedge)"
      />
      <line
        x1={coord(cameraX)}
        y1={coord(cameraY)}
        x2={coord(nearRayX)}
        y2={coord(nearRayY)}
        stroke="var(--wedge-line)"
        strokeWidth="1.8"
      />
      <line
        x1={coord(cameraX)}
        y1={coord(cameraY)}
        x2={coord(farRayX)}
        y2={coord(farRayY)}
        stroke="var(--wedge-line)"
        strokeWidth="1.8"
      />
      <line
        x1={coord(cameraX)}
        y1={coord(cameraY)}
        x2={coord(axisX)}
        y2={coord(axisY)}
        stroke="var(--wedge-line)"
        strokeWidth="1.5"
        strokeDasharray="7 6"
        opacity=".85"
      />
      {/* зона */}
      <rect
        x={coord(zoneStartX)}
        y={coord(planeY - 6)}
        width={coord(zoneWidthPx)}
        height="12"
        rx="2"
        fill="var(--accent)"
      />
      <text
        x={coord((zoneStartX + zoneEndX) / 2)}
        y={coord(zoneLabelY)}
        textAnchor="middle"
        className="t-z"
      >
        {t("diagramZone", formatNumber(x2 - x1, 1))}
      </text>
      {isFinite(frameWidthNear) && isFinite(frameWidthFar) && (
        <>
          <line
            x1={coord(zoneStartX)}
            y1={coord(planeY + 7)}
            x2={coord(zoneStartX)}
            y2={coord(planeY + 13)}
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <line
            x1={coord(zoneEndX)}
            y1={coord(planeY + 7)}
            x2={coord(zoneEndX)}
            y2={coord(planeY + 13)}
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <text
            x={coord(zoneStartX)}
            y={coord(frameLabelY)}
            textAnchor={isNarrow ? "end" : "middle"}
          >
            {t("diagramFrame", formatNumber(frameWidthNear, 1))}
          </text>
          <text
            x={coord(zoneEndX)}
            y={coord(frameLabelY)}
            textAnchor={isNarrow ? "start" : "middle"}
          >
            {t("diagramFrame", formatNumber(frameWidthFar, 1))}
          </text>
        </>
      )}
      {/* углы */}
      <line
        x1={coord(cameraX)}
        y1={coord(cameraY)}
        x2={coord(cameraX + tiltArcRadius + 60)}
        y2={coord(cameraY)}
        stroke="var(--dim)"
        strokeDasharray="4 4"
      />
      <path
        d={`M${coord(cameraX + tiltArcRadius)},${coord(cameraY)} A${tiltArcRadius},${tiltArcRadius} 0 0 1 ${coord(tiltArcEndX)},${coord(tiltArcEndY)}`}
        fill="none"
        stroke="var(--fg)"
        strokeWidth="1.5"
      />
      <text x={coord(tiltLabelX)} y={coord(tiltLabelY + 5)} className="t-b">
        {t("diagramTilt", formatNumber(tilt / DEG, 0))}
      </text>
      <path
        d={`M${coord(fovArcStartX)},${coord(fovArcStartY)} A${coord(fovArcRadius)},${coord(fovArcRadius)} 0 0 1 ${coord(fovArcEndX)},${coord(fovArcEndY)}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <text x={coord(fovLabelX + 4)} y={coord(fovLabelY + 5)} className="t-a">
        VFOV {formatNumber(vfov / DEG, 0)}°
      </text>
      {/* камера */}
      <line
        x1={coord(cameraX)}
        y1={coord(cameraY)}
        x2={coord(cameraX)}
        y2={coord(floorY)}
        stroke="var(--dim)"
        strokeWidth="1.5"
      />
      <rect
        x={coord(cameraX - 16)}
        y={coord(cameraY - 10)}
        width="28"
        height="18"
        rx="3"
        fill="var(--fg)"
      />
      <circle
        cx={coord(cameraX + 12)}
        cy={coord(cameraY - 1)}
        r="4"
        fill="var(--bg)"
      />
      {/* H слева */}
      <line
        x1={coord(heightDimX)}
        y1={coord(cameraY)}
        x2={coord(heightDimX)}
        y2={coord(floorY)}
        stroke="var(--muted)"
      />
      <line
        x1={coord(heightDimX - 6)}
        y1={coord(cameraY)}
        x2={coord(heightDimX + 6)}
        y2={coord(cameraY)}
        stroke="var(--muted)"
      />
      <line
        x1={coord(heightDimX - 6)}
        y1={coord(floorY)}
        x2={coord(heightDimX + 6)}
        y2={coord(floorY)}
        stroke="var(--muted)"
      />
      <text
        x={coord(heightDimX - 8)}
        y={coord((cameraY + floorY) / 2)}
        transform={`rotate(-90 ${coord(heightDimX - 8)} ${coord((cameraY + floorY) / 2)})`}
        textAnchor="middle"
        className="t-b"
      >
        {t("diagramCameraHeight", formatNumber(H, 1))}
      </text>
      {/* h справа — повернута, не пересекается с подписями кадра */}
      {h > 0.01 && (
        <>
          <line
            x1={coord(planeDimX)}
            y1={coord(planeY)}
            x2={coord(planeDimX)}
            y2={coord(floorY)}
            stroke="var(--muted)"
          />
          <line
            x1={coord(planeDimX - 6)}
            y1={coord(planeY)}
            x2={coord(planeDimX + 6)}
            y2={coord(planeY)}
            stroke="var(--muted)"
          />
          <line
            x1={coord(planeDimX - 6)}
            y1={coord(floorY)}
            x2={coord(planeDimX + 6)}
            y2={coord(floorY)}
            stroke="var(--muted)"
          />
          <text
            x={coord(planeDimX + 20)}
            y={coord(planeDimMidY)}
            transform={`rotate(-90 ${coord(planeDimX + 20)} ${coord(planeDimMidY)})`}
            textAnchor="middle"
          >
            {t("diagramPlaneHeight", formatNumber(h, 2))}
          </text>
        </>
      )}
      {/* размеры по полу */}
      <line
        x1={coord(zoneStartX)}
        y1={coord(planeY + 6)}
        x2={coord(zoneStartX)}
        y2={coord(dimLineY - 6)}
        stroke="var(--line)"
        strokeDasharray="3 4"
      />
      <line
        x1={coord(zoneEndX)}
        y1={coord(planeY + 6)}
        x2={coord(zoneEndX)}
        y2={coord(dimLineY - 6)}
        stroke="var(--line)"
        strokeDasharray="3 4"
      />
      {x1 > 0.05 &&
        dimension(
          cameraX,
          zoneStartX,
          t(
            zoneStartX - cameraX > 110 ? "diagramOffset" : "diagramLength",
            formatNumber(x1, 1),
          ),
        )}
      {dimension(
        zoneStartX,
        zoneEndX,
        t(
          zoneWidthPx > 170 ? "diagramDepth" : "diagramLength",
          formatNumber(x2 - x1, 1),
        ),
      )}
      {x1 <= 0.05 && (
        <text x={coord(cameraX)} y={coord(dimTextY + 20)} textAnchor="middle">
          {t(placement === "top" ? "diagramOverCenter" : "diagramOverZone")}
        </text>
      )}
    </svg>
  );
}
