import { ZoomExtension } from '@/features/document-editor/wysiwyg-editor/lexical-v2/extensions/ZoomExtension';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import {
  getContentEditorElement,
  getToggleReadModeBtn,
  getZoomInBtn,
  getZoomOutBtn
} from './RichTextEditor.locators';
import { renderEditor } from './utils';

const ZOOM_INCREMENT = 0.05;

describe('ZoomExtension', () => {
  test('can click on zoom in until max', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      zoomLevel: 2.9,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    const zoomInBtn = getZoomInBtn(screen);
    await expect(zoomInBtn).not.toBeDisabled();
    expect(zoomValue).toBeCloseTo(2.9);

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: ${zoomValue}`
    );

    await zoomInBtn.click();
    await expect(zoomInBtn).not.toBeDisabled();
    expect(zoomValue).toBeCloseTo(2.9 + ZOOM_INCREMENT);

    await zoomInBtn.click();
    await zoomInBtn.click();
    await expect(zoomInBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 3.`
    );
  });

  test('can click on zoom out until min', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      zoomLevel: 0.6,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    const zoomOutBtn = getZoomOutBtn(screen);
    await expect(zoomOutBtn).not.toBeDisabled();
    expect(zoomValue).toBeCloseTo(0.6);

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: ${zoomValue}`
    );

    await zoomOutBtn.click();
    await expect(zoomOutBtn).not.toBeDisabled();
    expect(zoomValue).toBeCloseTo(0.6 - ZOOM_INCREMENT);

    await zoomOutBtn.click();
    await expect(zoomOutBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 0.`
    );
  });

  test('zoom in zoom out stay enabled even if editor disabled', async () => {
    const screen = await renderEditor({
      zoomLevel: 1
    });

    const zoomInBtn = getZoomInBtn(screen);
    const zoomOutBtn = getZoomOutBtn(screen);
    await expect(zoomInBtn).not.toBeDisabled();
    await expect(zoomOutBtn).not.toBeDisabled();

    await getToggleReadModeBtn(screen).click();

    await expect(zoomInBtn).not.toBeDisabled();
    await expect(zoomOutBtn).not.toBeDisabled();
  });

  test('on initial load zoom is applied once', async () => {
    let zoomValueApplied = 0;
    const screen = await renderEditor({
      zoomLevel: 2,
      onZoomChange: () => {
        zoomValueApplied++;
      }
    });

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: ${2}`
    );
    expect(zoomValueApplied).toBe(2);
  });

  test('shortcut for zoom in works', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      zoomLevel: 2.9,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    const zoomInBtn = getZoomInBtn(screen);
    await expect(zoomInBtn).not.toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{+}');

    await expect(zoomInBtn).not.toBeDisabled();
    expect(zoomValue).toBeCloseTo(2.9 + ZOOM_INCREMENT);

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{+}');
    await userEvent.type(getContentEditorElement(screen), '{Meta>}{+}');
    await expect(zoomInBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 3.0`
    );
  });

  test('shortcut for zoom out works', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      zoomLevel: 0.6,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    const zoomOutBtn = getZoomOutBtn(screen);
    await expect(zoomOutBtn).not.toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{-}');

    await expect(zoomOutBtn).not.toBeDisabled();
    expect(zoomValue).toBeCloseTo(0.6 - ZOOM_INCREMENT);

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{-}');
    await userEvent.type(getContentEditorElement(screen), '{Meta>}{-}');
    await expect(zoomOutBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 0.`
    );
  });

  test('shortcut for zoom reset works', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      zoomLevel: 2,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{0}');

    expect(zoomValue).toBeCloseTo(1);

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 1`
    );
  });

  test('can use zoomSignal', async () => {
    function TestComponent() {
      const zoomSignal = useExtensionSignalValue(ZoomExtension, 'zoomSignal');
      return <div data-testid="zoom">Zoom: {zoomSignal}</div>;
    }

    const screen = await render(
      <LexicalExtensionComposer extension={ZoomExtension}>
        <TestComponent />
      </LexicalExtensionComposer>
    );

    const contentEditor = screen.getByRole('textbox');
    const testComponent = screen.getByTestId('zoom');

    await expect.element(testComponent).toHaveTextContent('Zoom: 1');

    await userEvent.type(contentEditor, '{Meta>}{+}{+}');

    await expect.element(testComponent).toHaveTextContent('Zoom: 1.1');
  });
});
