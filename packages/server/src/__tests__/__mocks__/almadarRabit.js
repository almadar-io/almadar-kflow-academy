// Stub for @almadar-io/rabit: its published dist is ESM-only and uses import.meta,
// which Jest's CJS transform cannot load. kflow's server never imports rabit directly;
// only @almadar-io/knowledge's dist does (runToolLoop), and no test exercises it.
export const runToolLoop = jest.fn(() => {
  throw new Error('@almadar-io/rabit is stubbed in tests');
});
