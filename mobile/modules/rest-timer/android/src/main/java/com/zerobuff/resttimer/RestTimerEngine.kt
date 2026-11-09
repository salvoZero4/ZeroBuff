package com.zerobuff.resttimer

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import java.time.Instant
import org.json.JSONObject

// Serializes native mutations from the Expo bridge and notification receivers.
// Expo owns the completion alarm; Android renders the countdown without ticks.
object RestTimerEngine {
  private const val KEY = "timer"
  private const val RUNNING_ID = 7201
  private const val RUNNING_CHANNEL = "zerobuff.rest.ongoing"
  private var inBackground = true
  var onChange: (() -> Unit)? = null
  private fun prefs(context: Context) = context.getSharedPreferences("zerobuff.rest.v1", Context.MODE_PRIVATE)
  private fun manager(context: Context) = context.getSystemService(NotificationManager::class.java)

  @Synchronized fun read(context: Context): JSONObject? {
    val state = prefs(context).getString(KEY, null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return null
    val current = RestTimerTransitions.expire(state, System.currentTimeMillis())
    if (current !== state) {
      save(context, current)
      manager(context).cancel(RUNNING_ID)
    }
    return current
  }

  @Synchronized fun set(context: Context, json: String, expectedVersion: Int): String {
    val current = read(context)
    val next = RestTimerTransitions.set(current, JSONObject(json), expectedVersion, System.currentTimeMillis())
    if (next !== current) save(context, next)
    // Retry publishing even when the persisted state did not change.
    present(context, next)
    return next.toString()
  }

  private fun save(context: Context, state: JSONObject) {
    check(prefs(context).edit().putString(KEY, state.toString()).commit()) { "Could not save rest timer" }
    onChange?.invoke()
  }

  @Synchronized fun action(context: Context, action: String, id: String, version: Int): String? {
    val state = read(context) ?: return null
    val next = RestTimerTransitions.action(state, action, id, version, System.currentTimeMillis()) ?: return null
    save(context, next)
    present(context, next)
    return next.toString()
  }

  @Synchronized fun clear(context: Context) {
    // Cancel before discarding state so a failed clear remains retryable.
    RestCompletionAlerts.clear(context)
    manager(context).cancel(RUNNING_ID)
    prefs(context).edit().remove(KEY).commit()
  }

  @Synchronized fun setInBackground(context: Context, background: Boolean) {
    inBackground = background
    if (background) {
      read(context)?.let { present(context, it) }
    } else {
      manager(context).cancel(RUNNING_ID)
      RestCompletionAlerts.cancelPending(context)
    }
  }

  fun canScheduleExactAlarms(context: Context): Boolean =
    Build.VERSION.SDK_INT < 31 || context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

  fun openAlarmSettings(context: Context) {
    val intent = if (Build.VERSION.SDK_INT >= 31) {
      Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
    } else {
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
    }
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  private fun channels(context: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    manager(context).createNotificationChannel(NotificationChannel(
      RUNNING_CHANNEL, "Rest countdown", NotificationManager.IMPORTANCE_LOW
    ).apply { setSound(null, null); enableVibration(false) })
    manager(context).createNotificationChannel(NotificationChannel(
      RestCompletionAlerts.CHANNEL, "Rest complete", NotificationManager.IMPORTANCE_DEFAULT
    ))
  }

  private fun actionIntent(context: Context, state: JSONObject, action: String): PendingIntent {
    val intent = Intent(context, RestTimerActionReceiver::class.java).apply {
      this.action = action
      // Include the version in the identity so an obsolete button cannot act on a new deadline.
      data = Uri.Builder().scheme("zerobuff-rest").authority("action")
        .appendPath(state.getString("id")).appendPath(state.getInt("version").toString())
        .appendPath(action).build()
      putExtra("timerId", state.getString("id"))
      putExtra("version", state.getInt("version"))
    }
    return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun present(context: Context, state: JSONObject) {
    channels(context)
    if (state.getString("status") != "active" || state.getDouble("endAt") <= System.currentTimeMillis()) {
      manager(context).cancel(RUNNING_ID)
      if (state.getString("status") == "skipped") RestCompletionAlerts.clear(context)
      return // Preserve a delivered completion alert.
    }
    if (!inBackground) return
    if (!manager(context).areNotificationsEnabled()) {
      manager(context).cancel(RUNNING_ID)
      RestCompletionAlerts.clear(context)
      return
    }
    // Publish the countdown even if the alarm scheduler fails on this device.
    try {
      RestCompletionAlerts.schedule(context, state)
    } finally {
      showCountdown(context, state)
    }
  }

  private fun showCountdown(context: Context, state: JSONObject) {
    if (state.optBoolean("surfaceDismissed")) {
      manager(context).cancel(RUNNING_ID)
      return
    }
    val launch = requireNotNull(context.packageManager.getLaunchIntentForPackage(context.packageName)).apply {
      action = Intent.ACTION_VIEW
      data = Uri.Builder().scheme("zerobuff").authority("workout").appendPath(state.getString("routineId")).build()
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val open = PendingIntent.getActivity(context, RUNNING_ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val deadline = state.getDouble("endAt").toLong()
    val routineTitle = state.getString("title")
    @Suppress("DEPRECATION")
    val builder = (if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, RUNNING_CHANNEL)
      else Notification.Builder(context).setPriority(Notification.PRIORITY_LOW).setSound(null))
      .setSmallIcon(R.drawable.zerobuff_rest_timer)
      .setContentTitle("Rest timer").setContentText(routineTitle)
      .setContentIntent(open).setDeleteIntent(actionIntent(context, state, "dismiss"))
      .setOngoing(true).setAutoCancel(false).setOnlyAlertOnce(true)
      .setCategory(Notification.CATEGORY_STOPWATCH)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(true).setWhen(deadline).setUsesChronometer(true).setChronometerCountDown(true)
      .addAction(Notification.Action.Builder(null, "Skip rest", actionIntent(context, state, "skip")).build())
      .addAction(Notification.Action.Builder(null, "+30s", actionIntent(context, state, "add")).build())
    if (Build.VERSION.SDK_INT >= 26) builder.setTimeoutAfter(maxOf(1, deadline - System.currentTimeMillis()))
    if (Build.VERSION.SDK_INT >= 36) {
      val metricStyle = if (Build.VERSION.SDK_INT >= 37) countdownMetricStyle(deadline) else null
      if (metricStyle != null) {
        builder.setStyle(metricStyle).setSubText(routineTitle).setShowWhen(false)
      } else {
        builder.setStyle(Notification.BigTextStyle().bigText(routineTitle))
      }
      // The extra also works with the API 36 SDK, whose public setter arrived in 36.1.
      builder.extras.putBoolean("android.requestPromotedOngoing", true)
    }
    manager(context).notify(RUNNING_ID, builder.build())
  }

  private fun countdownMetricStyle(deadline: Long): Notification.Style? {
    // Android 17's public metric API can render the live timer in the body.
    // Resolve it at runtime while Expo still compiles this module with API 36.
    return try {
      val metric = Class.forName("android.app.Notification\$Metric")
      val metricValue = Class.forName("android.app.Notification\$Metric\$MetricValue")
      val timeDifference = Class.forName("android.app.Notification\$Metric\$TimeDifference")
      val styleClass = Class.forName("android.app.Notification\$MetricStyle")
      val format = timeDifference.getField("FORMAT_CHRONOMETER").getInt(null)
      val timer = timeDifference.getMethod("forTimer", Instant::class.java, Int::class.javaPrimitiveType)
        .invoke(null, Instant.ofEpochMilli(deadline), format)
      val countdown = metric.getConstructor(metricValue, CharSequence::class.java)
        .newInstance(timer, "Rest left")
      val style = styleClass.getConstructor().newInstance()
      styleClass.getMethod("addMetric", metric).invoke(style, countdown)
      styleClass.getMethod("setCriticalMetric", Int::class.javaPrimitiveType).invoke(style, 0)
      style as Notification.Style
    } catch (error: ReflectiveOperationException) {
      Log.w("ZeroBuffRestTimer", "Timer metric unavailable, using the standard countdown", error)
      null
    }
  }
}
