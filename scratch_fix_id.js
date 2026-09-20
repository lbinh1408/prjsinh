const fs = require('fs');
const path = require('path');

const dirs = [
    '/Users/doducqunynhtram/Documents/projects/prjvan/js/components',
    '/Users/doducqunynhtram/Documents/projects/prjvan/js/components/layouts'
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        if (!fullPath.endsWith('.js')) continue;
        
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        
        // Match component.getElementById('something') and replace with component.querySelector('#something')
        // Using a regex to capture the quotes and ID
        const regex = /component\.getElementById\(\s*(['"`])([^'"`]+)\1\s*\)/g;
        if (regex.test(content)) {
            content = content.replace(regex, "component.querySelector($1#$2$1)");
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(fullPath, content);
            console.log('Fixed', fullPath);
        }
    }
}

for (const dir of dirs) {
    processDir(dir);
}
console.log('Done!');
