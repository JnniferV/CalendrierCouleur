const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export class Calendar {
  constructor(datePickerId, calendarId, legendId, formId, commentsId) {
    [this.datePicker, this.calendarDiv, this.legendDiv, this.form, this.commentsList] =
      [datePickerId, calendarId, legendId, formId, commentsId].map((id) => document.getElementById(id))

    this.people = new Map() // id -> {id, name, color}, chargée une seule fois
    this.selectedPerson = null
    this.allocations = {} // "YYYY-MM-DD" -> personId
    this.comments = []

    const today = new Date()
    this.datePicker.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    this.datePicker.addEventListener('input', () => this.load())
    this.form.day.addEventListener('input', () => this.renderCalendar())
    this.form.addEventListener('submit', (e) => this.addComment(e))
    this.renderCalendar() // les jours s'affichent sans attendre la base
    this.load()
  }

  async request(url, method = 'GET', body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  }

  async load() {
    const month = this.datePicker.value
    if (!month) return
    try {
      const data = await (await this.request(`/api/month/${month}`)).json()
      if (month !== this.datePicker.value) return // réponse périmée (mois changé entre-temps)
      if (!this.people.size) this.people = this.initPeople(data.people)
      this.allocations = data.allocations
      this.comments = data.comments
      this.renderCalendar()
      this.renderComments()
    } catch (e) {
      console.error('Chargement impossible :', e)
      this.commentsList.replaceChildren(this.el('li', 'comment', 'Base de données injoignable : données non chargées.'))
    }
  }

  el(tag, className, text = '') {
    const node = document.createElement(tag)
    node.className = className
    node.textContent = text
    return node
  }

  swatch(color) {
    const node = this.el('span', 'color-swatch')
    node.style.backgroundColor = color
    return node
  }

  initPeople(people) {
    this.form.personId.append(...people.map((p) => new Option(p.name, p.id)))
    const items = people.map((p) => {
      const item = this.el('div', 'legend-item')
      item.append(this.swatch(p.color), this.el('span', '', p.name))
      item.addEventListener('click', () => {
        this.selectedPerson = this.selectedPerson === p.id ? null : p.id
        items.forEach((it, i) => it.classList.toggle('active', people[i].id === this.selectedPerson))
      })
      return item
    })
    this.legendDiv.replaceChildren(...items)
    return new Map(people.map((p) => [p.id, p]))
  }

  renderCalendar() {
    const [year, month] = this.datePicker.value.split('-').map(Number)
    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month, 0).getDate()

    this.calendarDiv.replaceChildren(
      ...DAYS.map((d) => this.el('div', 'day-header', d)),
      ...Array.from({ length: offset }, () => this.el('div', 'empty-cell')),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        this.dayCell(`${this.datePicker.value}-${String(i + 1).padStart(2, '0')}`, i + 1),
      ),
    )
  }

  dayCell(key, day) {
    const cell = this.el('div', 'day-cell', day)
    const person = this.people.get(this.allocations[key])
    if (person) cell.style.backgroundColor = person.color
    cell.classList.toggle('selected', key === this.form.day.value)
    cell.addEventListener('click', () => this.clickDay(key))
    return cell
  }

  clickDay(key) {
    this.form.day.value = key
    if (this.selectedPerson) {
      // Même personne = décocher, sinon (re)colorier
      const personId = this.allocations[key] === this.selectedPerson ? null : this.selectedPerson
      if (personId) this.allocations[key] = personId
      else delete this.allocations[key]
      this.request(`/api/allocations/${key}`, personId ? 'PUT' : 'DELETE', { personId })
        .catch(() => this.load()) // échec : resynchronise avec la base
    }
    this.renderCalendar()
  }

  renderComments() {
    this.commentsList.replaceChildren(
      ...this.comments.map((c) => {
        const person = this.people.get(c.person_id)
        const head = this.el('div', 'comment-head')
        head.append(
          this.swatch(person.color),
          this.el('strong', '', person.name),
          ` · ${c.day.split('-').reverse().join('/')} · écrit le ${new Date(c.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`,
        )
        const li = this.el('li', 'comment')
        li.append(head, this.el('p', '', c.message))
        return li
      }),
    )
  }

  async addComment(e) {
    e.preventDefault()
    const { day, personId, message } = this.form
    try {
      await this.request('/api/comments', 'POST', { day: day.value, personId: Number(personId.value), message: message.value })
      message.value = ''
      this.datePicker.value = day.value.slice(0, 7) // affiche le mois du commentaire
      this.load()
    } catch (err) {
      console.error(err)
      alert("Le commentaire n'a pas pu être enregistré.")
    }
  }
}
