const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath, files);
        } else if (fullPath.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

const testFiles = findFiles('./tests');

const srcFiles = execSync('find src -type f -name "*.js"').toString().split('\n').filter(Boolean);
const srcMap = {}; // name -> src path
for (const src of srcFiles) {
    const name = path.basename(src);
    srcMap[name] = src;
}

for (const file of testFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Replace both import and require
    const importRegex = /(import\s+[^'"]*?from\s+['"])(\.\.?\/[^'"]+)(['"])/gs;
    content = content.replace(importRegex, (match, p1, p2, p3) => {
        const basename = path.basename(p2);
        if (srcMap[basename]) {
            let rel = path.relative(path.dirname(file), srcMap[basename]);
            if (!rel.startsWith('.')) rel = './' + rel;
            console.log(`Fixing ${p2} -> ${rel} in ${file}`);
            changed = true;
            return `${p1}${rel}${p3}`;
        }
        return match;
    });

    const requireRegex = /(require\s*\(\s*['"])(\.\.?\/[^'"]+)(['"])/gs;
    content = content.replace(requireRegex, (match, p1, p2, p3) => {
        const basename = path.basename(p2);
        if (srcMap[basename]) {
            let rel = path.relative(path.dirname(file), srcMap[basename]);
            if (!rel.startsWith('.')) rel = './' + rel;
            console.log(`Fixing ${p2} -> ${rel} in ${file}`);
            changed = true;
            return `${p1}${rel}${p3}`;
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(file, content);
    }
}
