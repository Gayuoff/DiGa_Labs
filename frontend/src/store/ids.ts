const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RANDOM_BITS = 80n;
const RANDOM_MAX = (1n << RANDOM_BITS) - 1n;

let lastTime = -1;
let lastRandom = 0n;

/**
 * A ULID: 26 characters, sortable by creation time (48-bit ms clock + 80 random bits), the same
 * format the backend uses. Monotonic within this tab: ids made in the same millisecond still sort
 * in creation order, which keeps the sync outbox in the order changes were made.
 */
export function newId(now: number = Date.now()): string {
  let time = now;
  let random: bigint;
  if (time <= lastTime) {
    time = lastTime;
    random = lastRandom + 1n;
    if (random > RANDOM_MAX) {
      time += 1;
      random = randomBits();
    }
  } else {
    random = randomBits();
  }
  lastTime = time;
  lastRandom = random;

  let value = (BigInt(time) << RANDOM_BITS) | random;
  let id = "";
  for (let i = 0; i < 26; i++) {
    id = CROCKFORD.charAt(Number(value & 31n)) + id;
    value >>= 5n;
  }
  return id;
}

function randomBits(): bigint {
  let value = 0n;
  for (const byte of crypto.getRandomValues(new Uint8Array(10))) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}
