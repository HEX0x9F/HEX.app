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

  const [isNextLessonOpen, setIsNextLessonOpen] = useState(false)

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

  const getLessonsForDate = (date) => {
    const week = getWeekNumber(date)
    const dayKey = dayKeys[date.getDay()]
    console.log('CHECK DAY:', dayKey, schedule[dayKey], Array.isArray(schedule[dayKey]))

    return sortLessonsByPeriod(
      (schedule[dayKey] || []).filter((lesson) => {
        const match = lesson.weeks.match(/(\d+)-(\d+)周/)

        if (!match) return true

        return (
          week >= Number(match[1]) && 
          week <= Number(match[2])
        )
      })
    )
  }

  let upcomingLesson 
  let upcomingLessonAt = null

  if (!isToday) {
    upcomingLesson = lessons[0] ?? null
  } else {
    const nowSeconds =
      currentTime.getHours() * 3600 + 
      currentTime.getMinutes() * 60 +
      currentTime.getSeconds()

    upcomingLesson = lessons.find((lesson) => {
      const [firstPeriod] = getLessonPeriodRange(lesson)
      const startTime = bellTimes[firstPeriod]?.[0]

      if (!startTime) return false

      const [hour, minute] = startTime.split(':').map(Number)
      const startSeconds = hour * 3600 + minute * 60

      return (
        startSeconds > nowSeconds &&
        lesson !== currentLesson &&
        lesson !== internalBreakLesson
      )
    }) ?? null

    if (upcomingLesson) {
      const [firstPeriod] = getLessonPeriodRange(upcomingLesson)
      const [hour, minute] = bellTimes[firstPeriod][0]
        .split(':')
        .map(Number)

      upcomingLessonAt = new Date(currentTime)
      upcomingLessonAt.setHours(hour,minute, 0, 0)
    } else {
      for (let offset = 1; offset <= 7; offset += 1) {
        const date = new Date(currentTime)
        date.setDate(date.getDate() + offset)

        const nextDayLessons = getLessonsForDate(date)

        if (nextDayLessons.length === 0) continue

        upcomingLesson = nextDayLessons[0]

        const [firstPeriod] = 
          getLessonPeriodRange(upcomingLesson)

        const [hour, minute] = bellTimes[firstPeriod][0]
          .split(':')
          .map(Number)

        date.setHours(hour, minute, 0, 0)
        upcomingLessonAt = date
        break
      }
    }
  }

  const upcomingSeconds = upcomingLessonAt
    ? Math.max(
      0,
      Math.floor(
        (upcomingLessonAt.getTime() - currentTime.getTime()) /
          1000
      )
    )
  : null

  return (
    <div className="app">

      <header className="header">
        <div className="header-main">
          <p className="subtitle">
            HEX.APP <span> / </span> 课程管理系统
          </p>

          <h1>
            {getSelectedWeekDate(
              selectedDay,
              selectedWeekStart
            ).toLocaleDateString('zh-CH', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h1>

          <p className="header-description">
            我的课程表
            <span> · </span>
            {selectedWeek} 周
            <span className="header-translation">
              ({selectedWeek} неделя)
            </span>
          </p>
        </div>

        <div className="header-clock">
          <span className="header-clock-label">
            北京时间
          </span>

          <div className="current-time">
            {currentTime.toLocaleTimeString(
              'zh-CH',
              {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }
            )}
          </div>

          <span className="header-clock-status">
            <span className="status-indicator"></span>
            实时更新
          </span>
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
          aria-label="上一周"
          title="上一周"
          onClick={() => {
            setSelectedWeek((week) => 
              Math.max(1, week - 1)
            )
            setSelectedDay('monday')
            setExpandedLesson(null)
          }}
        >
          ←
        </button>

        <strong>
          第 {selectedWeek} 周
        </strong>

        <button
          aria-label="下一周"
          title="下一周"
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
            正在上课
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
                距离下课
              </span>

              <div className="countdown-time">

                <div className="countdown-unit">
                  <strong>
                    {Math.floor(secondsLeft / 60)}
                  </strong>
                  <span>分</span>
                </div>

                <div className="countdown-separator">
                  :
                </div>

                <div className="countdown-unit">
                  <strong>
                    {String(secondsLeft % 60).padStart(2, '0')}
                  </strong>
                  <span>秒</span>
                </div>
                </div>
              </div>
            )}
         
         </div>
      )}

      {upcomingLesson && (
        <>
          <button
            type="button"
            className="next-lesson-trigger"
            onClick={() => setIsNextLessonOpen((open) => !open)}
          >
            <span className="next-lesson-trigger-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 11h18" />
                  <path d="M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01" />
                </svg>
            </span>

            <span className="next-lesson-trigger-copy">
              <strong>下一节课</strong>
              <small>点击查看详情</small>
            </span>

            <span className="next-lesson-trigger-arrow">›</span>
            </button>

            {isNextLessonOpen && (

              <div
                className="next-lesson-modal-backdrop"
                onClick={() => setIsNextLessonOpen(false)}
                
              >
                <section
                  className="next-lesson-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="next-lesson-modal-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="next-lesson-modal-close"
                    onClick={() => setIsNextLessonOpen(false)}
                    aria-label="关闭窗口"
                  >
                    ×
                  </button>

                  <span className="next-lesson-modal-label">下一节课</span>
                  <h2 id="next-lesson-modal-title">
                    {upcomingLesson.subject}
                  </h2>

                  <p className="next-lesson-modal-translation">
                    {upcomingLesson.russian}
                  </p>

                  <div className="next-lesson-modal-details">
                    <div>
                      <span>教室</span>
                      <strong>{upcomingLesson.classroom || '未指定'}</strong>
                    </div>

                    <div>
                      <span>开始时间</span>
                      <strong>
                        {bellTimes[getLessonPeriodRange(upcomingLesson)[0]]?.[0] || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>结束时间</span>
                      <strong>
                        {bellTimes[getLessonPeriodRange(upcomingLesson)[1]]?.[1] || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>距离开始</span>
                      <strong>
                        {upcomingSeconds !== null
                          ? `${Math.floor(upcomingSeconds / 60)}:${String(
                              upcomingSeconds % 60
                          ).padStart(2, '0')}`
                          : '—'}
                        
                      </strong>
                    </div>
                  </div>
                </section>
              </div> 
            )}
            </>
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
