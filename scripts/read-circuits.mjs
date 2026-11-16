// Convert trusted benchmark declarations to serializable circuit data.
// No application code or simulator state is imported by the exporter.
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const paths = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const result = {};
for (const filename of paths) {
  const source = stripTypeScriptTypes(fs.readFileSync(filename, 'utf8'));
  if (/\bimport\s/.test(source)) throw new Error(`Runtime import in circuit: ${filename}`);
  const script = source.replace(/export\s+const\s/g, 'const ');
  result[filename] = vm.runInNewContext(`${script}\n({boards, components, wires})`, {}, {timeout: 1000});
}
fs.writeFileSync(process.argv[3], JSON.stringify(result));
