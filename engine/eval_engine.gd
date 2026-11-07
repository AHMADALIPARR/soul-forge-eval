class_name EvalEngine
extends RefCounted

## The evaluation core. A subject is any Callable that takes a case
## input (Dictionary) and returns an output (Dictionary or String).
## The engine grades; the subject never grades itself. Every verdict
## is appended to a VerdictChain before it is reported.
##
## Template kinds (templates/templates.json):
##   assertions  — deterministic checks, all must pass (assay's seat)
##   reliability — N trials per case, gate reads pass^k (temper's seat)
##   metrology   — per-case time and size budget (tare's seat)
##   judge       — recognised, refused for now: no judge is trusted
##                 until the deterministic gates have been proven

const VerdictChainT := preload("res://verdict_chain.gd")

var chain: RefCounted

func _init() -> void:
	chain = VerdictChainT.new()

## One deterministic check. Returns true when the output holds.
static func run_check(check: Dictionary, output: Variant) -> bool:
	var kind := String(check.get("kind", ""))
	match kind:
		"exact":
			return String(output) == String(check.get("expected", ""))
		"contains":
			return String(output).contains(String(check.get("expected", "")))
		"key_equals":
			if typeof(output) != TYPE_DICTIONARY:
				return false
			var key := String(check.get("key", ""))
			return str((output as Dictionary).get(key, "")) == String(check.get("expected", ""))
		"numeric_close":
			var got := float((output as Dictionary).get(String(check.get("key", "")), NAN)) if typeof(output) == TYPE_DICTIONARY else float(output)
			var want := float(check.get("expected", 0.0))
			var tol := float(check.get("tolerance", 0.0))
			return absf(got - want) <= tol
		"length_within":
			var n := String(output).length()
			return n >= int(check.get("min", 0)) and n <= int(check.get("max", 1 << 30))
	return false

## Grade one case once under the assertions kind.
func grade_case(case_spec: Dictionary, subject: Callable) -> Dictionary:
	var output: Variant = subject.call(case_spec.get("input", {}))
	var results: Array = []
	var passed := true
	for check in case_spec.get("checks", []):
		var ok := run_check(check, output)
		results.append({"check": check.get("kind", ""), "ok": ok})
		passed = passed and ok
	return {"case": case_spec.get("id", ""), "passed": passed, "checks": results}

## Run one template over its cases. Returns the template verdict.
func run_template(template: Dictionary, cases: Array, subject: Callable) -> Dictionary:
	var kind := String(template.get("kind", ""))
	var verdict := {"template": template.get("id", ""), "kind": kind, "passed": false, "detail": {}}
	if not bool(template.get("enabled", false)):
		verdict["detail"] = {"skipped": "toggle off"}
		return verdict
	match kind:
		"assertions":
			var graded: Array = []
			var all_ok := true
			for c in cases:
				var g := grade_case(c, subject)
				graded.append(g)
				all_ok = all_ok and bool(g["passed"])
			verdict["passed"] = all_ok
			verdict["detail"] = {"cases": graded}
		"reliability":
			var trials := int(template.get("trials", 4))
			var any_pass_all := true
			var per_case: Array = []
			for c in cases:
				var wins := 0
				for _i in trials:
					var g := grade_case(c, subject)
					if bool(g["passed"]):
						wins += 1
				var pass_at_k := wins > 0
				var pass_pow_k := wins == trials
				any_pass_all = any_pass_all and pass_pow_k
				per_case.append({"case": c.get("id", ""), "trials": trials, "wins": wins, "pass_at_k": pass_at_k, "pass_pow_k": pass_pow_k})
			verdict["passed"] = any_pass_all
			verdict["detail"] = {"cases": per_case}
		"metrology":
			var budget := int(template.get("budget_usec_per_case", 50000))
			var rows: Array = []
			var within := true
			for c in cases:
				var t0 := Time.get_ticks_usec()
				var output: Variant = subject.call(c.get("input", {}))
				var dt := Time.get_ticks_usec() - t0
				var size := String(output).length() if typeof(output) == TYPE_STRING else JSON.stringify(output).length()
				var ok := dt <= budget
				within = within and ok
				rows.append({"case": c.get("id", ""), "usec": dt, "size": size, "within_budget": ok})
			verdict["passed"] = within
			verdict["detail"] = {"budget_usec_per_case": budget, "cases": rows}
		"judge":
			verdict["detail"] = {"refused": "judge templates stay off until the deterministic gates are proven"}
		_:
			verdict["detail"] = {"error": "unknown kind: " + kind}
	chain.append(verdict)
	return verdict
