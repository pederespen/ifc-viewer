<script lang="ts">
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';

	interface Props {
		tree: TreeNode[];
		hasModel: boolean;
		onItemClick: (item: TreeNode) => void;
	}

	let { tree, hasModel, onItemClick }: Props = $props();
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
		} else {
			onItemClick(node);
		}
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
	<div class="select-none" style="padding-left: {depth * 12}px">
		<div
			class="group flex cursor-pointer items-start gap-1 rounded px-2 py-1 text-sm transition-colors hover:bg-gray-200"
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
			role="button"
			tabindex="0"
		>
			{#if node.children && node.children.length > 0}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 flex-shrink-0 text-gray-500 transition-transform {expandedNodes.has(
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

			<!-- Icon based on type -->
			{#if node.type === 'Model'}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 flex-shrink-0 text-blue-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
					<polyline points="9 22 9 12 15 12 15 22" />
				</svg>
			{:else if node.type === 'TypeGroup' || node.type === 'Type'}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 flex-shrink-0 text-purple-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="3" y="3" width="7" height="7" />
					<rect x="14" y="3" width="7" height="7" />
					<rect x="14" y="14" width="7" height="7" />
					<rect x="3" y="14" width="7" height="7" />
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 flex-shrink-0 text-gray-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				</svg>
			{/if}

			<span class="break-words text-gray-700">{node.name}</span>
		</div>

		{#if expandedNodes.has(node.id) && node.children && node.children.length > 0}
			{#each node.children as child}
				{@render treeNode(child, depth + 1)}
			{/each}
		{/if}
	</div>
{/snippet}
