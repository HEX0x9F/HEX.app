import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLessonPeriodDurations,
  getScheduleState,
} from './scheduleTime.js'

function time(hour, minute, second = 0) {
  return new Date(2026, 9, 13, hour, minute, second)
}

const eveningLesson = {
  subject: 'Combined lesson',
  periods: '10-11',
}

test('counts down only to the end of the active period', () => {
  const state = getScheduleState([eveningLesson], time(20, 30), true)

  assert.equal(state.secondsLeft, 45 * 60)
  assert.equal(state.lessonProgress, 0)
  assert.equal(state.periodProgress, 0)
})

test('reports total lesson and current-period progress independently', () => {
  const state = getScheduleState([eveningLesson], time(21, 0), true)

  assert.equal(state.lessonProgress, 33)
  assert.equal(state.periodProgress, 67)
  assert.equal(state.secondsLeft, 15 * 60)
})

test('shows the internal break and freezes overall progress at one half', () => {
  const state = getScheduleState([eveningLesson], time(21, 15), true)
  const endOfBreak = getScheduleState(
    [eveningLesson],
    time(21, 19, 59),
    true
  )

  assert.equal(state.currentLesson, null)
  assert.equal(state.internalBreakLesson, eveningLesson)
  assert.equal(state.nextLesson, eveningLesson)
  assert.equal(state.dayStatus, 'internal-break')
  assert.equal(state.secondsUntilNextLesson, 5 * 60)
  assert.equal(state.lessonProgress, 50)
  assert.equal(endOfBreak.secondsUntilNextLesson, 1)
})

test('starts the next period at one-half progress and ends at full progress', () => {
  const secondPeriod = getScheduleState([eveningLesson], time(21, 20), true)
  const finalMinute = getScheduleState(
    [eveningLesson],
    time(22, 4, 59),
    true
  )
  const lessonEnd = getScheduleState([eveningLesson], time(22, 5), true)

  assert.equal(secondPeriod.currentPeriod, 11)
  assert.equal(secondPeriod.lessonProgress, 50)
  assert.equal(secondPeriod.periodProgress, 0)
  assert.equal(secondPeriod.secondsLeft, 45 * 60)
  assert.equal(
    getScheduleState([eveningLesson], time(21, 14, 59), true).secondsLeft,
    1
  )
  assert.equal(finalMinute.lessonProgress, 100)
  assert.equal(lessonEnd.currentLesson, null)
  assert.equal(lessonEnd.secondsLeft, null)
  assert.equal(lessonEnd.dayStatus, 'finished')
})

test('finds the next class after a regular break when periods are skipped', () => {
  const laterLesson = { subject: 'Later', periods: '12-12' }
  const earlierLesson = { subject: 'Earlier', periods: '10-10' }
  const state = getScheduleState(
    [laterLesson, earlierLesson],
    time(21, 15),
    true
  )

  assert.equal(state.dayStatus, 'break')
  assert.equal(state.nextLesson, laterLesson)
  assert.equal(state.secondsUntilNextLesson, 55 * 60)
})

test('orders lessons by period and chooses the next lesson across a skipped period', () => {
  const earlierLesson = { subject: 'Earlier', periods: '10-10' }
  const laterLesson = { subject: 'Later', periods: '12-12' }
  const state = getScheduleState(
    [laterLesson, earlierLesson],
    time(21, 15),
    true
  )

  assert.equal(state.dayStatus, 'break')
  assert.equal(state.nextLesson, laterLesson)
  assert.equal(state.secondsUntilNextLesson, 55 * 60)
})

test('does not report a current lesson when viewing another day', () => {
  const state = getScheduleState([eveningLesson], time(20, 45), false)

  assert.equal(state.currentPeriod, null)
  assert.equal(state.currentLesson, null)
  assert.equal(state.internalBreakLesson, null)
  assert.equal(state.dayStatus, 'before')
})

test('derives displayed duration from the bell-time periods', () => {
  assert.deepEqual(getLessonPeriodDurations('10-11'), [45, 45])
  assert.deepEqual(getLessonPeriodDurations('10'), [45])
})
