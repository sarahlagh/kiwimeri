import { ZoomExtension } from '@/features/rich-text-editor/extensions/ZoomExtension';
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

describe('ZoomExtension', () => {
  test('can click on zoom in until max', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      initialZoom: 290,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    const zoomInBtn = getZoomInBtn(screen);
    await expect(zoomInBtn).not.toBeDisabled();
    expect(zoomValue).toBe(0); // onZoomChange not fired for initial zoom

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 2.9`
    );

    await zoomInBtn.click();
    await expect(zoomInBtn).not.toBeDisabled();
    expect(zoomValue).toBe(295);

    await zoomInBtn.click();
    await expect(zoomInBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 3`
    );
  });

  test('can click on zoom out until min', async () => {
    let zoomValue = 0;
    const screen = await renderEditor({
      initialZoom: 60,
      onZoomChange: zoom => {
        zoomValue = zoom;
      }
    });

    const zoomOutBtn = getZoomOutBtn(screen);
    await expect(zoomOutBtn).not.toBeDisabled();
    expect(zoomValue).toBe(0); // onZoomChange not fired for initial zoom

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 0.6`
    );

    await zoomOutBtn.click();
    await expect(zoomOutBtn).not.toBeDisabled();
    expect(zoomValue).toBe(55);

    await zoomOutBtn.click();
    await expect(zoomOutBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 0.5`
    );
  });

  test('zoom in zoom out stay enabled even if editor disabled', async () => {
    const screen = await renderEditor({
      initialZoom: 100
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
      initialZoom: 200,
      onZoomChange: () => {
        zoomValueApplied++;
      }
    });

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: ${2}`
    );
    expect(zoomValueApplied).toBe(0);
  });

  test('shortcut for zoom in works', async () => {
    const screen = await renderEditor({
      initialZoom: 290
    });

    const zoomInBtn = getZoomInBtn(screen);
    await expect.element(zoomInBtn).not.toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{+}');

    await expect.element(zoomInBtn).not.toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{+}');
    await expect.element(zoomInBtn).toBeDisabled();

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 3`
    );
  });

  test('shortcut for zoom out works', async () => {
    const screen = await renderEditor({
      initialZoom: 60
    });

    const zoomOutBtn = getZoomOutBtn(screen);
    await expect.element(zoomOutBtn).not.toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{-}');

    await expect.element(zoomOutBtn).not.toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{-}');
    await userEvent.type(getContentEditorElement(screen), '{Meta>}{-}');
    await expect.element(zoomOutBtn).toBeDisabled();
    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 0.5`
    );
  });

  test('shortcut for zoom reset works', async () => {
    const screen = await renderEditor({
      initialZoom: 50
    });

    const zoomOutBtn = getZoomOutBtn(screen);
    await expect.element(zoomOutBtn).toBeDisabled();

    await userEvent.type(getContentEditorElement(screen), '{Meta>}{0}');

    await expect.element(zoomOutBtn).not.toBeDisabled();

    expect(getContentEditorElement(screen).getAttribute('style')).toContain(
      `zoom: 1`
    );
  });

  function TestComponent() {
    const zoomSignal = useExtensionSignalValue(ZoomExtension, 'zoom');
    return <div data-testid="zoom">Zoom: {zoomSignal}</div>;
  }

  test('can use zoomSignal', async () => {
    const screen = await render(
      <LexicalExtensionComposer extension={ZoomExtension}>
        <TestComponent />
      </LexicalExtensionComposer>
    );

    const contentEditor = screen.getByRole('textbox');
    const testComponent = screen.getByTestId('zoom');

    await expect.element(testComponent).toHaveTextContent('Zoom: 100');

    await userEvent.type(contentEditor, '{Meta>}{-}{-}');

    await expect.element(testComponent).toHaveTextContent('Zoom: 90');
  });
});
