// Prepares the exported ./dist for GitHub Pages:
//  - 404.html (copy of index.html) so client-side routing handles deep links
//    and hard refreshes, which Pages would otherwise 404.
//  - .nojekyll so Pages serves the underscore-prefixed _expo/ asset folder.
import { copyFileSync, writeFileSync, existsSync } from 'node:fs';

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html not found — run the web export first.');
  process.exit(1);
}

copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
console.log('Prepared dist/ for GitHub Pages (404.html + .nojekyll).');
