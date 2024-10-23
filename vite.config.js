import path from "path";
import { defineConfig } from "vite";
import pkg from './package.json';
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const external = Object.keys({
    ...pkg.peerDependencies
  });
  return {
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
    css: {
      modules:{
        generateScopedName:'[name]__[local]__[hash:base64:5]',
        hashPrefix:'prefix',
      },
      preprocessorOptions:{
        less:{}
      }
    },
    build: {
      target:['es2015'],
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        formats: ['iife', 'es', "cjs"],
        name: 'LittleBoard',
        fileName: 'index'
      },
      outdir: "dist",
      sourcemap: true,
      rollupOptions: {
        external,
        output:{
          globals:{
            whiteWebSdk: 'white-web-sdk',
            appliancePlugin: '@netless/appliance-plugin',
            windowManager: '@netless/window-manager'
          }
        }
      },
      minify: isProd,
    }
  };
});
