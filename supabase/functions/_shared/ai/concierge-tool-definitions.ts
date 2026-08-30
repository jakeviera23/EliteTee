export const CONCIERGE_TOOL_NAMES = [
  "search_members",
  "search_courses",
  "get_members_who_played_course",
  "get_course_member_stats",
  "get_top_rated_courses",
  "get_member_travel_matches",
  "get_relationship_state",
  "get_member_round_summary",
] as const;

export type ConciergeToolName = (typeof CONCIERGE_TOOL_NAMES)[number];

export type ConciergeToolDefinition = {
  type: "function";
  function: {
    name: ConciergeToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const CONCIERGE_TOOL_DEFINITIONS: ConciergeToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_members",
      description:
        "Find EliteTee members matching location, club, interests, travel, or semantic criteria. Requires at least one specific filter; never use for vague questions.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City or region where members are based." },
          home_club: { type: "string", description: "Primary club name." },
          interests: { type: "string", description: "Golf or business interests." },
          travel_destination: { type: "string", description: "Where members are traveling." },
          connection_interest: { type: "string", description: "Current request or connection topic." },
          semantic_query: { type: "string", description: "Optional free-text directory search." },
          limit: { type: "integer", description: "Max results (2-12)." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_courses",
      description: "Search the EliteTee course directory by name, location, type, or access.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Course name fragment." },
          city: { type: "string" },
          region: { type: "string" },
          country: { type: "string" },
          course_type: { type: "string", description: "e.g. links" },
          access: { type: "string", description: "e.g. private or public" },
          limit: { type: "integer" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_members_who_played_course",
      description:
        "Return members who have logged rounds at a specific course. Resolve the course first; only returns verified course experience.",
      parameters: {
        type: "object",
        properties: {
          course_name: { type: "string" },
          course_id: { type: "string", description: "UUID when known." },
          limit: { type: "integer" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_course_member_stats",
      description:
        "Return EliteTee member rating, round count, recommend %, member count, and review summary for one course.",
      parameters: {
        type: "object",
        properties: {
          course_name: { type: "string" },
          course_id: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_rated_courses",
      description:
        "Return courses ranked by EliteTee member ratings and activity. Use for best/highest-rated course questions, not literal text search.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string", description: "Optional region, state, or country filter." },
          country: { type: "string" },
          limit: { type: "integer" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_member_travel_matches",
      description: "Return members whose profile travel fields match a destination.",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string" },
          limit: { type: "integer" },
        },
        required: ["destination"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_relationship_state",
      description:
        "Return introduction/messaging relationship state between viewer and a member. For CTA context only.",
      parameters: {
        type: "object",
        properties: {
          member_id: { type: "string", description: "Target member user UUID." },
        },
        required: ["member_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_member_round_summary",
      description:
        "Return recent logged rounds and ratings for members, optionally scoped to a course name.",
      parameters: {
        type: "object",
        properties: {
          member_ids: {
            type: "array",
            items: { type: "string" },
            description: "Member UUIDs from prior tool results.",
          },
          course_name: { type: "string", description: "Optional course filter." },
          limit: { type: "integer" },
        },
        additionalProperties: false,
      },
    },
  },
];
