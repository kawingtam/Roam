import {build} from 'vite';
import {cp} from 'node:fs/promises';
await build({configFile:'web/vite.config.ts'});
await cp('docs','pages-dist/preview',{recursive:true});
