const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  reporter: [["list"], ["html"]],
  use: {
    baseURL: "http://localhost:5000",
    trace: "on",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
});