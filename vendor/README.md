# Local Tesseract package

`dhspl-tatvacare-tesseract-ui-1.1.0.tgz` is built from the user-provided Tesseract Storybook source and committed so clean installs do not contact GitHub Packages. Component imports, CSS and Tesseract icon CDN behavior remain unchanged.

- Package: `@dhspl-tatvacare/tesseract-ui` 1.1.0
- Source: `DHSPL-Tatvacare/tesseract-design-system`, commit `96d23da7f3b13b31fcfb489b65aac7a1b49a2f3f`
- Build: `npm run build:lib` in the Storybook checkout
- Pack: `npm pack --ignore-scripts --pack-destination /path/to/TP_Shyam_design/vendor`
- SHA-256: `c2ed7d00de243e2cda7d226ad86edbe7347c95b1916b6c94131ee3e1ad460b4b`
- Archive includes only `dist/`, the upstream README and package metadata. Upstream license metadata is preserved.

To update, build and pack a new library version, update the local file dependency in `package.json`, then run `npm install --package-lock-only --ignore-scripts`. Commit the new archive and lockfile together. Vercel needs no package registry token for this dependency.
