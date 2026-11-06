import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'

interface LeadTagInputProps {
  id: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  ariaLabel?: string
}

/**
 * Accessible multi-value tag field. Employees can press Enter or comma to add a
 * tag, or use the Add button. Each value is stored separately so the profile can
 * show products, requirements and preferences as individual tags.
 */
export function LeadTagInput({ id, values, onChange, placeholder, ariaLabel }: LeadTagInputProps) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const next = draft.trim().replace(/,$/, '')
    if (!next) return
    if (!values.some((value) => value.toLowerCase() === next.toLowerCase())) {
      onChange([...values, next])
    }
    setDraft('')
  }

  const remove = (value: string) => onChange(values.filter((item) => item !== value))

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add()
    }
    if (event.key === 'Backspace' && !draft && values.length) {
      remove(values[values.length - 1])
    }
  }

  return (
    <div className="tag-input">
      {values.length ? (
        <div className="tag-input__values">
          {values.map((value) => (
            <span className="tag-chip" key={value}>
              {value}
              <button type="button" onClick={() => remove(value)} aria-label={`Remove ${value}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="tag-input__entry">
        <input
          id={id}
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder={placeholder ?? 'Type a value and press Enter'}
          aria-label={ariaLabel ?? placeholder ?? 'Add a tag'}
        />
        <button type="button" className="tag-input__add" onClick={add} aria-label="Add value">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
