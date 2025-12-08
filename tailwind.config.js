/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Light mode - light blue/gray
				'bg-primary': '#f0f4f8',
				'bg-secondary': '#e2e8f0',
				'bg-surface': '#ffffff',
				'text-primary': '#1e293b',
				'text-secondary': '#64748b',
				'border-primary': '#cbd5e1',
				
				// Dark mode - dark but not super dark
				'bg-primary-dark': '#1a1d23',
				'bg-secondary-dark': '#252931',
				'bg-surface-dark': '#2d323a',
				'text-primary-dark': '#e2e8f0',
				'text-secondary-dark': '#94a3b8',
				'border-primary-dark': '#3f4654',
				
				// Accent colors (same for both modes)
				'accent-primary': '#3b82f6',
				'accent-hover': '#2563eb'
			}
		}
	},
	plugins: []
};

