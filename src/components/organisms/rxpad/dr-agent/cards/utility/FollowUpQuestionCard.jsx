"use client";

import { useState, useCallback } from "react";
import { TickCircle } from "iconsax-reactjs";
import { CardShell } from "../CardShell";
import { CheckboxRow } from "../CheckboxRow";
import { RadioRow } from "../RadioRow";
import { FooterCTA } from "../FooterCTA";










export function FollowUpQuestionCard({
  data,
  onSubmit
}) {
  const [selected, setSelected] = useState(

    () => {
      const init = {};
      data.options.forEach((opt) => {
        init[opt] = false;
      });
      return init;
    });

  const handleCheckboxToggle = useCallback(
    (option, checked) => {
      setSelected((prev) => ({ ...prev, [option]: checked }));
    },
    []
  );

  const handleRadioSelect = useCallback(
    (option) => {
      setSelected(() => {
        const next = {};
        data.options.forEach((opt) => {
          next[opt] = opt === option;
        });
        return next;
      });
    },
    [data.options]
  );

  const selectedOptions = Object.entries(selected).
  filter(([, v]) => v).
  map(([k]) => k);

  return (
    <CardShell
      icon={<span />}
      tpIconName="Diagnosis"
      title={data.question}
      sidebarLink={
      <FooterCTA
        label={`Submit${selectedOptions.length > 0 ? ` (${selectedOptions.length})` : ""}`}
        onClick={() => onSubmit?.(selectedOptions)}
        disabled={selectedOptions.length === 0}
        tone="secondary"
        iconLeft={<TickCircle size={14} variant="Bold" />} />

      }>
      
      {data.multiSelect ?
      data.options.map((option, i) =>
      <CheckboxRow
        key={option}
        label={option}
        checked={selected[option] ?? false}
        onChange={(checked) =>
        handleCheckboxToggle(option, checked)
        }
        isLast={i === data.options.length - 1} />

      ) :
      data.options.map((option, i) =>
      <RadioRow
        key={option}
        name="follow-up-question"
        label={option}
        checked={selected[option] ?? false}
        onChange={() => handleRadioSelect(option)}
        isLast={i === data.options.length - 1} />

      )}
    </CardShell>);

}