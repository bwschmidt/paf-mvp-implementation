import { join } from 'path';
import { defineConfig } from 'rollup';
import image from '@rollup/plugin-image';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import commonjs from "@rollup/plugin-commonjs";
import typescript from '@rollup/plugin-typescript';
import nodeResolve from "@rollup/plugin-node-resolve";
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';
import preact from 'rollup-plugin-preact';
import postcss from 'rollup-plugin-postcss'
import {terser} from 'rollup-plugin-terser';
import livereload from 'rollup-plugin-livereload';

import postCssInitial from 'postcss-initial';
import autoprefixer from 'autoprefixer';

const DEV = process.env.ROLLUP_WATCH;
const DIST = 'dist';

const relative = path => join(__dirname, path);
const getDestFolder = (path) => (DEV ? DIST : relative('../paf-mvp-demo-express/public/assets')) + path

// https://rollupjs.org/guide/en/#configuration-files
export default [
  defineConfig({
    input: relative('src/lib/paf-lib.ts'),
    output: {
      file: getDestFolder(`/paf-lib.js`),
      format: 'umd',
      name: 'PAF',
      sourcemap: DEV
    },
    treeshake: 'smallest', // remove unused code
    plugins: [
      typescript({
        tsconfig: relative('src/lib/tsconfig.json')
      }),
      commonjs(),
      nodeResolve(),
      // terser(), // minify js output
    ]
  }),
  defineConfig({
    input: relative('src/main.ts'), // entry file
    output: {
      file: getDestFolder(`/app.bundle.js`),
      format: 'umd', // preact-habitat requires "umd" format
      name: 'bundle',
      sourcemap: DEV,
    },
    treeshake: 'recommended', // remove unused code
    plugins: [ // a list of plugins we apply to the source code
      alias({ // create aliases to replace import sources
        entries: [
          {find: 'react', replacement: 'preact/compat'},
          {find: 'react-dom/test-utils', replacement: 'preact/test-utils'},
          {find: 'react-dom', replacement: 'preact/compat'},
          {find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime'}
        ]
      }),
      replace({ // replace value in runtime
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify(DEV ? 'development' : 'production'),
        'env__development': DEV ? 'env__development' : 'env__production' // to import correct env file
      }),
      postcss({ // compile scss => css
        modules: true, // add hashes to css selectors to have CSS Modules
        extract: true, // extract css from the output js
        minimize: !DEV,
        plugins: [ postCssInitial, autoprefixer() ]
      }),
      image(), // allow to import images into ts code (as base64)
      preact({ // compile preact components to javascript
        usePreactX: false,
        noPropTypes: false,
        noReactIs: false,
        noEnv: false,
        browser: true,
        resolvePreactCompat: true,
      }),
      typescript({
          tsconfig: relative('tsconfig.app.json')
        }
      ), // compile typescript => js
      ...(() => {
        if (!DEV) { // list of plugins for production
          return [
            terser(), // minify js output
            copy({ // copy files
              targets: [
                {
                  src: './assets/*',
                  dest: '../paf-mvp-demo-express/public/assets',
                },
              ],
            }),
          ]
        } else { // list of plugins for development
          return [
            serve({ // dev server
              contentBase: '',
              open: false, // change to true to open browser automatically
              openPage: '/',
              // Set to true to return index.html (200) instead of error page (404)
              historyApiFallback: true,
              host: 'localhost',
              port: 3000,
            }),
            livereload({ // reload the page if any changes
              watch: DIST,
            })
          ]
        }
      })(),
    ],
  })
];
