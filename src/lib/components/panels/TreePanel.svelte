<script lang="ts">
	import TreeView from '../TreeView.svelte';
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';

	interface Props {
		tree: TreeNode[];
		hasModel: boolean;
		onItemClick: (_node: TreeNode) => void;
		onItemHover: (_node: TreeNode | null) => void;
		onVisibilityToggle: (_node: TreeNode) => void;
		onClose: () => void;
	}

	let { tree, hasModel, onItemClick, onItemHover, onVisibilityToggle, onClose }: Props = $props();
</script>

<div class="flex h-full w-96 flex-col">
	<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
		<h2 class="font-semibold text-gray-900">IFC Tree</h2>
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
	<div class="flex-1 overflow-y-auto bg-gray-50 p-2">
		<TreeView {tree} {hasModel} {onItemClick} {onItemHover} {onVisibilityToggle} />
	</div>
</div>
