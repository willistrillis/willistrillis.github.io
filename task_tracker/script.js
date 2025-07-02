document.addEventListener('DOMContentLoaded', () => {
  const newTaskBtn = document.getElementById('new-task-btn');
  const modal = document.getElementById('task-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');
  const modalContent = document.querySelector('.modal-content');

  // Dynamically compute the base URL
  const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');

  const frames = [
    `${basePath}images/task.png`,
    `${basePath}images/f0.png`,
    `${basePath}images/f2.png`,
    `${basePath}images/f4.png`,
    `${basePath}images/scroll.png`
  ];

  const placeholders = [
    'Name thy quest...',
    'What task dost thou seek?',
    'Proclaim thine objective...',
    'Record thy noble duty...',
    'What venture awaits thee?',
    'Declare thy charge...',
    'What deed shall be done?',
    'Inscribe thy task...'
  ];

  let currentFrame = 0;

  // Preload frames
  const preloadFrames = () => {
    frames.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  };

  preloadFrames();

  const animate = (reverse = false) => {
    if (reverse) {
      if (currentFrame >= 0) {
        modalContent.style.backgroundImage = `url('${frames[currentFrame]}')`;

        if (currentFrame === 3) {
          form.classList.remove('visible');
        }

        currentFrame--;
        setTimeout(() => animate(true), 100);
      } else {
        modal.classList.remove('visible');
      }
    } else {
      if (currentFrame < frames.length) {
        modalContent.style.backgroundImage = `url('${frames[currentFrame]}')`;

        if (currentFrame === 3) {
          form.classList.add('visible');
        }

        currentFrame++;
        setTimeout(() => animate(false), 100);
      }
    }
  };

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
      addQuestElement(text, completed);
    });
  };

  function addQuestElement(text, completed = false) {
    const li = document.createElement('li');
    li.textContent = text;
    if (completed) li.classList.add('completed');

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
      if (holdTime < 1000) {
        li.classList.toggle('completed');
        saveTasks();
      }

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

  newTaskBtn.addEventListener('click', () => {
    modal.classList.add('visible');
    form.classList.remove('visible');
    form.style.transition = '';

    const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)];
    input.placeholder = randomPlaceholder;

    currentFrame = 0;
    animate(false);
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    form.classList.remove('visible');
    currentFrame = frames.length - 1;
    animate(true);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      addQuestElement(text);
      saveTasks();
    }
    form.reset();
    form.classList.remove('visible');
    currentFrame = frames.length - 1;
    animate(true);
  });

  loadTasks();
});
