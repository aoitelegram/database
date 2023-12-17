# @aoitelegram/database

A custom database designed specifically for `aoitelegram`.

## Usage Example
```javascript
const { KeyValue } = require("@aoitelegram/database");

// Initialize the database with custom configurations
const db = new KeyValue({
  path: "./database/",
  tables: ["main"],
  extname: ".sql",
});

// Set key-value pairs in the "main" table
db.set("main", "example", "k");
db.set("main", "45", "true");

// Delete a key-value pair in the "main" table
db.delete("main", "45");

// Access and log data at a specific index in the "main" table
console.log(db.at("main", -1));

// Check if the "main" table includes a specific value
console.log(db.includes("main", "true"));

// Get the value associated with the key "5" in the "main" table
console.log(db.get("main", "5"));

// Event listeners for database events
db.on("ready", () => console.log("Database is ready"));
db.on("create", (newValue) => console.log("Create: ", newValue));
db.on("update", (newValue, oldValue) => console.log("Update:", newValue, "Old Value:", oldValue));
db.on("delete", (oldValue) => console.log("Deleted Value:", oldValue));
db.on("deleteAll", (oldValue) => console.log("All values deleted:", oldValue));

// Establish a connection to the database and emit the "ready" event
db.connect();
```