import {
  element
} from './dom.js';

// Required/type attributes remain useful semantics, but browser validation bubbles
// use the browser language. Keep all submission feedback inside the translated UI.
export function bindValidatedSubmit(form, {
  t,
  submit,
  onSuccess
}) {
  form.noValidate = true;
  const error = element('p', {
    className: 'form-error',
    role: 'alert'
  });
  error.hidden = true;
  form.append(error);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const result = submit();
    if (result.ok) {
      onSuccess();
      return;
    }
    error.textContent = t(result.error);
    error.hidden = false;
    error.scrollIntoView({
      block: 'nearest'
    });
  });
}
