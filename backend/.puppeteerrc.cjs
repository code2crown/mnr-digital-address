const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Ye Chrome ko Render ke temporary cache ke bajay project folder ke andar save karega
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};