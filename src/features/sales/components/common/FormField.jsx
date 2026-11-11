export default function FormField({
  label,
  id,
  name,
  required = false,
  error = null,
  helperText = null,
  children,
  className = '',
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  ...rest
}) {
  const inputId = id || name || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className={`form-field-group ${className} ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="form-control-wrap">
        {children || (
          <input
            id={inputId}
            name={name}
            type={type}
            value={value !== undefined ? value : ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="form-input"
            {...rest}
          />
        )}
      </div>
      {error && <span className="form-error-msg">{error}</span>}
      {!error && helperText && <span className="form-helper-msg">{helperText}</span>}
    </div>
  );
}
