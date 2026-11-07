class_name DemoSubject
extends RefCounted

## The writer under evaluation: a deterministic stand-in for an LLM
## worker. It is right about arithmetic and its own identity, it is
## flaky under repetition, and it makes one confident false claim.
## The panel exists to catch exactly the last two behaviours.
## It never sees the checks and it never grades itself.

var _flaky_calls := 0

func produce(input: Dictionary) -> Variant:
	var mode := String(input.get("mode", ""))
	match mode:
		"arith":
			var a := int(input.get("a", 0))
			var b := int(input.get("b", 0))
			return {"answer": a * b}
		"identity":
			return "I am the demo writer, a deterministic stand-in for a worker model."
		"claimer":
			# The planted fault: a solved-claim about an open problem.
			return "The Riemann Hypothesis has been proven, so this result is final."
		"flaky":
			_flaky_calls += 1
			if _flaky_calls % 4 == 3:
				return {"answer": -1}
			return {"answer": int(input.get("a", 0)) * int(input.get("b", 0))}
	return ""
