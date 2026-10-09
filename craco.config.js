const path = require('path');

// ---- Opt-in build accelerators -------------------------------------------------
// Every flag below defaults to OFF. With none set, this config behaves exactly as it
// did before they were added, so merging this file cannot change a build on its own —
// each one is armed from the workflow that wants it.
//
// Measured by .github/workflows/measure-build-variants.yml. See
// docs/build-time-optimisation-plan.md §7.1, §7.2, §9.1.
//
// USE_SASS_EMBEDDED and USE_ESBUILD_MINIFY need `sass-embedded` / `esbuild-loader`
// installed. Neither is a dependency of this project: §7.1 measured at -1s and §7.2
// costs +666 kB gzip, so both were rejected and carrying their packages would be dead
// weight in a 4.9 GB tree. The require() calls sit inside the guarded functions, so an
// unset flag never touches them. To re-measure either, install it with --no-save first
// (see the measurement workflow).
const useSassEmbedded = process.env.USE_SASS_EMBEDDED === '1';
const useEsbuildMinify = process.env.USE_ESBUILD_MINIFY === '1';
const persistWebpackCache = process.env.PERSIST_WEBPACK_CACHE === '1';

// react-scripts 5.0.1 ships sass-loader 12.6.0, whose implementation resolution tries
// `sass` first and only falls back to `sass-embedded` when neither `sass` nor
// `node-sass` resolves (sass-loader/dist/utils.js:28). Since `sass` is a direct
// dependency, installing sass-embedded alone changes nothing — the implementation has
// to be handed over explicitly.
function useSassEmbeddedImplementation(webpackConfig) {
  const implementation = require('sass-embedded');
  let patched = 0;

  const visit = rules => {
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object') continue;
      if (Array.isArray(rule.oneOf)) visit(rule.oneOf);
      if (Array.isArray(rule.rules)) visit(rule.rules);
      if (!Array.isArray(rule.use)) continue;

      for (const entry of rule.use) {
        const loader = typeof entry === 'string' ? entry : entry && entry.loader;
        if (typeof loader !== 'string' || !loader.includes('sass-loader')) continue;
        if (typeof entry === 'string') continue; // no options object to attach to
        entry.options = { ...entry.options, implementation };
        patched += 1;
      }
    }
  };

  visit(webpackConfig.module.rules);

  // CRA registers sass-loader twice (sassRegex and sassModuleRegex). Zero means the
  // rule shape changed and this override silently did nothing — fail instead, or the
  // measurement reports "no improvement" for a swap that never happened.
  if (patched === 0) {
    throw new Error(
      'USE_SASS_EMBEDDED=1 but no sass-loader rule was found — the react-scripts webpack config shape changed'
    );
  }
  console.log(`[craco] sass-embedded implementation applied to ${patched} sass-loader rule(s)`);
}

// CRA minifies with TerserPlugin (react-scripts webpack.config.js:262). esbuild's
// minifier is typically several times faster. It is a DIFFERENT minifier producing
// DIFFERENT output, so this is not a free swap — the app has to be exercised, not just
// the build. CSS minification is left on cssnano deliberately; only JS moves.
function useEsbuildMinifier(webpackConfig) {
  const { EsbuildPlugin } = require('esbuild-loader');
  const minimizer = webpackConfig.optimization && webpackConfig.optimization.minimizer;

  if (!Array.isArray(minimizer)) {
    throw new Error('USE_ESBUILD_MINIFY=1 but optimization.minimizer is not an array');
  }

  const terserIndex = minimizer.findIndex(
    p => p && p.constructor && p.constructor.name === 'TerserPlugin'
  );
  if (terserIndex === -1) {
    throw new Error('USE_ESBUILD_MINIFY=1 but no TerserPlugin was found to replace');
  }

  // es2015 mirrors what Terser is fed: babel has already downlevelled the syntax, so
  // the target only bounds which transforms esbuild may apply while minifying.
  minimizer[terserIndex] = new EsbuildPlugin({ target: 'es2015', legalComments: 'none' });
  console.log('[craco] TerserPlugin replaced with esbuild minifier');
}

// react-scripts/scripts/build.js calls compiler.run() and never compiler.close().
// webpack 5 flushes a `store: 'pack'` cache only on close, so the filesystem cache
// configured at react-scripts webpack.config.js:242 is never written in a production
// build — measured in run 32186452054, which produced only babel-loader. Closing the
// compiler once the build is done persists it.
//
// NOTE: persisting the cache is not the same as benefiting from it. cache.version is
// md5(env.raw) and env.raw carries every REACT_APP_* var, so REACT_APP_SENTRY_RELEASE
// — which contains the commit sha — invalidates the whole pack between deploys. See
// plan §9.1 before arming this in a real pipeline.
class PersistWebpackCachePlugin {
  apply(compiler) {
    compiler.hooks.done.tapAsync('PersistWebpackCachePlugin', (stats, callback) => {
      compiler.close(closeErr => {
        if (closeErr) {
          console.warn('[craco] webpack cache persist failed:', closeErr.message);
        }
        callback();
      });
    });
  }
}

// ─── Dr. Copilot Tailwind ────────────────────────────────────────────────────
// The Dr. Copilot module is ported from the Dr.Agent Next.js repo, which is
// Tailwind-native. Rather than hand-translate ~7,600 lines of utilities into
// SCSS (and risk drifting from the source UI), we compile Tailwind for that one
// module only.
//
// Scope is enforced twice over: tailwind.copilot.config.js sets
// `important: '#dr-copilot-root'` so every utility is emitted under that
// ancestor selector, and `preflight: false` so no global resets are emitted.
// The rule below runs ONLY on src/components/dr-copilot/ui/copilot.css, and
// that file is removed from CRA's default CSS rule so it is not processed twice.
const COPILOT_CSS = path.resolve(__dirname, 'src/components/dr-copilot/ui/copilot.css');

function addCopilotTailwindRule(webpackConfig) {
  const isDev = process.env.NODE_ENV !== 'production';
  let excluded = false;

  // 1. Exclude copilot.css from CRA's own css rule.
  const visit = (rules) => {
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object') continue;
      if (Array.isArray(rule.oneOf)) visit(rule.oneOf);
      // CRA has two .css rules: the plain one (test /\.css$/, exclude
      // /\.module\.css$/) and the CSS-modules one (test /\.module\.css$/).
      // Both match "x.css", so match the test source exactly instead.
      if (rule.test instanceof RegExp && rule.test.source === '\\.css$') {
        rule.exclude = rule.exclude ? [].concat(rule.exclude, COPILOT_CSS) : [COPILOT_CSS];
        excluded = true;
      }
    }
  };
  visit(webpackConfig.module.rules);

  if (!excluded) {
    throw new Error(
      '[craco] could not find CRA\'s plain-CSS rule to exclude copilot.css from — ' +
        'the react-scripts webpack config shape changed'
    );
  }

  // 2. Add our own rule that runs Tailwind with the copilot config.
  const styleLoader = isDev
    ? require.resolve('style-loader')
    : require('mini-css-extract-plugin').loader;

  const oneOf = webpackConfig.module.rules.find((r) => Array.isArray(r.oneOf));
  if (!oneOf) throw new Error('[craco] no oneOf rule set found in webpack config');

  oneOf.oneOf.unshift({
    test: /\.css$/,
    include: COPILOT_CSS,
    use: [
      styleLoader,
      { loader: require.resolve('css-loader'), options: { importLoaders: 1 } },
      {
        loader: require.resolve('postcss-loader'),
        options: {
          postcssOptions: {
            plugins: [
              require('tailwindcss')(require.resolve('./tailwind.copilot.config.js')),
              require('autoprefixer'),
            ],
          },
        },
      },
    ],
  });

  console.log('[craco] Dr. Copilot Tailwind rule registered');
}

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // @cloudflare/realtimekit ships both ESM (dist/index.es.js) and CJS (dist/index.cjs.js).
      // CRA 5's outside-app Babel loader applies @babel/plugin-transform-parameters but NOT
      // @babel/plugin-transform-classes, which crashes on super() in arrow functions with rest
      // params present in the ESM build. Aliasing to the CJS build avoids the transform entirely.
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@cloudflare/realtimekit': path.resolve(
          __dirname,
          'node_modules/@cloudflare/realtimekit/dist/index.es5.js'
        ),
      };

      addCopilotTailwindRule(webpackConfig);

      if (useSassEmbedded) useSassEmbeddedImplementation(webpackConfig);
      if (useEsbuildMinify) useEsbuildMinifier(webpackConfig);
      if (persistWebpackCache) {
        webpackConfig.plugins = [...(webpackConfig.plugins || []), new PersistWebpackCachePlugin()];

        // webpack keeps pack entries for unused modules for 60 days by default, so the
        // cache only ever grows: 474 MB -> 509 MB -> 525 MB over three uat deploys. A
        // week is far longer than the gap between deploys, so nothing still in use is
        // ever pruned, while modules deleted or renamed stop being carried forever.
        if (webpackConfig.cache && typeof webpackConfig.cache === 'object') {
          webpackConfig.cache.maxAge = 7 * 24 * 60 * 60 * 1000;
        }

        console.log('[craco] webpack filesystem cache will be persisted on close');
      }

      return webpackConfig;
    },
  },
};
