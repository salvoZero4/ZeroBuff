package com.zerobuff.resttimer

import org.json.JSONObject

fun main() {
  fun state(id: String = "rest-1") = JSONObject()
    .put("id", id).put("status", "active").put("endAt", 100_000)
    .put("version", 1).put("surfaceDismissed", false)
  val original = state()
  val added = requireNotNull(RestTimerTransitions.action(original, "add", "rest-1", 1, 1_000))
  check(added.getDouble("endAt") == 130_000.0)
  check(added.getInt("version") == 2)
  check(original.getDouble("endAt") == 100_000.0) // no mutation of persisted input
  check(RestTimerTransitions.action(added, "add", "rest-1", 1, 1_000) == null)
  check(RestTimerTransitions.action(added, "skip", "rest-0", 2, 1_000) == null)
  check(RestTimerTransitions.action(original, "add", "rest-1", 1, 100_000) == null)
  val skipped = requireNotNull(RestTimerTransitions.action(added, "skip", "rest-1", 2, 1_000))
  check(skipped.getString("status") == "skipped" && skipped.getDouble("endAt") == 0.0)
  check(RestTimerTransitions.action(skipped, "add", "rest-1", 3, 1_000) == null)
  val dismissed = requireNotNull(RestTimerTransitions.action(original, "dismiss", "rest-1", 1, 1_000))
  check(dismissed.optBoolean("surfaceDismissed"))
  check(dismissed.getString("status") == "active" && dismissed.getDouble("endAt") == 100_000.0)
  val changed = RestTimerTransitions.set(dismissed, state().put("endAt", 160_000), 2, 1_000)
  check(changed.optBoolean("surfaceDismissed") && changed.getInt("version") == 3)
  check(RestTimerTransitions.set(added, original, 1, 1_000) === added)
  check(RestTimerTransitions.set(original, state(), 1, 1_000) === original)
  val replacement = RestTimerTransitions.set(dismissed, state("rest-2"), 0, 1_000)
  check(replacement.getInt("version") == 1 && !replacement.optBoolean("surfaceDismissed"))
  val expired = RestTimerTransitions.expire(original, 100_000)
  check(expired.getString("status") == "complete" && expired.getInt("version") == 2)
  check(RestTimerTransitions.expire(expired, 200_000) === expired)
  check(RestTimerTransitions.set(null, state(), 0, 200_000).getString("status") == "complete")
  println("Android rest timer transitions: 17 checks passed")
}
