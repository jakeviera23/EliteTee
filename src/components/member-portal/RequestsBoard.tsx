import type { MemberRequest } from "../../data/memberPortalDirectory";

type RequestsBoardProps = {
  requests: MemberRequest[];
  onRespond: (memberName: string) => void;
};

export function RequestsBoard({ requests, onRespond }: RequestsBoardProps) {
  return (
    <ul className="portal-requests-list">
      {requests.map((request) => (
        <li key={request.id}>
          <article className="portal-request-card">
            <h3 className="portal-request-name">{request.memberName}</h3>
            <p className="portal-request-type">{request.requestType}</p>
            <p className="portal-request-text">{request.text}</p>
            <button
              type="button"
              className="portal-btn portal-respond-btn--filled"
              onClick={() => onRespond(request.memberName)}
            >
              Respond Privately
            </button>
          </article>
        </li>
      ))}
    </ul>
  );
}
