import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: null,
    supportFile: false,
    specPattern: 'test/e2e/*.cy.js',
  },
});
