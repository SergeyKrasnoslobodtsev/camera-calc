// Экран шаблонов «Камеры»: встроенные и свои камеры, сколько камер каждого шаблона в расчёте, форма своей камеры.
import {
  STR,
  displayName,
  formatNumber,
  t,
  withUnit,
} from "../../i18n/index.ts";
import type { Camera } from "../../domain/entities/camera.ts";
import { parseNum } from "../../domain/parse-num.ts";
import { allCameras, deleteCamera, state } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { CameraForm } from "./CameraForm.tsx";
import { CatalogSection } from "./CatalogSection.tsx";

// камер шаблона во всех типах; недопустимое число камер типа не считается
const camerasInUse = (cameraId: string) =>
  state.cameraTypes
    .filter((type) => type.inputs.camera === cameraId)
    .reduce((sum, type) => sum + (Math.round(parseNum(type.count)) || 0), 0);

const millimeters = (value: number) => formatNumber(value, 1);
function lensText({ focalMin, focalMax }: Camera) {
  if (focalMin <= 0) return t("cameraAnyLens");
  return focalMin === focalMax
    ? withUnit(millimeters(focalMin), "mm")
    : withUnit(`${millimeters(focalMin)}–${millimeters(focalMax)}`, "mm");
}

export function CameraTemplates({ hidden }: { hidden: boolean }) {
  // свои камеры и типы, где они выбраны, — из state
  useComputed();
  const cameras = allCameras();
  return (
    <div className="gpage" id="templatePage-cams" hidden={hidden}>
      <CatalogSection
        titleId="camerasTitle"
        title={t("camerasTitle", cameras.length)}
        note={t("camerasNote")}
      >
        <div className="tbl" style={{ padding: "4px 8px 12px" }}>
          <table id="cameraTable">
            <thead>
              <tr>
                {STR.cameraTableHeader.map((header) => (
                  <th key={header}>{header}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera) => (
                <CameraRow key={camera.id} camera={camera} />
              ))}
            </tbody>
          </table>
        </div>
      </CatalogSection>
      <CameraForm />
    </div>
  );
}

function CameraRow({ camera }: { camera: Camera }) {
  const name = displayName(camera);
  const remove = () => {
    deleteCamera(camera.id);
    toast(t("cameraDeleted"));
  };
  return (
    <tr>
      <td className="txt">
        <b style={{ fontWeight: 600 }}>{name}</b>
        <span className="sub">
          {t(camera.custom ? "cameraCustom" : "cameraBuiltin")}
        </span>
      </td>
      <td>
        {camera.Nw} × {camera.Nh}
      </td>
      <td>{withUnit(formatNumber(camera.sensorWidth, 2), "mm")}</td>
      <td>{lensText(camera)}</td>
      <td>{camera.price ? "$" + formatNumber(camera.price, 0) : "—"}</td>
      <td>{camerasInUse(camera.id)}</td>
      <td>
        {camera.custom && (
          <button
            type="button"
            className="sm"
            aria-label={t("deleteAria", name)}
            onClick={remove}
          >
            {t("deleteBtn")}
          </button>
        )}
      </td>
    </tr>
  );
}
