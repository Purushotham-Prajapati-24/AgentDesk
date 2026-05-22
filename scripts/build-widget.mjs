import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "widget", "index.tsx");
const outputPath = path.join(projectRoot, "public", "widget.js");

const source = await readFile(sourcePath, "utf8");
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2019,
    module: ts.ModuleKind.None,
    jsx: ts.JsxEmit.ReactJSX,
    removeComments: true,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});

const diagnostics = result.diagnostics ?? [];
const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

if (errors.length > 0) {
  const host = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectRoot,
    getNewLine: () => "\n",
  };
  throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, host));
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, result.outputText, "utf8");
console.log(`Built ${path.relative(projectRoot, outputPath)}`);
