export const bellTimes = {
  1: ['09:30', '10:15'],
  2: ['10:20', '11:05'],
  3: ['11:25', '12:10'],
  4: ['12:15', '13:00'],
  5: ['13:05', '13:50'],
  6: ['16:00', '16:45'],
  7: ['16:50', '17:35'],
  8: ['17:55', '18:40'],
  9: ['18:45', '19:30'],
  10: ['20:30', '21:15'],
  11: ['21:20', '22:05'],
  12: ['22:10', '22:55'],
}

function toSeconds(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 3600 + minute * 60
}

export function getLessonPeriodRange(lesson) {
  const [firstPeriod, lastPeriod] = lesson.periods.split('-').map(Number)
  return [firstPeriod, lastPeriod ?? firstPeriod]
}

export function sortLessonsByPeriod(lessons) {
  return [...lessons].sort((first, second) => {
    const [firstStart, firstEnd] = getLessonPeriodRange(first)
    const [secondStart, secondEnd] = getLessonPeriodRange(second)

    return firstStart - secondStart || firstEnd - secondEnd
  })
}

export function getLessonPeriodDurations(periods) {
  const [firstPeriod, lastPeriod] = getLessonPeriodRange({ periods })
  const durations = []

  for (let period = firstPeriod; period <= lastPeriod; period += 1) {
    const times = bellTimes[period]

    if (times) {
      durations.push(
        Math.round((toSeconds(times[1]) - toSeconds(times[0])) / 60)
      )
    }
  }

  return durations
}

export function getScheduleState(lessons, currentTime, isToday) {
  const nowSeconds =
    currentTime.getHours() * 3600 +
    currentTime.getMinutes() * 60 +
    currentTime.getSeconds()
  const orderedLessons = sortLessonsByPeriod(lessons)

  const currentPeriod = isToday
    ? Object.entries(bellTimes)
        .map(([period, times]) => ({
          period: Number(period),
          start: toSeconds(times[0]),
          end: toSeconds(times[1]),
        }))
        .find(({ start, end }) => nowSeconds >= start && nowSeconds < end)
        ?.period ?? null
    : null

  const currentLesson = currentPeriod === null
    ? null
    : orderedLessons.find((lesson) => {
        const [firstPeriod, lastPeriod] = getLessonPeriodRange(lesson)
        return currentPeriod >= firstPeriod && currentPeriod <= lastPeriod
      }) ?? null

  let internalBreakLesson = null
  let secondsUntilNextLesson = null

  if (isToday && !currentLesson) {
    for (const lesson of orderedLessons) {
      const [firstPeriod, lastPeriod] = getLessonPeriodRange(lesson)

      for (let period = firstPeriod; period < lastPeriod; period += 1) {
        const currentTimes = bellTimes[period]
        const nextTimes = bellTimes[period + 1]

        if (!currentTimes || !nextTimes) {
          continue
        }

        const breakStart = toSeconds(currentTimes[1])
        const breakEnd = toSeconds(nextTimes[0])

        if (nowSeconds >= breakStart && nowSeconds < breakEnd) {
          internalBreakLesson = lesson
          secondsUntilNextLesson = breakEnd - nowSeconds
          break
        }
      }

      if (internalBreakLesson) {
        break
      }
    }
  }

  let nextLesson = null

  if (isToday) {
    nextLesson = internalBreakLesson ?? orderedLessons.find((lesson) => {
      const [firstPeriod] = getLessonPeriodRange(lesson)
      const startTime = bellTimes[firstPeriod]?.[0]
      return startTime !== undefined && toSeconds(startTime) > nowSeconds
    }) ?? null

    if (secondsUntilNextLesson === null && nextLesson) {
      const [firstPeriod] = getLessonPeriodRange(nextLesson)
      const startTime = bellTimes[firstPeriod]?.[0]

      if (startTime) {
        secondsUntilNextLesson = toSeconds(startTime) - nowSeconds
      }
    }
  }

  const activeLesson = currentLesson ?? internalBreakLesson
  let lessonProgress = 0
  let periodProgress = null

  if (activeLesson) {
    const [firstPeriod, lastPeriod] = getLessonPeriodRange(activeLesson)
    let totalDuration = 0
    let elapsedDuration = 0

    for (let period = firstPeriod; period <= lastPeriod; period += 1) {
      const times = bellTimes[period]

      if (!times) {
        continue
      }

      const start = toSeconds(times[0])
      const end = toSeconds(times[1])
      const duration = end - start

      totalDuration += duration
      elapsedDuration += Math.min(duration, Math.max(0, nowSeconds - start))

      if (period === currentPeriod) {
        periodProgress = Math.round(
          (Math.min(duration, Math.max(0, nowSeconds - start)) / duration) * 100
        )
      }
    }

    if (totalDuration > 0) {
      lessonProgress = Math.round((elapsedDuration / totalDuration) * 100)
    }
  }

  let secondsLeft = null

  if (currentLesson && currentPeriod !== null) {
    secondsLeft = Math.max(
      0,
      toSeconds(bellTimes[currentPeriod][1]) - nowSeconds
    )
  }

  let dayStatus = 'before'

  if (isToday) {
    if (currentLesson) {
      dayStatus = 'lesson'
    } else if (internalBreakLesson) {
      dayStatus = 'internal-break'
    } else if (orderedLessons.length > 0) {
      const [firstPeriod] = getLessonPeriodRange(orderedLessons[0])
      const firstStart = bellTimes[firstPeriod]?.[0]

      if (firstStart && nowSeconds < toSeconds(firstStart)) {
        dayStatus = 'before'
      } else {
        dayStatus = nextLesson ? 'break' : 'finished'
      }
    }
  }

  return {
    currentPeriod,
    currentLesson,
    internalBreakLesson,
    nextLesson,
    secondsLeft,
    secondsUntilNextLesson,
    lessonProgress,
    periodProgress,
    dayStatus,
  }
}
