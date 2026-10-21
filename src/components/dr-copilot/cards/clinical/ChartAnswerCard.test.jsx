import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChartAnswerCard } from './ChartAnswerCard';
jest.mock('../CardShell', () => ({ CardShell: ({ title, children }) => <article><h2>{title}</h2>{children}</article> }));
jest.mock('../../compat/tp-ui', () => ({ TPMedicalIcon: () => null }));
jest.mock('../../ui/CopilotIcon', () => ({ CopilotIcon: () => null }));
const data = { markdown: '# Patient overview\n\nRecorded diabetes follow-up.', cited: [] };
test('existing Markdown callers continue to render their answer', () => {
  const view = renderToStaticMarkup(<ChartAnswerCard data={data} />);
  expect(view).toContain('Patient overview');
  expect(view).toContain('Recorded diabetes follow-up.');
});
test('structured bodies reuse the answer shell and receive the native citation handler', () => {
  const renderBody = jest.fn(({ onCite, activeNumber }) => {
    expect(typeof onCite).toBe('function');
    expect(activeNumber).toBeNull();
    return <p>Structured summary</p>;
  });
  const view = renderToStaticMarkup(<ChartAnswerCard data={data} renderBody={renderBody} />);
  expect(view).toContain('Patient overview');
  expect(view).toContain('Structured summary');
  expect(view).not.toContain('Recorded diabetes follow-up.');
});
