import type { ChangeEvent } from "react";
import {
  COURSE_RATING_MAX,
  COURSE_RATING_MIN,
  COURSE_RATING_STEP,
  formatCourseRatingDisplay,
  validateCourseRating,
} from "../../lib/courseRating";

type CourseRatingPickerProps = {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string | null;
};

export function CourseRatingPicker({
  value,
  onChange,
  disabled = false,
  error = null,
}: CourseRatingPickerProps) {
  const sliderValue = value ?? COURSE_RATING_MAX;
  const display = value != null ? formatCourseRatingDisplay(value) : null;

  function applyRawInput(raw: string) {
    if (!raw.trim()) return;
    const result = validateCourseRating(raw);
    if (result.ok) {
      onChange(result.value);
    }
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    applyRawInput(event.target.value);
  }

  function handleSliderChange(event: ChangeEvent<HTMLInputElement>) {
    const result = validateCourseRating(Number(event.target.value));
    if (result.ok) {
      onChange(result.value);
    }
  }

  return (
    <fieldset className="portal-course-rating" disabled={disabled}>
      <legend>
        Course Rating <span className="portal-course-rating-required">*</span>
      </legend>
      <p className="portal-course-rating-help">
        10.0 means one of the best golf courses you&apos;ve ever played. Enter values like 8.7 or
        9.4.
      </p>

      <div className="portal-course-rating-control">
        <output className="portal-course-rating-display" aria-live="polite">
          {display ?? "—"}
        </output>

        <label className="portal-course-rating-slider-label">
          <span className="visually-hidden">Adjust rating</span>
          <input
            type="range"
            className="portal-course-rating-slider"
            min={COURSE_RATING_MIN}
            max={COURSE_RATING_MAX}
            step={COURSE_RATING_STEP}
            value={sliderValue}
            onChange={handleSliderChange}
            disabled={disabled}
            aria-valuemin={COURSE_RATING_MIN}
            aria-valuemax={COURSE_RATING_MAX}
            aria-valuenow={sliderValue}
            aria-valuetext={display ? `${display} out of 10.0` : "No rating selected"}
          />
        </label>

        <label className="portal-course-rating-input-label">
          <span className="portal-course-rating-input-caption">Rating</span>
          <input
            type="number"
            className="portal-course-rating-input"
            inputMode="decimal"
            min={COURSE_RATING_MIN}
            max={COURSE_RATING_MAX}
            step={COURSE_RATING_STEP}
            value={value ?? ""}
            onChange={handleNumberChange}
            disabled={disabled}
            placeholder="9.0"
            aria-label="Course rating from 1.0 to 10.0"
          />
        </label>
      </div>

      {error ? (
        <p className="portal-course-rating-error" role="alert">
          {error}
        </p>
      ) : display ? (
        <p className="portal-course-rating-selected" aria-live="polite">
          Selected: {display} / {COURSE_RATING_MAX.toFixed(1)}
        </p>
      ) : (
        <p className="portal-course-rating-selected portal-course-rating-selected--empty">
          Enter a rating from 1.0 to 10.0.
        </p>
      )}
    </fieldset>
  );
}
