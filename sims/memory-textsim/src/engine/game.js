// Framework-agnostic game logic. Runs in browser and in Node.
// Consumes scene JSON, drives state, hands events to the tracer.

export class Game {
  constructor(scenes, tracer) {
    this.scenes = scenes;              // { sceneId: sceneObject, ... }
    this.tracer = tracer;              // Tracer instance
    this.currentSceneId = null;
    this.currentMemoryId = null;
    this.state = {};                   // arbitrary state for scene transitions
    this.finished = false;
  }

  startMemory(memoryId, entrySceneId) {
    this.currentMemoryId = memoryId;
    this.tracer.startMemory(memoryId);
    this.goToScene(entrySceneId);
  }

  goToScene(sceneId) {
    const scene = this.scenes[sceneId];
    if (!scene) throw new Error(`Unknown scene: ${sceneId}`);
    this.currentSceneId = sceneId;

    // Fire scene-level events (zone entries, stillness triggers baked into the scene)
    if (scene.on_enter) {
      for (const event of scene.on_enter) {
        this.tracer.recordEvent(event.event_type, event.data);
      }
    }

    // If the scene is a terminal (memory-end) scene, close the memory
    if (scene.terminal) {
      this.tracer.endMemory(this.currentMemoryId);
      if (scene.next_memory) {
        this.startMemory(scene.next_memory.memory_id, scene.next_memory.entry_scene);
      } else {
        this.finished = true;
      }
    } else if (scene.choices && scene.choices.length > 0) {
      // Record that choices are being presented
      this.tracer.recordEvent('choice_presented', {
        scene_id: sceneId,
        context_summary: scene.context_summary || '',
        available_options: scene.choices.map(c => ({
          option_id: c.option_id,
          semantic_tag: c.semantic_tag,
          structural_tag: c.structural_tag || null
        }))
      });
    }
  }

  makeChoice(optionId) {
    const scene = this.scenes[this.currentSceneId];
    const choice = scene.choices.find(c => c.option_id === optionId);
    if (!choice) throw new Error(`Unknown choice: ${optionId} in ${this.currentSceneId}`);

    this.tracer.recordEvent('choice_made', {
      scene_id: this.currentSceneId,
      selected_option_id: choice.option_id,
      semantic_tag: choice.semantic_tag,
      structural_tag: choice.structural_tag || null
    });

    // Fire any follow-on events from the choice (e.g., stillness triggers)
    if (choice.on_select) {
      for (const event of choice.on_select) {
        this.tracer.recordEvent(event.event_type, event.data);
      }
    }

    // Transition to next scene
    if (choice.next_scene) {
      this.goToScene(choice.next_scene);
    }
  }

  getCurrentScene() {
    if (!this.currentSceneId) return null;
    return this.scenes[this.currentSceneId];
  }

  isFinished() {
    return this.finished;
  }
}
