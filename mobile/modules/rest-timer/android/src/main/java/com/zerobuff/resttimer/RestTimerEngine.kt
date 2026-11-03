package com.zerobuff.resttimer

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import org.json.JSONObject

// Timer metadata only. Notifee owns channels, countdown, triggers and action delivery.
object RestTimerEngine {
  private const val KEY = "timer"
  var onChange: (() -> Unit)? = null
  private fun prefs(context: Context) = context.getSharedPreferences("zerobuff.rest.v1", Context.MODE_PRIVATE)
  @Synchronized fun read(context: Context): JSONObject? = prefs(context).getString(KEY, null)?.let { runCatching { JSONObject(it) }.getOrNull() }

  @Synchronized fun set(context: Context, json: String, expectedVersion: Int): String {
    val next = JSONObject(json)
    val current = read(context)
    if (current != null && current.getString("id") == next.getString("id")) {
      if (current.getInt("version") != expectedVersion) return current.toString()
      if (current.getDouble("endAt") == next.getDouble("endAt") && current.getString("status") == next.getString("status")) return current.toString()
      next.put("version", current.getInt("version") + 1)
      next.put("surfaceDismissed", current.optBoolean("surfaceDismissed"))
    } else {
      next.put("version", 1)
      next.put("surfaceDismissed", false)
    }
    if (next.getDouble("endAt") <= System.currentTimeMillis()) next.put("status", "complete")
    save(context, next)
    return next.toString()
  }

  private fun save(context: Context, state: JSONObject) {
    prefs(context).edit().putString(KEY, state.toString()).commit()
    onChange?.invoke()
  }

  @Synchronized fun action(context: Context, action: String, id: String, version: Int): String? {
    val state = read(context) ?: return null
    if (id != state.getString("id") || state.getString("status") != "active" || version != state.getInt("version")) return null
    when (action) {
      "add" -> {
        if (state.getDouble("endAt") <= System.currentTimeMillis()) return null
        state.put("endAt", state.getDouble("endAt") + 30_000)
      }
      "skip" -> { state.put("status", "skipped"); state.put("endAt", 0) }
      "dismiss" -> state.put("surfaceDismissed", true)
      "complete" -> {
        if (state.getDouble("endAt") > System.currentTimeMillis()) return null
        state.put("status", "complete")
      }
      else -> return null
    }
    state.put("version", state.getInt("version") + 1)
    save(context, state)
    return state.toString()
  }

  @Synchronized fun clear(context: Context) { prefs(context).edit().remove(KEY).commit() }

  fun promote(context: Context, notificationId: String) {
    if (Build.VERSION.SDK_INT < 36) return
    val manager = context.getSystemService(NotificationManager::class.java)
    // Notifee uses the string id's Java hash as the Android notification id.
    val active = manager.activeNotifications.firstOrNull { it.id == notificationId.hashCode() } ?: return
    val promoted = Notification.Builder.recoverBuilder(context, active.notification)
      .setRequestPromotedOngoing(true).build()
    manager.notify(active.tag, active.id, promoted)
  }
}
