import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';
import { ESLint } from 'eslint';
import globals from 'globals';

const source = fs.readFileSync('src/App.jsx', 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true });
const functions = ast.body.filter(node => node.type === 'FunctionDeclaration');
const templateComponent = functions.find(node => node.id.name === 'ClientTemplatesPage');
const uploadHandler = templateComponent.body.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'handleTemplateImageUpload');
assert.ok(uploadHandler, 'Template upload handler must live in the template component');
const lint = new ESLint({ overrideConfigFile: true, overrideConfig: [{ files: ['**/*.jsx'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser }, rules: { 'no-undef': 'error' } }] });
const results = await lint.lintFiles(['src/App.jsx']);
assert.deepEqual(results.flatMap(result => result.messages), [], 'UI callbacks must resolve their dependencies');

let state = {};
let calls = [];
let busy = false;
let allowed = true;
let failUpload = false;
const alerts = [];
const context = vm.createContext({
  Date,
  client: { id: 'eco-fixture' },
  editingTemplate: null,
  access: {},
  console: { log() {} },
  alert: message => alerts.push(message),
  requirePlanPermission: () => allowed,
  setSaving: value => { busy = value; },
  setForm: update => { state = update(state); },
  uploadTemplateImageAsset: async (...args) => {
    calls.push(args);
    if (failUpload) throw new Error('Upload failed');
    return `https://example.test/${args[3]}.png`;
  },
});
vm.runInContext(source.slice(...uploadHandler.range), context);
for (const [field, folder] of [['customLogoUrl', 'logo'], ['backgroundUrl', 'background'], ['mainImageUrl', 'main']]) {
  const file = { name: 'image.png', type: 'image/png' };
  const event = { target: { files: [file], value: 'selected' } };
  await context.handleTemplateImageUpload(event, field, folder);
  assert.equal(state[field], `https://example.test/${folder}.png`);
  assert.equal(event.target.value, '');
  assert.equal(busy, false);
  assert.deepEqual(calls.at(-1), ['eco-fixture', undefined, file, folder]);
}
assert.equal(state.backgroundMode, 'image');
context.editingTemplate = { id: 'existing-template' };
await context.handleTemplateImageUpload({ target: { files: [{}] } }, 'customLogoUrl', 'logo');
assert.equal(calls.at(-1)[1], 'existing-template');
const previous = { ...state };
failUpload = true;
await context.handleTemplateImageUpload({ target: { files: [{}] } }, 'customLogoUrl', 'logo');
assert.deepEqual({ ...state }, previous, 'Failed upload must preserve the form');
assert.equal(busy, false);
assert.equal(alerts.at(-1), 'Upload failed');
allowed = false;
const before = calls.length;
await context.handleTemplateImageUpload({ target: { files: [{}] } }, 'customLogoUrl', 'logo');
assert.equal(calls.length, before, 'Plan restriction must prevent upload');

const accessFunctions = ['parseClientDate', 'formatPlanAccessDate', 'getClientPlanAccess', 'timeToMinutes'];
vm.runInContext(functions.filter(node => accessFunctions.includes(node.id.name)).map(node => source.slice(...node.range)).join('\n'), context);
for (const [dueDate, create, edit] of [['2026-09-11', true, true], ['2026-09-06', false, true], ['2026-09-01', false, false], ['2026-08-27', false, false]]) {
  const access = context.getClientPlanAccess({ dueDate }, new Date('2026-09-11T12:00:00'));
  assert.equal(access.canCreate, create);
  assert.equal(access.canEdit, edit);
}
assert.equal(context.timeToMinutes('09:30'), 570);
console.log('PASS: UI callback scope, new/edit image uploads, upload failure, plan restrictions and scheduling helper');
