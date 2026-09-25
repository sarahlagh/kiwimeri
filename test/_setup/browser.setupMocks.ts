import * as reactRouter from 'react-router';
import { NavigateOptions } from 'react-router';

vi.mock('react-router', { spy: true });

const navigateToList: string[] = [];
vi.stubGlobal('navigateToList', navigateToList);

const mockNavigateFunction: reactRouter.NavigateFunction = (
  to: reactRouter.To | number,
  options?: NavigateOptions
) => {
  if (typeof to === 'string') {
    navigateToList.push(to);
  }
};

vi.mocked(reactRouter.useNavigate).mockImplementation(
  () => mockNavigateFunction
);
