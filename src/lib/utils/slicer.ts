import * as THREE from 'three';
import * as OBC from '@thatopen/components';

export interface SliceData {
	id: string;
	normal: { x: number; y: number; z: number };
	position: { x: number; y: number; z: number };
}

export class SlicerTool {
	private components: OBC.Components;
	private world: OBC.World;
	private clipper: OBC.Clipper;
	private enabled = false;

	// Callbacks
	public onEnabledChange?: (enabled: boolean) => void;
	public onSlicesChange?: (slices: SliceData[]) => void;

	constructor(components: OBC.Components, world: OBC.World) {
		this.components = components;
		this.world = world;

		// Get the clipper component
		this.clipper = components.get(OBC.Clipper);

		// Setup clipper
		this.clipper.setup({
			color: new THREE.Color(0x1e40af), // Same blue as measurement tool
			opacity: 0.3,
			size: 5
		});

		// Listen for slice changes
		this.clipper.onAfterCreate.add(() => {
			this.notifySlicesChange();
		});

		this.clipper.onAfterDelete.add(() => {
			this.notifySlicesChange();
		});
	}

	get isEnabled(): boolean {
		return this.enabled;
	}

	enable(): void {
		if (this.enabled) return;
		this.enabled = true;
		this.clipper.enabled = true;
		this.onEnabledChange?.(true);
	}

	disable(): void {
		if (!this.enabled) return;
		this.enabled = false;
		this.clipper.enabled = false;
		this.onEnabledChange?.(false);
	}

	toggle(): void {
		if (this.enabled) {
			this.disable();
		} else {
			this.enable();
		}
	}

	async handleDoubleClick(): Promise<boolean> {
		if (!this.enabled) return false;

		try {
			const plane = await this.clipper.create(this.world);
			if (plane) {
				return true;
			}
		} catch (error) {
			console.error('Error creating slice plane:', error);
		}

		return false;
	}

	async deleteAtCursor(): Promise<boolean> {
		if (!this.enabled) return false;

		try {
			await this.clipper.delete(this.world);
			return true;
		} catch (error) {
			console.error('Error deleting slice plane:', error);
		}

		return false;
	}

	deleteSlice(id: string): void {
		const plane = this.clipper.list.get(id);
		if (plane) {
			plane.dispose();
			this.clipper.list.delete(id);
			this.notifySlicesChange();
		}
	}

	clearAllSlices(): void {
		this.clipper.deleteAll();
		this.notifySlicesChange();
	}

	getSlices(): SliceData[] {
		const slices: SliceData[] = [];
		for (const [id, plane] of this.clipper.list) {
			slices.push({
				id,
				normal: {
					x: plane.normal.x,
					y: plane.normal.y,
					z: plane.normal.z
				},
				position: {
					x: plane.origin.x,
					y: plane.origin.y,
					z: plane.origin.z
				}
			});
		}
		return slices;
	}

	private notifySlicesChange(): void {
		this.onSlicesChange?.(this.getSlices());
	}

	setVisible(visible: boolean): void {
		this.clipper.visible = visible;
	}

	dispose(): void {
		this.disable();
		this.clipper.deleteAll();
	}
}
