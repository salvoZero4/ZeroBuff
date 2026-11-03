// LiveActivityIntent executes in the app process, where the real Notifee core
// adapter is linked. The extension only renders the activity and intent metadata.
enum NotifeeRestAlerts {
  static func clear() async throws { }
  static func schedule(_ state: RestTimerState) async throws { }
}
