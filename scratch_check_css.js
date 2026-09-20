const fs = require('fs');

const path = '/Users/doducqunynhtram/Documents/projects/prjvan/js/components/reference.js';
let content = fs.readFileSync(path, 'utf8');

const styleMatch = content.match(/style\.innerHTML = `([\s\S]*?)`;/);
if (styleMatch) {
    const css = styleMatch[1];
    // console log lines that have a '{' but no '.' or '#' before it (meaning generic tags)
    const lines = css.split('\n');
    lines.forEach(line => {
        if (line.includes('{') && !line.includes('.') && !line.includes('#') && !line.includes('@')) {
            console.log(line.trim());
        }
    });
}
