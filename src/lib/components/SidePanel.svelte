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
	}

	let {
		isOpen,
		tree,
		hasModel,
		selectedElement,
		onToggle,
		onTreeItemClick,
		onTreeItemHover,
		onVisibilityToggle
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
	class="relative z-10 flex h-full flex-col border-r border-gray-200 bg-white shadow-sm transition-all duration-300 {isOpen
		? 'w-96'
		: 'w-0'}"
	style="overflow: hidden;"
>
	<div class="flex h-full w-96 flex-col">
		<!-- Side Panel Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
			<h2 class="font-semibold text-gray-900">Navigation</h2>
			<button
				onclick={onToggle}
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
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<!-- Accordion Menu -->
		<div class="flex-1 overflow-y-auto">
			<!-- IFC Tree Section -->
			<div class="border-b border-gray-200">
				<button
					onclick={() => toggleAccordion('tree')}
					class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
				>
					<span class="font-medium text-gray-900">IFC Tree</span>
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
					class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
				>
					<span class="font-medium text-gray-900">Properties</span>
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
								<h4 class="text-sm font-semibold text-gray-900">Element Details</h4>
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

			<!-- Layers Section (placeholder for future) -->
			<div class="border-b border-gray-200">
				<button
					onclick={() => toggleAccordion('layers')}
					class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
				>
					<span class="font-medium text-gray-900">Layers</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-gray-500 transition-transform {activeAccordion === 'layers'
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

				{#if activeAccordion === 'layers'}
					<div class="border-t border-gray-100 bg-gray-50 px-4 py-4">
						<p class="text-sm text-gray-500">Layer controls will appear here</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
