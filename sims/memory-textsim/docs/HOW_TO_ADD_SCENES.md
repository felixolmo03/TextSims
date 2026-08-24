# How to Add Scenes

## For a new scene in an existing memory

1. Open the appropriate `src/engine/scenes/memory_N.json`.
2. Add a new scene object under the `scenes` key with a unique ID.
3. Point some existing scene's choice `next_scene` at your new scene.
4. Test in browser (`npm run dev`) — play through the branch you added.

## For a new memory

1. Create `src/engine/scenes/memory_N.json` with the standard structure.
2. In the previous memory's terminal scene, set `next_memory` to `{ "memory_id": "memory_N", "entry_scene": "m_N_first" }`.
3. Update `App.svelte` to load the new memory if you want it independently accessible for testing.
4. Restart `engine_bridge.js` so it picks up the new file.

## Choice tag guide

Semantic tags — pick one:

- **honest** — the option that reveals something true about the character
- **deflecting** — the option that avoids the question with warmth
- **silent** — the option to say nothing
- **cruel** — an option that pushes back sharply, said to prove unworthiness
- **engage** — a spatial or nonverbal choice to move toward
- **avoid** — a spatial or nonverbal choice to move away
- **observe** — a choice to watch without committing

Structural tags — pick one:

- **terminal** — this choice ends the exchange or closes it off
- **extended** — this choice invites continuation, elaborates, or asks back

## Testing a new scene

1. Run `npm run dev`, play through the scene manually.
2. Download the trace at the end — inspect the JSON to confirm events fired correctly.
3. Restart the engine bridge, run one LLM persona through the same branch (`--count 1`) to confirm headless mode works.
