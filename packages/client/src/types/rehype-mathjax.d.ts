declare module 'rehype-mathjax' {
  import type { Plugin } from 'unified';

  interface MathJaxOptions {
    tex?: {
      packages?: string[];
    };
    svg?: Record<string, unknown>;
    chtml?: Record<string, unknown>;
  }

  const rehypeMathjax: Plugin<[MathJaxOptions?]>;
  export default rehypeMathjax;
}

