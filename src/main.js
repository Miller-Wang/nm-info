const program = require('commander');
const { version } = require('../package.json'); //获取版本号
const path = require('path');

if (process.argv.length <= 2) {
  require(path.resolve(__dirname, './index'));
} else {
  useCommander();
}

function useCommander() {
  //多个指令命令的集合
  const mapAction = {
    start: {
      alias: 's',
      description: 'get node_modules info',
      examples: ['nm-info start'],
    },
    remove: {
      //创建模板
      alias: 'rm', //配置命令的别称
      description: 'remove node_modules',
      examples: ['nm-info remove'],
    },
    '*': {
      //根据自己的情况配置别的命令
      alias: '',
      description: 'command not found',
      examples: [],
    },
  };

  //相等于 Object.key() 循环遍历创建命令
  Reflect.ownKeys(mapAction).forEach((action) => {
    program
      .command(action) //配置命令的名字
      .alias(mapAction[action].alias) //命令别的名称
      .description(mapAction[action].description) //命令对应的描述
      .action(() => {
        if (action === '*') {
          // 访问不到对应的命令 就打印找不到命令
          console.log(mapAction[action].description);
        } else if (action === 'start') {
          require(path.resolve(__dirname, './index'));
        } else {
          // 解析后是[node, nm-info, command]
          require(path.resolve(__dirname, action));
        }
      });
  });

  //用户监听help事件打印出信息  运行 --help
  program.on('--help', () => {
    console.log('\r\nExamples:');
    Reflect.ownKeys(mapAction).forEach((action) => {
      mapAction[action].examples.forEach((example) => {
        console.log('   ' + example);
      });
    });
  });

  program.on('', () => {
    console.log('空');
  });

  //运行 --version结果为当前的版本
  //解析用户传过来的参数  --help 运行出来结果
  program.version(version).parse(process.argv);
}
