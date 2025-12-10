<script lang="ts">
	import type { CompassAxes } from '$lib/types/viewer';

	interface Props {
		compassAxes: CompassAxes;
		onRecenter: () => void;
		onReset: () => void;
	}

	let { compassAxes, onRecenter, onReset }: Props = $props();

	const axes = $derived(
		[
			{ axis: 'x', color: '#ef4444', data: compassAxes.x },
			{ axis: 'y', color: '#22c55e', data: compassAxes.y },
			{ axis: 'z', color: '#3b82f6', data: compassAxes.z }
		].sort((a, b) => a.data.z - b.data.z)
	);
</script>

<div
	class="absolute right-4 bottom-4 z-10 flex flex-col items-center overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-lg backdrop-blur-sm"
>
	<div class="p-2">
		<svg class="h-28 w-28" viewBox="-44 -44 88 88">
			<circle cx="0" cy="0" r="40" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />

			<!-- Center dot rendered first (behind everything for 3D effect) -->
			<circle cx="0" cy="0" r="4" fill="#374151" stroke="white" stroke-width="1" />

			<!-- Render axes in depth order (back to front) -->
			{#each axes as { axis, color, data }}
				{@const opacity = 0.5 + (data.z + 1) * 0.25}
				{@const strokeWidth = 2.5 + (data.z + 1) * 0.5}

				<!-- Shadow for line -->
				<line
					x1="1"
					y1="1"
					x2={data.x + 1}
					y2={data.y + 1}
					stroke="rgba(0,0,0,0.15)"
					stroke-width={strokeWidth + 1}
					stroke-linecap="round"
				/>

				<!-- Axis line -->
				<line
					x1="0"
					y1="0"
					x2={data.x}
					y2={data.y}
					stroke={color}
					stroke-width={strokeWidth}
					stroke-linecap="round"
					{opacity}
				/>

				<!-- Shadow for circle -->
				<circle cx={data.x + 1} cy={data.y + 1} r={8 + (data.z + 1) * 1} fill="rgba(0,0,0,0.15)" />

				<!-- Axis circle -->
				<circle cx={data.x} cy={data.y} r={8 + (data.z + 1) * 1} fill={color} {opacity} />

				<!-- Axis label -->
				<text
					x={data.x}
					y={data.y}
					text-anchor="middle"
					dominant-baseline="central"
					fill="white"
					font-size={9 + (data.z + 1) * 0.5}
					font-weight="bold">{axis.toUpperCase()}</text
				>
			{/each}
		</svg>
	</div>
	<div class="h-px w-full bg-gray-200"></div>
	<div class="flex w-full">
		<button
			onclick={onRecenter}
			class="flex flex-1 cursor-pointer items-center justify-center border-r border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-100"
			title="Recenter"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 text-gray-600"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M2 8V2h6" /><path d="M22 8V2h-6" /><path d="M2 16v6h6" /><path d="M22 16v6h-6" />
				<circle cx="12" cy="12" r="2" fill="currentColor" />
			</svg>
		</button>
		<button
			onclick={onReset}
			class="flex flex-1 cursor-pointer items-center justify-center px-3 py-2.5 transition-colors hover:bg-gray-100"
			title="Reset View"
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
				<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<polyline points="9 22 9 12 15 12 15 22" />
			</svg>
		</button>
	</div>
</div>
