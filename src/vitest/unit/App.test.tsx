import { render } from '@testing-library/react';
import App from '../../App';
import { TestingProvider } from '../setup/test.react.utils';

test('renders without crashing', () => {
  const { baseElement } = render(<App />, { wrapper: TestingProvider });
  expect(baseElement).toBeDefined();
});
