import { useId } from 'react'
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react'

/* ------------------------------------------------------------------ */
/* FormField: wraps a control with a VISIBLE label, hint, and error.  */
/* Visible labels are mandatory -- never placeholder-only.            */
/* ------------------------------------------------------------------ */

interface FormFieldRenderArgs {
  id: string
  ariaDescribedBy?: string
  ariaInvalid: boolean
}

interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  id?: string
  children: (args: FormFieldRenderArgs) => ReactNode
}

export function FormField({
  label,
  required,
  hint,
  error,
  id,
  children,
}: FormFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const ariaDescribedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={`form-field${error ? ' form-field--invalid' : ''}`}>
      <label className="form-field__label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <span id={`${fieldId}-hint`} className="form-field__hint">
          {hint}
        </span>
      )}
      {children({ id: fieldId, ariaDescribedBy, ariaInvalid: Boolean(error) })}
      {error && (
        <span id={`${fieldId}-error`} className="form-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'required' | 'aria-invalid' | 'aria-describedby'
>

export interface TextFieldProps extends InputProps {
  label: string
  name: string
  required?: boolean
  hint?: string
  error?: string
}

export function TextField(props: TextFieldProps) {
  const { label, name, required, hint, error, ...rest } = props
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      {({ id, ariaDescribedBy, ariaInvalid }) => (
        <input
          {...rest}
          id={id}
          name={name}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      )}
    </FormField>
  )
}

/* ------------------------------------------------------------------ */

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'name' | 'required' | 'aria-invalid' | 'aria-describedby'
>

export interface SelectFieldProps extends SelectProps {
  label: string
  name: string
  required?: boolean
  hint?: string
  error?: string
  options: ReadonlyArray<{ value: string; label: string }>
}

export function SelectField(props: SelectFieldProps) {
  const { label, name, required, hint, error, options, ...rest } = props
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      {({ id, ariaDescribedBy, ariaInvalid }) => (
        <select
          {...rest}
          id={id}
          name={name}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  )
}

/* ------------------------------------------------------------------ */

type TextareaProps = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  | 'placeholder'
  | 'rows'
  | 'value'
  | 'onChange'
  | 'autoComplete'
  | 'readOnly'
  | 'disabled'
>

export interface TextareaFieldProps extends TextareaProps {
  label: string
  name: string
  required?: boolean
  hint?: string
  error?: string
}

export function TextareaField(props: TextareaFieldProps) {
  const { label, name, required, hint, error, ...rest } = props
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      {({ id, ariaDescribedBy, ariaInvalid }) => (
        <textarea
          {...rest}
          id={id}
          name={name}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      )}
    </FormField>
  )
}