use std::sync::{Arc, Mutex};
use std::{thread, time};
use std::sync::mpsc::{Sender};
use std::sync::mpsc;

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

    fn eat(&self, table: &Table, sender: &Sender<String>) {
        let _left = table.forks[self.left].lock().unwrap();
        let _right = table.forks[self.right].lock().unwrap();

        // println!("{} is eating.", self.name);
        sender.send(format!("{} is eating.", self.name).to_string()).unwrap();

        let delay = time::Duration::from_millis(1000);

        thread::sleep(delay);

        // println!("{} is done eating.", self.name);
        sender.send(format!("{} is done eating.", self.name).to_string()).unwrap();
    }
}

struct Table {
    forks: Vec<Mutex<()>>,
}

fn main() {
    let (tx, rx) = mpsc::channel();
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
        Philosopher::new("Bruce", 0, 4),
    ];

    let handles: Vec<_> = philosophers
        .into_iter()
        .map(|p| {
            let table = table.clone();
            let sender = tx.clone();

            thread::spawn(move || {
                p.eat(&table, &sender);
            })
        })
        .collect();

    for h in handles {
        h.join().unwrap();
    }

    tx.send("Done".to_string()).unwrap();

    let mut result: String = String::from("");
 
    for received in rx {
        if received == "Done" {
            break;
        }
        result.push_str(&received);
        result.push_str("\n");
    }
    println!("{}", result);
}
