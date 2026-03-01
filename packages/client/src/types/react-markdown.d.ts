declare module 'react-markdown' {
  import * as React from 'react';

  const ReactMarkdown: React.ComponentType<any>;

  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const remarkGfm: any;
  export default remarkGfm;
}

declare module 'remark-math' {
  const remarkMath: any;
  export default remarkMath;
}

declare module 'rehype-katex' {
  const rehypeKatex: any;
  export default rehypeKatex;
}

declare module 'react-syntax-highlighter' {
  const SyntaxHighlighter: any;
  export const Prism: any;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: any;
}