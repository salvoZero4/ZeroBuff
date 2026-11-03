import Foundation

// Cross-language bridge contract: JS sends no native-only optional fields.
let payload = #"{"id":"rest-1","workoutKey":"routine:123","routineId":"routine","title":"Pull","endAt":90000,"version":0,"status":"active"}"#
var state = try JSONDecoder().decode(RestTimerState.self, from: Data(payload.utf8))
precondition(state.activityStarted == nil && state.startedAt == nil)
precondition(state.endDate.timeIntervalSince1970 == 90, "Bridge timestamps must stay in milliseconds")
state.activityStarted = true
state.startedAt = 1000
state.version = 2
let decoded = try JSONDecoder().decode(RestTimerState.self, from: Data(state.json.utf8))
precondition(decoded.activityStarted == true, "User-dismissed activities must not be recreated")
precondition(decoded.version == 2 && decoded.startedAt == 1000)
print("Rest timer Swift bridge contract passed")
