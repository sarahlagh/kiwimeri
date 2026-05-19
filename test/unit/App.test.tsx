import App from '@/App';
import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { TestingProvider } from '../_setup/test.react.utils';

test('renders without crashing', () => {
  const { baseElement } = render(<App />, { wrapper: TestingProvider });
  expect(baseElement).toBeDefined();
});
