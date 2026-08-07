const path = require('path');

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
      return webpackConfig;
    },
  },
};
