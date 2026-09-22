import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RxActionTooltip from './RxActionTooltip';

test('hover hint hides on click and stays hidden while its control is active', async () => {
  const { rerender } = render(<RxActionTooltip title="Browse templates"><button>Templates</button></RxActionTooltip>);
  const hover = () => fireEvent.mouseEnter(screen.getByRole('button').parentElement);
  hover();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Browse templates');
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  rerender(<RxActionTooltip title="Browse templates" active><button>Templates</button></RxActionTooltip>);
  fireEvent.mouseLeave(screen.getByRole('button').parentElement); hover();
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  rerender(<RxActionTooltip title="Browse templates"><button>Templates</button></RxActionTooltip>);
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Browse templates');
});
