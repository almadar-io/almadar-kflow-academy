// Mock for @almadar/sdk/* subpaths, kept separate from almadarMock.js (used for
// @almadar/ui and other @almadar/* packages) so a per-test `jest.mock('@almadar/sdk/react', ...)`
// doesn't collide with a `jest.mock('@almadar/ui', ...)` in the same file — the
// generic mapper would otherwise resolve both specifiers to the same file and
// registering a factory for one clobbers the other.
const React = require('react');

const stub = (name) =>
  React.forwardRef(function AlmadarSdkStub(props, ref) {
    return React.createElement('div', { 'data-testid': `almadar-sdk-${name}`, ref, ...props });
  });

module.exports = new Proxy(
  { __esModule: true },
  {
    get(target, key) {
      if (key in target) return target[key];
      if (key === '__esModule') return true;
      return stub(String(key));
    },
  }
);
