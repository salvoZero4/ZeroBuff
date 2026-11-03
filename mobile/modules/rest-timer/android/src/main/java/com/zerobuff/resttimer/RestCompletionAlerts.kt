package com.zerobuff.resttimer

import android.app.NotificationManager
import android.content.Context
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.triggers.DateTrigger
import expo.modules.notifications.service.delegates.ExpoSchedulingDelegate
import org.json.JSONObject

// Narrow SDK-specific adapter: uses the installed expo-notifications scheduler
// from native actions, without waking JS. Recheck these APIs on Expo upgrades.
object RestCompletionAlerts {
  const val ID = "zerobuff.rest.complete"
  const val CHANNEL = "zerobuff.rest.complete"

  fun schedule(context: Context, state: JSONObject) {
    val data = JSONObject().put("kind", "rest-timer")
      .put("timerId", state.getString("id"))
      .put("routineId", state.getString("routineId"))
      .put("version", state.getInt("version").toString())
      .put("endAt", state.getDouble("endAt").toString())
    val content = NotificationContent.Builder()
      .setTitle("Rest complete").setText("Your next set is ready.")
      .setBody(data).setAutoDismiss(true).build()
    // Expo presents local requests under (identifier, 0).
    context.getSystemService(NotificationManager::class.java).cancel(ID, 0)
    ExpoSchedulingDelegate(context).scheduleNotification(
      NotificationRequest(ID, content, DateTrigger(CHANNEL, state.getDouble("endAt").toLong()))
    )
  }

  fun clear(context: Context) {
    ExpoSchedulingDelegate(context).removeScheduledNotifications(listOf(ID))
    context.getSystemService(NotificationManager::class.java).cancel(ID, 0)
  }
}
