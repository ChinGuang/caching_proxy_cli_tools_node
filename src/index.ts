#!/usr/bin/env node
const args: string[] = process.argv.slice(2);
console.log("Arguments received:", args);

// Example of accessing arguments
const command = args[0];
const value = args[1];

if (command === "greet" && value) {
  console.log(`Hello, ${value}!`);
} else if (command === "help") {
  console.log("Usage: mycli greet <name>");
} else {
  console.log("Unknown command or missing value. Use 'mycli help' for more info.");
}
