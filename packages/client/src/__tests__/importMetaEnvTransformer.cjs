// ts-jest AST transformer: rewrite `import.meta.env.X` -> `process.env.X` so
// Vite-style env access in app sources compiles under Jest's CJS transform.
/** @type {import('ts-jest').TransformerSourceFile} */
module.exports = {
  name: 'import-meta-env-transformer',
  version: 1,
  factory({ configSet }) {
    const ts = configSet.compilerModule;
    function visit(node) {
      // import.meta.env  ==>  process.env
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === 'env' &&
        ts.isMetaProperty(node.expression) &&
        node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
        node.expression.name.text === 'meta'
      ) {
        return ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('process'),
          'env'
        );
      }
      return ts.visitEachChild(node, visit, undefined);
    }
    return () => (sourceFile) => ts.visitNode(sourceFile, visit);
  },
};
