<script lang="ts">
	import { icons, type IconName } from '$lib/constants/icons';

	interface Props {
		icon: IconName;
		label: string;
		active: boolean;
		highlighted?: boolean;
		onclick: () => void;
	}

	let { icon, label, active, highlighted = false, onclick }: Props = $props();
</script>

<button
	{onclick}
	class="group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors"
	class:bg-blue-600={active}
	class:text-white={active || highlighted}
	class:bg-green-600={highlighted && !active}
	class:text-gray-300={!active && !highlighted}
	class:hover:bg-gray-700={!active && !highlighted}
	class:hover:text-white={!active && !highlighted}
	aria-label={label}
>
	{@html icons[icon]}
	<div
		class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
	>
		{label}
	</div>
</button>
