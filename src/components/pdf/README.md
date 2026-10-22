# PDFCN / Forme

Components and themes in this directory were installed from the official PDFCN
registry at https://pdfcn.dev/r/ using shadcn. Source:
https://github.com/shadcn-labs/pdfcn (MIT, see LICENSE).

The report editor uses Forme, not Puppeteer. Editable JSX is interpreted through
the allowlisted evaluator in `src/lib/lead-research/pdf/evaluate-jsx.ts`; it is
never executed as arbitrary JavaScript. The same component tree produces both
the live PDF preview and downloaded reports.

`pdfcn-theme.ts` has its registry-generated import corrected to the installed
professional-theme path. Runtime themes are selected in the report renderer.
The renderer maps `Times-Roman` to Forme's built-in `Times` family. Corporate's
Lato fonts are bundled under `assets/pdf/fonts/` (SIL Open Font License).
