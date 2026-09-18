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
_PREPARE = None


def install_solution():
    global _SOLUTION_FN, _PREPARE
    code = globals()['__CODE']
    fn_name = globals()['__FN']
    namespace = {}
    # Problems with structured inputs (linked lists, trees) carry a prepare
    # block: it defines the node classes, converts the JSON args into live
    # objects, and returns (call_args, finisher). Building inputs happens
    # outside the timed window; the finisher serializes the return value.
    prep_code = globals().get('__PREP_CODE')
    if prep_code:
        exec(compile(prep_code, '<prepare>', 'exec'), namespace)
    exec(compile(code, '<solution>', 'exec'), namespace)
    fn = namespace.get(fn_name)
    if fn is None:
        raise NameError('solution did not define a function named %r' % fn_name)
    _SOLUTION_NS.clear()
    _SOLUTION_NS.update(namespace)
    _SOLUTION_FN = fn
    _PREPARE = namespace.get('prepare') if prep_code else None


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
    raw_args = json.loads(globals()['__ARGS_JSON'])
    finish = None
    if _PREPARE is not None:
        call_args, finish = _PREPARE(raw_args)
    else:
        call_args = raw_args
    start = time.perf_counter()
    try:
        out = _SOLUTION_FN(*call_args)
    except BaseException:
        return json.dumps({'status': 'error', 'error': traceback.format_exc()})
    single = time.perf_counter() - start
    runtime = single
    if single < 0.005:
        # Browser timers are quantized coarser than one fast call (Chrome
        # rounds to ~100us), so a single timing can land on 0. Time a batch
        # and report the per-call average instead. The first call's result
        # is the reported answer; repeats are for timing only.
        #
        # Prepared problems rebuild fresh inputs per repeat (outside the
        # timed window) and finish each repeat immediately: solutions may
        # mutate or rebuild node chains, so a repeat must never walk stale
        # links, and no long chain may sit unlinked-and-dead for the garbage
        # collector to cascade over.
        reps = min(200, max(20, int(0.05 / max(single, 1e-05))))
        try:
            if _PREPARE is None:
                batch_start = time.perf_counter()
                for _ in range(reps):
                    _SOLUTION_FN(*call_args)
                runtime = (time.perf_counter() - batch_start) / reps
            else:
                # Prepared problems: rebuild fresh inputs per repeat outside
                # the timed window, time only the solution call, and finish
                # each repeat immediately so no long node chain sits dead for
                # the garbage collector to cascade over.
                total = 0.0
                for _ in range(reps):
                    repeat_args, repeat_finish = _PREPARE(raw_args)
                    mark = time.perf_counter()
                    repeat_out = _SOLUTION_FN(*repeat_args)
                    total += time.perf_counter() - mark
                    repeat_finish(repeat_out)
                runtime = total / reps
        except BaseException:
            runtime = single
    if finish is not None:
        out = finish(out)
    try:
        actual = json.dumps(out)
    except (TypeError, ValueError) as exc:
        return json.dumps({
            'status': 'error',
            'error': 'return value is not JSON serializable: %s' % exc,
        })
    return json.dumps({'status': 'ok', 'runtimeMs': runtime * 1000.0, 'actual': actual})
