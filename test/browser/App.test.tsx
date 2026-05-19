import App from '@/App';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { TestingProvider } from './TestingProvider';

test('renders without crashing', async () => {
  const screen = await render(<App />, {
    wrapper: TestingProvider
  });

  expect(screen.baseElement).toBeDefined();
});
