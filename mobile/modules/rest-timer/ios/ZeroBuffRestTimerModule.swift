import ExpoModulesCore
import ActivityKit

public final class ZeroBuffRestTimerModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ZeroBuffRestTimer")
    Events("onRestTimerChanged")
    OnCreate { [weak self] in
      self?.observer = NotificationCenter.default.addObserver(
        forName: RestTimerEngine.changeNotification, object: nil, queue: nil
      ) { [weak self] _ in
        self?.sendEvent("onRestTimerChanged", [:])
      }
    }
    OnDestroy { [weak self] in
      if let observer = self?.observer { NotificationCenter.default.removeObserver(observer) }
    }
    AsyncFunction("getState") { () async -> String? in
      await RestTimerEngine.shared.read()?.json
    }
    AsyncFunction("setTimer") { (json: String, expectedVersion: Int) async throws -> String in
      try await RestTimerEngine.shared.set(json, expectedVersion: expectedVersion)
    }
    AsyncFunction("clear") { () async in await RestTimerEngine.shared.clear() }
    Function("canShowLiveActivity") { ActivityAuthorizationInfo().areActivitiesEnabled }
  }
}
