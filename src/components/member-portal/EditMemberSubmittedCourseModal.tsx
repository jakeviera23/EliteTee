import { FormEvent, useMemo, useRef, useState } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import type { GolfCourseRecord } from "../../types/golfCourse";
import { updateMemberSubmittedCourse } from "../../lib/memberSubmittedCourses";
import { usePortalToast } from "./PortalToastProvider";

type EditMemberSubmittedCourseModalProps = {
  course: GolfCourseRecord;
  onClose: () => void;
  onSaved: () => void;
};

export function EditMemberSubmittedCourseModal({
  course,
  onClose,
  onSaved,
}: EditMemberSubmittedCourseModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus({ dialogRef, onEscape: onClose });
  const { showToast } = usePortalToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(() => ({
    name: course.name ?? "",
    city: course.city ?? "",
    region: course.region ?? "",
    country: course.country ?? "",
    website_url: course.website_url ?? "",
    course_type: course.course_type ?? "",
    access_type: course.access_type ?? "",
    holes: course.holes ? String(course.holes) : "",
  }));

  const isEditable =
    course.source_name === "member_submitted" || Boolean(course.submitted_by_member);

  const holesValue = useMemo(() => {
    const trimmed = form.holes.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }, [form.holes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEditable) return;

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await updateMemberSubmittedCourse({
      courseId: course.id,
      name: form.name,
      city: form.city,
      region: form.region,
      country: form.country,
      website_url: form.website_url,
      course_type: form.course_type,
      access_type: form.access_type,
      holes: holesValue,
    });

    setSubmitting(false);

    if (updateError) {
      console.error("[EditMemberSubmittedCourseModal] update failed", updateError.message);
      const permissionDenied = /permission to edit/i.test(updateError.message);
      if (permissionDenied) {
        showToast("You do not have permission to edit this course.");
      }
      setError(
        permissionDenied
          ? "You do not have permission to edit this course."
          : "Course details could not be updated. Please try again.",
      );
      return;
    }

    showToast("Course updated.");
    onSaved();
    onClose();
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        ref={dialogRef}
        className="portal-modal portal-modal--course-played"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-course-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="edit-course-heading">Edit course</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="portal-course-played-form" onSubmit={handleSubmit}>
          <label className="portal-profile-field portal-profile-field--full">
            <span>Course name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>City</span>
            <input
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              required
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>State / region</span>
            <input
              value={form.region}
              onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
              required
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Country</span>
            <input
              value={form.country}
              onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
              required
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Website URL</span>
            <input
              value={form.website_url}
              onChange={(event) =>
                setForm((current) => ({ ...current, website_url: event.target.value }))
              }
              placeholder="https://"
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Course type</span>
            <input
              value={form.course_type}
              onChange={(event) =>
                setForm((current) => ({ ...current, course_type: event.target.value }))
              }
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Access type</span>
            <input
              value={form.access_type}
              onChange={(event) =>
                setForm((current) => ({ ...current, access_type: event.target.value }))
              }
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Holes</span>
            <input
              inputMode="numeric"
              value={form.holes}
              onChange={(event) => setForm((current) => ({ ...current, holes: event.target.value }))}
              placeholder="18"
            />
          </label>

          {error ? (
            <p className="portal-course-played-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="portal-btn portal-btn--primary portal-btn--full" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </form>
      </article>
    </div>
  );
}
