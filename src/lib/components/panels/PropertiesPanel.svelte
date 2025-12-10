<script lang="ts">
	interface Props {
		selectedElement: Record<string, unknown> | null;
		onClearSelection: () => void;
		onClose: () => void;
	}

	let { selectedElement, onClearSelection, onClose }: Props = $props();
</script>

<div class="flex h-full w-96 flex-col">
	<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
		<h2 class="font-semibold text-gray-900">Properties</h2>
		<button
			onclick={onClose}
			class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
			aria-label="Close panel"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	</div>
	<div class="flex-1 overflow-y-auto p-4">
		{#if selectedElement}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-semibold text-gray-900">Element Details</h4>
					<button
						onclick={onClearSelection}
						class="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
					>
						Clear
					</button>
				</div>
				<div class="space-y-3">
					{#each Object.entries(selectedElement) as [key, value]}
						{@const displayValue =
							typeof value === 'object' && value !== null && 'value' in value ? value.value : value}
						{@const shouldDisplay =
							displayValue !== null &&
							displayValue !== undefined &&
							typeof displayValue !== 'object'}

						{#if shouldDisplay}
							<div>
								<dt class="text-xs font-medium tracking-wider text-gray-500 uppercase">
									{key.replace(/^_/, '')}
								</dt>
								<dd class="mt-1 text-sm break-words text-gray-900">{displayValue}</dd>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{:else}
			<p class="text-sm text-gray-500">Double-click an element to view its properties</p>
		{/if}
	</div>
</div>
