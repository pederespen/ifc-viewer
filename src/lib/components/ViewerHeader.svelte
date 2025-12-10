<script lang="ts">
	interface Props {
		currentFileName?: string;
	}

	let { currentFileName }: Props = $props();
</script>

<div
	class="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm"
>
	<div class="flex items-center gap-3">
		<button
			class="relative cursor-pointer text-2xl font-semibold text-gray-900 transition-colors hover:text-blue-600"
			onclick={() => window.location.reload()}
		>
			IFC Viewer
			<span class="align-super text-xs font-normal text-gray-400 lowercase">beta</span>
		</button>
		{#if currentFileName}
			<span class="text-sm text-gray-600">•</span>
			<span class="text-sm text-gray-700">{currentFileName}</span>
		{/if}
	</div>
</div>
