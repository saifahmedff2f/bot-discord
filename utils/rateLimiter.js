const buckets = new Map();

function allow(userId, key = 'default', cooldownMs = 10000) {
  const mapKey = `${userId}:${key}`;
  const now = Date.now();
  const record = buckets.get(mapKey);
  if (!record || now - record >= cooldownMs) {
    buckets.set(mapKey, now);
    return true;
  }
  return false;
}

function timeLeft(userId, key = 'default', cooldownMs = 10000) {
  const mapKey = `${userId}:${key}`;
  const record = buckets.get(mapKey) || 0;
  const left = cooldownMs - (Date.now() - record);
  return left > 0 ? left : 0;
}

module.exports = { allow, timeLeft };
