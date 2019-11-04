import DefaultAxios from 'axios';

function getCsrfToken() {
  const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
  if (csrfTokenMeta) {
    return csrfTokenMeta.content;
  } else {
    return null;
  }
}

const defaultAxios = DefaultAxios.create({
  headers: {
    'X-CSRF-Token': getCsrfToken(),
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

export default defaultAxios;
