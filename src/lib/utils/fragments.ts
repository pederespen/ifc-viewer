import * as OBC from '@thatopen/components';
import type { FragmentsManager, FragmentGroup } from '$lib/types/viewer';

/**
 * Helper utility to work with fragments and eliminate repetitive type casts
 */
export class FragmentsHelper {
	/**
	 * Get the FragmentsManager with proper typing
	 */
	static get(components: OBC.Components): FragmentsManager {
		return components.get(OBC.FragmentsManager) as unknown as FragmentsManager;
	}

	/**
	 * Iterate over all fragment groups
	 */
	static *iterateGroups(components: OBC.Components): Generator<{
		id: string;
		group: FragmentGroup;
	}> {
		const fragments = this.get(components);
		for (const [id, group] of fragments.list) {
			yield { id, group: group as FragmentGroup };
		}
	}

	/**
	 * Get the first model name (UUID) from the fragments list
	 */
	static getFirstModelName(components: OBC.Components): string | undefined {
		const fragments = this.get(components);
		return fragments.list.keys().next().value;
	}

	/**
	 * Get all model names (UUIDs) from the fragments list
	 */
	static getAllModelNames(components: OBC.Components): string[] {
		const fragments = this.get(components);
		return Array.from(fragments.list.keys());
	}

	/**
	 * Update fragments core (for rendering updates)
	 */
	static updateCore(components: OBC.Components): void {
		const fragments = this.get(components) as unknown as {
			core?: { update?: (force: boolean) => void };
		};
		fragments.core?.update?.(true);
	}
}
