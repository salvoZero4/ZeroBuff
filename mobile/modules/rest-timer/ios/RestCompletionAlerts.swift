import Foundation
import UserNotifications

// Share Expo's system notification queue. LiveActivityIntent can replace the
// request while JS is suspended; Expo handles permission and response events.
enum RestCompletionAlerts {
  static let id = "zerobuff.rest.complete"

  static func clear() async {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [id])
    center.removeDeliveredNotifications(withIdentifiers: [id])
  }

  static func schedule(_ state: RestTimerState) async throws {
    let remaining = state.endDate.timeIntervalSinceNow
    guard remaining > 0 else { return }
    let content = UNMutableNotificationContent()
    content.title = "Rest complete"
    content.body = "Your next set is ready."
    content.sound = .default
    content.userInfo = [
      "kind": "rest-timer", "timerId": state.id, "routineId": state.routineId,
      "version": String(state.version), "endAt": String(state.endAt)
    ]
    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [id])
    // Adding the same identifier replaces its pending request atomically.
    try await center.add(UNNotificationRequest(
      identifier: id, content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: max(1, remaining), repeats: false)
    ))
  }
}
