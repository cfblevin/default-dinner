# Default Dinner

A personal food system: tonight's dinner, four core bowls, four protein desserts, meal prep, inventory and shopping.

Live: https://cfblevin.github.io/default-dinner/ — add it to your home screen. It works offline after the first visit.

## Editing
1. Edit files in `src/`.
2. Run `python3 build.py --site-dir .` from this folder. It rebuilds `index.html`, `sw.js` and `manifest.webmanifest`.
3. Commit and push. Phones pick up the new version in the background and use it the next time the app opens.

Icons: `python3 tools/make_icons.py icons`. All user data stays in the browser (localStorage).
