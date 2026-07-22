import React from 'react';
import ReactDOM from 'react-dom/client';
import { enableMapSet } from 'immer';
import { initializePatterns } from '@almadar/ui/renderer';
import { registerCodeLanguageLoader } from '@almadar/ui';
import './styles';
import App from './App';

// Enable Immer support for Map and Set - must be called before any Redux code
enableMapSet();

// Load the Almadar pattern registry so runtime-rendered orbitals can instantiate UI patterns
initializePatterns();

// Dynamic Prism grammar loading: any syntax-highlighting language outside the
// statically-bundled set (e.g. ocaml, ruby, java) is fetched on demand. This
// must live in app source — Vite code-splits each grammar into its own lazy
// chunk via import.meta.glob, which a dynamic import inside the pre-bundled
// @almadar/ui dep cannot do. We glob refractor's self-contained language
// definitions directly (react-syntax-highlighter's prism files are thin
// re-exports of these, but depend on a transitive refractor that isn't
// resolvable from app source). First encounter of a language fetches ~10-30KB;
// cached thereafter. The glob key's basename (minus .js) is the language id.
const prismLanguageLoaders = import.meta.glob<{ default: (prism: object) => void }>(
  '../node_modules/refractor/lang/*.js',
);

registerCodeLanguageLoader(async (lang) => {
  const entry = Object.entries(prismLanguageLoaders).find(([path]) => path.endsWith(`/lang/${lang}.js`));
  if (!entry) return null;
  const mod = await entry[1]();
  return mod.default;
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
