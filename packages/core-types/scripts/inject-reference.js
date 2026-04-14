#!/usr/bin/env node
// Prepends a triple-slash reference to dist/index.d.ts so consumers of the
// published package automatically pick up the globe.gl ambient declarations.
'use strict';
const fs = require('fs');
const path = require('path');

const dtsPath = path.join(__dirname, '..', 'dist', 'index.d.ts');
const reference = '/// <reference path="./globe-gl.d.ts" />\n';
const contents = fs.readFileSync(dtsPath, 'utf8');
if (!contents.startsWith(reference)) {
  fs.writeFileSync(dtsPath, reference + contents);
}
