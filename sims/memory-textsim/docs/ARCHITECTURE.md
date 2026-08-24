# Architecture Notes

## Two frontends, one engine

The core game logic lives in `src/engine/game.js` and `src/engine/tracer.js`. These are plain ES modules with no framework dependencies.

- The **browser** uses Svelte components to render scenes and collect input from a human player. Svelte imports the engine as ES modules directly.
- The **LLM client** uses a small Node HTTP server (`llm_client/engine_bridge.js`) that imports the same engine and exposes it as REST endpoints. Python code drives playthroughs by calling those endpoints.

Both paths end with a schema-compliant `PlayerProfile` object. There is only one implementation of the game rules.

## Scene JSON format

Each memory is one JSON file with:

```json
{
  "memory_id": "memory_1",
  "entry_scene": "m1_arrival",
  "scenes": {
    "scene_id": {
      "context_summary": "brief description for the tracer",
      "narration": ["paragraph 1", "paragraph 2"],
      "on_enter": [ ...events triggered when scene loads... ],
      "choices": [
        {
          "option_id": "unique_id",
          "text": "what the player sees",
          "semantic_tag": "honest|deflecting|cruel|silent|engage|avoid|observe",
          "structural_tag": "terminal|extended",
          "next_scene": "id_of_next_scene",
          "on_select": [ ...events triggered by this choice... ]
        }
      ],
      "terminal": false,
      "next_memory": { "memory_id": "memory_2", "entry_scene": "m2_..." }
    }
  }
}
```

`terminal: true` scenes end the current memory. If `next_memory` is present the engine chains into it. Otherwise the playthrough ends.

## Semantic and structural tags

Every choice is tagged twice:

- **semantic_tag** — what the choice means in the game (honest, deflecting, cruel, silent, engage, avoid, observe)
- **structural_tag** — how the choice extends or closes the exchange (terminal vs extended)

The clustering model uses both to distinguish archetypes with similar semantic patterns but different interaction styles (Withdrawer vs Observer, for example).

## Event stream

The tracer records every meaningful thing that happens as an event with a type, timestamp, and data payload. Event types are defined in Behavior Trace Schema v1.1:

- `zone_entered`, `zone_exited`
- `choice_presented`, `choice_made`
- `stillness_triggered`
- `npc_interaction`
- `object_examined`
- `memory_transition`

The full events array is preserved so feature engineering can be revisited without regenerating data.

## The engine bridge is not for production

`engine_bridge.js` is a minimal local HTTP server intended for the LLM validation workflow — Python driving playthroughs on the same machine. It has no auth, no rate limiting, no persistence. For production LLM runs, wrap it in a proper API service or bake the engine into a Python-native equivalent.
