export class Calendar {
  constructor(datePickerId, calendarId, legendId) {
    this.datePicker = document.getElementById(datePickerId)
    this.calendarDiv = document.getElementById(calendarId)
    this.legendDiv = document.getElementById(legendId)

    // API Configuration - Relative path so it works both locally and on production
    this.apiUrl = '/api/allocations'

    // Data for the people/colors
    this.people = [
      {
        id: 'sylvie',
        name: 'Sylvie',
        class: 'bg-sylvie',
        swatchClass: 'swatch-sylvie',
      },
      {
        id: 'evelyne',
        name: 'Evelyne',
        class: 'bg-evelyne',
        swatchClass: 'swatch-evelyne',
      },
      {
        id: 'francoise',
        name: 'Françoise',
        class: 'bg-francoise',
        swatchClass: 'swatch-francoise',
      },
      {
        id: 'marie-claire',
        name: 'Marie-Claire',
        class: 'bg-marie-claire',
        swatchClass: 'swatch-marie-claire',
      },
      {
        id: 'nathalie',
        name: 'Nathalie',
        class: 'bg-nathalie',
        swatchClass: 'swatch-nathalie',
      },
    ]

    this.selectedPerson = null
    // Store allocations: key="YYYY-MM-DD", value=personId
    this.allocations = new Map()
    this.loadAllocations()

    this.initLegend()
    this.datePicker.addEventListener('input', () => this.renderCalendar())
    this.renderCalendar()
  }

  async loadAllocations() {
    try {
      const response = await fetch(this.apiUrl)
      if (!response.ok) throw new Error('Network response was not ok')

      const parsed = await response.json()

      if (Array.isArray(parsed)) {
        const validEntries = parsed.filter(([key, value]) => {
          const isValidKey =
            typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key)
          const isValidPerson = this.people.some((p) => p.id === value)
          return isValidKey && isValidPerson
        })
        this.allocations = new Map(validEntries)
        this.renderCalendar()
      }
    } catch (e) {
      console.error('Failed to load allocations:', e)
      this.allocations = new Map()
    }
  }

  async saveAllocation(date, personId) {
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, personId }),
      })
    } catch (e) {
      console.error('Failed to save allocation:', e)
    }
  }

  async deleteAllocation(date) {
    try {
      await fetch(this.apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
    } catch (e) {
      console.error('Failed to delete allocation:', e)
    }
  }

  initLegend() {
    this.legendDiv.innerHTML = ''

    this.people.forEach((person) => {
      const item = document.createElement('div')
      item.className = 'legend-item'
      item.dataset.id = person.id

      const swatch = document.createElement('div')
      swatch.className = `color-swatch ${person.swatchClass}`

      const name = document.createElement('span')
      name.textContent = person.name

      item.appendChild(swatch)
      item.appendChild(name)

      item.addEventListener('click', () => {
        // Deselect logic if clicking the same one, or select new one
        if (this.selectedPerson === person) {
          this.selectedPerson = null
          item.classList.remove('active')
        } else {
          // Remove active class from all
          this.legendDiv
            .querySelectorAll('.legend-item')
            .forEach((el) => el.classList.remove('active'))

          // Activate clicked one
          this.selectedPerson = person
          item.classList.add('active')
        }
      })

      this.legendDiv.appendChild(item)
    })
  }

  generateCalendar(year, month) {
    const calendar = []
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const daysInMonth = lastDayOfMonth.getDate()
    let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7

    let currentWeek = []

    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        calendar.push(currentWeek)
        currentWeek = []
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      calendar.push(currentWeek)
    }

    return calendar
  }

  renderCalendar() {
    let year, month

    if (!this.datePicker.value) {
      const today = new Date()
      year = today.getFullYear()
      month = today.getMonth()

      const formattedMonth = (month + 1).toString().padStart(2, '0')
      this.datePicker.value = `${year}-${formattedMonth}`
    } else {
      const [y, m] = this.datePicker.value.split('-').map(Number)
      year = y
      month = m - 1
    }

    const calendarData = this.generateCalendar(year, month)

    this.calendarDiv.innerHTML = ''

    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    daysOfWeek.forEach((day) => {
      const header = document.createElement('div')
      header.textContent = day
      header.classList.add('day-header')
      this.calendarDiv.appendChild(header)
    })

    calendarData.forEach((week) => {
      week.forEach((day) => {
        const cell = document.createElement('div')

        if (day) {
          cell.textContent = day
          cell.classList.add('day-cell')

          // Unique key for this specific date: YYYY-MM-DD
          // Pad month and day to ensure correct string format
          const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${day
            .toString()
            .padStart(2, '0')}`

          // Check if this day is already allocated
          if (this.allocations.has(key)) {
            const personId = this.allocations.get(key)
            const person = this.people.find((p) => p.id === personId)
            if (person) {
              cell.classList.add(person.class)
            }
          }

          // Click event to assign color
          cell.addEventListener('click', () => {
            if (!this.selectedPerson) return // Do nothing if no one selected

            // Toggle logic: if already this person, remove it. If different or empty, set it.
            if (this.allocations.get(key) === this.selectedPerson.id) {
              this.allocations.delete(key)
              cell.classList.remove(this.selectedPerson.class)
              this.deleteAllocation(key) // Call API
            } else {
              // Remove any existing person class first
              this.people.forEach((p) => cell.classList.remove(p.class))

              // Add new assignment
              this.allocations.set(key, this.selectedPerson.id)
              cell.classList.add(this.selectedPerson.class)
              this.saveAllocation(key, this.selectedPerson.id) // Call API
            }
          })
        } else {
          cell.classList.add('empty-cell')
        }

        this.calendarDiv.appendChild(cell)
      })
    })
  }
}
