// Lightweight HTTP wrapper around the same engine the browser uses.
// The Python LLM client hits this to drive playthroughs.
//
// Run with: node engine_bridge.js
// Serves on port 3001.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Game } from '../src/engine/game.js';
import { Tracer } from '../src/engine/tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load scene data
const scenesDir = path.resolve(__dirname, '../src/engine/scenes');
const scenes = {};
for (const file of fs.readdirSync(scenesDir)) {
  if (file.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(path.join(scenesDir, file), 'utf-8'));
    scenes[data.memory_id] = data;
  }
}

// Active sessions keyed by profile_id
const sessions = new Map();

// Polyfill crypto.randomUUID for older Node
if (!globalThis.crypto) {
  globalThis.crypto = { randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  })};
}

// Polyfill performance.now for headless mode
if (!globalThis.performance) {
  globalThis.performance = { now: () => Date.now() };
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const payload = body ? JSON.parse(body) : {};
      const action = req.url.slice(1);
      const result = handleAction(action, payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

function handleAction(action, payload) {
  if (action === 'start') {
    const { memory_id, profile_id, metadata } = payload;
    const memoryData = scenes[memory_id];
    if (!memoryData) throw new Error(`No scene data for ${memory_id}`);

    const tracer = new Tracer({ ...metadata, profile_id });
    const game = new Game(memoryData.scenes, tracer);
    game.startMemory(memory_id, memoryData.entry_scene);
    sessions.set(profile_id, { game, tracer });

    return {
      finished: game.isFinished(),
      current_scene: game.getCurrentScene()
    };
  }

  if (action === 'choose') {
    const { profile_id, option_id } = payload;
    const session = sessions.get(profile_id);
    if (!session) throw new Error(`No session ${profile_id}`);
    session.game.makeChoice(option_id);
    return {
      finished: session.game.isFinished(),
      current_scene: session.game.getCurrentScene()
    };
  }

  if (action === 'advance') {
    // No-op for scenes with no choices (terminal)
    const { profile_id } = payload;
    const session = sessions.get(profile_id);
    return {
      finished: session.game.isFinished(),
      current_scene: session.game.getCurrentScene()
    };
  }

  if (action === 'export') {
    const { profile_id } = payload;
    const session = sessions.get(profile_id);
    const exported = session.tracer.export();
    sessions.delete(profile_id);
    return exported;
  }

  throw new Error(`Unknown action: ${action}`);
}

server.listen(3001, () => {
  console.log('Engine bridge listening on http://localhost:3001');
});
