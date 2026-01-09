import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use Vercel adapter for deployment
		adapter: adapter({
			// Use Edge Functions for faster response times (optional)
			// runtime: 'edge',
			
			// Use Node.js runtime (default, more compatible)
			runtime: 'nodejs22.x',
			
			// Regions to deploy to (optional - Vercel will auto-select)
			// regions: ['gru1'], // São Paulo
			
			// Split output for better caching (recommended)
			split: true
		}),
		
		// Alias for easier imports
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$services: 'src/lib/services'
		}
	}
};

export default config;
