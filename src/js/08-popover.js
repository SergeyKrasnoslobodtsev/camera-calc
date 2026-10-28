const pop = document.createElement("div");
pop.className = "pop";
pop.id = "pop";
pop.setAttribute("role", "tooltip");
pop.hidden = true;
document.body.append(pop);
let popFor = null,
  pinned = false;
function showTip(btn, pin) {
  popFor = btn;
  pinned = !!pin;
  pop.textContent = STR.tips[btn.dataset.key];
  pop.hidden = false;
  document
    .querySelectorAll(".tipbtn[aria-expanded=true]")
    .forEach((x) => x.setAttribute("aria-expanded", "false"));
  btn.setAttribute("aria-expanded", "true");
  const r = btn.getBoundingClientRect(),
    pw = pop.offsetWidth,
    ph = pop.offsetHeight,
    vw = document.documentElement.clientWidth,
    vh = window.innerHeight;
  let left = Math.min(
    Math.max(12, r.left + r.width / 2 - pw / 2),
    vw - pw - 12,
  );
  let top = r.bottom + 8;
  if (top + ph > vh - 12 && r.top - ph - 8 > 12) top = r.top - ph - 8;
  pop.style.left = left + "px";
  pop.style.top = top + "px";
}
function hideTip() {
  pop.hidden = true;
  pinned = false;
  if (popFor) popFor.setAttribute("aria-expanded", "false");
  popFor = null;
}
Object.keys(STR.tips).forEach((key) => {
  const lab =
    document.querySelector(`label[for="${key}"]`) ||
    document.querySelector(`[data-tip="${key}"]`);
  if (!lab) return;
  const box = lab.closest(".f");
  if (!box) return;
  const row = document.createElement("div");
  row.className = "lrow";
  lab.before(row);
  row.append(lab);
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tipbtn";
  b.textContent = "?";
  b.dataset.key = key;
  b.setAttribute("aria-label", t("tipAria"));
  b.setAttribute("aria-expanded", "false");
  b.setAttribute("aria-describedby", "pop");
  row.append(b);
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    popFor === b && pinned ? hideTip() : showTip(b, true);
  });
  b.addEventListener("mouseenter", () => {
    if (!pinned) showTip(b, false);
  });
  b.addEventListener("mouseleave", () => {
    if (!pinned && popFor === b) hideTip();
  });
  b.addEventListener("focus", () => {
    if (!pinned) showTip(b, false);
  });
  b.addEventListener("blur", () => {
    if (!pinned && popFor === b) hideTip();
  });
});
document.addEventListener("click", (e) => {
  if (!pop.hidden && !pop.contains(e.target)) hideTip();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideTip();
});
window.addEventListener(
  "scroll",
  () => {
    if (!pop.hidden) hideTip();
  },
  { passive: true },
);
window.addEventListener("resize", () => {
  if (!pop.hidden) hideTip();
});
