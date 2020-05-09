const dirOffset = {
  U: [0, -1],
  D: [0, 1],
  R: [1, 0],
  L: [-1, 0],
};

const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, scalar) => [a[0] * scalar, a[1] * scalar];
const ccomp = (a, b) => a[0] === b[0] && a[1] === b[1];
const ccopy = c => [...c];

class ObiexBoard {
  constructor(map) {
    if (!map) {
      this._setMap({
        target: [0, 0],
        obs: [[-1, 0], [1, 0]],
      })
    } else {
      this._setMap(map);
    }
  }

  _validateCoordinate(c) {
    if (!Array.isArray(c) || c.length !== 2) {
      throw new Error('invalid coordinate: unknown type');
    }
    if (!Number.isSafeInteger(c[0]) || !Number.isSafeInteger(c[1])) {
      throw new Error('invalid coordinate: must be integers' + c);
    }
    return c;
  }

  _validate(map) {
    const {target, obs} = map;
    if (!Array.isArray(obs)) {
      throw new Error('invalid map: unknown type');
    }
    const c = [target, ...obs];
    const v = {};
    for (const x of c) {
      try {
        this._validateCoordinate(x);
      } catch (e) {
        throw new Error('invalid map: ' + e.message);
      }
      if (v[x]) {
        throw new Error('invalid map: all coordinates must be unique');
      }
      v[x] = true;
    }
  }

  _setMap(map) {
    this._validate(map);

    const target = ccopy(map.target);
    const obs = map.obs.map(ccopy);
    this.target = target;
    this.obs = obs;
    this.boundaries = {
      minx: target[0],
      maxx: target[0],
      miny: target[1],
      maxy: target[1],
    };
    this.obs.forEach(c => {
      this.boundaries.minx = Math.min(this.boundaries.minx, c[0]);
      this.boundaries.miny = Math.min(this.boundaries.miny, c[1]);
      this.boundaries.maxx = Math.max(this.boundaries.maxx, c[0]);
      this.boundaries.maxy = Math.max(this.boundaries.maxy, c[1]);
    });
    this._hash = {};
    this._hash[this.target] = 'x';
    this.obs.forEach((c, i) => this._hash[c] = 'o');
  }

  _getMap() {
    return {
      target: ccopy(this.target),
      obs: this.obs.map(ccopy),
    };
  }

  // serialize serializes the map data into a string.
  // It uses the format base64(targetx,targety,obs0x,obs0y,obs1x,obs1y,...).
  // TODO: Use more efficient format, e.g. each coordinate is encoded byte data.
  //       To allow range [-128,127], each coordinate (x,y) can be encoded with 2 bytes.
  serialize(encoding = 'base64') {
    const s = [this.target, ...this.obs].map(p => p.join(',')).join(',');
    return new Buffer(s).toString(encoding);
  }

  // load loads serialized map data into the object. The existing map data will be reset.
  load(s, encoding = 'base64') {
    const p = new Buffer(s, encoding).toString('utf8').split(',').map(c => parseInt(c));
    if (p.length % 2 !== 0 || p.length < 6) {
      throw new Error('invalid board data');
    }
    for (const c of p) {
      if (isNaN(c)) {
        throw new Error('invalid board data');
      }
    }
    const target = p.slice(0, 2);
    const obs = [];
    for (let i = 2; i < p.length; i += 2) {
      obs.push(p.slice(i, i + 2));
    }
    this._setMap({target, obs});
  }

  // render renders the board into a string.
  render() {
    let b = '';
    for (let y = this.boundaries.miny; y <= this.boundaries.maxy; y++) {
      for (let x = this.boundaries.minx; x <= this.boundaries.maxx; x++) {
        if (this._hash[[x, y]]) {
          if (this._hash[[x, y]] === 'x') {
            b += 'x';
          } else {
            const i = this.obs.findIndex(c => ccomp(c, [x, y]));
            b += '' + i;
          }
        } else {
          b += '.';
        }
      }
      if (y < this.boundaries.maxy) {
        b += '\n';
      }
    }
    return b;
  }

  isWin() {
    return ccomp(this.obs[0], this.target);
  }

  isLose() {
    return this.obs.findIndex(c => isNaN(c[0])) > -1;
  }

  // moveC moves an obx based on its coordinate.
  // dir is one of ['U', 'D', 'L', 'R'].
  // It returns the new coordinate of the moved obx.
  // It will throw error if the dir is invalid or the coordinate is empty.
  // If the obx moves out of bounds, the coordinate will be [NaN, NaN].
  moveC(c, dir) {
    if (!dirOffset.hasOwnProperty(dir)) {
      throw new Error('invalid move: unknown direction');
    }
    try {
      this._validateCoordinate(c);
    } catch (e) {
      throw new Error('invalid move: ' + e.message);
    }
    const i = this.obs.find(ob => ccomp(ob, c));
    if (i === -1) {
      throw new Error('invalid move: no obx at the desired coordinate');
    }
    return this._move(i, dir);
  }

  // moveI moves an obx based on obx index.
  // dir is one of ['U', 'D', 'L', 'R'].
  // It returns the new coordinate of the moved obx.
  // It will throw error if the dir is invalid or the index is out of bounds.
  // If the obx moves out of bounds, the coordinate will be [NaN, NaN].
  moveI(i, dir) {
    if (!dirOffset.hasOwnProperty(dir)) {
      throw new Error('invalid move: unknown direction');
    }
    if (!Number.isInteger(i) || i < 0 || i >= this.obs.length) {
      throw new Error('invalid move: invalid index');
    }
    return this._move(i, dir);
  }

  _move(idx, dir) {
    // brute force for point of contact
    let ci = -1, dist = Infinity;
    for (let i = 0; i < this.obs.length; i++) {
      if (i === idx) continue;
      const diff = csub(this.obs[i], this.obs[idx]);
      const d = Math.abs(diff[0]) + Math.abs(diff[1]);
      const t = cadd(this.obs[idx], cmul(dirOffset[dir], d));
      if (ccomp(t, this.obs[i])) {
        if (d < dist) {
          ci = i;
          dist = d;
        }
      }
    }
    const prev = [...this.obs[idx]];
    delete this._hash[this.obs[idx]];
    if (ci === -1) {
      this.obs[idx] = [NaN, NaN];
      return this.obs[idx];
    }
    this.obs[idx] = cadd(prev, cmul(dirOffset[dir], dist - 1));
    this._hash[this.obs[idx]] = 'o';
    return ccopy(this.obs[idx]);
  }

  forceMove(idx, c) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= this.obs.length) {
      throw new Error('invalid move: invalid index');
    }
    const prev = ccopy(this.obs[idx]);
    delete this._hash[this.obs[idx]];
    this._validateCoordinate(c);
    this.obs[idx] = ccopy(c);
    this._hash[this.obs[idx]] = 'o';
    return ccopy(this.obs[idx]);
  }
}

class Obiex {
  constructor() {
    this.board = new ObiexBoard();
    this.state = new ObiexBoard(); // board and state should not refer to the same instance
    this.moves = [];
  }

  reset() {
    this.moves = [];
    this.state = new ObiexBoard(this.board._getMap());
  }

  // load loads board and/or moves. It will reset state and moves.
  load(s, encoding = 'base64') {
    const data = new Buffer(s, encoding).toString('utf8');
    const [board, moves] = data.split('|');
    this.board.load(board, 'utf8');
    this.reset();
    if (moves) {
      this.loadMoves(moves, 'utf8');
    }
  }

  loadMoves(s, encoding = 'base64') {
    const data = new Buffer(s, encoding).toString('utf8').split(',');
    const moves = [];
    console.log(data);
    for (const move of data) {
      const dir = move.slice(-1);
      if (!dirOffset.hasOwnProperty(dir)) {
        throw new Error('invalid move data: unknown dir ' + dir);
      }
      const idx = parseInt(move.slice(0, -1));
      if (!Number.isSafeInteger(idx) || idx < 0 || idx >= this.board.obs.length) {
        throw new Error('invalid move data: invalid index ' + idx);
      }
      moves.push({dir, idx});
    }
    for (const move of moves) {
      this.moveI(move.idx, move.dir);
    }
  }

  // serialize serializes board and/or moves.
  serialize(encoding = 'base64') {
    const board = this.board.serialize('utf8');
    if (this.moves.length > 0) {
      const data = board + '|' + this.serializeMoves('utf8');
      return new Buffer(data).toString(encoding);
    } else {
      return new Buffer(board).toString(encoding);
    }
  }

  serializeMoves(encoding = 'base64') {
    const s = this.moves.map(({idx, dir}) => idx + dir).join(',');
    return new Buffer(s).toString(encoding);
  }

  moveI(i, dir) {
    if (!dirOffset.hasOwnProperty(dir)) {
      throw new Error('invalid move: unknown direction');
    }
    if (!Number.isInteger(i) || i < 0 || i >= this.board.obs.length) {
      throw new Error('invalid move: invalid index');
    }
    this.moves.push({
      idx: i,
      dir,
      c: [ccopy(this.state.obs[i]), this.state.moveI(i, dir)],
    });
  }

  undo() {
    if (this.moves.length === 0) {
      throw new Error('invalid action: no moves to undo');
    }
    const move = this.moves.pop();
    this.state.forceMove(move.idx, move.c[0]);
  }
}

module.exports = Obiex;
