<script lang="ts">
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';

	interface Props {
		tree: TreeNode[];
		hasModel: boolean;
		onItemClick: (node: TreeNode) => void;
		onItemHover: (node: TreeNode | null) => void;
		onVisibilityToggle: (node: TreeNode) => void;
	}

	let { tree, hasModel, onItemClick, onItemHover, onVisibilityToggle }: Props = $props();
	let expandedNodes = $state(new Set<string>());

	function toggleNode(nodeId: string) {
		const newSet = new Set(expandedNodes);
		if (newSet.has(nodeId)) {
			newSet.delete(nodeId);
		} else {
			newSet.add(nodeId);
		}
		expandedNodes = newSet; // Create new Set to trigger reactivity
	}

	function handleNodeClick(node: TreeNode) {
		if (node.children && node.children.length > 0) {
			toggleNode(node.id);
		}
		onItemClick(node);
	}

	function handleVisibilityClick(e: MouseEvent, node: TreeNode) {
		e.stopPropagation();
		onVisibilityToggle(node);
	}
</script>

{#if !hasModel}
	<p class="px-2 py-4 text-center text-sm text-gray-500">Load an IFC file to see the structure</p>
{:else if tree.length === 0}
	<p class="px-2 py-4 text-center text-sm text-gray-500">Loading tree...</p>
{:else}
	<div class="space-y-1">
		{#each tree as node}
			{@render treeNode(node, 0)}
		{/each}
	</div>
{/if}

{#snippet treeNode(node: TreeNode, depth: number)}
	<div class="select-none" style="padding-left: {depth * 4}px">
		<div
			class="group flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-blue-200 hover:bg-blue-50 {!node.visible
				? 'opacity-50'
				: ''}"
			onclick={(e) => {
				e.stopPropagation();
				handleNodeClick(node);
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					e.stopPropagation();
					handleNodeClick(node);
				}
			}}
			onmouseenter={() => onItemHover(node)}
			onmouseleave={() => onItemHover(null)}
			role="button"
			tabindex="0"
		>
			{#if node.children && node.children.length > 0}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform {expandedNodes.has(
						node.id
					)
						? 'rotate-90'
						: ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			{:else}
				<div class="h-4 w-4 flex-shrink-0"></div>
			{/if}

			<!-- Type label and name stacked -->
			<div class="flex min-w-0 flex-1 flex-col">
				{#if node.type && node.type !== 'Model' && node.type !== 'TypeGroup' && node.type !== 'Type' && node.type !== 'Info' && node.type !== 'Error'}
					<span class="text-xs font-medium tracking-wide text-gray-500 uppercase">{node.type}</span>
				{/if}
				<span class="text-sm break-words text-gray-800">{node.name}</span>
			</div>

			<!-- Visibility toggle button -->
			<button
				class="flex-shrink-0 rounded p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600"
				onclick={(e) => handleVisibilityClick(e, node)}
				title={node.visible ? 'Hide' : 'Show'}
			>
				{#if node.visible}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 text-gray-300"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
						/>
						<line x1="1" y1="1" x2="23" y2="23" />
					</svg>
				{/if}
			</button>
		</div>

		{#if expandedNodes.has(node.id) && node.children && node.children.length > 0}
			{#each node.children as child}
				{@render treeNode(child, depth + 1)}
			{/each}
		{/if}
	</div>
{/snippet}
