import type { FeedPost } from "../../../data/portalSocial";
import { buildProfileFeedActivityPreview } from "../../../lib/feedPostDisplay";
import { CourseImage } from "../CourseImage";

type ProfileFeedActivityListProps = {
  posts: FeedPost[];
  onOpenPost?: (postId: string) => void;
};

export function ProfileFeedActivityList({ posts, onOpenPost }: ProfileFeedActivityListProps) {
  if (posts.length === 0) return null;

  return (
    <ul className="et-profile-feed-activity">
      {posts.map((post) => {
        const preview = buildProfileFeedActivityPreview(post);

        return (
          <li key={post.id}>
            <button
              type="button"
              className="et-profile-feed-activity-card"
              onClick={() => onOpenPost?.(post.id)}
              aria-label={`View full feed post: ${preview.title}`}
            >
              <div className="et-profile-feed-activity-media" aria-hidden="true">
                {preview.thumbnailUrl ? (
                  <img src={preview.thumbnailUrl} alt="" loading="lazy" decoding="async" />
                ) : post.golfCourseId ? (
                  <CourseImage
                    name={preview.title}
                    imageUrl={null}
                    thumbnailUrl={null}
                    golfCourseId={post.golfCourseId}
                    variant="card"
                    className="et-profile-feed-activity-course-image"
                  />
                ) : (
                  <span className="et-profile-feed-activity-media-fallback" />
                )}
              </div>

              <div className="et-profile-feed-activity-copy">
                <div className="et-profile-feed-activity-head">
                  {preview.badgeLabel ? (
                    <span className="et-profile-feed-activity-badge">{preview.badgeLabel}</span>
                  ) : null}
                  {preview.timestamp ? (
                    <time className="et-profile-feed-activity-time">{preview.timestamp}</time>
                  ) : null}
                </div>
                <p className="et-profile-feed-activity-title">{preview.title}</p>
                {(preview.locationLabel || preview.ratingLabel) && (
                  <p className="et-profile-feed-activity-meta">
                    {preview.locationLabel}
                    {preview.locationLabel && preview.ratingLabel ? " · " : null}
                    {preview.ratingLabel ? `${preview.ratingLabel} rating` : null}
                  </p>
                )}
                {preview.excerpt ? (
                  <p className="et-profile-feed-activity-excerpt">{preview.excerpt}</p>
                ) : null}
                <span className="et-profile-feed-activity-link">View full post</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
