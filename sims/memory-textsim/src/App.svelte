<script>
  import { onMount } from 'svelte';
  import SceneView from './components/SceneView.svelte';
  import TraceDownload from './components/TraceDownload.svelte';
  import { Game } from './engine/game.js';
  import { Tracer } from './engine/tracer.js';
  import memory1Scenes from './engine/scenes/memory_1.json';

  let game = null;
  let tracer = null;
  let currentScene = null;
  let finished = false;
  let started = false;

  function startNewPlaythrough() {
    tracer = new Tracer({ generation_source: 'human' });
    game = new Game(memory1Scenes.scenes, tracer);
    game.startMemory('memory_1', memory1Scenes.entry_scene);
    currentScene = game.getCurrentScene();
    finished = false;
    started = true;
  }

  function handleChoice(optionId) {
    game.makeChoice(optionId);
    currentScene = game.getCurrentScene();
    if (game.isFinished()) {
      finished = true;
    }
  }
</script>

<main>
  <header>
    <h1>Memory Project</h1>
    <p class="subtitle">Text simulation · development build</p>
  </header>

  {#if !started}
    <div class="start-screen">
      <p>A short narrative experience. Approximately 10–15 minutes.</p>
      <button on:click={startNewPlaythrough}>Begin</button>
    </div>
  {:else if finished}
    <TraceDownload {tracer} onRestart={startNewPlaythrough} />
  {:else}
    <SceneView scene={currentScene} onChoice={handleChoice} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #1a1a1a;
    color: #e8e6e0;
    font-family: 'Georgia', 'Times New Roman', serif;
    line-height: 1.6;
  }
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 3rem 2rem;
    min-height: 100vh;
  }
  header {
    text-align: center;
    margin-bottom: 3rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #333;
  }
  h1 {
    font-weight: 400;
    font-size: 1.5rem;
    letter-spacing: 0.05em;
    margin: 0;
    color: #c8c6c0;
  }
  .subtitle {
    font-size: 0.75rem;
    color: #666;
    margin: 0.5rem 0 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .start-screen {
    text-align: center;
    padding: 4rem 0;
  }
  .start-screen p {
    color: #888;
    margin-bottom: 2rem;
  }
  button {
    background: transparent;
    color: #e8e6e0;
    border: 1px solid #555;
    padding: 0.75rem 2rem;
    font-family: inherit;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.05em;
  }
  button:hover {
    border-color: #888;
    color: #fff;
  }
</style>
