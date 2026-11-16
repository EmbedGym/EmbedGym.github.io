"""Regression cases for provenance-preserving trajectory export."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-benchmark.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

class ExportTests(unittest.TestCase):
    def test_hardware_calls_not_source_reads(self):
        self.assertFalse(exporter.hardware_command("cat > main.c <<'EOF'\nint v = Wire.read();\nEOF\narduino-cli compile"))
        self.assertFalse(exporter.hardware_command('cat /usr/local/bin/vlx-run'))
        self.assertTrue(exporter.hardware_command("vlx-run --ms 5000 <<'EOF'\n0 set THERM1.temperature = -10\nEOF"))
        self.assertTrue(exporter.hardware_command('arduino-cli compile && timeout 60 vlx-run --ms 5000'))

    def test_parallel_and_delayed_tool_results_are_preserved(self):
        steps = exporter.parse_steps([
            {'role': 'assistant', 'tool_calls': [{'id': 'a', 'function': {'arguments': '{"command":"one"}'}}, {'id': 'b', 'function': {'arguments': '{"command":"two"}'}}]},
            {'role': 'tool', 'tool_call_id': 'b', 'content': 'B', 'extra': {'returncode': 1}},
            {'role': 'tool', 'tool_call_id': 'a', 'content': 'A', 'extra': {'returncode': 0}},
        ])
        self.assertEqual([c['output'] for c in steps[0]['calls']], ['A', 'B'])
        self.assertEqual([c['returncode'] for c in steps[0]['calls']], [0, 1])

    def test_redaction_preserves_experiment_values(self):
        raw = 'set THERM1.temperature = -10\nOPENAI_API_KEY=sk-' + 'a' * 35 + '\n/Users/example/file.cpp'
        sanitized = exporter.sanitize(raw)
        self.assertIn('THERM1.temperature = -10', sanitized)
        self.assertNotIn('sk-', sanitized)
        self.assertNotIn('/Users/example', sanitized)

if __name__ == '__main__':
    unittest.main()
