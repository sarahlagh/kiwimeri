import { Divider } from './buttons';
import {
  GlobalEditorSection,
  GlobalEditorSectionProps
} from './GlobalEditorSection';
import { InsertBlocksSection } from './InsertBlocksSection';
import { TextFormatSection } from './TextFormatSection';
import './Toolbar.scss';

type ToolbarProps = GlobalEditorSectionProps;

const Toolbar = (props: ToolbarProps) => {
  return (
    <div className="toolbar">
      <GlobalEditorSection {...props} />
      <Divider />
      {/* <BlockFormatSection />
      <Divider /> */}
      <TextFormatSection />
      <Divider />
      <InsertBlocksSection />
    </div>
  );
};

export default Toolbar;
