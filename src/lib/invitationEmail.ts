type InvitationEmailInput = {
  fullName: string;
  email: string;
  foundingMemberNumber: string;
  invitationLink: string | null;
  loginUrl: string;
};

export function buildInvitationEmailDraft({
  fullName,
  email,
  foundingMemberNumber,
  invitationLink,
  loginUrl,
}: InvitationEmailInput) {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";

  const setupLine = invitationLink
    ? `Set your password and activate your account:\n${invitationLink}`
    : `Sign in at ${loginUrl} once your admin has created your login.`;

  return `Subject: Welcome to EliteTee — Founding Member ${foundingMemberNumber}

Hi ${firstName},

Welcome to EliteTee. Your membership application has been approved.

You are Founding Member ${foundingMemberNumber}.

${setupLine}

Once your account is active:
1. Complete your golfer profile
2. Introduce yourself in the Feed
3. Explore courses and connect with other founding members

We're building something intentional — thank you for being among the first.

— Jake Viera
Founder, EliteTee

---
This invitation was generated for ${email}. Do not forward this link publicly.`;
}
