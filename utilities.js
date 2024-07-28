const { readFile } = require("node:fs/promises");

const readLinesFromFile = async (file) =>
  (await readFile(file, "utf-8"))
    .trim()
    .split("\n")
    .map((line) => line.trim());
const getRandomLine = (list) => list[Math.floor(Math.random() * list.length)];

module.exports = {
  readLinesFromFile,
  getRandomLine,
};
