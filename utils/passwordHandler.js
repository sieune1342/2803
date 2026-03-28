const crypto = require('crypto');

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const NUMBERS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+?';

function randomChar(pool) {
  return pool[crypto.randomInt(0, pool.length)];
}

function shuffle(text) {
  const items = text.split('');
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.join('');
}

function generateStrongPassword(length = 16) {
  if (length < 4) {
    throw new Error('Password length must be at least 4 characters');
  }

  const allChars = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;
  let password = '';

  password += randomChar(UPPERCASE);
  password += randomChar(LOWERCASE);
  password += randomChar(NUMBERS);
  password += randomChar(SYMBOLS);

  while (password.length < length) {
    password += randomChar(allChars);
  }

  return shuffle(password);
}

module.exports = {
  generateStrongPassword
};
