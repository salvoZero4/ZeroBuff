import Foundation
import RNNotifee

// Use Notifee's native core from AppIntents: no JS launch is needed to reschedule.
enum NotifeeRestAlerts {
  static let id = "zerobuff.rest.complete"

  static func clear() async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      NotifeeCore.cancelNotification(id, withNotificationType: 0) { error in
        if let error { continuation.resume(throwing: error) }
        else { continuation.resume() }
      }
    }
  }

  static func schedule(_ state: RestTimerState) async throws {
    let notification: [String: Any] = [
      "id": id, "title": "Rest complete", "body": "Your next set is ready.",
      "data": ["kind": "rest-timer", "timerId": state.id, "routineId": state.routineId,
               "version": String(state.version), "endAt": String(state.endAt)],
      "ios": ["sound": "default", "foregroundPresentationOptions": ["banner": false, "list": true, "sound": true, "badge": false]]
    ]
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      NotifeeCore.createTriggerNotification(notification, withTrigger: ["type": 0, "timestamp": state.endAt]) { error in
        if let error { continuation.resume(throwing: error) }
        else { continuation.resume() }
      }
    }
  }
}
