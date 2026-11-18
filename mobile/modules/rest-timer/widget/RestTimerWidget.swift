import WidgetKit
import SwiftUI

struct RestTimerWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RestTimerAttributes.self) { context in
      VStack(alignment: .leading, spacing: 12) {
        Text(context.state.title).font(.headline).lineLimit(1)
        HStack {
          Text(statusLabel(context.state, complete: context.isStale))
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
          Text(statusLabel(context.state, complete: context.isStale)).font(.headline)
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

  private func statusLabel(_ state: RestTimerState, complete: Bool) -> String {
    if state.isItalian { return complete ? "Recupero completato" : "Recupero in corso" }
    return complete ? "Rest complete" : "Resting"
  }

  private func countdown(_ state: RestTimerState) -> some View {
    // The system drives this Text; there is no TimelineView or periodic app wakeup.
    Text(timerInterval: Date(timeIntervalSince1970: (state.startedAt ?? state.endAt) / 1000)...state.endDate, countsDown: true, showsHours: false)
      .monospacedDigit()
      .contentTransition(.identity)
      .accessibilityLabel(state.isItalian ? "Tempo di recupero rimanente" : "Rest time remaining")
  }

  @ViewBuilder private func controls(_ state: RestTimerState) -> some View {
    if #available(iOS 17.0, *) {
      HStack {
        Button(intent: SkipRestIntent(timerId: state.id)) { Text(state.isItalian ? "Salta recupero" : "Skip rest").frame(minHeight: 48) }
        Spacer()
        Button(intent: AddRestTimeIntent(timerId: state.id)) { Text("+30s").frame(minHeight: 48)
          .accessibilityLabel(state.isItalian ? "Aggiungi 30 secondi" : "Add 30 seconds") }
      }
      .buttonStyle(.bordered)
    }
  }

  private func workoutURL(_ state: RestTimerState) -> URL? {
    URL(string: "zerobuff://workout/\(state.routineId)")
  }
}
