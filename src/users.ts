import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), './assets/users.json');

export interface User {
  username: string;
  password: string;
  twoFASecret?: string | null;
}

// Load users from the JSON file.
function loadUsers(): User[] {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users file:", err);
    return [];
  }
}

// Save users back to the JSON file.
function saveUsers(users: User[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing users file:", err);
  }
}

export function findUser(username: string, password: string): User | undefined {
  const users = loadUsers();
  return users.find(u => u.username === username && u.password === password);
}

export function getUserByUsername(username: string): User | undefined {
  const users = loadUsers();
  return users.find(u => u.username === username);
}

export function updateUserTwoFASecret(username: string, secret: string): void {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (user) {
    user.twoFASecret = secret;
    saveUsers(users);
  }
}

