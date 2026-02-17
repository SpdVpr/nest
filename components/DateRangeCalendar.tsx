'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateRangeCalendarProps {
  startDate: Date
  endDate?: Date
  onCheckIn: (date: Date) => void
  onCheckOut: (date: Date) => void
  checkedInDate?: Date
  checkedOutDate?: Date
  onReset?: () => void
}

export default function DateRangeCalendar({
  startDate,
  endDate,
  onCheckIn,
  onCheckOut,
  checkedInDate,
  checkedOutDate,
  onReset,
}: DateRangeCalendarProps) {
  const eventEnd = endDate || startDate
  const [currentMonth, setCurrentMonth] = useState(startDate)

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const monthDays = useMemo(() => {
    const days = []
    const totalDays = daysInMonth(currentMonth)
    const firstDay = firstDayOfMonth(currentMonth)

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i))
    }

    return days
  }, [currentMonth])

  const isDateInEventRange = (date: Date) => {
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const eventStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate())

    return dateStart >= eventStart && dateStart <= eventEndDate
  }

  const isDateInSelection = (date: Date) => {
    if (!checkedInDate || !checkedOutDate) return false

    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const checkInStart = new Date(checkedInDate.getFullYear(), checkedInDate.getMonth(), checkedInDate.getDate())
    const checkOutStart = new Date(checkedOutDate.getFullYear(), checkedOutDate.getMonth(), checkedOutDate.getDate())

    return dateStart >= checkInStart && dateStart < checkOutStart
  }

  const isCheckInDate = (date: Date) => {
    if (!checkedInDate) return false
    return (
      date.getDate() === checkedInDate.getDate() &&
      date.getMonth() === checkedInDate.getMonth() &&
      date.getFullYear() === checkedInDate.getFullYear()
    )
  }

  const isCheckOutDate = (date: Date) => {
    if (!checkedOutDate) return false
    return (
      date.getDate() === checkedOutDate.getDate() &&
      date.getMonth() === checkedOutDate.getMonth() &&
      date.getFullYear() === checkedOutDate.getFullYear()
    )
  }

  const handleDayClick = (date: Date) => {
    if (!isDateInEventRange(date)) return

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const checkInOnly = checkedInDate 
      ? new Date(checkedInDate.getFullYear(), checkedInDate.getMonth(), checkedInDate.getDate())
      : null

    if (!checkedInDate) {
      onCheckIn(dateOnly)
    } else if (!checkedOutDate) {
      if (checkInOnly && dateOnly > checkInOnly) {
        onCheckOut(dateOnly)
      } else if (checkInOnly && dateOnly < checkInOnly) {
        onCheckIn(dateOnly)
      } else if (checkInOnly && dateOnly.getTime() === checkInOnly.getTime()) {
        onReset?.()
      }
    } else {
      onReset?.()
      onCheckIn(dateOnly)
    }
  }

  const monthName = currentMonth.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })
  const daysOfWeek = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-gray-900 capitalize">{monthName}</h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, index) => {
          const isInRange = date && isDateInEventRange(date)
          const isSelected = date && isDateInSelection(date)
          const isCheckIn = date && isCheckInDate(date)
          const isCheckOut = date && isCheckOutDate(date)
          const isDisabled = !isInRange

          return (
            <button
              key={index}
              type="button"
              onClick={() => date && handleDayClick(date)}
              disabled={isDisabled}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-colors
                ${isDisabled ? 'text-gray-300 cursor-not-allowed' : ''}
                ${isCheckIn ? 'bg-green-500 text-white font-bold' : ''}
                ${isCheckOut ? 'bg-red-500 text-white font-bold' : ''}
                ${isSelected && !isCheckIn && !isCheckOut ? 'bg-blue-200 text-gray-900' : ''}
                ${isInRange && !isSelected && !isCheckIn && !isCheckOut ? 'bg-[#efefef] border border-gray-300 hover:bg-gray-100 text-gray-900' : ''}
              `}
            >
              {date && date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p className="mb-2">🟢 Příjezd (check-in) • 🔴 Odjezd (check-out) • 🔵 Vybrané noci</p>
        {checkedInDate && checkedOutDate && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Zvolit znovu
          </button>
        )}
      </div>
    </div>
  )
}
