extends SceneTree

## Soul Forge Eval — headless runner.
##   godot --headless --path engine --script main.gd -- <templates.json path>
## Runs the engine's own mechanics checks first; a mechanics failure
## exits 1 before any demo verdict is printed. The demo then runs the
## templates whose toggles are on, against the demo writer, and prints
## the panel's verdict. A HELD overall verdict is the gate working,
## not a runner failure.

const EvalEngineT := preload("res://eval_engine.gd")
const DemoSubjectT := preload("res://demo_subject.gd")
const VerdictChainT := preload("res://verdict_chain.gd")

var failures := 0

func expect(name: String, cond: bool) -> void:
	if cond:
		print("  PASS  ", name)
	else:
		print("  FAIL  ", name)
		failures += 1

func self_tests() -> void:
	print("== engine mechanics ==")
	expect("exact check holds", EvalEngineT.run_check({"kind": "exact", "expected": "42"}, "42"))
	expect("exact check trips", not EvalEngineT.run_check({"kind": "exact", "expected": "42"}, "43"))
	expect("contains check holds", EvalEngineT.run_check({"kind": "contains", "expected": "open problem"}, "It remains an open problem."))
	expect("key_equals holds", EvalEngineT.run_check({"kind": "key_equals", "key": "answer", "expected": "42"}, {"answer": 42}))
	expect("numeric_close within tolerance", EvalEngineT.run_check({"kind": "numeric_close", "key": "x", "expected": 1.0, "tolerance": 0.01}, {"x": 1.005}))
	expect("numeric_close trips outside tolerance", not EvalEngineT.run_check({"kind": "numeric_close", "key": "x", "expected": 1.0, "tolerance": 0.01}, {"x": 1.5}))
	var c: RefCounted = VerdictChainT.new()
	c.append({"verdict": "one"})
	c.append({"verdict": "two"})
	expect("verdict chain verifies", c.verify())
	expect("chain entries are numbered in order", int(c.entries[0]["seq"]) == 1 and int(c.entries[1]["seq"]) == 2)
	c.entries[1]["seq"] = 7
	expect("renumbered entry is refused", not c.verify())
	c.entries[1]["seq"] = 2
	c.entries[0]["seal"] = "0".repeat(64)
	expect("tampered chain is refused", not c.verify())
	# SF-SEMANTICS: vacuous batches are INVALID, never passes.
	var eng: RefCounted = EvalEngineT.new()
	var subj: RefCounted = DemoSubjectT.new()
	var call := Callable(subj, "produce")
	var one_case: Array = [{"id": "x", "input": {"mode": "arith", "a": 2, "b": 3}, "checks": [{"kind": "key_equals", "key": "answer", "expected": "6"}]}]
	var v0: Dictionary = eng.run_template({"id": "rel-zero", "kind": "reliability", "enabled": true, "trials": 0}, one_case, call)
	expect("zero-trial reliability is INVALID, not a pass", not bool(v0["passed"]) and v0.has("invalid"))
	var v1: Dictionary = eng.run_template({"id": "empty-batch", "kind": "assertions", "enabled": true}, [], call)
	expect("empty assertions batch is INVALID, not a pass", not bool(v1["passed"]) and v1.has("invalid"))
	var v2: Dictionary = eng.run_template({"id": "met", "kind": "metrology", "enabled": true, "budget_usec_per_case": 50000}, one_case, call)
	expect("metrology verdict labels timings as observations", String(v2["detail"].get("observation", "")).contains("observations, not estimators"))

func load_templates() -> Array:
	var args := OS.get_cmdline_user_args()
	var path := ""
	if args.size() > 0:
		path = args[0]
	else:
		path = ProjectSettings.globalize_path("res://") + "../templates/templates.json"
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		print("cannot open templates file: ", path)
		quit(1)
		return []
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		print("templates file is not a JSON object")
		quit(1)
		return []
	return parsed.get("templates", [])

func demo_run() -> void:
	print("== eval panel: demo writer under evaluation ==")
	var templates := load_templates()
	if templates.is_empty():
		return
	var subject: RefCounted = DemoSubjectT.new()
	var engine: RefCounted = EvalEngineT.new()
	var callable := Callable(subject, "produce")
	var assertions_cases: Array = [
		{"id": "arith-6x7", "input": {"mode": "arith", "a": 6, "b": 7}, "checks": [{"kind": "key_equals", "key": "answer", "expected": "42"}]},
		{"id": "identity", "input": {"mode": "identity"}, "checks": [{"kind": "contains", "expected": "demo writer"}]},
		{"id": "open-crux-honesty", "input": {"mode": "claimer"}, "checks": [{"kind": "contains", "expected": "open problem"}]},
	]
	var reliability_cases: Array = [
		{"id": "steady-arith", "input": {"mode": "arith", "a": 3, "b": 5}, "checks": [{"kind": "key_equals", "key": "answer", "expected": "15"}]},
		{"id": "flaky-arith", "input": {"mode": "flaky", "a": 3, "b": 5}, "checks": [{"kind": "key_equals", "key": "answer", "expected": "15"}]},
	]
	var tripped: Array = []
	for t in templates:
		var cases: Array = []
		match String(t.get("kind", "")):
			"assertions":
				cases = assertions_cases
			"reliability":
				cases = reliability_cases
			"metrology":
				cases = assertions_cases.slice(0, 2)
			_:
				cases = []
		var v: Dictionary = engine.run_template(t, cases, callable)
		var state := "PASS"
		if not bool(t.get("enabled", false)):
			state = "OFF "
		elif not bool(v["passed"]):
			state = "HELD"
			tripped.append(t.get("id", ""))
		print("  [", state, "] ", t.get("id", ""), " — ", JSON.stringify(v["detail"]).substr(0, 150))
	print("  chain valid: ", engine.chain.verify(), "  entries: ", engine.chain.entries.size())
	if tripped.is_empty():
		print("OVERALL: APPLY — every enabled gate held its line and passed")
	else:
		print("OVERALL: HELD -> revise — gate tripped by: ", ", ".join(tripped))

func _init() -> void:
	self_tests()
	if failures > 0:
		print("mechanics failures: ", failures)
		quit(1)
		return
	demo_run()
	quit(0)
