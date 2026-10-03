const inquirer = require('inquirer');

const TYPE_LABELS = {
  web: 'Web-prilozhenie',
  cli: 'CLI-utilita',
  lib: 'Biblioteka',
  micro: 'Mikroservis',
};

function printResult(c) {
  const o = [];
  if (c.typescript) o.push('TypeScript');
  if (c.eslint) o.push('ESLint');
  if (c.prettier) o.push('Prettier');
  if (c.jest) o.push('Jest');
  console.log('OK: Project "' + c.name + '" uspeshno inicializirovan!');
  console.log('Tip: ' + (TYPE_LABELS[c.type] || c.type));
  console.log('Opcii: ' + (o.length ? o.join(', ') : '(net)'));
  console.log('Git: ' + (c.git ? 'da' : 'net'));
}

module.exports = async function init(options) {
  if (options.interactive === false) {
    if (!options.name || !options.type) {
      console.error('Error: v neinteraktivnom rezhime neobhodimo ukazat --name i --type');
      process.exit(1);
    }
    return printResult({
      name: options.name, type: options.type,
      typescript: !!options.typescript, eslint: !!options.eslint,
      prettier: !!options.prettier, jest: !!options.jest, git: !!options.git,
    });
  }
  const answers = await inquirer.prompt([
    { type: 'input', name: 'name', message: 'Enter project name:', default: 'my-project' },
    { type: 'list', name: 'type', message: 'Select project type:', choices: [
      { name: 'Web app', value: 'web' },
      { name: 'CLI util', value: 'cli' },
      { name: 'Library', value: 'lib' },
      { name: 'Microservice', value: 'micro' },
    ]},
    { type: 'checkbox', name: 'features', message: 'Select features:', choices: [
      { name: 'TypeScript', value: 'typescript', checked: true },
      { name: 'ESLint', value: 'eslint' },
      { name: 'Prettier', value: 'prettier', checked: true },
      { name: 'Jest', value: 'jest' },
    ]},
    { type: 'confirm', name: 'git', message: 'Use Git?', default: true },
    { type: 'password', name: 'token', message: 'Enter access token:', mask: '*' },
  ]);
  const features = answers.features || [];
  printResult({
    name: answers.name || options.name, type: answers.type || options.type,
    typescript: features.includes('typescript'), eslint: features.includes('eslint'),
    prettier: features.includes('prettier'), jest: features.includes('jest'),
    git: answers.git,
  });
};