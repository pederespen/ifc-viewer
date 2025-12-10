<script lang="ts">
	import TreeView from './TreeView.svelte';
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';

	interface Props {
		tree: TreeNode[];
		hasModel: boolean;
		selectedElement: Record<string, unknown> | null;
		onTreeItemClick: (node: TreeNode) => void;
		onTreeItemHover: (node: TreeNode | null) => void;
		onVisibilityToggle: (node: TreeNode) => void;
		onClearSelection: () => void;
	}

	let {
		tree,
		hasModel,
		selectedElement,
		onTreeItemClick,
		onTreeItemHover,
		onVisibilityToggle,
		onClearSelection
	}: Props = $props();

	let activePanel: string | null = $state(null);

	function togglePanel(panel: string) {
		activePanel = activePanel === panel ? null : panel;
	}

	// Open properties panel when an element is selected
	$effect(() => {
		if (selectedElement) {
			activePanel = 'properties';
		}
	});
</script>

<!-- Side Panel Container -->
<div class="relative z-10 flex h-full w-16">
	<!-- Icon Sidebar (Always Visible) -->
	<div class="flex h-full w-16 flex-col border-r border-gray-200 bg-gray-800 shadow-sm">
		<!-- Menu Items -->
		<div class="flex flex-col gap-1 p-2">
			<!-- IFC Tree Icon -->
			<button
				onclick={() => togglePanel('tree')}
				class="group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors {activePanel ===
				'tree'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="IFC Tree"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="3" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="14" width="7" height="7" rx="1" />
					<rect x="3" y="14" width="7" height="7" rx="1" />
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					IFC Tree
				</div>
			</button>

			<!-- Properties Icon -->
			<button
				onclick={() => togglePanel('properties')}
				class="group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors {activePanel ===
				'properties'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="Properties"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					Properties
				</div>
			</button>
		</div>
	</div>

	<!-- Slide-out Panel (Positioned Absolutely) -->
	<div
		class="absolute top-0 left-16 h-full overflow-hidden border-r border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out {activePanel
			? 'w-96'
			: 'w-0'}"
	>
		<!-- IFC Tree Panel - Always rendered, visibility controlled by CSS -->
		<div class="flex h-full w-96 flex-col {activePanel === 'tree' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">IFC Tree</h2>
				<button
					onclick={() => togglePanel('tree')}
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
			<div class="flex-1 overflow-y-auto bg-gray-50 p-2">
				<TreeView
					{tree}
					{hasModel}
					onItemClick={onTreeItemClick}
					onItemHover={onTreeItemHover}
					{onVisibilityToggle}
				/>
			</div>
		</div>

		<!-- Properties Panel - Always rendered, visibility controlled by CSS -->
		<div class="flex h-full w-96 flex-col {activePanel === 'properties' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">Properties</h2>
				<button
					onclick={() => togglePanel('properties')}
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
									typeof value === 'object' && value !== null && 'value' in value
										? value.value
										: value}
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
	</div>
</div>
