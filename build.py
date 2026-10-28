#!/usr/bin/env python3
"""Собирает dist/camera-calc.html из src/: разметка + формулы + JS-модули по порядку имён."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / "src"
layout = (src / "layout.html").read_text(encoding="utf-8")
formulas = (src / "formulas.html").read_text(encoding="utf-8").rstrip("\n")
slot = '<div class="formulas" id="formulas"></div>'
assert slot in layout, "в layout.html нет места под формулы"
layout = layout.replace(slot, '<div class="formulas" id="formulas">' + formulas + '</div>')
js = [p.read_text(encoding="utf-8").rstrip("\n") for p in sorted((src / "js").glob("*.js"))]
html = layout + "\n<script>\n" + "\n".join(js) + "\n</script>\n"
out = root / "dist" / "camera-calc.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"{out.relative_to(root)}: {len(html):,} символов")
