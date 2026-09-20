const fs = require('fs');

const path = '/Users/doducqunynhtram/Documents/projects/prjvan/js/components/reference.js';
let content = fs.readFileSync(path, 'utf8');

// The CSS is injected via a template literal: style.innerHTML = ` ... `;
// I will just use a regex replace to scope the problematic generic selectors.

// 1. Scope main
content = content.replace(/main\s*\{/g, '.reference-component main {');

// 2. Scope header
content = content.replace(/header\s*\{/g, '.reference-component header {');

// 3. Scope body (it was setting background: #f8fafc and fonts, which might affect the whole app, though it's already those values). But let's change it to .reference-component.
content = content.replace(/body\s*\{/g, '.reference-component {');

// 4. Scope * (reset)
content = content.replace(/\*\s*\{/g, '.reference-component * {');

// 5. Scope table, th, td
content = content.replace(/table\s*\{/g, '.reference-component table {');
content = content.replace(/th,\s*td\s*\{/g, '.reference-component th, .reference-component td {');
content = content.replace(/th\s*\{/g, '.reference-component th {');
content = content.replace(/td\s*\{/g, '.reference-component td {');

fs.writeFileSync(path, content);
console.log("Fixed CSS scoping in reference.js");
