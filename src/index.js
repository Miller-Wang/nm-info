const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const startServer = require('./server');

const Fields = ['name', 'version', 'description', 'license', 'homepage'];

function splitLine(output) {
  const [size, file] = output.split('\t');
  const unit = size.substring(size.length - 1);
  const number = size.substring(0, size.length - 1);
  let total = 0;
  if (unit === 'M') {
    total = parseFloat(number) * 1024;
  } else if (unit === 'K') {
    total = parseFloat(number);
  } else {
    return { id: Math.random() };
  }
  return {
    size: total,
    sizeM: (total / 1024).toFixed(3) + 'M',
    module: file,
    id: Math.random(),
  };
}

async function getSubModules(modulesPath) {
  const subFiles = await fs.readdir(modulesPath);
  const promises = subFiles.map(
    (file) =>
      new Promise((resolve, reject) => {
        exec(`du -sh ${file}`, { cwd: modulesPath }, async (err, stdout) => {
          if (err) return reject(err);
          const module = splitLine(stdout);
          // 获取依赖
          module.package = await getDeps(path.join(modulesPath, file));
          resolve(module);
        });
      }),
  );
  const subModules = await Promise.all(promises);
  return subModules.filter((v) => v);
}

async function getDeps(modulePath) {
  const packagePath = path.join(modulePath, 'package.json');
  try {
    await fs.access(packagePath);
    const package = JSON.parse(await fs.readFile(packagePath));
    const pickPackage = Fields.reduce((memo, k) => {
      memo[k] = package[k] && !package[k].includes('`') ? package[k] : '';
      return memo;
    }, {});
    let editUrl = '';
    if (typeof package.repository === 'string') {
      editUrl = package.repository;
    } else if (typeof package.repository === 'object') {
      editUrl = package.repository.url;
    }

    if (editUrl.includes('://')) {
      [, editUrl] = editUrl.match(/:\/\/(.*)$/);
    }

    if (editUrl.endsWith('.git')) {
      editUrl = editUrl.substring(0, editUrl.length - 4);
    }
    editUrl = editUrl.replace('.com', '.dev');
    pickPackage.editUrl = `https://${editUrl}`;
    return pickPackage;
  } catch (error) {
    return {};
  }
}

function execPromise(commnad, options) {
  return new Promise((resolve, reject) => {
    exec(commnad, options, (err, stdout) => {
      err ? reject(err) : resolve(stdout.split('\t')[0]);
    });
  });
}

(async () => {
  const modulesPath = path.resolve(process.cwd(), './node_modules');
  const ora = await import('ora');
  const spinner = ora.default('Loading...');
  try {
    spinner.start();
    const totalSize = await execPromise(`du -sh node_modules`);
    let totalPackages = 0;
    const files = await fs.readdir(modulesPath);
    const allProcess = files
      .filter((v) => !v.startsWith('.'))
      .map(
        (file) =>
          new Promise((resolve, reject) => {
            exec(
              `du -sh ${file}`,
              { cwd: modulesPath },
              async (err, stdout) => {
                if (err) return reject(err);
                const module = splitLine(stdout);
                // 处理@开头的包
                if (file.startsWith('@')) {
                  module.children = await getSubModules(
                    path.join(modulesPath, file),
                  );
                  module.children.forEach(m => {
                    m.packageDir = `/${file}/${m.module}`;
                  });
                  totalPackages += module.children.length;
                } else if (module) {
                  // 获取依赖
                  module.package = await getDeps(path.join(modulesPath, file));
                  module.packageDir = `/${module.module}`;
                  totalPackages += 1;
                }
                resolve(module);
              },
            );
          }),
      );

    const outputs = await Promise.all(allProcess);
    spinner.succeed();
    startServer({
      modules: outputs.filter((v) => v),
      totalSize,
      totalPackages,
    });
  } catch (err) {
    spinner.fail();
    console.error(err);
  }
})();
