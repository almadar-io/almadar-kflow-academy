declare module 'react-syntax-highlighter/dist/esm/prism' {
  import { ComponentType } from 'react';
  interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, React.CSSProperties>;
    children?: string;
    showLineNumbers?: boolean;
    wrapLines?: boolean;
    wrapLongLines?: boolean;
    customStyle?: React.CSSProperties;
    codeTagProps?: React.HTMLAttributes<HTMLElement>;
    [key: string]: unknown;
  }
  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus' {
  const style: Record<string, React.CSSProperties>;
  export default style;
}
