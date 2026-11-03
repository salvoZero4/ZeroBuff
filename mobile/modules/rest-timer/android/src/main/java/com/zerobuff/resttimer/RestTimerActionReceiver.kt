package com.zerobuff.resttimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.concurrent.Executors

// Explicit, non-exported PendingIntents only. No foreground service or JS task.
class RestTimerActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra("timerId") ?: return
    val action = intent.action ?: return
    val version = intent.getIntExtra("version", -1)
    val pending = goAsync()
    executor.execute {
      try {
        RestTimerEngine.action(context.applicationContext, action, id, version)
      } catch (error: Exception) {
        Log.e("ZeroBuffRestTimer", "Could not apply rest notification action", error)
      } finally {
        pending.finish()
      }
    }
  }

  companion object {
    private val executor = Executors.newSingleThreadExecutor()
  }
}
