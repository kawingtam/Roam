import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'web',base:'/Roam/',plugins:[react()],publicDir:'public',build:{outDir:'../pages-dist',emptyOutDir:true,rollupOptions:{input:['web/index.html','web/registration-review.html']}},server:{host:'127.0.0.1',port:5182}});
