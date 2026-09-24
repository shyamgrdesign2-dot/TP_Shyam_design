const text = value => typeof value === 'string';
const isRow = row => row && text(row.sourceRef);

// Render only this literal, shallow contract. No bindings, expressions, raw HTML,
// actions or model-provided component names are evaluated.
function usableSpec(ui) {
  if (ui?.schemaVersion !== 'doctor-agent.ui.v1' || !ui.elements || Object.keys(ui.elements).length > 258) return false;
  const root = ui.elements[ui.root];
  if (root?.type !== 'Response' || !Array.isArray(root.children)) return false;
  const seen = new Set([ui.root]);
  let cards = 0;
  for (const id of root.children) {
    if (seen.has(id)) return false;
    seen.add(id);
    const node = ui.elements[id];
    if (node?.type === 'Narrative' && text(node.props?.markdown)) continue;
    if (node?.type !== 'ClinicalCard' || !text(node.props?.title) || !Array.isArray(node.children)) return false;
    cards++;
    for (const key of node.children) {
      if (seen.has(key)) return false;
      seen.add(key);
      const child = ui.elements[key], props = child?.props;
      if (!props) return false;
      if (child.type === 'Narrative' && text(props.markdown)) continue;
      if (child.type === 'Trend' && Array.isArray(props.chart?.points) && props.chart.points.length <= 5000) continue;
      if (['Measurements', 'Prescriptions'].includes(child.type) && Array.isArray(props.rows) && props.rows.length <= 5000 && props.rows.every(isRow)) continue;
      return false;
    }
  }
  return cards === 1;
}

export function normalizeLiveResult(result) {
  const evidence = (result.evidence || []).map((row, index) => ({
    ...row, id: String(row.id || row.source_ref || row.evidenceId || index),
    source_ref: String(row.source_ref || row.id || row.evidenceId || index),
    title: row.title || row.testName || row.brandName || row.code || 'Source record',
    text: row.text || '', highlights: Array.isArray(row.highlights) ? row.highlights : [],
    chips: Array.isArray(row.chips) ? row.chips : [],
  }));
  let ui = usableSpec(result.ui) ? result.ui : null;
  if (!ui) ui = { schemaVersion: 'doctor-agent.ui.v1', root: 'response', elements: {
    response: { type: 'Response', props: {}, children: ['card'] },
    card: { type: 'ClinicalCard', props: { title: 'From the record' }, children: ['narrative'] },
    narrative: { type: 'Narrative', props: { markdown: result.answer }, children: [] },
  } };
  // Match the reference renderer: promote a leading narrative heading into the
  // shell while preserving its citations and the complete clinical body.
  const cardKey = ui.elements[ui.root].children.find(key => ui.elements[key].type === 'ClinicalCard');
  const card = ui.elements[cardKey];
  const firstKey = card.children.find(key => ui.elements[key].type === 'Narrative');
  const first = ui.elements[firstKey];
  if (first) {
    const markdown = first.props.markdown.replace(/(^|\n) {0,3}\*\*([^*\n]{1,200})\*\*[ \t]*(?=\n|$)/g, '$1## $2');
    const heading = /^ {0,3}#{1,6}[ \t]+([^\n]+)(?:\n|$)/.exec(markdown);
    if (heading) {
      const citations = heading[1].match(/\[[^\]]+\]\(#evidence-[^)]+\)/g) || [];
      const title = heading[1].replace(/\[[^\]]+\]\(#evidence-[^)]+\)/g, '').replace(/[*_`]/g, '').trim();
      if (title) ui = { ...ui, elements: { ...ui.elements,
        [cardKey]: { ...card, props: { title } },
        [firstKey]: { ...first, props: { markdown: [citations.join(' '), markdown.slice(heading[0].length)].filter(Boolean).join('\n\n') } },
      } };
    }
  }
  const intro = ui.elements[ui.root].children.map(key => ui.elements[key]).filter(node => node.type === 'Narrative').map(node => node.props.markdown).join('\n\n');
  return { ...result, live: true, evidence, ui, intro };
}
