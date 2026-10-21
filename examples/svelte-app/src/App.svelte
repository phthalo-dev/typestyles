<script lang="ts">
  import { button } from './styles';

  let ghost = $state(false);
</script>

<main class="page">
  <h1>typestyles + Svelte</h1>
  <p>Typed component styles with ordinary <code>class</code> bindings.</p>
  <button type="button" class={button({ ghost }).className} onclick={() => (ghost = !ghost)}>
    {ghost ? 'Ghost' : 'Primary'}
  </button>
</main>

<style>
  .page {
    max-width: 40rem;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }
</style>
