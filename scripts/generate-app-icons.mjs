import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const source = fileURLToPath(new URL("../public/icons/kemtech.svg", import.meta.url));
for (const size of [180, 192, 512]) {
  const target = fileURLToPath(new URL(`../public/icons/kemtech-${size}.png`, import.meta.url));
  await sharp(source).resize(size, size).png().toFile(target);
}
