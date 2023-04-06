/**
 * The dining philosophers implementation of Node.js
 *
 * See also:
 * http://rust-lang-ja.github.io/the-rust-programming-language-ja/1.6/book/dining-philosophers.html
 *
 * (c) 2018 Leko
 */
const cluster = require("cluster");

const FREE = 0;
const LOCKED = 1;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Philosopher {
  constructor(name, left, right) {
    this.name = name;
    this.left = left;
    this.right = right;
  }

  async eat(table) {
    const left = await table.forks[this.left].lock();
    console.log("%s got a left(%s) lock", this.name, this.left);

    await sleep(1000);

    const right = await table.forks[this.right].lock();
    console.log("%s got a right(%s) lock", this.name, this.right);

    console.log("%s is eating.", this.name);
    await sleep(1000);
    console.log("%s is done eating.", this.name);

    await left.free();
    console.log("%s free left(%s) lock", this.name, this.left);

    await right.free();
    console.log("%s free right(%s) lock", this.name, this.right);
  }
}

class Table {
  constructor(forkSize) {
    this.forkSize = forkSize;
    this.forks = [];
    for (let i = 0; i < forkSize; i++) {
      this.forks.push(new Mutex(i));
    }
  }
}

class Mutex {
  constructor(sharedMemoryIndex) {
    this.sharedMemoryIndex = sharedMemoryIndex;
  }

  async lock() {
    const tryLock = () =>
      new Promise((resolve) => {
        const callback = ({ operation, returns }) => {
          if (operation !== "lock") {
            return;
          }
          process.removeListener("message", callback);
          resolve(returns);
        };
        process.on("message", callback);
        process.send({ operation: "lock", index: this.sharedMemoryIndex });
      });

    while (1) {
      const ret = await tryLock();
      if (ret !== "timed-out") {
        break;
      }
    }

    return this;
  }

  async free() {
    return new Promise((resolve) => {
      const callback = ({ operation, returns }) => {
        if (operation !== "free") {
          return;
        }
        process.removeListener("message", callback);
        resolve(returns);
      };
      process.on("message", callback);
      process.send({ operation: "free", index: this.sharedMemoryIndex });
    });
  }
}

if (cluster.isMaster) {
  const table = new Table(5);
  const philosophers = [
    new Philosopher("Donald", 0, 1),
    new Philosopher("Larry", 1, 2),
    new Philosopher("Mark", 2, 3),
    new Philosopher("John", 3, 4),
    new Philosopher("Bruce", 0, 4),
  ];

  const sab = new SharedArrayBuffer(5 * Int32Array.BYTES_PER_ELEMENT);
  const sharedArray = new Int32Array(sab);
  const main = async (philosophers) => {
    for (philosopher of philosophers) {
      const worker = cluster.fork();
      worker.send({ philosopher, table });
      worker.on("message", ({ operation, index }) => {
        switch (operation) {
          case "lock": {
            const result = Atomics.wait(sharedArray, index, LOCKED, 1);
            if (result !== "timed-out") {
              Atomics.store(sharedArray, index, LOCKED);
            }
            worker.send({
              operation,
              returns: result,
            });
            break;
          }
          case "free": {
            Atomics.store(sharedArray, index, FREE);
            worker.send({
              operation,
              returns: Atomics.notify(sharedArray, index, 1),
            });
            break;
          }
          default:
            throw new Error(
              `Unknown operation: '${operation}' from worker#${worker.id}`
            );
        }
      });
    }
  };

  main(philosophers);
} else if (cluster.isWorker) {
  const main = async (philosopher, table) => {
    await philosopher.eat(table);
    cluster.worker.disconnect();
  };

  process.once("message", ({ philosopher, table }) => {
    main(
      new Philosopher(philosopher.name, philosopher.left, philosopher.right),
      new Table(table.forkSize)
    );
  });
}
