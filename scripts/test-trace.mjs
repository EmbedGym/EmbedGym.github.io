import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import {existsSync, readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import test from 'node:test';
registerHooks({resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL && !/\.[a-z]+$/.test(specifier)) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
  }
  return next(specifier, context);
}});
const {buildTrace, lineDiff} = await import('../src/trace.ts');
const round = (index, ...calls) => ({index, text: '', calls});
const call = (command, output = '', returncode = 0) => ({command, output, returncode, hardware: command.startsWith('vlx-run')});
const compile = 'arduino-cli compile --fqbn arduino:avr:mega --output-dir /solution/build /solution';
const write = source => `cat > /solution/solution.ino <<'EOF'\n${source}\nEOF`;
test('pairs parallel call results, keeps failed compile and exact source versions', () => {
 const result = buildTrace({steps:[round(1, call(write('int x=1;')), call(compile,'error: invalid',1)), round(2, call(write('int x=2;')), call(compile,'Sketch uses 20 bytes')), round(3,call('cp /solution/build/solution.ino.hex /solution/solution.hex')), round(4,call("vlx-run --ms 1000 <<'EOF'\n100 read L1.value\nEOF",'=== vlx-run: simulator output ===\n[100 ms] > read L1.value = true\n[1000 ms] end of run\n'))]});
 assert.deepEqual(result.versions.map(v=>v.source),['int x=1;\n','int x=2;\n']);
 assert.deepEqual(result.events.filter(e=>e.kind==='compile').map(e=>e.step.ok),[false,true]);
 assert.equal(result.events.at(-1).version,2);
 assert.equal(result.events.at(-1).lines[0].value,'true');
});
test('never invents simulation output or replaces unknown edits with final source', () => {
 const r=buildTrace({steps:[round(1,call(write('int x=1;'))),round(2,call('echo custom > /solution/solution.ino')), round(3,call(compile+' && vlx-run','error: build failed',1))]});
 assert.equal(r.versions.at(-1).source,null);
 assert.equal(r.events.filter(e=>e.kind==='simulate').length,0);
});
test('real paper trace has separate simulation events and reconstructs shipped source', () => {
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/data/runs/atmega2560_arduino/sim/meta__muse-glimmer-30b/photoresistor_nightlight.json.gz',import.meta.url))));
 const r=buildTrace(data);
 assert(r.events.some(e=>e.kind==='simulate'));
 assert(r.versions.length>1);
 const final=r.versions.at(-1).source;
 assert(final !== null);
 assert(Object.values(data.files).some(source=>source===final));
});
test('diff keeps unchanged context and bounds oversized inputs',()=>{
 assert.equal(lineDiff('a\nb','a\nc'),'  a\n+ c\n- b');
 assert.equal(lineDiff('a\n'.repeat(2000),'b\n'.repeat(2000)),null);
});
