<script lang="ts">
	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let expandedHelpItems = $state(new Set<string>());

	function toggleHelpItem(id: string) {
		const newSet = new Set(expandedHelpItems);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedHelpItems = newSet;
	}

	const helpItems = [
		{
			id: 'tree',
			title: 'IFC Tree',
			icon: 'tree',
			content:
				'Browse the building structure hierarchically. Click items to expand or collapse. Hover over items to highlight them in the 3D view with a transparent x-ray effect. Use the eye icon to toggle visibility of elements and their children.'
		},
		{
			id: 'measure',
			title: 'Measure',
			icon: 'measure',
			content:
				'Measure distances in your model. Double-click to place the first point, then double-click again to complete the measurement. The distance is shown on the line.'
		},
		{
			id: 'slicer',
			title: 'Slicer',
			icon: 'slicer',
			content:
				'Create clipping planes to cut through your model. Double-click on any surface to create a plane. Drag the arrow to move it along its axis. Use the X button to remove planes.'
		},
		{
			id: 'properties',
			title: 'Properties',
			icon: 'properties',
			content:
				'View element details. Double-click any element in the 3D view to select it and see all its IFC attributes and property sets.'
		}
	];
</script>

<div class="flex h-full w-96 flex-col">
	<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
		<h2 class="font-semibold text-gray-900">Help</h2>
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
		<p class="mb-4 text-sm text-gray-500">
			A free, browser-based IFC viewer for exploring BIM models. <strong class="text-gray-600"
				>100% local — your files never leave your browser.</strong
			>
			Built with
			<a
				href="https://github.com/ThatOpen/engine_components"
				target="_blank"
				class="text-blue-600 hover:underline">That Open Engine</a
			>
			and
			<a
				href="https://github.com/IFCjs/web-ifc"
				target="_blank"
				class="text-blue-600 hover:underline">web-ifc</a
			>.
		</p>
		<div class="space-y-1">
			{#each helpItems as item}
				<div>
					<button
						onclick={() => toggleHelpItem(item.id)}
						class="flex w-full cursor-pointer items-center justify-between rounded px-2 py-2 text-left transition-colors hover:bg-gray-100"
					>
						<span class="flex items-center gap-2 text-sm font-medium text-gray-700">
							{#if item.icon === 'tree'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M3 3h4v4H3zM13 7h4v4h-4zM13 17h4v4h-4z" />
									<path d="M5 7v6h8M5 13h8v4" />
								</svg>
							{:else if item.icon === 'properties'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
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
								</svg>
							{:else if item.icon === 'measure'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"
									/>
									<path d="m14.5 12.5 2-2" />
									<path d="m11.5 9.5 2-2" />
									<path d="m8.5 6.5 2-2" />
									<path d="m17.5 15.5 2-2" />
								</svg>
							{:else if item.icon === 'slicer'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="6" cy="6" r="3" />
									<circle cx="6" cy="18" r="3" />
									<line x1="20" y1="4" x2="8.12" y2="15.88" />
									<line x1="14.47" y1="14.48" x2="20" y2="20" />
									<line x1="8.12" y1="8.12" x2="12" y2="12" />
								</svg>
							{/if}
							{item.title}
						</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 text-gray-400 transition-transform {expandedHelpItems.has(item.id)
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
					{#if expandedHelpItems.has(item.id)}
						<p class="px-2 pb-2 pl-8 text-sm text-gray-500">{item.content}</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
