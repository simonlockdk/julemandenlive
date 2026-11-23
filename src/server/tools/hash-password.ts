/**
 * Laver en scrypt-hash til ADMIN_PASSWORD_HASH.
 *   npm run hash-password
 * Adgangskoden læses skjult fra terminalen (eller fra stdin, hvis den pipes ind).
 */
import readline from 'node:readline';
import { hashPassword } from '../auth';

async function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted) out.output.write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

const pw = await readHidden('Ny administratoradgangskode (mindst 12 tegn): ');
if (pw.length < 12) {
  console.error('Adgangskoden skal være mindst 12 tegn.');
  process.exit(1);
}
if (process.stdin.isTTY) {
  const again = await readHidden('Gentag adgangskoden: ');
  if (again !== pw) {
    console.error('Adgangskoderne er ikke ens.');
    process.exit(1);
  }
}
const hash = await hashPassword(pw);
console.log('\nIndsæt denne linje i din .env-fil (uden anførselstegn):\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
