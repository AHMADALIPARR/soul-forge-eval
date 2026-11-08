extends Node

## Browser host. The page writes window.sfPending and this node
## picks it up on the next frame, runs the same GDScript runner
## the CLI uses, then stores one SF_JSON line on window.sfLast.
## Grading stays in the engine.

const PanelRunnerT := preload("res://panel_runner.gd")

var _runner
var _busy := false

func _ready() -> void:
	_runner = PanelRunnerT.new()
	if not OS.has_feature("web"):
		set_process(false)
		return
	var window := JavaScriptBridge.get_interface("window")
	window.set("sfPending", "")
	window.set("sfLast", "")
	window.set("sfReady", true)
	print("SF_READY")

func _process(_delta: float) -> void:
	if _busy or not OS.has_feature("web"):
		return
	var window := JavaScriptBridge.get_interface("window")
	var pending: Variant = window.get("sfPending")
	var text := ""
	if typeof(pending) == TYPE_STRING:
		text = pending
	elif pending != null:
		text = str(pending)
	if text == "":
		return
	_busy = true
	window.set("sfPending", "")
	_handle(text)
	_busy = false

func _handle(text: String) -> void:
	print("SF_ENTER")
	var parsed: Variant = JSON.parse_string(text)
	var tamper := false
	var templates: Array = []
	var loaded_default := false
	if typeof(parsed) == TYPE_DICTIONARY and parsed.has("templates"):
		var list: Variant = parsed.get("templates", [])
		if typeof(list) == TYPE_ARRAY:
			templates = list
		tamper = bool(parsed.get("tamper", false))
	else:
		var loaded: Dictionary = _runner.load_default_templates()
		if not bool(loaded.get("ok", false)):
			_emit({"error": String(loaded.get("error", "templates unavailable"))})
			return
		templates = loaded["templates"]
		loaded_default = true
		if typeof(parsed) == TYPE_DICTIONARY:
			tamper = bool(parsed.get("tamper", false))
	var mechanics: Dictionary = _runner.self_tests()
	var panel: Dictionary = _runner.run_panel(templates, tamper)
	_emit({
		"mechanics": mechanics,
		"panel": panel,
		"engine": "GDScript",
		"godot": Engine.get_version_info().get("string", ""),
		"loaded_default": loaded_default,
	})

func _emit(report: Dictionary) -> void:
	var line := "SF_JSON " + JSON.stringify(report)
	print(line)
	if OS.has_feature("web"):
		var window := JavaScriptBridge.get_interface("window")
		window.set("sfLast", line)
