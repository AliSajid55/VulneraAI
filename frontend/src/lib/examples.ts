// Example snippets for the "Try an example" buttons.
// Taken from vulnerability_test_cases.py, where the model's answer matches the expected label.

export interface Example {
  id: string;
  label: string;
  language: string;
  expected: "safe" | "vulnerable";
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "sql-injection",
    label: "SQL injection",
    language: "python",
    expected: "vulnerable",
    code: `def get_user(cursor, username):
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()
`,
  },
  {
    id: "command-injection",
    label: "Command injection",
    language: "python",
    expected: "vulnerable",
    code: `import os

def check_host(host):
    command = "ping -c 1 " + host
    return os.system(command)
`,
  },
  {
    id: "safe-sql",
    label: "Parameterized SQL (safe)",
    language: "python",
    expected: "safe",
    code: `def get_user(cursor, user_id):
    cursor.execute("SELECT name FROM users WHERE id = ?", (user_id,))
    return cursor.fetchone()
`,
  },
  {
    id: "weak-hash",
    label: "Weak password hash",
    language: "python",
    expected: "vulnerable",
    code: `import hashlib

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
`,
  },
];
