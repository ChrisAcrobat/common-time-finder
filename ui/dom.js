export function element(tag, {
  className,
  text,
  ...attributes
} = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attributes))
    if (value != null) node.setAttribute(key, String(value));
  node.append(...children.filter(Boolean));
  return node;
}
export function button(text, action, attributes = {}) {
  const node = element('button', {
    type: 'button',
    text,
    ...attributes
  });
  node.addEventListener('click', action);
  return node;
}
export function field(label, input) {
  input.setAttribute('aria-label', label);
  return element('label', {
    className: 'field'
  }, element('span', {
    text: label
  }), input);
}
export function input(value, attributes = {}) {
  const node = element('input', attributes);
  node.value = value ?? '';
  return node;
}
export function select(value, options) {
  const node = element('select');
  for (const [key, label] of options) node.append(element('option', {
    value: key,
    text: label
  }));
  node.value = value;
  return node;
}
export function checkbox(label, checked, onChange) {
  const node = input(null, {
    type: 'checkbox'
  });
  node.checked = checked;
  node.addEventListener('change', () => onChange(node.checked));
  return element('label', {
    className: 'check'
  }, node, element('span', {
    text: label
  }));
}
export function zoneInput(zone, zones, id) {
  const node = input(zone, {
    list: id,
    required: '',
    autocomplete: 'off',
    name: 'timeZone'
  });
  const list = element('datalist', {
    id
  });
  for (const value of zones) list.append(element('option', {
    value
  }));
  return {
    node,
    list
  };
}
