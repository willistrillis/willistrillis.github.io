document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');

  // Save all quests to localStorage
  const saveTasks = () => {
    const quests = [...list.children].map(li => ({
      text: li.textContent,
      completed: li.classList.contains('completed')
    }));
    localStorage.setItem('quests', JSON.stringify(quests));
  };

  // Load quests from localStorage
  const loadTasks = () => {
    const saved = JSON.parse(localStorage.getItem('quests')) || [];
    saved.forEach(({ text, completed }) => {
      addQuestElement(text, completed);
    });
  };

  function addQuestElement(text, completed = false) {
    const li = document.createElement('li');
    li.textContent = text;
    if (completed) li.classList.add('completed');
  
    li.addEventListener('click', () => {
      li.classList.toggle('completed');
      saveTasks();
    });
  
    let holdTimer = null;
    let holdTime = 0;
    let isHolding = false;
  
    const startPress = (e) => {
      e.preventDefault();
      isHolding = true;
      holdTime = 0;
  
      holdTimer = setInterval(() => {
        if (!isHolding) return;
  
        holdTime += 100;
  
        if (holdTime >= 1000 && !li.classList.contains('shaking')) {
          li.classList.add('shaking');
        }
  
        if (holdTime >= 3000) {
          clearInterval(holdTimer);
          li.remove();
          saveTasks();
        }
      }, 100);
    };
  
    const cancelPress = () => {
      isHolding = false;
      clearInterval(holdTimer);
      holdTime = 0;
      li.classList.remove('shaking');
    };
  
    li.addEventListener('mousedown', startPress);
    li.addEventListener('touchstart', startPress);
    li.addEventListener('mouseup', cancelPress);
    li.addEventListener('mouseleave', cancelPress);
    li.addEventListener('touchend', cancelPress);
  
    list.appendChild(li);
  }
    
  

  // Add quest on form submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addQuestElement(text);
    input.value = '';
    saveTasks();
  });

  loadTasks(); // Load any saved quests on page load
});
