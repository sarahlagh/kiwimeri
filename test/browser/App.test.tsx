import App from '@/App';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

test('renders without crashing', async () => {
  const screen = await render(<App />);

  expect(screen.baseElement).toBeDefined();
});
