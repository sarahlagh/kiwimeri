import { Trans } from "@lingui/react/macro";
import './ExploreContainer.css';

interface ContainerProps {
  name: string;
}

const ExploreContainer: React.FC<ContainerProps> = ({ name }) => {
  return (
    <div id="container">
      <strong>{name}</strong>

      <p>content</p>
    </div>
  );
};

export default ExploreContainer;
