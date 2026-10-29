// Общее для работы с DOM: элемент по id и экранирование текста в разметке.
// T — тип элемента, например HTMLInputElement; элемент с таким id есть в layout.html.
export const byId = <T extends Element = HTMLElement>(id: string) =>
  document.getElementById(id) as unknown as T;
// поле формы со значением value
export type Field = HTMLInputElement | HTMLSelectElement;
export const escapeHtml = (text: unknown) =>
  String(text ?? "").replace(
    /[&<>"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!,
  );
