import type { TypeResult } from "../compute-type/index.ts";
import type { Camera } from "../entities/camera.ts";
import type { SystemSettings } from "../entities/system-settings.ts";
import { parseNum } from "../parse-num.ts";

// Канал с запасом: поток × NETWORK_HEADROOM должен быть меньше предела порта, Мбит/с.
// Значения без источника, см. decisions/domain.md.
const NETWORK_HEADROOM = 1.3;
const PORT_1G_LIMIT_MBPS = 900;
const PORT_10G_LIMIT_MBPS = 9000;
// мощность на порт PoE у коммутатора, Вт (IEEE 802.3af)
const POE_PORT_W = 15.4;
const SECONDS_PER_DAY = 86400;

export type NetworkPort = "1G" | "10G" | "over10G";

// totalMbps — поток всех камер, Мбит/с; cameraCost — камеры из шаблонов с ценой, $;
// poeW — мощность PoE на все камеры, Вт; archiveTB — архив за archiveDays суток, ТБ.
export type SystemTotals = {
  cameraCount: number;
  totalMbps: number;
  cameraCost: number;
  port: NetworkPort;
  poeW: number;
  archiveDays: number;
  archiveTB: number;
};

// cameras — камеры шаблонов, из них берётся цена камеры типа
export function systemTotals(
  results: TypeResult[],
  settings: SystemSettings,
  cameras: readonly Camera[],
): SystemTotals {
  const cameraCount = results.reduce((sum, result) => sum + result.count, 0);
  const totalMbps = results.reduce(
    (sum, result) =>
      result.ok && result.count > 0
        ? sum + result.stream.bitrateMbps * result.count
        : sum,
    0,
  );
  const cameraCost = results.reduce((sum, result) => {
    const camera = cameras.find(
      (item) => item.id === result.type.inputs.camera,
    );
    const price = camera?.price ?? 0;
    return sum + (price > 0 ? price * result.count : 0);
  }, 0);
  const portMbps = totalMbps * NETWORK_HEADROOM;
  const archiveDays = parseNum(settings.archiveDays) || 0;
  return {
    cameraCount,
    totalMbps,
    cameraCost,
    port:
      portMbps < PORT_1G_LIMIT_MBPS
        ? "1G"
        : portMbps < PORT_10G_LIMIT_MBPS
          ? "10G"
          : "over10G",
    poeW: cameraCount * POE_PORT_W,
    archiveDays,
    archiveTB: (((totalMbps * 1e6) / 8) * SECONDS_PER_DAY * archiveDays) / 1e12,
  };
}
