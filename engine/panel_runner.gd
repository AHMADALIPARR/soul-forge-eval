class_name PanelRunner
extends RefCounted

## Shared runner for the headless CLI and the web host.
## Grading stays in EvalEngine. This file only sequences the
## mechanics suite and the demo panel, then returns the records.

const EvalEngineT := preload("res://eval_engine.gd")
const DemoSubjectT := preload("res://demo_subject.gd")
const VerdictChainT := preload("res://verdict_chain.gd")

var checks: Array = []
var failures := 0

func expect(name: String, cond: bool) -> void:
	checks.append({"name": name, "pass": cond})
	if not cond:
		failures += 1

func self_tests() -> Dictionary:
	checks = []
	failures = 0
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
	return {"checks": checks.duplicate(true), "failures": failures}

func templates_from_text(text: String) -> Dictionary:
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) == TYPE_DICTIONARY:
		var list: Variant = parsed.get("templates", [])
		if typeof(list) != TYPE_ARRAY:
			return {"ok": false, "error": "templates file is not a JSON object", "templates": []}
		return {"ok": true, "error": "", "templates": list}
	if typeof(parsed) == TYPE_ARRAY:
		return {"ok": true, "error": "", "templates": parsed}
	return {"ok": false, "error": "templates file is not a JSON object", "templates": []}

func templates_from_path(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {"ok": false, "error": "cannot open templates file: " + path, "templates": []}
	return templates_from_text(f.get_as_text())

func load_default_templates() -> Dictionary:
	var sibling := ProjectSettings.globalize_path("res://") + "../templates/templates.json"
	if FileAccess.file_exists(sibling):
		return templates_from_path(sibling)
	if FileAccess.file_exists("res://templates.json"):
		return templates_from_path("res://templates.json")
	return {"ok": false, "error": "cannot open templates file", "templates": []}

func run_panel(templates: Array, tamper: bool) -> Dictionary:
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
	var rows: Array = []
	var tripped: Array = []
	for t in templates:
		var kind := String(t.get("kind", ""))
		var cases: Array = []
		match kind:
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
			state = "OFF"
		elif not bool(v.get("passed", false)):
			state = "HELD"
			tripped.append(String(t.get("id", "")))
		rows.append({
			"state": state,
			"id": String(t.get("id", "")),
			"title": String(t.get("title", "")),
			"verdict": v,
		})
	var valid_before: bool = engine.chain.verify()
	var tamper_report: Variant = null
	if tamper and engine.chain.entries.size() > 0:
		engine.chain.entries[0]["seal"] = "0".repeat(64)
		tamper_report = {"seal_replaced": 1, "valid_after": engine.chain.verify()}
	var overall_line := "OVERALL: APPLY — every enabled gate held its line and passed"
	var overall := "APPLY"
	if tripped.size() > 0:
		overall = "HELD"
		overall_line = "OVERALL: HELD -> revise — gate tripped by: " + ", ".join(tripped)
	return {
		"rows": rows,
		"chain_valid": engine.chain.verify(),
		"chain_valid_before_tamper": valid_before,
		"tamper": tamper_report,
		"entries": engine.chain.entries,
		"tip": engine.chain.tip,
		"entry_count": engine.chain.entries.size(),
		"overall": overall,
		"overall_line": overall_line,
		"tripped": tripped,
	}
