"""Test harness loaded into Pyodide before any solution code.

The worker and the content pipeline inject values through module globals:
__CODE and __FN for install_solution(), __ARGS_JSON for run_one().
Results come back as a JSON string so the JS side parses exactly one value.

Timing is measured inside Python around the solution call, so JS-side
bookkeeping never poisons runtime measurements.
"""
import json
import time
import traceback

_SOLUTION_NS = {}
_SOLUTION_FN = None


def install_solution():
    global _SOLUTION_FN
    code = globals()['__CODE']
    fn_name = globals()['__FN']
    namespace = {}
    exec(compile(code, '<solution>', 'exec'), namespace)
    fn = namespace.get(fn_name)
    if fn is None:
        raise NameError('solution did not define a function named %r' % fn_name)
    _SOLUTION_NS.clear()
    _SOLUTION_NS.update(namespace)
    _SOLUTION_FN = fn


def install_pyflakes():
    """Extracts the vendored pyflakes wheel into site-packages."""
    import os
    import sys
    import zipfile

    wheel_path = globals()['__WHEEL_PATH']
    target = next(path for path in sys.path if 'site-packages' in path)
    with zipfile.ZipFile(wheel_path) as archive:
        archive.extractall(target)
    os.remove(wheel_path)


def lint_one():
    """Runs pyflakes over __LINT_CODE and returns JSON diagnostics."""
    import io
    import json

    code = globals()['__LINT_CODE']
    try:
        import pyflakes.api
        import pyflakes.reporter
    except ImportError:
        return json.dumps([])

    out = io.StringIO()
    err = io.StringIO()
    reporter = pyflakes.reporter.Reporter(out, err)
    pyflakes.api.check(code, 'solution.py', reporter)

    diagnostics = []
    for stream, severity in ((out, 'warning'), (err, 'error')):
        for line in stream.getvalue().splitlines():
            parts = line.split(':', 3)
            if len(parts) == 4 and parts[1].isdigit() and parts[2].isdigit():
                diagnostics.append({
                    'line': int(parts[1]),
                    'column': int(parts[2]),
                    'message': parts[3].strip(),
                    'severity': severity,
                })
            elif severity == 'warning' and line.strip():
                diagnostics.append({
                    'line': 1,
                    'column': 1,
                    'message': line.strip(),
                    'severity': severity,
                })
    return json.dumps(diagnostics)


def run_one():
    args = json.loads(globals()['__ARGS_JSON'])
    start = time.perf_counter()
    try:
        out = _SOLUTION_FN(*args)
    except BaseException:
        return json.dumps({'status': 'error', 'error': traceback.format_exc()})
    single = time.perf_counter() - start
    runtime = single
    if single < 0.005:
        # Browser timers are quantized coarser than one fast call (Chrome
        # rounds to ~100us), so a single timing can land on 0. Time a batch
        # and report the per-call average instead. The first call's result
        # is the reported answer; repeats are for timing only.
        reps = min(200, max(20, int(0.05 / max(single, 1e-05))))
        try:
            batch_start = time.perf_counter()
            for _ in range(reps):
                _SOLUTION_FN(*args)
            runtime = (time.perf_counter() - batch_start) / reps
        except BaseException:
            runtime = single
    try:
        actual = json.dumps(out)
    except (TypeError, ValueError) as exc:
        return json.dumps({
            'status': 'error',
            'error': 'return value is not JSON serializable: %s' % exc,
        })
    return json.dumps({'status': 'ok', 'runtimeMs': runtime * 1000.0, 'actual': actual})
