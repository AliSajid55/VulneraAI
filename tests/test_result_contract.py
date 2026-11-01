"""Exercise both real route bodies without loading model weights or PostgreSQL.

Inference and persistence are fakes; serialization uses the actual Scan methods.
Run with: python -m unittest discover -s tests -v
"""
import ast
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import cast
import unittest

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def load_functions(filename, names, namespace):
    tree = ast.parse((BACKEND / filename).read_text())
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    for node in nodes:
        node.decorator_list = []
    # ast.Module.body expects list[ast.stmt]; list is invariant, so cast the
    # narrower list[ast.FunctionDef] we collected above.
    module = ast.Module(body=cast("list[ast.stmt]", nodes), type_ignores=[])
    exec(compile(module, filename, 'exec'), namespace)


class ResultContractTest(unittest.TestCase):
    def test_predict_and_saved_scan_preserve_model_result(self):
        source = ast.parse((BACKEND / 'database.py').read_text())
        scan_class = next(n for n in source.body if isinstance(n, ast.ClassDef) and n.name == 'Scan')
        methods = [n for n in scan_class.body if isinstance(n, ast.FunctionDef) and n.name in {'to_summary', 'to_detail'}]
        method_ns = {}
        # ast.Module.body expects list[ast.stmt]; list is invariant, so cast the
        # narrower list[ast.FunctionDef] we collected above.
        module = ast.Module(body=cast("list[ast.stmt]", methods), type_ignores=[])
        exec(compile(module, 'database.py', 'exec'), method_ns)

        def init(scan, **values):
            scan.__dict__.update(values)
            scan.id = 1
            scan.created_at = datetime.now(timezone.utc)

        Scan = type('Scan', (), {'__init__': init, **method_ns})
        # A score above 0.5 may still be safe with a calibrated threshold.
        for prediction, probability in [('safe', 0.8), ('vulnerable', 0.95)]:
            with self.subTest(prediction=prediction):
                expected = dict(prediction=prediction, confidence=0.75,
                                vulnerable_probability=probability, threshold=0.9,
                                chunk_count=2, total_chunks=2, chunk_aggregation='max', model='test-model')
                ns = {
                    'request': SimpleNamespace(get_json=lambda **_: {'code': 'print(1)', 'language': 'python'}),
                    'read_scan_input': lambda data: (data['code'], data['language'], 'Test', None),
                    'predict_code': lambda code: expected.copy(),
                    'jsonify': lambda data: data,
                    'g': SimpleNamespace(user=SimpleNamespace(id=1)),
                    'explain_with_gemini': lambda **_: {'available': False, 'explanation': ''},
                    'normalize_code': lambda code: code,
                    'strip_fences': lambda code: code,
                    'Scan': Scan,
                    'SessionLocal': SimpleNamespace(add=lambda scan: None, commit=lambda: None),
                }
                load_functions('server.py', {'predict_only', 'scan_code'}, ns)
                raw = ns['predict_only']()
                saved, status = ns['scan_code']()
                self.assertEqual(status, 201)
                for key in ['prediction', 'confidence', 'vulnerable_probability', 'threshold', 'chunk_count']:
                    self.assertEqual(raw[key], saved[key], key)
                self.assertEqual(saved['model_version'], raw['model'])
                self.assertEqual(saved['overall_risk'], 'high' if prediction == 'vulnerable' else 'low')


if __name__ == '__main__':
    unittest.main()
