import { useState } from 'react'
import './ChecklistForm.css'

const initialState = {
  site_name: '',
  blast_id: '',
  temperature_c: '',
  rainfall_mm: '',
  wind_speed_kmh: '',
  lightning_warning: false,
  blast_date: '',
  blast_time: '',
  supervisor_available: true,
  blasting_officer_available: true,
  worker_count: '',
  max_safe_worker_count: '',
  workers_in_exclusion_zone: false,
  safety_briefing_completed: true,
  detonators_secure: true,
  siren_working: true,
  communication_working: true,
  emergency_vehicle_available: true,
  exclusion_zone_established: true,
  barricades_in_place: true,
  blast_design_approved: true,
  escape_route_clear: true,
  additional_notes: '',
}

function Section({ title, children }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      <div className="form-grid">{children}</div>
    </fieldset>
  )
}

function NumberField({ label, name, value, onChange, required = true, ...rest }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" name={name} value={value} onChange={onChange} required={required} {...rest} />
    </label>
  )
}

function ToggleField({ label, name, value, onChange }) {
  return (
    <label className="toggle-field">
      <span>{label}</span>
      <button
        type="button"
        className={`toggle ${value ? 'on' : 'off'}`}
        aria-pressed={value}
        onClick={() => onChange({ target: { name, type: 'checkbox', checked: !value } })}
      >
        <span className="toggle-knob" />
        <span className="toggle-text">{value ? 'YES' : 'NO'}</span>
      </button>
    </label>
  )
}

export default function ChecklistForm({ onResult, apiSubmit }) {
  const [form, setForm] = useState(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, type, checked, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        temperature_c: Number(form.temperature_c),
        rainfall_mm: Number(form.rainfall_mm),
        wind_speed_kmh: Number(form.wind_speed_kmh),
        worker_count: Number(form.worker_count),
        max_safe_worker_count: form.max_safe_worker_count ? Number(form.max_safe_worker_count) : null,
        additional_notes: form.additional_notes || null,
      }
      const result = await apiSubmit(payload)
      onResult(result)
    } catch (err) {
      setError(err.message || 'Something went wrong submitting the checklist.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="checklist-form" onSubmit={handleSubmit}>
      <Section title="Site Identification">
        <label className="field">
          <span>Site Name</span>
          <input type="text" name="site_name" value={form.site_name} onChange={handleChange} required minLength={2} />
        </label>
        <label className="field">
          <span>Blast ID</span>
          <input type="text" name="blast_id" value={form.blast_id} onChange={handleChange} required />
        </label>
      </Section>

      <Section title="Weather">
        <NumberField label="Temperature (°C)" name="temperature_c" value={form.temperature_c} onChange={handleChange} step="0.1" />
        <NumberField label="Rainfall (mm)" name="rainfall_mm" value={form.rainfall_mm} onChange={handleChange} step="0.1" min="0" />
        <NumberField label="Wind Speed (km/h)" name="wind_speed_kmh" value={form.wind_speed_kmh} onChange={handleChange} step="0.1" min="0" />
        <ToggleField label="Lightning Warning Active" name="lightning_warning" value={form.lightning_warning} onChange={handleChange} />
      </Section>

      <Section title="Shift">
        <label className="field">
          <span>Blast Date</span>
          <input type="date" name="blast_date" value={form.blast_date} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Blast Time</span>
          <input type="time" name="blast_time" value={form.blast_time} onChange={handleChange} required />
        </label>
        <ToggleField label="Supervisor Available" name="supervisor_available" value={form.supervisor_available} onChange={handleChange} />
        <ToggleField label="Blasting Officer Available" name="blasting_officer_available" value={form.blasting_officer_available} onChange={handleChange} />
      </Section>

      <Section title="Workforce">
        <NumberField label="Worker Count" name="worker_count" value={form.worker_count} onChange={handleChange} min="0" />
        <NumberField label="Max Safe Worker Count" name="max_safe_worker_count" value={form.max_safe_worker_count} onChange={handleChange} required={false} min="1" />
        <ToggleField label="Workers Inside Exclusion Zone" name="workers_in_exclusion_zone" value={form.workers_in_exclusion_zone} onChange={handleChange} />
        <ToggleField label="Safety Briefing Completed" name="safety_briefing_completed" value={form.safety_briefing_completed} onChange={handleChange} />
      </Section>

      <Section title="Equipment">
        <ToggleField label="Detonators Secure" name="detonators_secure" value={form.detonators_secure} onChange={handleChange} />
        <ToggleField label="Warning Siren Working" name="siren_working" value={form.siren_working} onChange={handleChange} />
        <ToggleField label="Communication Working" name="communication_working" value={form.communication_working} onChange={handleChange} />
        <ToggleField label="Emergency Vehicle Available" name="emergency_vehicle_available" value={form.emergency_vehicle_available} onChange={handleChange} />
      </Section>

      <Section title="Site">
        <ToggleField label="Exclusion Zone Established" name="exclusion_zone_established" value={form.exclusion_zone_established} onChange={handleChange} />
        <ToggleField label="Barricades In Place" name="barricades_in_place" value={form.barricades_in_place} onChange={handleChange} />
        <ToggleField label="Blast Design Approved" name="blast_design_approved" value={form.blast_design_approved} onChange={handleChange} />
        <ToggleField label="Escape Route Clear" name="escape_route_clear" value={form.escape_route_clear} onChange={handleChange} />
      </Section>

      <Section title="Notes">
        <label className="field field-wide">
          <span>Additional Notes (optional)</span>
          <textarea name="additional_notes" value={form.additional_notes} onChange={handleChange} rows={3} maxLength={2000} />
        </label>
      </Section>

      {error && <div className="form-error" role="alert">{error}</div>}

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'EVALUATING…' : 'RUN SAFETY EVALUATION'}
      </button>
    </form>
  )
}
