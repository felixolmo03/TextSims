<script>
  export let scene;
  export let onChoice;

  $: hasChoices = scene.choices && scene.choices.length > 0;
</script>

<article class="scene">
  {#if scene.narration}
    {#each scene.narration as paragraph}
      <p>{paragraph}</p>
    {/each}
  {/if}

  {#if hasChoices}
    <div class="choices">
      {#each scene.choices as choice}
        <button on:click={() => onChoice(choice.option_id)}>
          {choice.text}
        </button>
      {/each}
    </div>
  {/if}
</article>

<style>
  .scene {
    animation: fadeIn 0.6s ease-in;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  p {
    font-size: 1.05rem;
    margin-bottom: 1.25rem;
    color: #d8d6d0;
  }
  .choices {
    margin-top: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  button {
    background: transparent;
    color: #c8c6c0;
    border: 1px solid #444;
    padding: 0.85rem 1.25rem;
    font-family: inherit;
    font-size: 0.95rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    line-height: 1.5;
  }
  button:hover {
    border-color: #888;
    color: #fff;
    background: rgba(255, 255, 255, 0.02);
  }
</style>
