import { useState, useEffect, useRef } from 'react'
import schedule from './schedule'
import './App.css'

const days = [
  { key: 'monday', name: '周一' },
  { key: 'tuesday', name: '周二' },
  { key: 'wednesday', name: '周三' },
  { key: 'thursday', name: '周四' },
  { key: 'friday', name: '周五' },
  { key: 'saturday', name: '周六' },
  { key: 'sunday', name: '周日' },
]

const dayKeys = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function getSelectedDate(dayKey, currentDate) {
  const todayIndex = currentDate.getDay()
  const selectedIndex = dayKeys.indexOf(dayKey)

  const date = new Date(currentDate)

  const difference = selectedIndex - todayIndex

  date.setDate(
    currentDate.getDate() + difference
  )

  return date
}

function getWeekEndDate(currentDate) {
  const monday = getSelectedDate(
    'monday',
    currentDate
  )

  const sunday = new Date(monday)

  sunday.setDate(
    monday.getDate() + 6
  )

  return sunday
}

const semesterStart = new Date(
  '2026-08-31T00:00:00'
)

const bellTimes = {
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

function App() {
  const [expandedLesson, setExpandedLesson] =
    useState(null)

  const [currentTime, setCurrentTime] =
    useState(new Date())

  const [selectedDay, setSelectedDay] = useState(
    dayKeys[new Date().getDay()]
  )

  const previousDayRef = useRef(
    dayKeys[new Date().getDay()]
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const today = dayKeys[currentTime.getDay()]

    if (previousDayRef.current !== today) {
      previousDayRef.current = today
      setSelectedDay(today)
      setExpandedLesson(null)
    }
  }, [currentTime])

  const currentWeek =
    Math.floor(
      (
        currentTime.getTime() -
        semesterStart.getTime()
      ) / (7 * 24 * 60 * 60 * 1000)
    ) + 1

  const lessons = (
    schedule[selectedDay] || []
  ).filter((lesson) => {
    const match =
      lesson.weeks.match(/(\d+)-(\d+)周/)

    if (!match) return true

    const startWeek = Number(match[1])
    const endWeek = Number(match[2])

    return (
      currentWeek >= startWeek &&
      currentWeek <= endWeek
    )
  })

  const todayKey =
    dayKeys[currentTime.getDay()]

  const isToday =
    selectedDay === todayKey

  const currentMinute =
    currentTime.getHours() * 60 +
    currentTime.getMinutes()

  const currentSecond =
    currentTime.getHours() * 60 * 60 +
    currentTime.getMinutes() * 60 +
    currentTime.getSeconds()

  const currentPeriod = isToday
    ? Object.entries(bellTimes).find(
        ([, time]) => {
          const [startHour, startMinute] =
            time[0].split(':').map(Number)

          const [endHour, endMinute] =
            time[1].split(':').map(Number)

          const start =
            startHour * 60 * 60 +
            startMinute * 60

          const end =
            endHour * 60 * 60 +
            endMinute * 60

          return (
            currentSecond >= start &&
            currentSecond < end
          )
        }
      )?.[0]
    : null

  const currentLesson = lessons.find(
    (lesson) => {
      if (!currentPeriod) return false

      const firstPeriod = Number(
        lesson.periods.split('-')[0]
      )

      const lastPeriod = Number(
        lesson.periods.split('-')[1]
      )

      return (
        firstPeriod <= Number(currentPeriod) &&
        lastPeriod >= Number(currentPeriod)
      )
    }
  )

  const internalBreakLesson = isToday
    ? lessons.find((lesson) => {
        const [
          firstPeriod,
          lastPeriod,
        ] = lesson.periods
          .split('-')
          .map(Number)

        if (
          firstPeriod === lastPeriod
        ) {
          return false
        }

        for (
          let period = firstPeriod;
          period < lastPeriod;
          period++
        ) {
          const currentEnd =
            bellTimes[period]?.[1]

          const nextStart =
            bellTimes[period + 1]?.[0]

          if (
            !currentEnd ||
            !nextStart
          ) {
            continue
          }

          const [endHour, endMinute] =
            currentEnd
              .split(':')
              .map(Number)

          const [startHour, startMinute] =
            nextStart
              .split(':')
              .map(Number)

          const breakStart =
            endHour * 60 * 60 +
            endMinute * 60

          const breakEnd =
            startHour * 60 * 60 +
            startMinute * 60

          if (
            currentSecond >= breakStart &&
            currentSecond < breakEnd
          ) {
            return true
          }
        }

        return false
      })
    : null

  const nextLesson = isToday
    ? internalBreakLesson ||
      lessons.find((lesson) => {
        const firstPeriod = Number(
          lesson.periods.split('-')[0]
        )

        const startTime =
          bellTimes[firstPeriod]?.[0]

        if (!startTime) return false

        const [hour, minute] =
          startTime
            .split(':')
            .map(Number)

        const lessonStart =
          hour * 60 + minute

        return (
          lessonStart > currentMinute
        )
      })
    : null

  let nextLessonStartTime = null

  if (internalBreakLesson) {
    const [
      firstPeriod,
      lastPeriod,
    ] = internalBreakLesson.periods
      .split('-')
      .map(Number)

    for (
      let period = firstPeriod;
      period < lastPeriod;
      period++
    ) {
      const endTime =
        bellTimes[period]?.[1]

      const startTime =
        bellTimes[period + 1]?.[0]

      if (
        !endTime ||
        !startTime
      ) {
        continue
      }

      const [endHour, endMinute] =
        endTime
          .split(':')
          .map(Number)

      const [startHour, startMinute] =
        startTime
          .split(':')
          .map(Number)

      const breakStart =
        endHour * 60 * 60 +
        endMinute * 60

      const breakEnd =
        startHour * 60 * 60 +
        startMinute * 60

      if (
        currentSecond >= breakStart &&
        currentSecond < breakEnd
      ) {
        nextLessonStartTime =
          breakEnd

        break
      }
    }
  } else if (nextLesson) {
    const firstPeriod = Number(
      nextLesson.periods.split('-')[0]
    )

    const startTime =
      bellTimes[firstPeriod]?.[0]

    if (startTime) {
      const [hour, minute] =
        startTime
          .split(':')
          .map(Number)

      nextLessonStartTime =
        hour * 60 * 60 +
        minute * 60
    }
  }

  let secondsLeft = null

  if (currentLesson) {
    const lastPeriod = Number(
      currentLesson.periods.split('-')[1]
    )

    const endTime =
      bellTimes[lastPeriod]?.[1]

    if (endTime) {
      const [endHour, endMinute] =
        endTime
          .split(':')
          .map(Number)

      const lessonEnd =
        endHour * 60 * 60 +
        endMinute * 60

      secondsLeft = Math.max(
        0,
        lessonEnd - currentSecond
      )
    }
  }

  let secondsUntilNextLesson = null

  if (
    nextLessonStartTime !== null
  ) {
    secondsUntilNextLesson =
      Math.max(
        0,
        nextLessonStartTime -
          currentSecond
      )
  }

  let lessonProgress = 0
  let lessonMinutesLeft = 0

  if (currentLesson) {
    const [
      firstPeriod,
      lastPeriod,
    ] = currentLesson.periods
      .split('-')
      .map(Number)

    const startTime =
      bellTimes[firstPeriod]?.[0]

    const endTime =
      bellTimes[lastPeriod]?.[1]

    if (startTime && endTime) {
      const [startHour, startMinute] =
        startTime
          .split(':')
          .map(Number)

      const [endHour, endMinute] =
        endTime
          .split(':')
          .map(Number)

      const lessonStart =
        startHour * 60 * 60 +
        startMinute * 60

      const lessonEnd =
        endHour * 60 * 60 +
        endMinute * 60

      const lessonDuration =
        lessonEnd - lessonStart

      const elapsed =
        currentSecond - lessonStart

      lessonProgress = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (elapsed / lessonDuration) *
              100
          )
        )
      )

      lessonMinutesLeft = Math.ceil(
        Math.max(
          0,
          lessonEnd - currentSecond
        ) / 60
      )
    }
  }

  let dayStatus = 'before'

  if (currentLesson) {
    dayStatus = 'lesson'
  } else if (internalBreakLesson) {
    dayStatus = 'internal-break'
  } else if (
    isToday &&
    lessons.length > 0
  ) {
    const firstLesson =
      lessons[0]

    const firstPeriod = Number(
      firstLesson.periods
        .split('-')[0]
    )

    const firstStartTime =
      bellTimes[firstPeriod]?.[0]

    if (firstStartTime) {
      const [firstHour, firstMinute] =
        firstStartTime
          .split(':')
          .map(Number)

      const firstLessonStart =
        firstHour * 60 +
        firstMinute

      if (
        currentMinute <
        firstLessonStart
      ) {
        dayStatus = 'before'
      } else if (nextLesson) {
        dayStatus = 'break'
      } else {
        dayStatus = 'finished'
      }
    }
  }

  return (
    <div className="app">

      <header className="header">

        <div>
          <p className="subtitle">
            МОЁ РАСПИСАНИЕ · {currentWeek} НЕДЕЛЯ
          </p>

          <h1>
            {getSelectedDate(
              selectedDay,
              currentTime
            ).toLocaleDateString(
              'ru-RU',
              {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }
            )}
          </h1>
        </div>

        <div className="current-time">
          {currentTime.toLocaleTimeString(
            'ru-RU',
            {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }
          )}
        </div>

      </header>

      <div className="week-info">

        <span>
          当前周
        </span>

        <strong>
          第 {currentWeek} 周
        </strong>

        <p>
          {getSelectedDate(
            'monday',
            currentTime
          ).toLocaleDateString(
            'ru-RU',
            {
              day: 'numeric',
              month: 'long',
            }
          )}

          {' — '}

          {getWeekEndDate(
            currentTime
          ).toLocaleDateString(
            'ru-RU',
            {
              day: 'numeric',
              month: 'long',
            }
          )}
        </p>

      </div>

      <nav className="days">

        {days.map((day) => (
          <button
            key={day.key}
            className={
              selectedDay === day.key
                ? 'active'
                : ''
            }
            onClick={() => {
              setSelectedDay(day.key)
              setExpandedLesson(null)
            }}
          >
            {day.name}
          </button>
        ))}

      </nav>

      {dayStatus === 'internal-break' && (
        <div className="current-status">

          <span>
            Перемена
          </span>

          <h2>
            Сейчас перерыв
          </h2>

          {nextLesson && (
            <p>
              Продолжение:{' '}
              {nextLesson.subject}
            </p>
          )}

          {secondsUntilNextLesson !== null && (
            <div className="countdown">

              <span className="countdown-title">
                ДО НАЧАЛА
              </span>

              <div className="countdown-time">

                <div className="countdown-unit">

                  <strong>
                    {Math.floor(
                      secondsUntilNextLesson /
                      60
                    )}
                  </strong>

                  <span>
                    мин
                  </span>

                </div>

                <div className="countdown-separator">
                  :
                </div>

                <div className="countdown-unit">

                  <strong>
                    {String(
                      secondsUntilNextLesson %
                      60
                    ).padStart(
                      2,
                      '0'
                    )}
                  </strong>

                  <span>
                    сек
                  </span>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {dayStatus === 'break' && (
        <div className="current-status">

          <span>
            Перемена
          </span>

          <h2>
            Сейчас перерыв
          </h2>

          {nextLesson && (
            <p>
              Следующая пара:{' '}
              {nextLesson.subject}
            </p>
          )}

          {secondsUntilNextLesson !== null && (
            <div className="countdown">

              <span className="countdown-title">
                ДО НАЧАЛА ПАРЫ
              </span>

              <div className="countdown-time">

                <div className="countdown-unit">

                  <strong>
                    {Math.floor(
                      secondsUntilNextLesson /
                      60
                    )}
                  </strong>

                  <span>
                    мин
                  </span>

                </div>

                <div className="countdown-separator">
                  :
                </div>

                <div className="countdown-unit">

                  <strong>
                    {String(
                      secondsUntilNextLesson %
                      60
                    ).padStart(
                      2,
                      '0'
                    )}
                  </strong>

                  <span>
                    сек
                  </span>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {dayStatus === 'finished' && (
        <div className="current-status">

          <span>
            Сегодня
          </span>

          <h2>
            Занятия закончились
          </h2>

          <p>
            На сегодня больше пар нет.
          </p>

        </div>
      )}

      {currentLesson && (
        <div className="current-status">

          <span>
            Сейчас
          </span>

          <h2>
            {currentLesson.subject}
          </h2>

          <p>
            {currentLesson.russian}
          </p>

          <div className="lesson-progress">

            <div className="lesson-progress-header">

              <span>
                ПРОГРЕСС ПАРЫ
              </span>

              <strong>
                {lessonProgress}% ·{' '}
                {lessonMinutesLeft} мин
              </strong>

            </div>

            <div className="lesson-progress-bar">

              <div
                className="lesson-progress-fill"
                style={{
                  width: `${lessonProgress}%`,
                }}
              />

            </div>

          </div>

          {secondsLeft !== null && (
            <div className="countdown">

              <span className="countdown-title">
                ДО КОНЦА ПАРЫ
              </span>

              <div className="countdown-time">

                <div className="countdown-unit">

                  <strong>
                    {Math.floor(
                      secondsLeft / 60
                    )}
                  </strong>

                  <span>
                    мин
                  </span>

                </div>

                <div className="countdown-separator">
                  :
                </div>

                <div className="countdown-unit">

                  <strong>
                    {String(
                      secondsLeft % 60
                    ).padStart(
                      2,
                      '0'
                    )}
                  </strong>

                  <span>
                    сек
                  </span>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {nextLesson &&
        !currentLesson &&
        !internalBreakLesson &&
        dayStatus !== 'finished' && (
          <div className="next-lesson">

            <span>
              Следующая пара
            </span>

            <h2>
              {nextLesson.subject}
            </h2>

            <p>
              {nextLesson.russian}
            </p>

          </div>
        )}

      <main className="schedule">

        {lessons.map(
          (lesson, index) => {

            const firstPeriod =
              Number(
                lesson.periods
                  .split('-')[0]
              )

            const lastPeriod =
              Number(
                lesson.periods
                  .split('-')[1]
              )

            const isCurrent =
              currentPeriod &&
              firstPeriod <=
                Number(currentPeriod) &&
              lastPeriod >=
                Number(currentPeriod)

            const startTime =
              bellTimes[
                firstPeriod
              ]?.[0]

            const endTime =
              bellTimes[
                lastPeriod
              ]?.[1]

            return (
              <div
                className="lesson"
                key={`${lesson.subject}-${index}`}
              >

                <div className="lesson-time">

                  <span>
                    {startTime}
                  </span>

                  <span>
                    {endTime}
                  </span>

                </div>

                <div
                  className={`lesson-card ${
                    isCurrent
                      ? 'current'
                      : ''
                  }`}
                  onClick={() => {
                    setExpandedLesson(
                      expandedLesson === index
                        ? null
                        : index
                    )
                  }}
                >

                  <span className="lesson-number">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      '0'
                    )}
                  </span>

                  <h2>
                    {lesson.subject}
                  </h2>

                  <div className="expand-indicator">
                    {expandedLesson === index
                      ? '⌃'
                      : '⌄'}
                  </div>

                  {isCurrent && (
                    <div className="current-label">
                      <span className="current-dot">
                        ●
                      </span>
                      进行中 · Сейчас идёт
                    </div>
                  )}

                  <p className="lesson-russian">
                    {lesson.russian}
                  </p>

                  {expandedLesson === index && (
                    <div className="lesson-details">

                      <div>
                        <span>
                          时间
                        </span>
                        {startTime} - {endTime}
                      </div>

                      <div>
                        <span>
                          周
                        </span>
                        {lesson.weeks}
                      </div>

                      <div>
                        <span>
                          教室
                        </span>
                        {lesson.classroom}
                      </div>

                      <div>
                        <span>
                          老师
                        </span>
                        {lesson.teacher}
                      </div>

                      <div>
                        <span>
                          课程
                        </span>
                        {lesson.courseCode}
                      </div>

                      <div>
                        <span>
                          班级
                        </span>
                        {lesson.className}
                      </div>

                      {lesson.note && (
                        <div>
                          <span>
                            备注
                          </span>
                          {lesson.note}
                        </div>
                      )}

                    </div>
                  )}

                </div>

              </div>
            )
          }
        )}

      </main>

    </div>
  )
}

export default App
