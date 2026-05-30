import { copyFile } from "fs/promises";

await copyFile("build/client/__spa-fallback.html", "build/client/404.html");
console.log("Copied __spa-fallback.html to 404.html");
