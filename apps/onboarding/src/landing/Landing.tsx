import { Button, FormField, Input } from "@comfi/ui";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Centered, Screen } from "../layout";

const tokenPattern = /^[A-Za-z0-9_-]{8,}$/;

/** Accepts a full onboarding link (".../r/<token>") or just the token. */
export function parseToken(input: string): string | null {
  const trimmed = input.trim();
  const path = URL.canParse(trimmed) ? new URL(trimmed).pathname : trimmed;
  const candidate = path.split("/").filter(Boolean).at(-1) ?? "";
  return tokenPattern.test(candidate) ? candidate : null;
}

export function Landing() {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = parseToken(link);
    if (token) navigate(`/r/${token}`);
    else setError("That doesn't look like an onboarding link. Paste the full link you received.");
  };

  return (
    <Screen>
      <Centered>
        <form className="ob-panel ob-landing" onSubmit={onSubmit} noValidate>
          <div className="ob-eyebrow">Business onboarding</div>
          <h1 className="ob-landing__title">Continue your business onboarding</h1>
          <p className="ob-landing__lead">
            Paste the link you received from Comfi. Your progress is saved, so you can pick up right where you left off.
          </p>
          <FormField label="Onboarding link" error={error}>
            {(id) => (
              <Input
                id={id}
                value={link}
                aria-invalid={error ? true : undefined}
                placeholder="https://…/r/your-code"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  setLink(event.target.value);
                  setError(null);
                }}
              />
            )}
          </FormField>
          <Button type="submit" variant="primary" className="ob-landing__submit">
            Continue
          </Button>
        </form>
      </Centered>
    </Screen>
  );
}
