<script lang="ts">
	import type { UnitSystem } from '$lib/utils/measurement';

	interface Props {
		unitSystem: UnitSystem;
		onUnitSystemChange: (_unit: UnitSystem) => void;
		onClose: () => void;
	}

	let { unitSystem, onUnitSystemChange, onClose }: Props = $props();
</script>

<div class="flex h-full w-96 flex-col">
	<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
		<h2 class="font-semibold text-gray-900">Settings</h2>
		<button
			onclick={onClose}
			class="cursor-pointer rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
		<!-- Unit System Setting -->
		<div>
			<h3 class="mb-3 text-sm font-medium text-gray-700">Unit System</h3>
			<div class="flex gap-2">
				<button
					onclick={() => onUnitSystemChange('metric')}
					class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors {unitSystem ===
					'metric'
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					Metric
				</button>
				<button
					onclick={() => onUnitSystemChange('imperial')}
					class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors {unitSystem ===
					'imperial'
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					Imperial
				</button>
			</div>
			<p class="mt-2 text-xs text-gray-400">
				{unitSystem === 'metric' ? 'Meters (m)' : 'Feet and inches (ft-in)'}
			</p>
		</div>
	</div>
</div>
