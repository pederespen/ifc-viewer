import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@thatopen/components', '@thatopen/components-front']
	},
	server: {
		port: 3000
	}
});
