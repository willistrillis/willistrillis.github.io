document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const li = document.createElement('li');
    li.textContent = text;
    li.addEventListener('click', () => li.classList.toggle('completed'));
    list.appendChild(li);
    input.value = '';
  });
});
