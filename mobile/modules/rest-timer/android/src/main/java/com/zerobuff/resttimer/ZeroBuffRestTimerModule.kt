package com.zerobuff.resttimer

import android.util.Log
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.LifecycleState
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ZeroBuffRestTimerModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)

  private fun updateVisibility(inBackground: Boolean) {
    val context = appContext.reactContext ?: return
    runCatching { RestTimerEngine.setInBackground(context, inBackground) }
      .onFailure { Log.e("ZeroBuffRestTimer", "Could not update background rest alerts", it) }
  }

  override fun definition() = ModuleDefinition {
    Name("ZeroBuffRestTimer")
    Events("onRestTimerChanged")
    OnCreate {
      RestTimerEngine.onChange = { sendEvent("onRestTimerChanged", emptyMap<String, Any>()) }
      if ((appContext.reactContext as? ReactContext)?.lifecycleState == LifecycleState.RESUMED) {
        updateVisibility(inBackground = false)
      }
    }
    OnActivityEntersForeground { updateVisibility(inBackground = false) }
    OnActivityEntersBackground { updateVisibility(inBackground = true) }
    OnDestroy { RestTimerEngine.onChange = null }
    AsyncFunction("getState") { RestTimerEngine.read(context)?.toString() }
    AsyncFunction("setTimer") { json: String, expectedVersion: Int -> RestTimerEngine.set(context, json, expectedVersion) }
    AsyncFunction("clear") { RestTimerEngine.clear(context) }
    AsyncFunction("performAction") { action: String, id: String, version: Int -> RestTimerEngine.action(context, action, id, version) }
    AsyncFunction("canScheduleExactAlarms") { RestTimerEngine.canScheduleExactAlarms(context) }
    AsyncFunction("openAlarmSettings") { RestTimerEngine.openAlarmSettings(context) }
    Function("canShowLiveActivity") { true }
  }
}
