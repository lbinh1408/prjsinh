const fs = require('fs');

const refContent = fs.readFileSync('/Users/doducqunynhtram/Documents/projects/prjvan/js/components/reference.js', 'utf8');
console.log(refContent.match(/max-width:[^;]+;/g));
