export type MemberCourseRoundRecord = {
  id: string;
  member_user_id: string;
  course_name: string;
  location: string;
  played_on: string;
  note: string;
  would_play_again: boolean;
  created_at: string;
};

export type MemberCourseRoundInsert = {
  course_name: string;
  location: string;
  played_on: string;
  note: string;
  would_play_again: boolean;
};
