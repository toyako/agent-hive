// Authentication module
function login(username, password) {
  // BUG: SQL Injection vulnerability
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  // BUG: No input validation
  if (username && password) {
    return { success: true, token: "fake-jwt-token" };
  }
  
  return { success: false };
}

function logout(token) {
  // BUG: No token invalidation
  return { success: true };
}

module.exports = { login, logout };
