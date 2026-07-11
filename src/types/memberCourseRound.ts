import type { MemberCourseRoundPhotoRecord } from "./memberCourseRoundPhoto";

export type MemberCourseRoundRecord = {
  id: string;
  member_user_id: string;
  golf_course_id?: string | null;
  course_name: string;
  location: string;
  played_on: string;
  note: string;
  would_play_again: boolean;
  course_rating: number;
  created_at: string;
  member_name?: string;
  member_slug?: string;
  course_slug?: string;
  photos?: MemberCourseRoundPhotoRecord[];
};

export type MemberCourseRoundInsert = {
  course_name: string;
  location: string;
  played_on: string;
  note: string;
  would_play_again: boolean;
  course_rating: number;
  golf_course_id?: string | null;
};
