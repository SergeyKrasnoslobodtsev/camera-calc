// jsdom не выполняет <script type="module">. Браузер выполняет такой скрипт после разбора страницы, здесь — так же:
// его текст добавляется в конец страницы обычным скриптом. Возвращает окно, когда React закончил первую отрисовку.
export async function runModuleScripts(window) {
  const { document } = window;
  document.querySelectorAll('script[type="module"]').forEach((module) => {
    const script = document.createElement("script");
    script.textContent = module.textContent;
    document.body.append(script);
  });
  await settle(window);
  return window;
}

// React отрисовывает не сразу. Изменение состояния — в микрозадаче. Первую отрисовку он планирует
// из микрозадачи отдельной задачей; в jsdom нет MessageChannel, поэтому это setTimeout. Ждём микрозадачи,
// затем задачу, поставленную после задачи React.
export async function settle(window) {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve));
}
