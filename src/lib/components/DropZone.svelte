<script lang="ts">
	interface Props {
		isDragging: boolean;
		onTriggerFileInput: () => void;
	}

	let { isDragging, onTriggerFileInput }: Props = $props();
</script>

<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
	<div
		class="pointer-events-auto flex h-1/2 w-1/2 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-all {isDragging
			? 'border-blue-500 bg-blue-50 text-blue-600'
			: 'border-gray-300 text-gray-400 hover:border-gray-400 hover:bg-gray-50'}"
		onclick={onTriggerFileInput}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onTriggerFileInput()}
		role="button"
		tabindex="0"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="64"
			height="64"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="17 8 12 3 7 8" />
			<line x1="12" y1="3" x2="12" y2="15" />
		</svg>
		<p class="text-lg font-medium">Drop your IFC file here</p>
		<p class="text-sm opacity-70">or click to browse</p>
	</div>
</div>
