from pathlib import Path
import shutil,re,json,subprocess,hashlib,argparse,tempfile
parser=argparse.ArgumentParser(description="Vendor the task illustrations and pure trace parser from the merged demo")
parser.add_argument("--source",type=Path,required=True)
args=parser.parse_args()
root=args.source.resolve(); out=Path(__file__).resolve().parents[1]; dest=out/'vendor/velxio'
files=[]
def copy(p):
 p=p.resolve()
 if p in files:return
 files.append(p); q=dest/p.relative_to(root);q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 if p.suffix not in ('.ts','.tsx'):return
 text=p.read_text()
 for spec in re.findall(r'(?:from\s*|import\s*)[\'\"]([^\'\"]+)[\'\"]',text):
  if spec.startswith('@velxio/'): base=root/'frontend/src'/spec[8:]
  elif spec.startswith('.'):base=p.parent/spec
  else:continue
  resolved=next((x for x in [base,Path(str(base)+'.ts'),Path(str(base)+'.tsx'),base/'index.ts'] if x.is_file()),None)
  if not resolved:raise Exception(f'{p}: {spec}')
  copy(resolved)
for name in ['cell.ts','anim.ts','kit.ts','mount.ts','registry.ts','boards.json']:
 copy(root/'demo/cells'/name)
for p in (root/'demo/cells/tasks').rglob('*.ts'):copy(p)
for name in ['extract.ts','pyedit.ts']:copy(root/'demo/lab'/name)
for name in ['components/velxio-components/registerAll.ts','components/velxio-components/Esp32Element.ts','components/velxio-components/Nrf52840DkElement.ts','services/ComponentRegistry.ts','utils/wireTidy/probe.ts','utils/wireTidy/metrics.ts']:
 copy(root/'frontend/src'/name)
for name in ['component-svgs','boards','fonts']:
 shutil.copytree(root/'frontend/public'/name,out/'public'/name,dirs_exist_ok=True)
shutil.copy2(root/'frontend/public/components-metadata.json',out/'public/components-metadata.json')
# The original artwork uses absolute drawing coordinates; preserve it as vendor art.
copy(root/'demo/cells/cells.css')
commit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
manifest={'source':'https://github.com/iot-agent/velxio-automation','commit':commit,'license':'AGPL-3.0','files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(dest/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
boards=json.loads((root/'demo/cells/boards.json').read_text());paths=[];lookup={}
for board,b in boards.items():
 for p in (root/'demo/cells/tasks'/board).glob('*.ts'):
  circuit=root/'cli/testbench/tasks'/p.stem/b['target']/'circuit.ts'
  assert circuit.exists(),circuit
  paths.append(str(circuit));lookup[str(circuit)]=(board,p.stem)
temporary=tempfile.TemporaryDirectory(prefix='embedgym-demo-')
scratch=Path(temporary.name)
(scratch/'paths.json').write_text(json.dumps(paths))
subprocess.run(['node',str(out/'scripts/read-circuits.mjs'),str(scratch/'paths.json'),str(scratch/'circuits.json')],check=True)
for name,c in json.loads((scratch/'circuits.json').read_text()).items():
 board,task=lookup[name];p=out/'public/demo/circuits'/board/(task+'.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(c,separators=(',',':')))
print(f'Vendored {len(files)} files; {len(paths)} animated board/task circuits at {commit}')

# Type-only correction for strict checking in the host project.
mount=dest/'demo/cells/mount.ts'
mount.write_text(mount.read_text().replace('as { rotation?: number };', 'as { rotation?: number; [key: string]: unknown };'))
temporary.cleanup()
