import type { JsonValue } from '@almadar-io/knowledge';

declare module 'rehype-mathjax' {
  import type { Plugin } from 'unified';

  interface MathJaxOptions {
    tex?: {
      packages?: string[];
    };
    svg?: Record<string, JsonValue>;
    chtml?: Record<string, JsonValue>;
  }

  const rehypeMathjax: Plugin<[MathJaxOptions?]>;
  export default rehypeMathjax;
}

