# RAB Rumahku Pro — Audit & Implementasi Phase 1

## Audit awal
- Electron entry point: `electron/src/main.js`
- Preload bridge: `electron/src/preload.js`
- UI/application state: `electron/src/app.js`
- Three.js renderer/editor: `electron/src/render3d.js`
- RAB quantity/material engine: `electron/src/engine.js`
- Persistence: SQLite table `projects` in Electron main process.
- Existing building data: `project.building` + `project.rooms`.
- Existing 2D editor: room select/drag/resize in `app.js`.
- Existing 3D model: generated from project dimensions/specification in `render3d.js`.
- Existing RAB geometry: `engine.js::geometry()` derives quantities from building dimensions and openings.
- Existing export: PDF/Excel through Electron main process.

## Risiko
The existing application has separate conceptual room rectangles and exterior building dimensions. Phase 1 therefore uses the existing building model as the source and derives four exterior wall objects in 3D rather than introducing a second persistent wall database.

## Implementasi
1. 3D wall metadata and selection.
2. Edit mode with constrained exterior-wall drag.
3. Snap/grid controls.
4. Numeric wall dimension editing.
5. Room boundary resize when an exterior wall changes.
6. Undo/redo history.
7. Explicit save state.
8. No new RAB coefficients.

## Testing
| Test | Status |
|---|---|
| `node --check electron/src/app.js` | PASS |
| `node --check electron/src/render3d.js` | PASS |
| Existing RAB/material engine tests | PASS |
| Electron GUI startup | NOT TESTED (dependencies are not bundled in source ZIP) |
| Real mouse wall drag in Chromium/Electron | NOT TESTED |
| Save/reload GUI interaction | NOT TESTED |
| Full regression GUI suite | NOT TESTED |

Do not interpret NOT TESTED as PASS.
