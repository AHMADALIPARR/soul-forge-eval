class_name VerdictChain
extends RefCounted

## Append-only verdict ledger. Each entry carries the hash of the
## previous entry and its own SHA-256 seal over a canonical string.
## The chain is the panel's memory: a verdict that is not in the
## chain did not happen, and a changed verdict breaks the chain.

var entries: Array = []
var tip: String = "GENESIS"

static func sha256_hex(text: String) -> String:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(text.to_utf8_buffer())
	return ctx.finish().hex_encode()

func append(record: Dictionary) -> String:
	var canonical := JSON.stringify(record)
	var seal := sha256_hex(tip + "|" + canonical)
	entries.append({"record": record, "prev": tip, "seal": seal})
	tip = seal
	return seal

func verify() -> bool:
	var prev := "GENESIS"
	for e in entries:
		if e["prev"] != prev:
			return false
		var canonical := JSON.stringify(e["record"])
		if sha256_hex(prev + "|" + canonical) != e["seal"]:
			return false
		prev = e["seal"]
	return prev == tip
