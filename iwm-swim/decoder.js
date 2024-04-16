'use strict';

const { parse } = require('fast-csv');
const fs = require('fs');

const iwmLatchToFunction = {
  0: 'Phase0',
  1: 'Phase1',
  2: 'Phase2',
  3: 'Phase3',
  4: 'MotorOn',
  5: 'DS',
  6: 'L6',
  7: 'L7'
};

const iwm = {
  lastLatch: 0,
  lastValue: 0,
  stateL7: 0,
  stateL6: 0,
  stateMotor: 0,
  state: function() { return [this.stateL7, this.stateL6, this.stateMotor].join('') },
  stateToStateName:{ 
    '000': 'Read All Ones',
    '001': 'Read Data',
    '010': 'Read Status',
    '011': 'Read Status',
    '101': 'Read Write-Handshake',
    '100': 'Read Write-Handshake',
    '110': 'Set Mode',
    '111': 'Write Data'
  },
  stateName: function() { return this.stateToStateName[this.state()] }
};

const ism = {
  lastLatch: 0,
  lastReadMode: 0,
  latchToRegister: {
    0: 'Write Data',
    1: 'Write Mark',
    2: 'Write CRC/IWM Config',
    3: 'Write Parameter RAM',
    4: 'Write Phases',
    5: 'Write Setup',
    6: 'Write Mode 0s',
    7: 'Write Mode 1s',
    8: 'Read Data',
    9: 'Read Mark',
    10: 'Read CRC',
    11: 'Read Parameter RAM',
    12: 'Read Phases',
    13: 'Read Setup',
    14: 'Read Status',
    15: 'Read Handshake'
  }
};

let currentDrive = 0;
let lineNumber = 0;
let lastDev = 0;
let lastWrite = 0;

const filename = process.argv[2];
if (!filename) {
  console.error('Missing source data filename');
  process.exit(1);
}

console.log('                              /= IWM ================================/= ISM ==========================\\');
console.log('stamp     time  drv w d r addr function value state                   rm latch register');
console.log('--------- ----- --- - - - ---- -------- ----- ----------------------- -- ----- -----------------------');
const stream = parse({ headers: false, skipLines: 1 })
  .on('error', error => console.error(error))
  .on('data', (row) => {
    lineNumber++;
    const [a0, a1, a2, a3, write, dev, wrreq] = row;
    ismStateMachine(write, dev, wrreq, a0, a1, a2, a3);
    iwmStateMachine(write, dev, wrreq, a0, a1, a2, a3);
    lastDev = dev;
    lastWrite = write;
  });
fs.createReadStream(filename)
  .pipe(stream);

function updateStatus(iwmLatch, iwmValue, write, ismLatch, ismReadMode, dev, wrreq) {
  if (currentDrive == 1) {
    return;
  }
  console.log([
    lineNumber.toString().padStart(9, ' '),
    (lineNumber / 16000000).toFixed(2).toString().padStart(5, ' '),
    ` ${currentDrive} `,
    write || 0,
    dev || 0,
    wrreq || 0,
    iwmLatch.toString().padEnd(5, ' '),
    iwmLatchToFunction[iwmLatch].padEnd(8),
    iwmValue.toString().padEnd(5, ' '),
    iwm.state(),
    iwm.stateName().padEnd(20, ' '),
    (ismReadMode == 1 ? 'R' : 'W').padEnd(2, ' '),
    ismLatch.toString().padEnd(5, ' '),
    ism.latchToRegister[ismLatch]
  ].join(' '));
}

function iwmStateMachine(writeData, dev, wrreq, a0, a1, a2, a3) {
  const value = a0;
  const address = [a3, a2, a1].join('');
  const latch = parseInt(address, 2);

  if ((dev == 0 && lastDev != 0) || lastWrite != writeData) {
    if (latch == 5) { // DS
      currentDrive = iwm.lastValue;
      return;
    } else if (latch == 4) { // MO
      iwm.stateMotor = iwm.lastValue;
    } else if (latch == 6) { // L6
      iwm.stateL6 = iwm.lastValue;
    } else if (latch == 7) { // L7
      iwm.stateL7 = iwm.lastValue;
    }
    updateStatus(latch, value, writeData, ism.lastLatch, ism.lastReadMode, dev, wrreq);
  }
  iwm.lastLatch = latch;
  iwm.lastValue = value;
};

function ismStateMachine(writeData, dev, wrreq, a0, a1, a2, a3) {
  const readMode = a3;
  const address = [a3, a2, a1, a0].join('');
  const latch = parseInt(address, 2);

  ism.lastLatch = latch;
  ism.lastReadMode = readMode;
};
