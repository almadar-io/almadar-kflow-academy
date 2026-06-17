// Generic mock for all @almadar/* packages used during Jest tests.
// Returns simple React-renderable stubs for UI components and no-op functions for everything else.
const React = require('react');

const stub = (name) =>
  React.forwardRef(function AlmadarStub(props, ref) {
    return React.createElement('div', { 'data-testid': `almadar-${name}`, ref, ...props });
  });

// Named exports commonly used
module.exports = {
  // @almadar/ui components
  Button: stub('Button'),
  // Allow anything else to be accessed without crashing
  __esModule: true,
  default: new Proxy(
    {},
    {
      get(_, key) {
        if (key === '__esModule') return true;
        if (key === 'default') return {};
        return stub(String(key));
      },
    }
  ),
};

// Make any named import work via Proxy
module.exports = new Proxy(module.exports, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === '__esModule') return true;
    // Return a React component stub for any unknown named import
    return stub(String(key));
  },
});
