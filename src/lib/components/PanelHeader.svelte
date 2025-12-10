<script lang="ts">
	import { icons } from '$lib/constants/icons';

	interface Props {
		title: string;
		onClose: () => void;
	}

	let { title, onClose }: Props = $props();
</script>

<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
	<h2 class="font-semibold text-gray-900">{title}</h2>
	<button
		onclick={onClose}
		class="cursor-pointer rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
		aria-label="Close panel"
	>
		{@html icons.close}
	</button>
</div>
