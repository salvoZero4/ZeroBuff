package com.zerobuff.resttimer

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ZeroBuffRestTimerModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  override fun definition() = ModuleDefinition {
    Name("ZeroBuffRestTimer")
    Events("onRestTimerChanged")
    OnCreate { RestTimerEngine.onChange = { sendEvent("onRestTimerChanged", emptyMap<String, Any>()) } }
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
