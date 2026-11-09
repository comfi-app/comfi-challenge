import type { ApplicantRunView } from "@comfi/kyb-contracts";
import { Button } from "@comfi/ui";
import { Link } from "react-router";
import { AlertIcon, CheckIcon, CloseIcon, LinkIcon } from "../icons";
import { Centered, Screen, StatusCard } from "../layout";

export function EndingScreen({ view }: { view: ApplicantRunView }) {
  const { ending, company, flow } = view;
  const approved = (ending?.outcome ?? view.run.outcome) !== "rejected";
  return (
    <Centered>
      <StatusCard
        className="ob-ending"
        tone={approved ? "success" : "danger"}
        icon={approved ? <CheckIcon size={26} /> : <CloseIcon size={24} />}
        title={ending?.title ?? (approved ? "You're all set" : "We couldn't complete your onboarding")}
      >
        {ending?.body && <p className="ob-status__body">{ending.body}</p>}
        <p className="ob-status__meta">
          {company.name} · {flow.name}
        </p>
      </StatusCard>
    </Centered>
  );
}

export function BlockedScreen() {
  return (
    <Centered>
      <StatusCard tone="neutral" icon={<AlertIcon size={22} />} title="Your application needs a closer look">
        <p className="ob-status__body">
          We've received everything you sent, but we can't move it forward automatically. Our team will pick it up and
          get in touch with you. There's nothing you need to do right now.
        </p>
      </StatusCard>
    </Centered>
  );
}

export function LoadErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Centered>
      <StatusCard tone="neutral" icon={<AlertIcon size={22} />} title="We couldn't load your onboarding">
        <p className="ob-status__body">Check your connection and try again in a moment.</p>
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      </StatusCard>
    </Centered>
  );
}

export function NotFoundScreen() {
  return (
    <Screen>
      <Centered>
        <StatusCard tone="neutral" icon={<LinkIcon size={22} />} title="This link doesn't work">
          <p className="ob-status__body">
            It may have been mistyped or copied only in part. Open the link from your invitation again, or paste it
            below.
          </p>
          <Link to="/" className="cf-btn cf-btn--primary">
            Enter your link
          </Link>
        </StatusCard>
      </Centered>
    </Screen>
  );
}
