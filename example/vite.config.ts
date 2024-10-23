import {resolve} from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  // resolve: {
  //   alias: {
  //     "@netless/appliance-plugin": path.resolve(__dirname, "src"),
  //     "components": path.resolve(__dirname, "src/components"),
  //     "styles": path.resolve(__dirname, "src/styles"),
  //   },
  // },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  css: {
    modules:{
      generateScopedName:'[name]__[local]__[hash:base64:5]',
      hashPrefix:'prefix',
    },
    preprocessorOptions:{
      less:{}
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions:{
      input: resolve(__dirname,'index.html')
    }
  },
})