import WidgetKit
import SwiftUI

struct RestTimerWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RestTimerAttributes.self) { context in
      VStack(alignment: .leading, spacing: 12) {
        Text(context.state.title).font(.headline).lineLimit(1)
        HStack {
          Text(context.isStale ? "Rest complete" : "Resting")
          Spacer()
          countdown(context.state).font(.system(size: 32, weight: .semibold, design: .rounded))
        }
        if !context.isStale { controls(context.state) }
      }
      .padding()
      .widgetURL(workoutURL(context.state))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.isStale ? "Rest complete" : "Resting").font(.headline)
        }
        DynamicIslandExpandedRegion(.trailing) { countdown(context.state).font(.title2) }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 8) {
            Text(context.state.title).font(.caption).lineLimit(1)
            if !context.isStale { controls(context.state) }
          }
        }
      } compactLeading: {
        Image(systemName: "timer")
      } compactTrailing: {
        countdown(context.state).monospacedDigit().frame(maxWidth: 56)
      } minimal: {
        Image(systemName: "timer")
      }
      .widgetURL(workoutURL(context.state))
    }
  }

  private func countdown(_ state: RestTimerState) -> some View {
    // The system drives this Text; there is no TimelineView or periodic app wakeup.
    Text(timerInterval: Date(timeIntervalSince1970: (state.startedAt ?? state.endAt) / 1000)...state.endDate, countsDown: true, showsHours: false)
      .monospacedDigit()
      .contentTransition(.identity)
      .accessibilityLabel("Rest time remaining")
  }

  @ViewBuilder private func controls(_ state: RestTimerState) -> some View {
    if #available(iOS 17.0, *) {
      HStack {
        Button(intent: SkipRestIntent(timerId: state.id)) { Text("Skip rest").frame(minHeight: 48) }
        Spacer()
        Button(intent: AddRestTimeIntent(timerId: state.id)) { Text("+30s").frame(minHeight: 48) }
      }
      .buttonStyle(.bordered)
    }
  }

  private func workoutURL(_ state: RestTimerState) -> URL? {
    URL(string: "zerobuff://workout/\(state.routineId)")
  }
}
