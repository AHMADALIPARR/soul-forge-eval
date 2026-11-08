extends SceneTree

## Soul Forge Eval — headless runner.
##   godot --headless --path engine --script main.gd -- <templates.json path>
## Runs the engine's own mechanics checks first; a mechanics failure
## exits 1 before any demo verdict is printed. The demo then runs the
## templates whose toggles are on, against the demo writer, and prints
## the panel's verdict. A HELD overall verdict is the gate working,
## not a runner failure.

const PanelRunnerT := preload("res://panel_runner.gd")

func _init() -> void:
	var runner := PanelRunnerT.new()
	var mechanics: Dictionary = runner.self_tests()
	print("== engine mechanics ==")
	for c in mechanics["checks"]:
		if bool(c["pass"]):
			print("  PASS  ", c["name"])
		else:
			print("  FAIL  ", c["name"])
	if int(mechanics["failures"]) > 0:
		print("mechanics failures: ", mechanics["failures"])
		quit(1)
		return
	var loaded: Dictionary = _resolve_templates(runner)
	if not bool(loaded["ok"]):
		print(loaded["error"])
		quit(1)
		return
	var panel: Dictionary = runner.run_panel(loaded["templates"], false)
	print("== eval panel: demo writer under evaluation ==")
	for row in panel["rows"]:
		var state := String(row["state"])
		var tag := state
		if state == "OFF":
			tag = "OFF "
		var detail: String = JSON.stringify(row["verdict"]["detail"])
		print("  [", tag, "] ", row["id"], " — ", detail.substr(0, 150))
	print("  chain valid: ", panel["chain_valid"], "  entries: ", panel["entry_count"])
	print(panel["overall_line"])
	quit(0)

func _resolve_templates(runner) -> Dictionary:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		var arg := String(args[0])
		if arg.begins_with("{") or arg.begins_with("["):
			return runner.templates_from_text(arg)
		return runner.templates_from_path(arg)
	return runner.load_default_templates()
