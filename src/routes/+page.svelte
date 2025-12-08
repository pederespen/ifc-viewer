<script lang="ts">
	import IFCViewer from '$lib/components/IFCViewer.svelte';
</script>

<svelte:head>
	<title>IFC Viewer</title>
	<meta name="description" content="Simple IFC file viewer built with SvelteKit" />
</svelte:head>

<div class="flex h-screen w-full flex-col">
	<IFCViewer />
</div>

