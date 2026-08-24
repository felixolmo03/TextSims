<script>
  export let tracer;
  export let onRestart;

  function download() {
    const json = tracer.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `playthrough_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="end-screen">
  <p class="ending-text">End of playthrough.</p>
  <div class="actions">
    <button on:click={download}>Download trace</button>
    <button on:click={onRestart}>New playthrough</button>
  </div>
</div>

<style>
  .end-screen {
    text-align: center;
    padding: 4rem 0;
  }
  .ending-text {
    color: #888;
    margin-bottom: 3rem;
    font-style: italic;
  }
  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  button {
    background: transparent;
    color: #e8e6e0;
    border: 1px solid #555;
    padding: 0.75rem 1.5rem;
    font-family: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  button:hover {
    border-color: #888;
    color: #fff;
  }
</style>
