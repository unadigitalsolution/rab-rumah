# RAB-Rumahku Pro v3.0.2 — Interactive House Editor Upgrade

## Implemented
- Shared house model migration for `doors`, `windows`, and `partitions`, while preserving legacy `building.openings` counts.
- 3D picking/selection for walls, rooms, doors, windows, partitions, roof and existing structural/visual objects.
- 3D edit mode:
  - drag exterior walls with snap
  - drag doors/windows along their host wall with wall-constrained placement
  - drag partitions
  - edit door/window position and dimensions in the property panel
  - edit room name/size from 3D
  - edit roof type, pitch and overhang
  - add/delete doors, windows and partitions
- 2D plan:
  - rooms remain editable and draggable
  - doors/windows/partitions are represented by model-backed handles
  - doors/windows/partitions can be selected, dragged and edited from the property editor
  - add/delete support is connected to the same model
- Roof coverage:
  - pelana geometry corrected so length/width are not transposed
  - roof uses footprint dimensions plus configured overhang
  - limas roof replaced with a rectangular footprint-aware hipped mesh
  - flat roof uses footprint plus overhang
  - existing `top-interior` / roof visibility mechanism is preserved
- Undo/redo and save/load continue to operate through the same project snapshot/database model.
- RAB remains driven by the existing `engine.js`; door/window counts are synchronized back into `building.openings`.
- Existing engine tests pass.

## Validation performed
- `node --check` passed for app.js, render3d.js, engine.js, main.js and preload.js.
- Existing `node tests/engine.test.js` passed:
  - geometry/RAB calculations
  - material aggregation
  - waste
  - source traceability
  - coefficient override

## Known scope
The current source represents the building footprint as a rectangular `building.length × building.width` model. Therefore the roof follows the complete rectangular footprint; a genuinely arbitrary non-rectangular exterior-wall topology is not introduced because the existing source does not contain an irregular-footprint wall graph. The roof implementation is prepared around the footprint dimensions without replacing the existing 3D engine.
