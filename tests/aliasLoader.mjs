import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const rootDir = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let resolved = path.resolve(rootDir, specifier.slice(2));
    if (!fs.existsSync(resolved)) {
      if (fs.existsSync(resolved + '.js')) resolved += '.js';
      else if (fs.existsSync(resolved + '.jsx')) resolved += '.jsx';
    }
    return {
      shortCircuit: true,
      url: pathToFileURL(resolved).href,
    };
  }
  return nextResolve(specifier, context);
}

