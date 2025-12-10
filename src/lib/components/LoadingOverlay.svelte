<script lang="ts">
	interface Props {
		message?: string;
		submessage?: string;
	}

	let { message = 'Loading IFC file...', submessage = 'This may take a moment' }: Props = $props();
</script>

<div
	class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm"
>
	<div class="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
	<p class="text-lg font-medium text-gray-900">{message}</p>
	{#if submessage}
		<p class="text-sm text-gray-500">{submessage}</p>
	{/if}
</div>
