// Mock for @almadar/logger: the generic almadarMock returns React stubs, which
// are not callable as createLogger(). Provide a real no-op logger instead.
const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

module.exports = {
  __esModule: true,
  createLogger: () => noopLogger,
};
