import { BlockFormatSection } from './BlockFormatSection';
import { Divider } from './buttons';
import { GlobalEditorSection } from './GlobalEditorSection';
import { InsertBlocksSection } from './InsertBlocksSection';
import { OtherSection } from './OtherSection';
import { TextAlignSection } from './TextAlignSection';
import { TextFormatSection } from './TextFormatSection';
import './Toolbar.scss';

const Toolbar = () => {
  return (
    <div className="toolbar" role="toolbar">
      <GlobalEditorSection />
      <Divider />
      <TextFormatSection />
      <Divider />
      <TextAlignSection />
      <Divider />
      <InsertBlocksSection />
      <Divider />
      <BlockFormatSection />
      <Divider />
      <OtherSection />
    </div>
  );
};

export default Toolbar;
