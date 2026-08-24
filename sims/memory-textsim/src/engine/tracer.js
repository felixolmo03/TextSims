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

    // Derived features are computed later by the extraction pipeline,
    // not here. This keeps the tracer thin and the feature engineering
    // versionable independently.
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

  export() {
    return JSON.parse(JSON.stringify(this.profile));
  }

  toJSON() {
    return JSON.stringify(this.profile, null, 2);
  }
}
