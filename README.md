# Emberwild — GitHub Pages test build

A standalone browser RPG built with Babylon.js, WebGPU with automatic WebGL fallback, painted 3D scenery and directional 2D characters. This package includes all ten tree designs and the full-quality game assets.

Source snapshot: `e2609980eaa42f6b04556518113cc7d1b3f319e9` (published Sites version 39).

This export includes the animated start screen, loading progress, eight town guards, camp rescues, and the latest water and healing effects. `build-info.json` records the source version and SHA-256 hashes of every game file.

## GitHub Pages

Upload these files to the root of a repository's `main` branch. Keep `index.html`, `.nojekyll`, the JavaScript/WASM files and `assets/` together, preserving their names and folder structure.

In **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then save. Open the published project URL with its trailing slash, for example `https://USERNAME.github.io/REPOSITORY/`. No build step or package installation is required.

## Run locally

Install Node.js, extract the ZIP, open a terminal in the extracted folder and run:

```sh
node server.cjs
```

Open `http://127.0.0.1:4174/`. If that port is already occupied, choose another, for example `node server.cjs 4192`. Stop the server with Ctrl+C.

Alternatively, with Python installed, run `python -m http.server 4174 --bind 127.0.0.1` from the extracted folder. Serve the files over HTTP or HTTPS; opening `index.html` directly through `file://` will not load the game's modules correctly. The local server binds only to your own computer.

## Play

- WASD or arrows: move. Left-click the ground: walk to a point.
- Hold right mouse and drag: orbit and tilt. Scroll: zoom. Z/C: rotate. V: reset view.
- Space: attack. Q: class skill. F: ultimate. Shift: dash. R: potion.
- E: interact. I: inventory. J: quest log. M: map. T: tree designs. Escape: pause/settings.
- Sound defaults to on after beginning the adventure; automatic basic attacks default to off.

Progress saves in this browser's local storage. GitHub Pages, another hosting domain and localhost have separate saves. Paths on the same origin share local storage, so two Emberwild copies under the same `USERNAME.github.io` origin use the same save key. No game account or server is required.

Use `?renderer=webgl` to test WebGL explicitly. WebGPU requires a compatible browser/device and HTTPS (localhost is also supported). `gpu-check.html` provides a local diagnostic page. Preview studios use their explicit filenames, such as `environment-studio.html?place=trees` and `combat-studio.html?preview=loot`.

Babylon and shader helpers are bundled. The title screen requests Google Fonts; the CSS includes fallback fonts if that service is unavailable. The bundled Babylon license is in `BABYLON-LICENSE.md`.
