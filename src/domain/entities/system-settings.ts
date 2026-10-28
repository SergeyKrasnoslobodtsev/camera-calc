// Параметры системы: значения полей формы строками, разбираются при расчёте (parseNum)
export type SystemSettings = {
  efficiency: string; // доля паспортной производительности GPU, которая достижима на деле
  reserve: string; // запас по нагрузке инференса и декодера, %
  archiveDays: string; // глубина архива, сут; 0 — без архива
  gpu: string; // "auto" или id GPU
  gpuCount: string; // "auto" или число GPU
};
