import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig({
 server:{host:'localhost',port:5174,strictPort:true,fs:{allow:[import.meta.dirname,path.resolve(import.meta.dirname,'../shared')]},proxy:{'/api':{target:'http://127.0.0.1:3000',changeOrigin:true}}},
 plugins:[react()],resolve:{alias:{'@':path.resolve(import.meta.dirname,'src')}},
});
