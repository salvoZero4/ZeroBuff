import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ScrollView,
  View,
  type LayoutRectangle,
  type ScrollViewInstance,
} from "react-native";
import {
  GestureDetector,
  useNativeGesture,
  usePanGesture,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Icon } from "@/components/ui/Icon";
import type { RoutineExerciseDraft } from "../utils/routineDraft";

type DragPosition = {
  from: number;
  to: number;
  offset: number;
  height: number;
};
type DragOrigin = {
  index: number;
  target: number;
  scroll: number;
  pointer: number;
  translation: number;
};
const idlePosition: DragPosition = { from: -1, to: -1, offset: 0, height: 0 };
const autoScrollEdge = 64;

type RoutineExerciseListProps = {
  exercises: RoutineExerciseDraft[];
  disabled: boolean;
  onDragStart: () => void;
  onDrop: (from: number, to: number) => void;
  renderRow: (
    exercise: RoutineExerciseDraft,
    grip: ReactNode,
    isActive: boolean,
  ) => ReactNode;
};

export function RoutineExerciseList({
  exercises,
  disabled,
  onDragStart,
  onDrop,
  renderRow,
}: RoutineExerciseListProps) {
  const list = useRef<ScrollViewInstance>(null);
  const layouts = useRef<LayoutRectangle[]>([]);
  const scrollOffset = useRef(0);
  const viewport = useRef(0);
  const contentHeight = useRef(0);
  const origin = useRef<DragOrigin | null>(null);
  const autoScroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const position = useSharedValue(idlePosition);
  const [activeIndex, setActiveIndex] = useState(-1);
  const scrollGesture = useNativeGesture({});

  useLayoutEffect(() => {
    position.set(idlePosition);
  }, [exercises, position]);

  useEffect(
    () => () => {
      if (autoScroll.current !== null) clearInterval(autoScroll.current);
    },
    [],
  );

  function updatePosition(drag: DragOrigin) {
    const row = layouts.current[drag.index];
    const offset = drag.translation + scrollOffset.current - drag.scroll;
    const center = row.y + row.height / 2 + offset;
    let target = drag.index;
    for (let index = 0; index < exercises.length; index++) {
      const other = layouts.current[index];
      if (!other) continue;
      const otherCenter = other.y + other.height / 2;
      if (index > drag.index && center > otherCenter) target = index;
      if (index < drag.index && center < otherCenter) {
        target = index;
        break;
      }
    }
    drag.target = target;
    position.set({ from: drag.index, to: target, offset, height: row.height });
  }

  function startDrag(index: number, handleY: number) {
    const row = layouts.current[index];
    if (!row || origin.current) return;

    origin.current = {
      index,
      target: index,
      scroll: scrollOffset.current,
      pointer: row.y - scrollOffset.current + handleY,
      translation: 0,
    };
    setActiveIndex(index);
    onDragStart();

    autoScroll.current = setInterval(() => {
      const drag = origin.current;
      if (!drag) return;
      const finger = drag.pointer + drag.translation;
      const edge = Math.min(autoScrollEdge, viewport.current / 3);
      const direction =
        finger < edge
          ? -1
          : finger > viewport.current - edge
            ? 1
            : 0;
      const maxOffset = Math.max(0, contentHeight.current - viewport.current);
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, scrollOffset.current + direction * 2),
      );
      if (nextOffset === scrollOffset.current) return;
      scrollOffset.current = nextOffset;
      list.current?.scrollTo({ y: nextOffset, animated: false });
      updatePosition(drag);
    }, 16);
  }

  function moveDrag(index: number, translation: number) {
    const drag = origin.current;
    if (drag?.index !== index) return;
    drag.translation = translation;
    updatePosition(drag);
  }

  function endDrag(index: number, cancelled: boolean) {
    const drag = origin.current;
    if (drag?.index !== index) return;
    if (autoScroll.current !== null) clearInterval(autoScroll.current);
    autoScroll.current = null;
    origin.current = null;
    const target = cancelled ? index : drag.target;
    if (target === index) position.set(idlePosition);
    setActiveIndex(-1);
    onDrop(index, target);
  }

  return (
    <GestureDetector gesture={scrollGesture}>
      <ScrollView
        ref={list}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onLayout={({ nativeEvent }) => {
          viewport.current = nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, height) => {
          contentHeight.current = height;
        }}
        onScroll={({ nativeEvent }) => {
          if (!origin.current)
            scrollOffset.current = nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {exercises.map((exercise, index) => (
          <DraggableRow
            key={exercise.id}
            index={index}
            disabled={disabled}
            isActive={activeIndex === index}
            position={position}
            scrollGesture={scrollGesture}
            onLayout={(layout) => {
              layouts.current[index] = layout;
            }}
            onStart={startDrag}
            onMove={moveDrag}
            onEnd={endDrag}
            renderGrip={(grip) =>
              renderRow(exercise, grip, activeIndex === index)
            }
          />
        ))}
      </ScrollView>
    </GestureDetector>
  );
}

function DraggableRow({
  index,
  disabled,
  isActive,
  position,
  scrollGesture,
  onLayout,
  onStart,
  onMove,
  onEnd,
  renderGrip,
}: {
  index: number;
  disabled: boolean;
  isActive: boolean;
  position: SharedValue<DragPosition>;
  scrollGesture: ReturnType<typeof useNativeGesture>;
  onLayout: (layout: LayoutRectangle) => void;
  onStart: (index: number, y: number) => void;
  onMove: (index: number, translation: number) => void;
  onEnd: (index: number, cancelled: boolean) => void;
  renderGrip: (grip: ReactNode) => ReactNode;
}) {
  const pan = usePanGesture({
    enabled: !disabled,
    block: scrollGesture,
    activeOffsetY: [-4, 4],
    maxPointers: 1,
    runOnJS: true,
    onActivate: (event) => onStart(index, event.y - event.translationY),
    onUpdate: (event) => onMove(index, event.translationY),
    onFinalize: (event) => onEnd(index, event.canceled),
  });

  const animatedStyle = useAnimatedStyle(() => {
    const { from, to, offset, height } = position.get();
    if (index === from)
      return { zIndex: 1, transform: [{ translateY: offset }] };

    let shift = 0;
    if (index > from && index <= to) shift = -height;
    if (index < from && index >= to) shift = height;
    return {
      zIndex: 0,
      transform: [
        { translateY: from < 0 ? 0 : withTiming(shift, { duration: 130 }) },
      ],
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      onLayout={({ nativeEvent }) => onLayout(nativeEvent.layout)}
    >
      {renderGrip(
        <GestureDetector gesture={pan}>
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            className="min-h-12 w-12 items-center justify-center"
          >
            <View
              className={`size-8 items-center justify-center rounded-sm ${isActive ? "bg-accent" : ""}`}
            >
              <Icon
                name="grip-vertical"
                size={16}
                className={isActive ? "text-on-accent" : "text-text-secondary"}
              />
            </View>
          </View>
        </GestureDetector>,
      )}
    </Animated.View>
  );
}
