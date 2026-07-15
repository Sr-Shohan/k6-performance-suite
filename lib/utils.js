// Small helpers for generating randomized, realistic test data.

const FIRST_NAMES = ['Jim', 'Sarah', 'Alex', 'Maria', 'John', 'Priya', 'Chen', 'Omar', 'Lena', 'Diego'];
const LAST_NAMES = ['Brown', 'Smith', 'Khan', 'Garcia', 'Lee', 'Nguyen', 'Patel', 'Wilson', 'Costa', 'Ali'];

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

export function randomName() {
  return {
    firstname: randomItem(FIRST_NAMES),
    lastname: randomItem(LAST_NAMES),
  };
}

// Return an ISO date (YYYY-MM-DD) offset from today by `days`.
export function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
