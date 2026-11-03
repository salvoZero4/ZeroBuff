import Foundation
import ActivityKit
import AppIntents
import UserNotifications

struct RestTimerAttributes: ActivityAttributes {
  typealias ContentState = RestTimerState
  var timerId: String
}

// Both the app and LiveActivityIntent use this actor. Intents run in the app process.
// The shared container holds timer metadata only, never auth or unsaved workout data.
actor RestTimerEngine {
  static let shared = RestTimerEngine()
  static let changeNotification = Notification.Name("ZeroBuffRestTimerChanged")
  private let defaults = UserDefaults(suiteName: "group.com.zerobuff.mobile")!
  private let key = "zerobuff.restTimer.v1"
  private var tail: Task<Void, Never>?

  private func enqueue<T: Sendable>(_ operation: @escaping @Sendable () async throws -> T) async throws -> T {
    let previous = tail
    let task = Task { await previous?.value; return try await operation() }
    tail = Task { _ = try? await task.value }
    return try await task.value
  }

  func read() -> RestTimerState? {
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(RestTimerState.self, from: data)
  }

  private func save(_ state: RestTimerState) {
    defaults.set(try? JSONEncoder().encode(state), forKey: key)
    NotificationCenter.default.post(name: Self.changeNotification, object: nil)
  }

  func set(_ json: String, expectedVersion: Int) async throws -> String {
    try await enqueue { try await self.performSet(json, expectedVersion: expectedVersion) }
  }

  private func performSet(_ json: String, expectedVersion: Int) async throws -> String {
    var next = try JSONDecoder().decode(RestTimerState.self, from: Data(json.utf8))
    if let current = read(), current.id == next.id {
      guard current.version == expectedVersion else { return current.json }
      if current.endAt == next.endAt && current.status == next.status {
        try await present(current)
        return current.json
      }
      next.surfaceDismissed = current.surfaceDismissed
      next.activityStarted = current.activityStarted
      next.startedAt = current.startedAt
      next.version = current.version + 1
    } else {
      next.version = 1
      await endActivities()
    }
    if next.startedAt == nil { next.startedAt = Date().timeIntervalSince1970 * 1000 }
    if next.endDate <= Date() { next.status = "complete" }
    save(next)
    try await present(next)
    return next.json
  }

  func action(id: String, addSeconds: Double?) async throws {
    try await enqueue { try await self.performAction(id: id, addSeconds: addSeconds) }
  }

  private func performAction(id: String, addSeconds: Double?) async throws {
    guard var current = read(), current.id == id, current.status == "active" else { return }
    // An expired notification cannot restart a rest or affect a later rest.
    if let addSeconds {
      guard current.endDate > Date() else { return }
      current.endAt += addSeconds * 1000
    } else {
      current.status = "skipped"
      current.endAt = 0
    }
    current.version += 1
    save(current)
    try await present(current)
  }

  func clear() async {
    _ = try? await enqueue { await self.performClear() }
  }

  private func performClear() async {
    defaults.removeObject(forKey: key)
    try? await NotifeeRestAlerts.clear()
    await endActivities()
  }

  private func endActivities() async {
    for activity in Activity<RestTimerAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  private func present(_ state: RestTimerState) async throws {
    try await NotifeeRestAlerts.clear()
    guard state.status == "active", state.endDate > Date() else {
      await endActivities()
      return
    }
    let permissions = await UNUserNotificationCenter.current().notificationSettings()
    if permissions.authorizationStatus == .authorized || permissions.authorizationStatus == .provisional {
      try await NotifeeRestAlerts.schedule(state)
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    let active = Activity<RestTimerAttributes>.activities.first { $0.attributes.timerId == state.id }
    let activityContent = ActivityContent(state: state, staleDate: state.endDate)
    if let active {
      await active.update(activityContent)
    } else if state.activityStarted != true && state.surfaceDismissed != true {
      // Do not recreate an activity dismissed by the user on later adjustments.
      _ = try Activity.request(attributes: RestTimerAttributes(timerId: state.id), content: activityContent, pushType: nil)
      var started = state
      started.activityStarted = true
      save(started)
    }
  }
}

@available(iOS 17.0, *)
struct AddRestTimeIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Add 30 seconds"
  static var openAppWhenRun = false
  @Parameter(title: "Timer") var timerId: String
  init() {}
  init(timerId: String) { self.timerId = timerId }
  func perform() async throws -> some IntentResult {
    try await RestTimerEngine.shared.action(id: timerId, addSeconds: 30)
    return .result()
  }
}

@available(iOS 17.0, *)
struct SkipRestIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Skip rest"
  static var openAppWhenRun = false
  @Parameter(title: "Timer") var timerId: String
  init() {}
  init(timerId: String) { self.timerId = timerId }
  func perform() async throws -> some IntentResult {
    try await RestTimerEngine.shared.action(id: timerId, addSeconds: nil)
    return .result()
  }
}
