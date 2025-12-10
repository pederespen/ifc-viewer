<script lang="ts">
	import type { SliceData } from '$lib/utils/slicer';

	interface Props {
		slices: SliceData[];
		onDeleteSlice: (_id: string) => void;
		onClearSlices: () => void;
		onClose: () => void;
	}

	let { slices, onDeleteSlice, onClearSlices, onClose }: Props = $props();
</script>

<div class="flex h-full w-96 flex-col">
	<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
		<h2 class="font-semibold text-gray-900">Slicer</h2>
		<button
			onclick={onClose}
			class="cursor-pointer rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
		<p class="mb-4 text-sm text-gray-500">
			Double-click on a surface to create a clipping plane. Drag the plane's arrow to move it along
			its axis.
		</p>

		<!-- Slices list -->
		{#if slices.length > 0}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium text-gray-700">Clipping Planes</h3>
					<button onclick={onClearSlices} class="text-xs text-gray-500 hover:text-red-600">
						Clear all
					</button>
				</div>
				{#each slices as slice, index}
					<div class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
						<div class="flex items-center gap-2">
							<span
								class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800"
							>
								{index + 1}
							</span>
							<span class="text-sm text-gray-700"> Plane {index + 1} </span>
						</div>
						<button
							onclick={() => onDeleteSlice(slice.id)}
							class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600"
							aria-label="Delete slice"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
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
				{/each}
			</div>
		{/if}
	</div>
</div>
