// Schema-compliant behavior trace recorder.
// Matches Behavior Trace Schema v1.1.

export class Tracer {
  constructor(metadata = {}) {
    this.profile = {
      profile_id: metadata.profile_id || crypto.randomUUID(),
      profile_metadata: {
        generation_source: metadata.generation_source || 'human',
        llm_model: metadata.llm_model || null,
        llm_persona_intent: metadata.llm_persona_intent || null,
        llm_temperature: metadata.llm_temperature || null,
        llm_prompt_version: metadata.llm_prompt_version || null,
        timestamp: new Date().toISOString(),
        game_version: metadata.game_version || '0.1.0',
        schema_version: '1.1.0'
      },
      memory_traces: {},
      final_profile: {
        feature_vector: null,
        assigned_cluster: null,
        assigned_archetype: null,
        ai_report_variant: null
      }
    };
    this.currentMemory = null;
    this.memoryStartTime = null;
    this.eventCounter = 0;
    this.useRealTimestamps = metadata.generation_source === 'human';
  }

  startMemory(memoryId) {
    this.currentMemory = memoryId;
    this.memoryStartTime = performance.now();
    this.eventCounter = 0;

    this.profile.memory_traces[memoryId] = {
      memory_id: memoryId,
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: null,
      events: [],
      derived_features: {}
    };

    this.recordEvent('memory_transition', {
      transition_type: 'start',
      trigger: 'scripted'
    });
  }

  endMemory(memoryId) {
    if (this.currentMemory !== memoryId) return;
    const memory = this.profile.memory_traces[memoryId];
    memory.ended_at = new Date().toISOString();
    memory.total_duration_seconds = this.useRealTimestamps
      ? (performance.now() - this.memoryStartTime) / 1000
      : null;

    this.recordEvent('memory_transition', {
      transition_type: 'end',
      trigger: 'scripted'
    });
  }

  recordEvent(eventType, data) {
    if (!this.currentMemory) return;

    const timestamp = this.useRealTimestamps
      ? (performance.now() - this.memoryStartTime) / 1000
      : this.eventCounter;

    this.profile.memory_traces[this.currentMemory].events.push({
      event_type: eventType,
      timestamp: timestamp,
      timestamp_source: this.useRealTimestamps ? 'real' : 'synthetic',
      data: data
    });

    this.eventCounter++;
  }

  // -----------------------------------------------------------------------
  // Query methods: let the engine inspect what happened during this memory
  // so scenes can conditionally include narration fragments.
  // -----------------------------------------------------------------------

  getEventsForMemory(memoryId) {
    const memory = this.profile.memory_traces[memoryId || this.currentMemory];
    return memory ? memory.events : [];
  }

  // Did the player enter this zone during the given memory (default: current)?
  hasZoneEntered(zoneId, memoryId) {
    return this.getEventsForMemory(memoryId).some(e =>
      e.event_type === 'zone_entered' && e.data.zone_id === zoneId
    );
  }

  // Did the player make this specific choice option during the given memory?
  hasChoiceMade(optionId, memoryId) {
    return this.getEventsForMemory(memoryId).some(e =>
      e.event_type === 'choice_made' && e.data.selected_option_id === optionId
    );
  }

  // Did the player make any choice with this semantic tag during the given memory?
  hasSemanticTag(tag, memoryId) {
    return this.getEventsForMemory(memoryId).some(e =>
      e.event_type === 'choice_made' && e.data.semantic_tag === tag
    );
  }

  // Total count of choices with a given semantic tag during the given memory.
  countSemanticTag(tag, memoryId) {
    return this.getEventsForMemory(memoryId).filter(e =>
      e.event_type === 'choice_made' && e.data.semantic_tag === tag
    ).length;
  }

  // Count of stillness triggers during the given memory (optionally filtered by context).
  countStillness(context, memoryId) {
    return this.getEventsForMemory(memoryId).filter(e =>
      e.event_type === 'stillness_triggered' &&
      (!context || e.data.trigger_context === context)
    ).length;
  }

  export() {
    return JSON.parse(JSON.stringify(this.profile));
  }

  toJSON() {
    return JSON.stringify(this.profile, null, 2);
  }
}
