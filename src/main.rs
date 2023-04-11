use std::sync::{Arc, Mutex};
use std::{thread, time};

struct Philosopher {
    name: String,
    left: usize,
    right: usize,
}

impl Philosopher {
    fn new(name: &str, left: usize, right: usize) -> Philosopher {
        Philosopher {
            name: name.to_string(),
            left: left,
            right: right,
        }
    }

    fn eat(&self, table: &Table) {
        println!("{} is picking up the left fork.", self.name);
        let _left = table.forks[self.left].lock().unwrap();

        thread::sleep(time::Duration::from_millis(5));

        println!("{} is picking up the right fork.", self.name);
        let _right = table.forks[self.right].lock().unwrap();

        println!("{} is eating.", self.name);

        let delay = time::Duration::from_millis(1000);

        thread::sleep(delay);

        println!("{} is done eating.", self.name);
    }
}

struct Table {
    forks: Vec<Mutex<()>>,
}

fn main() {
    let table = Arc::new(Table {
        forks: vec![
            Mutex::new(()),
            Mutex::new(()),
            Mutex::new(()),
            Mutex::new(()),
            Mutex::new(()),
        ],
    });                                         


    let philosophers = vec![
        Philosopher::new("Donald", 0, 1),
        Philosopher::new("Larry", 1, 2),
        Philosopher::new("Mark", 2, 3),
        Philosopher::new("John", 3, 4),
        Philosopher::new("Bruce", 4, 0),
    ];

    let handles: Vec<_> = philosophers
        .into_iter()
        .map(|p| {
            let table = table.clone();

            thread::spawn(move || {
                p.eat(&table);
            })
        })
        .collect();

    for h in handles {
        h.join().unwrap();
    }
}
