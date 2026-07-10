import { COURSE_RATING_MAX } from "../../lib/courseRating";

type CourseRatingPickerProps = {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function CourseRatingPicker({ value, onChange, disabled = false }: CourseRatingPickerProps) {
  return (
    <fieldset className="portal-course-rating">
      <legend>
        Course Rating <span className="portal-course-rating-required">*</span>
      </legend>
      <p className="portal-course-rating-help">
        10 means one of the best golf courses you&apos;ve ever played.
      </p>
      <div className="portal-course-rating-options" role="radiogroup" aria-label="Course rating">
        {Array.from({ length: COURSE_RATING_MAX }, (_, index) => {
          const rating = index + 1;
          const isActive = value === rating;

          return (
            <button
              key={rating}
              type="button"
              className={`portal-course-rating-option${isActive ? " is-active" : ""}`}
              onClick={() => onChange(rating)}
              disabled={disabled}
              aria-pressed={isActive}
            >
              {rating}
            </button>
          );
        })}
      </div>
      {value ? (
        <p className="portal-course-rating-selected" aria-live="polite">
          Selected: {value}/{COURSE_RATING_MAX}
        </p>
      ) : (
        <p className="portal-course-rating-selected portal-course-rating-selected--empty">
          Select a rating from 1 to 10.
        </p>
      )}
    </fieldset>
  );
}
