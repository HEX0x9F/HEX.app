import { useState, useEffect, useRef } from 'react'
import schedule from './schedule'
import {
  bellTimes,
  getLessonPeriodDurations,
  getLessonPeriodRange,
  getScheduleState,
  sortLessonsByPeriod,
} from './scheduleTime'
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

const semesterStart = new Date(
  '2026-08-31T00:00:00'
)

function getWeekNumber(date) {
  const dateInUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const semesterStartInUtc = Date.UTC(
    semesterStart.getFullYear(),
    semesterStart.getMonth(),
    semesterStart.getDate()
  )

  return Math.floor(
    (dateInUtc - semesterStartInUtc) /
      (7 * 24 * 60 * 60 * 1000)
  ) + 1
}

function getSelectedWeekDate(dayKey, weekStart) {
  const date = new Date(weekStart)
  const selectedDayIndex = days.findIndex(
    (day) => day.key === dayKey
  )

  date.setDate(
    weekStart.getDate() + selectedDayIndex
  )

  return date
}

function LessonProgress({
  lesson,
  lessonProgress,
}) {
  const duration = getLessonPeriodDurations(lesson.periods)

  return (
    <div className="lesson-progress">
      <div className="lesson-progress-header">
        <span>ПРОГРЕСС ПАРЫ</span>
        <strong>
          {lessonProgress}% · {duration.reduce((sum, duration) => sum + duration, 0)} мин
        </strong>
      </div>

      <div className="lesson-progress-bar">
        <div
          className="lesson-progress-fill"
          style={{ width: `${lessonProgress}%` }}
        />
      </div>

    </div>
  )
}

function App() {
  const [expandedLesson, setExpandedLesson] =
    useState(null)

  const [currentTime, setCurrentTime] =
    useState(new Date())

  const currentWeek = getWeekNumber(currentTime)
  const todayKey = dayKeys[currentTime.getDay()]

  const [selectedDay, setSelectedDay] = useState(
    todayKey
  )

  const previousDayRef = useRef(todayKey)
  const previousWeekRef = useRef(currentWeek)

  const [selectedWeek, setSelectedWeek] =
    useState(currentWeek)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (previousDayRef.current !== todayKey) {
      previousDayRef.current = todayKey
      setSelectedDay(todayKey)
      setExpandedLesson(null)
    }
    if (previousWeekRef.current !== currentWeek) {
      previousWeekRef.current = currentWeek
      setSelectedWeek(currentWeek)
      setExpandedLesson(null)
    }
  }, [currentWeek, todayKey])

  const selectedWeekStart = new Date(semesterStart)
  selectedWeekStart.setDate(
    selectedWeekStart.getDate() + (selectedWeek - 1) * 7
  )
  const selectedWeekEnd = getSelectedWeekDate(
    'sunday',
    selectedWeekStart
  )

  const lessons = sortLessonsByPeriod((
    schedule[selectedDay] || []
  ).filter((lesson) => {
    const match =
      lesson.weeks.match(/(\d+)-(\d+)周/)

    if (!match) return true

    const startWeek = Number(match[1])
    const endWeek = Number(match[2])

    return (
      selectedWeek >= startWeek &&
      selectedWeek <= endWeek
    )
  }))

  const isToday = 
    selectedWeek === currentWeek &&
    selectedDay === todayKey

  const {
    currentPeriod,
    currentLesson,
    internalBreakLesson,
    nextLesson,
    secondsLeft,
    secondsUntilNextLesson,
    lessonProgress,
    periodProgress,
    dayStatus,
  } = getScheduleState(lessons, currentTime, isToday)

  return (
    <div className="app">

      <header className="header">

        <div>
          <p className="subtitle">
            МОЁ РАСПИСАНИЕ · {selectedWeek} НЕДЕЛЯ
          </p>

          <h1>
            {getSelectedWeekDate(
              selectedDay,
              selectedWeekStart
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
          第 {selectedWeek} 周
        </strong>

         <p>
           {selectedWeekStart.toLocaleDateString(
			   'ru-RU',
			   {
				   day: 'numeric',
				   month: 'long',
			   }
			 )}
			
			 {' — '}
			
			 {selectedWeekEnd.toLocaleDateString(
			 	 'ru-RU',
				 {
					 day: 'numeric',
					 month: 'long',
				 }
			   )}
		  </p>
		</div>
      
      <div className="week-switcher">
        <button
          onClick={() => {
			  setSelectedWeek((week) =>
			    Math.max(1, week -1)
			  )
			  setSelectedDay('monday')
			  setExpandedLesson(null)
		  }}
		>
		  ←
		</button>
		
		<strong>
		  {selectedWeek} НЕДЕЛЯ
		</strong>
		
		<button
		  onClick={() => {
			  setSelectedWeek((week) =>
			    Math.min(17, week + 1)
			  )
			  setSelectedDay('monday')
              setExpandedLesson(null)
		  }}
		>
		  →
		</button>
	  </div>
	  
	  <button
	    className="today-button"
	    onClick={() => {
			setSelectedWeek(currentWeek)
			setSelectedDay(todayKey)
			setExpandedLesson(null)
		}}
	   >
	     今天
       </button>

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

          {internalBreakLesson && (
            <LessonProgress
              lesson={internalBreakLesson}
              lessonProgress={lessonProgress}
              periodProgress={null}
            />
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

          <LessonProgress
            lesson={currentLesson}
            lessonProgress={lessonProgress}
            periodProgress={periodProgress}
          />

          {secondsLeft !== null && (
            <div className="countdown">

              <span className="countdown-title">
                ДО КОНЦА УРОКА
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

              {dayStatus == 'before' &&
                secondsUntilNextLesson !== null && (
                  <div className="countdown">
                    <span className="countdown-title">
                      НАЧАЛО ЧЕРЕЗ
                    </span>

                    <div className="countdown-time">
                      <div className="contdown-unit">
                        <strong>
                          {Math.floor(secondsUntilNextLesson / 60)}
                        </strong>
                        <span>мин</span>
                      </div>

                      <div className="countdown-separator">:</div>

                      <div className="countdown-unit">
                        <strong>
                          {String(secondsUntilNextLesson % 60).padStart(2, '0')}
                        </strong>
                        <span>сек</span>
                      </div>
                    </div>
                  </div>
                )}

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

            const [firstPeriod, lastPeriod] =
              getLessonPeriodRange(lesson)

            const isCurrent =
              currentPeriod !== null &&
              firstPeriod <=
                currentPeriod &&
              lastPeriod >=
                currentPeriod

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
