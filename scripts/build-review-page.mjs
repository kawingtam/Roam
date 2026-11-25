import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
// Self-contained, public-code-only page. Publishing it needs no Android source changes.
const result=await build({entryPoints:['web/review/main.tsx'],bundle:true,write:false,outdir:'review-bundle',platform:'browser',format:'iife',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline'});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replaceAll('</script','<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
const config=await readFile('web/public/config.js','utf8');
if(/sb_secret_|service_role|re_[A-Za-z0-9_]{20}/.test(config))throw Error('Only browser-safe configuration may be bundled.');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Roam · Private registration review</title><style>${css}</style></head><body><div id="review-root"></div><script>${config}</script><script>${js}</script></body></html>\n`;
await writeFile('docs/registration-review.html',html);
console.log('Standalone browser review page prepared (not published): docs/registration-review.html');
