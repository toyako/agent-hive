
function login(username, password) {
  // BUG: SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE username = '" + username + "'";
  return { success: true };
}
module.exports = { login };
