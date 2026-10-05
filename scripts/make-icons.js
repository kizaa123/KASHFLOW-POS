/* Builds every app icon from build/logo-source.jpg:
   crops the white border, makes the rounded corners transparent, then writes
   build/icon.png + build/icon.ico (desktop, taskbar, installer) and assets/logo.png (inside the app).
   Run with `npm run icons` after replacing logo-source.jpg. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const root = path.join(__dirname, '..');
const src = path.join(root, 'build', 'logo-source.jpg');

async function findSquare() {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let top = height, left = width, bottom = -1, right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      if (data[i] + data[i + 1] + data[i + 2] < 300) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  const size = Math.min(right - left, bottom - top) + 1;
  return { left, top, width: size, height: size };
}

async function main() {
  const box = await findSquare();
  const size = 1024;
  const radius = Math.round(size * 0.2);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  const master = await sharp(src)
    .extract(box)
    .resize(size, size)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  await sharp(master).resize(512, 512).png().toFile(path.join(root, 'build', 'icon.png'));
  await sharp(master).resize(256, 256).png().toFile(path.join(root, 'assets', 'logo.png'));

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map((s) => sharp(master).resize(s, s).png().toBuffer()));
  fs.writeFileSync(path.join(root, 'build', 'icon.ico'), await pngToIco(pngs));

  console.log('make-icons: wrote build/icon.png, build/icon.ico and assets/logo.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
