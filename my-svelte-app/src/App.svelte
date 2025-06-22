<script>
  import Router from 'svelte-spa-router';
  import Personal from './routes/personal.svelte';
  import Games from './routes/games.svelte';

  const routes = {
    '/': Personal,
    '/games': Games
  };
</script>

<Router {routes} />