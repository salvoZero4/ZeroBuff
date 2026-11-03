package com.zerobuff.resttimer

import org.json.JSONObject

// Pure state transitions shared by the bridge and background receiver.
internal object RestTimerTransitions {
  fun expire(state: JSONObject, now: Long): JSONObject {
    if (state.getString("status") != "active" || state.getDouble("endAt") > now) return state
    return JSONObject(state.toString()).put("status", "complete").put("version", state.getInt("version") + 1)
  }

  fun set(current: JSONObject?, incoming: JSONObject, expectedVersion: Int, now: Long): JSONObject {
    val next = JSONObject(incoming.toString())
    if (current != null && current.getString("id") == next.getString("id")) {
      if (current.getInt("version") != expectedVersion) return current
      if (current.getDouble("endAt") == next.getDouble("endAt") && current.getString("status") == next.getString("status")) return current
      next.put("version", current.getInt("version") + 1)
      next.put("surfaceDismissed", current.optBoolean("surfaceDismissed"))
    } else {
      next.put("version", 1).put("surfaceDismissed", false)
    }
    if (next.getDouble("endAt") <= now) next.put("status", "complete")
    return next
  }

  fun action(current: JSONObject, action: String, id: String, version: Int, now: Long): JSONObject? {
    if (id != current.getString("id") || current.getString("status") != "active" || version != current.getInt("version") || current.getDouble("endAt") <= now) return null
    val next = JSONObject(current.toString())
    when (action) {
      "add" -> next.put("endAt", next.getDouble("endAt") + 30_000)
      "skip" -> next.put("status", "skipped").put("endAt", 0)
      "dismiss" -> next.put("surfaceDismissed", true)
      else -> return null
    }
    return next.put("version", next.getInt("version") + 1)
  }
}
