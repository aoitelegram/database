# **@aoitelegram/database**

[![NPM Version](https://img.shields.io/npm/v/@aoitelegram/database)](https://www.npmjs.com/package/@aoitelegram/database)
[![Bot API](https://img.shields.io/badge/Bot%20API-v.7.1-00aced.svg?style=flat-square&logo=telegram)](https://core.telegram.org/bots/api)
[![NPM Downloads](https://img.shields.io/npm/dt/@aoitelegram/database.svg?maxAge=3600)](https://www.npmjs.com/package/@aoitelegram/database)
[![License](https://img.shields.io/npm/l/@aoitelegram/database)](https://github.com/aoitelegram/database/blob/main/LICENSE)

`@aoitelegram/database` is a Node.js library for managing various types of databases, including Firebase Realtime Database, MongoDB, and a generic file-based storage solution. It provides a unified interface for performing CRUD operations, managing events, and checking database responsiveness.

## Installation

You can install the library via npm:

```bash
npm install @aoitelegram/database
```

## Usage

### FirebaseDB

```typescript
import { FirebaseDB } from "@aoitelegram/database";

// Create a FirebaseDB instance
const db = new FirebaseDB("<your-firebase-database-url>", {
  projectId: "<your-firebase-priject-id>",
  tables: ["users", "posts"], // Optional: specify tables
});

// Connect to the Firebase database
await db.connect();

// Perform operations such as get, set, delete, etc.
await db.set("users", "user1", { name: "John", age: 30 });
const user = await db.get("users", "user1");
console.log(user); // Output: { name: 'John', age: 30 }
```

### MongoDB

```typescript
import { MongoDB } from "@aoitelegram/database";

// Create a MongoDB instance
const db = new MongoDB("<your-mongodb-url>", {
  tables: ["users", "posts"], // Specify tables
});

// Connect to the MongoDB database
await db.connect();

// Perform operations such as get, set, delete, etc.
await db.set("users", "user1", { name: "John", age: 30 });
const user = await db.get("users", "user1");
console.log(user); // Output: { name: 'John', age: 30 }
```

### StorageDB

```typescript
import { StorageDB } from "@aoitelegram/database";

// Create a StorageDB instance
const db = new StorageDB({
  path: "./data", // Optional: specify data directory
  tables: ["users", "posts"], // Optional: specify tables
});

// Connect to the storage database
await db.connect();

// Perform operations such as get, set, delete, etc.
await db.set("users", "user1", { name: "John", age: 30 });
const user = await db.get("users", "user1");
console.log(user); // Output: { name: 'John', age: 30 }
```

## API Documentation

Please refer to the [API Documentation](#) for detailed information on classes, methods, and usage examples.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This library is released under the [MIT License](https://github.com/aoitelegram/database/blob/main/LICENSE).
