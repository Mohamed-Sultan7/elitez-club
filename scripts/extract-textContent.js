import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(
  __dirname,
  "../firebase/firestore-text-only-courses.json"
);
const outputJsonPath = path.resolve(
  __dirname,
  "../firebase/firestore-text-contents.json"
);
const outputTxtPath = path.resolve(
  __dirname,
  "../firebase/firestore-text-contents.txt"
);

function collectTextContent(node, out) {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectTextContent(item, out);
    return;
  }
  if (typeof node === "object") {
    if (typeof node.textContent === "string" && node.textContent.length > 0) {
      out.push(node.textContent);
    }
    for (const key of Object.keys(node)) {
      collectTextContent(node[key], out);
    }
  }
}

function main() {
  const raw = fs.readFileSync(inputPath, "utf8");
  const data = JSON.parse(raw);
  const contents = [];
  collectTextContent(data, contents);
  const payload = { count: contents.length, textContents: contents };
  fs.writeFileSync(outputJsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(outputTxtPath, contents.join("\n\n---\n\n"), "utf8");
  console.log(
    JSON.stringify(
      {
        inputPath,
        outputJsonPath,
        outputTxtPath,
        count: contents.length,
      },
      null,
      2
    )
  );
}

main();
