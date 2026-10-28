const popover = document.createElement("div");
popover.className = "pop";
popover.id = "popover";
popover.setAttribute("role", "tooltip");
popover.hidden = true;
document.body.append(popover);
// кнопка «?», для которой открыта подсказка; pinned — открыта щелчком, а не наведением
let popoverOwner = null,
  pinned = false;
function showTip(button, pin) {
  popoverOwner = button;
  pinned = !!pin;
  popover.textContent = STR.tips[button.dataset.key];
  popover.hidden = false;
  document
    .querySelectorAll(".tipbtn[aria-expanded=true]")
    .forEach((openButton) => openButton.setAttribute("aria-expanded", "false"));
  button.setAttribute("aria-expanded", "true");
  const rect = button.getBoundingClientRect(),
    popoverWidth = popover.offsetWidth,
    popoverHeight = popover.offsetHeight,
    viewportWidth = document.documentElement.clientWidth,
    viewportHeight = window.innerHeight;
  let left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - popoverWidth / 2),
    viewportWidth - popoverWidth - 12,
  );
  let top = rect.bottom + 8;
  if (
    top + popoverHeight > viewportHeight - 12 &&
    rect.top - popoverHeight - 8 > 12
  )
    top = rect.top - popoverHeight - 8;
  popover.style.left = left + "px";
  popover.style.top = top + "px";
}
function hideTip() {
  popover.hidden = true;
  pinned = false;
  if (popoverOwner) popoverOwner.setAttribute("aria-expanded", "false");
  popoverOwner = null;
}
Object.keys(STR.tips).forEach((key) => {
  const label =
    document.querySelector(`label[for="${key}"]`) ||
    document.querySelector(`[data-tip="${key}"]`);
  if (!label) return;
  const box = label.closest(".f");
  if (!box) return;
  const row = document.createElement("div");
  row.className = "lrow";
  label.before(row);
  row.append(label);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tipbtn";
  button.textContent = "?";
  button.dataset.key = key;
  button.setAttribute("aria-label", t("tipAria"));
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-describedby", "popover");
  row.append(button);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    popoverOwner === button && pinned ? hideTip() : showTip(button, true);
  });
  button.addEventListener("mouseenter", () => {
    if (!pinned) showTip(button, false);
  });
  button.addEventListener("mouseleave", () => {
    if (!pinned && popoverOwner === button) hideTip();
  });
  button.addEventListener("focus", () => {
    if (!pinned) showTip(button, false);
  });
  button.addEventListener("blur", () => {
    if (!pinned && popoverOwner === button) hideTip();
  });
});
document.addEventListener("click", (event) => {
  if (!popover.hidden && !popover.contains(event.target)) hideTip();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideTip();
});
window.addEventListener(
  "scroll",
  () => {
    if (!popover.hidden) hideTip();
  },
  { passive: true },
);
window.addEventListener("resize", () => {
  if (!popover.hidden) hideTip();
});
