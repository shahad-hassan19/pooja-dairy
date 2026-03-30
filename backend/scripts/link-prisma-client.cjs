/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const backendRoot = path.resolve(__dirname, '..');

  const generated = path.join(backendRoot, 'node_modules', '.prisma');
  const prismaClientPkg = path.join(
    backendRoot,
    'node_modules',
    '@prisma',
    'client',
  );
  const target = path.join(prismaClientPkg, '.prisma');

  if (!exists(generated)) {
    console.warn(
      `[link-prisma-client] Missing generated folder: ${generated} (skipping)`,
    );
    return;
  }

  if (!exists(prismaClientPkg)) {
    console.warn(
      `[link-prisma-client] Missing @prisma/client package folder: ${prismaClientPkg} (skipping)`,
    );
    return;
  }

  if (exists(target)) {
    // If it already exists, leave it alone.
    return;
  }

  ensureDir(prismaClientPkg);

  // Create a symlink so @prisma/client exports resolve.
  fs.symlinkSync(generated, target, 'dir');
  console.log(`[link-prisma-client] Linked ${target} -> ${generated}`);
}

main();

