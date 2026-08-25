// Framework-agnostic game logic. Runs in browser and in Node.
// Consumes scene JSON, drives state, hands events to the tracer.

export class Game {
  constructor(scenes, tracer) {
    this.scenes = scenes;
    this.tracer = tracer;
    this.currentSceneId = null;
    this.currentMemoryId = null;
    this.state = {};
    this.finished = false;
    this.awaitingContinue = false;
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

    if (scene.on_enter) {
      for (const event of scene.on_enter) {
        this.tracer.recordEvent(event.event_type, event.data);
      }
    }

    if (scene.terminal) {
      this.awaitingContinue = true;
    } else if (scene.choices && scene.choices.length > 0) {
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

    if (choice.on_select) {
      for (const event of choice.on_select) {
        this.tracer.recordEvent(event.event_type, event.data);
      }
    }

    if (choice.next_scene) {
      this.goToScene(choice.next_scene);
    }
  }

  continueFromTerminal() {
    const scene = this.scenes[this.currentSceneId];
    if (!scene.terminal || !this.awaitingContinue) return;
    this.awaitingContinue = false;
    this.tracer.endMemory(this.currentMemoryId);
    if (scene.next_memory) {
      this.startMemory(scene.next_memory.memory_id, scene.next_memory.entry_scene);
    } else {
      this.finished = true;
    }
  }

  getCurrentScene() {
    if (!this.currentSceneId) return null;
    return this.scenes[this.currentSceneId];
  }

  // -----------------------------------------------------------------------
  // Assemble the scene's narration for rendering. If the scene uses
  // static + fragments + close, evaluate the fragment conditions against
  // the trace and produce a single flat array of paragraphs.
  //
  // Fragment condition keys supported:
  //   if_zone_entered: "zone_id"
  //   if_choice_made:  "option_id"
  //   if_semantic_tag: "honest" | "deflecting" | "avoid" | ...
  //   if_stillness_context: "overwhelmed" | "being_seen" | ...
  //
  // A fragment may declare multiple conditions; ALL must be true for the
  // fragment to appear. If a fragment has no conditions, it always appears.
  // -----------------------------------------------------------------------
  getSceneNarration(sceneId) {
    const scene = this.scenes[sceneId || this.currentSceneId];
    if (!scene) return [];

    // Simple case: static narration only
    if (scene.narration && !scene.narration_fragments) {
      return scene.narration;
    }

    // Fragment case: assemble static intro + matching fragments + static close
    const paragraphs = [];
    if (scene.narration_static) {
      paragraphs.push(...scene.narration_static);
    }
    if (scene.narration_fragments) {
      const matched = scene.narration_fragments
        .filter(f => this._fragmentMatches(f))
        .map(f => f.text);
      if (matched.length > 0) {
        paragraphs.push(matched.join(' '));
      }
    }
    if (scene.narration_close) {
      paragraphs.push(...scene.narration_close);
    }
    return paragraphs;
  }

  _fragmentMatches(fragment) {
    if (fragment.if_zone_entered) {
      if (!this.tracer.hasZoneEntered(fragment.if_zone_entered)) return false;
    }
    if (fragment.if_choice_made) {
      if (!this.tracer.hasChoiceMade(fragment.if_choice_made)) return false;
    }
    if (fragment.if_semantic_tag) {
      if (!this.tracer.hasSemanticTag(fragment.if_semantic_tag)) return false;
    }
    if (fragment.if_stillness_context) {
      if (this.tracer.countStillness(fragment.if_stillness_context) === 0) return false;
    }
    return true;
  }

  isAwaitingContinue() {
    return this.awaitingContinue;
  }

  isFinished() {
    return this.finished;
  }
}
