document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');

  const saveTasks = () => {
    const quests = [...list.children].map(li => ({
      text: li.textContent,
      completed: li.classList.contains('completed')
    }));
    localStorage.setItem('quests', JSON.stringify(quests));
  };

  const loadTasks = () => {
    const saved = JSON.parse(localStorage.getItem('quests')) || [];
    saved.forEach(({ text, completed }) => {
      const li = document.createElement('li');
      li.textContent = text;
      if (completed) li.classList.add('completed');
      li.addEventListener('click', () => {
        li.classList.toggle('completed');
        saveTasks();
      });
      list.appendChild(li);
    });
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const li = document.createElement('li');
    li.textContent = text;
    li.addEventListener('click', () => {
      li.classList.toggle('completed');
      saveTasks();
    });
    list.appendChild(li);
    input.value = '';
    saveTasks(); // ✅ Save after adding new quest
  });

  loadTasks(); // ✅ Load quests on page load
});
