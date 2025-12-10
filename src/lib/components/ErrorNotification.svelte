<script lang="ts">
	interface Props {
		error: string;
		onClose: () => void;
	}

	let { error, onClose }: Props = $props();
</script>

<div class="animate-fade-in absolute top-4 right-4 z-30 max-w-md">
	<div class="rounded-lg border border-red-200 bg-white p-4 shadow-lg">
		<div class="flex items-start gap-3">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 flex-shrink-0 text-red-500"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<div class="flex-1">
				<h3 class="font-semibold text-red-800">Error Loading IFC File</h3>
				<p class="mt-1 text-sm text-red-700">{error}</p>
			</div>
			<button
				onclick={onClose}
				class="flex-shrink-0 cursor-pointer text-red-400 transition-colors hover:text-red-600"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	</div>
</div>
