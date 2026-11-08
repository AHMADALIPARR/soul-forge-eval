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
	# Entries are numbered (SF-SEMANTICS fix): the sequence number is
	# folded into the seal, so a duplicated, replayed, or renumbered
	# entry breaks verification instead of passing silently.
	var seq := entries.size() + 1
	var canonical := JSON.stringify(record)
	var seal := sha256_hex(tip + "|" + str(seq) + "|" + canonical)
	entries.append({"seq": seq, "record": record, "prev": tip, "seal": seal})
	tip = seal
	return seal

func verify() -> bool:
	var prev := "GENESIS"
	var expect_seq := 0
	for e in entries:
		expect_seq += 1
		if int(e.get("seq", 0)) != expect_seq:
			return false
		if e["prev"] != prev:
			return false
		var canonical := JSON.stringify(e["record"])
		if sha256_hex(prev + "|" + str(expect_seq) + "|" + canonical) != e["seal"]:
			return false
		prev = e["seal"]
	return prev == tip
