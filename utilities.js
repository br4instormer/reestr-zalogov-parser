const { readFile } = require("node:fs/promises");

const readLinesFromFile = async (file) =>
  (await readFile(file, "utf-8"))
    .trim()
    .split("\n")
    .map((line) => line.trim());
const getRandomLine = (list) => list[Math.floor(Math.random() * list.length)];
const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

module.exports = {
  readLinesFromFile,
  getRandomLine,
  getRandomInt,
};
