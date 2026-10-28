import type { Feed } from "./feed.ts";
import type { ObjectResult } from "./scene-object.ts";

// Запуск модели: одна модель с одинаковой подачей обслуживает свои объекты одним проходом.
// load — кадров в секунду на входе модели со всех камер типа: камеры × частота аналитики × тайлы.
export type RunGroup = {
  model: string;
  feed: Feed;
  objects: ObjectResult[];
  load: number;
};

export function runGroups(
  objects: ObjectResult[],
  count: number,
  analyticsFps: number,
): RunGroup[] {
  const groups = new Map<string, RunGroup>();
  objects.forEach((result) => {
    const { object, feed } = result;
    const key = [
      object.model,
      object.feed,
      feed.inputSize,
      object.feed === "tiles" ? object.overlap : "",
    ].join("|");
    const group = groups.get(key);
    if (group) group.objects.push(result);
    else
      groups.set(key, {
        model: object.model,
        feed,
        objects: [result],
        load: count * analyticsFps * feed.tiles,
      });
  });
  return [...groups.values()];
}
