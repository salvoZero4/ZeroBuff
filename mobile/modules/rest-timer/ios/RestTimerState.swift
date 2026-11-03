import Foundation

struct RestTimerState: Codable, Hashable {
  var id: String
  var workoutKey: String
  var routineId: String
  var title: String
  var endAt: Double
  var version: Int
  var status: String
  var surfaceDismissed: Bool?
  var activityStarted: Bool?
  var startedAt: Double?

  var endDate: Date { Date(timeIntervalSince1970: endAt / 1000) }
  var json: String { String(data: (try? JSONEncoder().encode(self)) ?? Data(), encoding: .utf8) ?? "null" }
}

