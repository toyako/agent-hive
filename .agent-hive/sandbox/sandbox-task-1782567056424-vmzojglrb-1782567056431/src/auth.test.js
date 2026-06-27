const { login, logout } = require('./auth');

test('login should work with valid credentials', () => {
  const result = login('admin', 'password123');
  expect(result.success).toBe(true);
});

test('login should fail with invalid credentials', () => {
  const result = login('', '');
  expect(result.success).toBe(false);
});

test('logout should invalidate token', () => {
  const result = logout('some-token');
  expect(result.success).toBe(true);
  // BUG: Token should be invalidated but isn't
});
