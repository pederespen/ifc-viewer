<script lang="ts">
	import TreeView from './TreeView.svelte';
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';

	interface Props {
		isOpen: boolean;
		tree: TreeNode[];
		hasModel: boolean;
		selectedElement: any;
		onToggle: () => void;
		onTreeItemClick: (node: TreeNode) => void;
		onTreeItemHover: (node: TreeNode | null) => void;
		onVisibilityToggle: (node: TreeNode) => void;
		onClearSelection: () => void;
	}

	let {
		isOpen,
		tree,
		hasModel,
		selectedElement,
		onToggle,
		onTreeItemClick,
		onTreeItemHover,
		onVisibilityToggle,
		onClearSelection
	}: Props = $props();

	let activeAccordion: string | null = $state('tree');

	function toggleAccordion(section: string) {
		activeAccordion = activeAccordion === section ? null : section;
	}

	// Export function to allow parent to control active accordion
	export function setActiveAccordion(section: string) {
		activeAccordion = section;
	}
</script>

<!-- Side Panel -->
<div
	class="relative z-10 flex h-full border-r border-gray-200 bg-white shadow-sm transition-all duration-300"
>
	{#if !isOpen}
		<!-- Collapsed state - Icon sidebar only -->
		<div class="flex h-full w-14 flex-col bg-gray-50">
			<!-- Expand button at top -->
			<button
				onclick={onToggle}
				class="flex h-14 w-14 items-center justify-center border-b border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
				title="Expand panel"
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
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>

			<!-- Section Icons -->
			<div class="flex flex-col">
				<button
					onclick={() => {
						onToggle();
						activeAccordion = 'tree';
					}}
					class="flex h-14 w-14 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					title="IFC Tree"
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
						<rect x="3" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="14" width="7" height="7" rx="1" />
						<rect x="3" y="14" width="7" height="7" rx="1" />
					</svg>
				</button>
				<button
					onclick={() => {
						onToggle();
						activeAccordion = 'properties';
					}}
					class="flex h-14 w-14 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					title="Properties"
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
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" y1="13" x2="8" y2="13" />
						<line x1="16" y1="17" x2="8" y2="17" />
						<polyline points="10 9 9 9 8 9" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<!-- Expanded state - Full panel -->
		<div class="flex h-full w-96 flex-col">
			<!-- Side Panel Header -->
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">Navigation</h2>
				<button
					onclick={onToggle}
					class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Collapse panel"
					title="Collapse panel"
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
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</button>
			</div>

			<!-- Accordion Menu -->
			<div class="flex-1 overflow-y-auto">
				<!-- IFC Tree Section -->
				<div class="border-b border-gray-200">
					<button
						onclick={() => toggleAccordion('tree')}
						class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-gray-600"
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
						<span class="flex-1 font-medium text-gray-900">IFC Tree</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-gray-500 transition-transform {activeAccordion === 'tree'
								? 'rotate-180'
								: ''}"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>

					{#if activeAccordion === 'tree'}
						<div class="border-t border-gray-100 bg-gray-50 px-2 py-2">
							<TreeView
								{tree}
								{hasModel}
								onItemClick={onTreeItemClick}
								onItemHover={onTreeItemHover}
								{onVisibilityToggle}
							/>
						</div>
					{/if}
				</div>

				<!-- Properties Section -->
				<div class="border-b border-gray-200">
					<button
						onclick={() => toggleAccordion('properties')}
						class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-gray-600"
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
						<span class="flex-1 font-medium text-gray-900">Properties</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-gray-500 transition-transform {activeAccordion === 'properties'
								? 'rotate-180'
								: ''}"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>

					{#if activeAccordion === 'properties'}
						<div class="border-t border-gray-100 bg-gray-50 px-4 py-4">
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
									<div class="max-h-96 space-y-3 overflow-y-auto">
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
								<p class="text-sm text-gray-500">Select an element to view its properties</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
