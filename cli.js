
const Obiex = require('./Obiex');
const readline = require('readline');

// const o = new ObiexBoard();
// const s = o.serialize();
// console.log(o.serialize());
const levels = [
  '0,0,-1,0,1,0',
  '5,2,2,3,1,1,6,1,6,3',
  '4,3,5,3,5,1,5,5,1,3,0,0',
  '2,2,3,1,5,1,1,2,1,5,5,4',
  '6,4,4,4,6,1,1,4,3,4,8,4',
  '4,3,4,1,1,1,6,1,1,4,6,4',
  '3,2,2,3,1,1,5,1,6,1,5,3,6,3',
  '4,4,6,4,1,1,1,4,1,7,7,3,6,7',
  '4,3,2,5,1,1,1,2,2,1,6,1,6,5',
  '3,2,2,3,1,1,6,1,7,1,6,3,7,3',
  '2,4,5,6,1,1,4,1,7,1,1,6',
  '3,2,2,5,1,1,5,1,6,2,5,5,6,5',
  '4,3,4,1,1,1,1,4,7,1,7,5,8,4',
  '5,3,9,4,1,1,1,3,1,6,9,2,9,5',
  '3,2,3,5,1,1,1,4,5,1,5,4,2,5,4,5',
  '4,3,5,1,1,1,1,4,7,1,8,4,7,5',
  '6,3,10,4,1,1,1,3,1,6,10,2,10,5',
  '5,5,10,7,1,1,1,7,2,7,10,1,9,2',
  '0,0,100,0,-1,0'
];

// for (const level in levels) {
//   const o = new ObiexBoard();
//   o.load(levels[level], 'utf8');
//   console.log('level ' + level + ':');
//   console.log(o.render());
//   console.log();
// }

// const o = new ObiexBoard();
// o.load('0,0,1,0,3,0,5,0,10,0', 'utf8');
// console.log(o.render());
// console.log(o.moveI(0, 'L'));
// console.log(o.render());

const obiex = new Obiex();

let level;
const load = l => {
  console.log('Loading level ' + l);
  obiex.load(levels[l], 'utf8');
  level = l;
};
load(0);
console.log(obiex.state.render());

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.prompt();
rl.on('line', line => {
  try {
    const tokens = line.split(' ');
    switch (tokens[0]) {
      case 'load':
        if (!isNaN(tokens[1])) {
          load(parseInt(tokens[1]));
        } else {
          obiex.load(tokens[1]);
        }
        break;

      case 'move':
        obiex.moveI(parseInt(tokens[1]), tokens[2]);
        break;
      
      case 'undo':
        obiex.undo();
        break;
      
      case 'restart':
        obiex.reset();
        break;
      
      case 'save':
        console.log(obiex.serialize());
        break;

      case 'exit':
        rl.close();
        process.exit(0);
        break;
      
      default:
        console.log('unknown command');
    }

    console.log(obiex.state.render());
    if (obiex.state.isWin()) {
      console.log('You win!');
      load(level + 1);
      console.log(obiex.state.render());
    } else if (obiex.state.isLose()) {
      console.log('You lose! :(');
      obiex.reset();
      console.log(obiex.state.render());
    }
  } catch (e) {
    console.log('error:', e.message);
  } finally {
    rl.prompt();
  }
});
