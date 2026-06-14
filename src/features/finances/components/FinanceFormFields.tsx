import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-xs text-fg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all'

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-fg-dim tracking-wide uppercase">{children}</label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={inputClass + ' min-h-[5rem] resize-y'}
      {...props}
    />
  )
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const options = React.Children.toArray(props.children)
    .map((child: any) => {
      if (child && child.type === 'option') {
        return { value: child.props.value, label: child.props.children }
      }
      return null
    })
    .filter(Boolean) as { value: string | number | readonly string[] | undefined; label: React.ReactNode }[]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value == props.value) || options[0]

  const handleChange = (val: string | number | readonly string[] | undefined) => {
    if (props.onChange) {
      props.onChange({ target: { value: val } } as React.ChangeEvent<HTMLSelectElement>)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={props.disabled}
        className={`${inputClass} flex w-full items-center justify-between text-left ${
          props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50 hover:bg-fg/5 shadow-sm'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption?.value === "" ? "text-fg-muted" : "text-fg"}>
          {selectedOption ? selectedOption.label : t('finances.form.select')}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-4 w-4 text-fg-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && !props.disabled && (
        <div className="luna-select-menu absolute left-0 top-full z-[999] mt-1.5 w-full animate-in fade-in zoom-in-95 duration-150">
          <ul className="max-h-60 overflow-auto p-1.5 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent">
            {options.map((option, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
                    props.value == option.value
                      ? 'bg-accent/10 text-accent'
                      : 'text-fg hover:bg-fg/5'
                  }`}
                  onClick={() => handleChange(option.value)}
                >
                  {option.label}
                  {props.value == option.value && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function DateInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [viewDate, setViewDate] = useState(() => {
    return props.value ? new Date(props.value as string + 'T12:00:00') : new Date()
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleChange = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const val = `${yyyy}-${mm}-${dd}`
    if (props.onChange) {
      props.onChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)
    }
    setIsOpen(false)
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))

  const selectedDate = props.value ? new Date(props.value as string + 'T12:00:00') : null
  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString(i18n.language)
    : t('finances.form.selectDate')

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={props.disabled}
        className={`${inputClass} flex w-full items-center justify-between text-left ${
          props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50 hover:bg-fg/5 shadow-sm'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={props.value ? "text-fg" : "text-fg-muted"}>{displayValue}</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-fg-muted">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </button>

      {isOpen && !props.disabled && (
        <div className="luna-select-menu absolute right-0 top-full z-[999] mt-1.5 w-[260px] p-3 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
          <div className="flex items-center justify-between mb-3">
            <button type="button" className="flex h-6 w-6 items-center justify-center hover:bg-fg/10 rounded-lg text-fg transition-colors" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
            </button>
            <span className="text-xs font-bold text-fg capitalize">{viewDate.toLocaleDateString(i18n.language, {month: 'long', year: 'numeric'})}</span>
            <button type="button" className="flex h-6 w-6 items-center justify-center hover:bg-fg/10 rounded-lg text-fg transition-colors" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="text-[10px] font-semibold text-fg-muted">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              if (!date) return <div key={i} />
              const isSelected = selectedDate?.getDate() === date.getDate() && selectedDate?.getMonth() === date.getMonth() && selectedDate?.getFullYear() === date.getFullYear()
              const isToday = new Date().getDate() === date.getDate() && new Date().getMonth() === date.getMonth() && new Date().getFullYear() === date.getFullYear()
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChange(date)}
                  className={`h-7 w-7 rounded-full text-xs transition-all flex items-center justify-center ${
                    isSelected ? 'bg-accent text-white font-bold shadow-md shadow-accent/20' : 
                    isToday ? 'bg-accent/10 text-accent font-bold' : 
                    'text-fg hover:bg-fg/10 hover:scale-110'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-line pt-3">
            <button type="button" className="rounded px-2 py-1 text-[10px] font-semibold text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors" onClick={() => { if(props.onChange) props.onChange({target:{value:''}} as any); setIsOpen(false) }}>{t('finances.form.clear')}</button>
            <button type="button" className="rounded px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/10 hover:text-accent-hover transition-colors" onClick={() => handleChange(new Date())}>{t('finances.form.today')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CreatableCategorySelect(props: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: React.ReactNode; name: string }[]
  onCreateCategory: (name: string) => string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = props.options.find((o) => o.value === props.value)
  const filteredOptions = props.options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
  const canCreate = search.trim().length > 0 && !props.options.some(o => o.name.toLowerCase() === search.trim().toLowerCase())

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={props.disabled}
        className={`${inputClass} flex w-full items-center justify-between text-left ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50 hover:bg-fg/5 shadow-sm'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={props.value ? "text-fg" : "text-fg-muted"}>{selectedOption ? selectedOption.label : t('finances.form.categorySearch')}</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`h-4 w-4 text-fg-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>

      {isOpen && !props.disabled && (
        <div className="luna-select-menu absolute left-0 top-full z-[999] mt-1.5 w-full animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-line bg-surface">
            <input 
              autoFocus
              type="text" 
              placeholder={t('finances.form.categoryPlaceholder')}
              className="w-full bg-transparent text-sm outline-none text-fg placeholder:text-fg-muted"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <ul className="max-h-52 overflow-auto p-1.5 scrollbar-thin">
            {filteredOptions.map((option, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${props.value === option.value ? 'bg-accent/10 text-accent' : 'text-fg hover:bg-fg/5'}`}
                  onClick={() => { props.onChange(option.value); setIsOpen(false); setSearch('') }}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {canCreate && (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-all"
                  onClick={() => {
                    const newId = props.onCreateCategory(search.trim())
                    props.onChange(newId)
                    setIsOpen(false)
                    setSearch('')
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                  {t('finances.form.createTag', { name: search.trim() })}
                </button>
              </li>
            )}
            {filteredOptions.length === 0 && !canCreate && (
              <li className="px-3 py-4 text-center text-xs text-fg-muted">{t('finances.form.noCategory')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export { inputClass }
