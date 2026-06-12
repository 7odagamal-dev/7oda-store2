interface TurnstileObject {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

interface Window {
  turnstile?: TurnstileObject;
}
