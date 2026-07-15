// Payload factories for the Restful-Booker booking resource.

import { randomInt, randomName, isoDate } from '../lib/utils.js';

const DEPOSIT_PAID = [true, false];
const ADDITIONAL_NEEDS = ['Breakfast', 'Late checkout', 'Extra pillows', 'None'];

// Build a valid create-booking payload with randomized data.
export function buildBooking() {
  const name = randomName();
  const nights = randomInt(1, 14);
  const checkin = randomInt(1, 30);
  return {
    firstname: name.firstname,
    lastname: name.lastname,
    totalprice: randomInt(50, 5000),
    depositpaid: DEPOSIT_PAID[randomInt(0, 1)],
    bookingdates: {
      checkin: isoDate(checkin),
      checkout: isoDate(checkin + nights),
    },
    additionalneeds: ADDITIONAL_NEEDS[randomInt(0, ADDITIONAL_NEEDS.length - 1)],
  };
}

// Build an updated version of an existing booking payload (full replace / PUT).
export function buildUpdatedBooking(base = buildBooking()) {
  return {
    ...base,
    totalprice: randomInt(50, 5000),
    additionalneeds: 'Breakfast',
  };
}

// Build a partial payload for a PATCH (only a subset of fields).
export function buildPartialBooking() {
  const name = randomName();
  return {
    firstname: name.firstname,
    totalprice: randomInt(50, 5000),
  };
}
