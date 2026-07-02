// Application State Management
let state = {
  theme: 'light-theme',
  currentUser: null, // Stores { id, name, role } when authenticated
  checklist: {
    chk_guide_1: false,
    chk_guide_2: false,
    chk_guide_3: false,
    chk_guide_4: false,
    chk_guide_5: false
  },
  overview: {
    interview_date: '',
    operator_contact: '',
    coord_leader: '',
    coord_member1: '',
    coord_member2: ''
  },
  teachers: [], // Array of { name, role, subject, career, contact }
  infra: {
    school_name: '',
    school_region: '서울',
    school_address: '',
    school_level: '초',
    school_est_type: '공립',
    school_lead_type: '일반',
    school_lead_status: '유',
    count_teachers: '',
    count_staff: '',
    count_classes: '',
    count_students: '',
    teacher_devices: [], // Selected values
    teacher_device_etc_chk: false,
    teacher_device_etc: '',
    student_device_ratio: '100% 이상',
    tech_difficulties: [], // Selected values
    tech_difficulty_etc_chk: false,
    tech_difficulty_etc: '',
    budget_status: '',
    infra_notes: ''
  },
  goals: {
    participation_goals: [], // Selected values
    participation_goal_etc_chk: false,
    participation_goal_etc: ''
  },
  diagnosis: {
    digital_capacity: '중',
    digital_reaction: '매우 긍정적 및 선도적',
    capacity_opinion: ''
  },
  modules: {
    mod0_hours: 1,
    mod1_active: false,
    mod1_hours: 0,
    mod2_active: false,
    mod2_hours: 0,
    mod3_active: false,
    mod3_hours: 0,
    mod4_active: false,
    mod4_hours: 0,
    mod5_active: false,
    mod5_hours: 0,
    mod6_active: false,
    mod6_hours: 0,
    mod7_hours: 1
  },
  planning: [], // Array of { moduleNum, hours, date, method, tool, topic, note }
  etc_considerations: {
    consider_pre_level: '',
    consider_infra: '',
    consider_school_req: '',
    consider_etc: ''
  },
  summary: {
    sum_school_goal: '',
    sum_core_result: ''
  },
  photoBase64: '',
  signatureBase64: ''
};

// Global DOM references
const form = document.getElementById('consult-form');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const btnPrint = document.getElementById('btn-print');
const btnExportJson = document.getElementById('btn-export-json');
const btnImportJson = document.getElementById('btn-import-json');
const fileImport = document.getElementById('file-import');
const btnReset = document.getElementById('btn-reset');
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');

// Auth DOM references
const authGateway = document.getElementById('auth-gateway');
const appMainLayout = document.getElementById('app-main-layout');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const btnLogout = document.getElementById('btn-logout');
const goToSignup = document.getElementById('go-to-signup');
const goToLogin = document.getElementById('go-to-login');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayRole = document.getElementById('user-display-role');
const navAdminLi = document.getElementById('nav-admin-li');

// Autosave Timer
let autosaveTimeout = null;

// Initialize Web App
document.addEventListener('DOMContentLoaded', () => {
  // Lucide icon replacement
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  initNavigation();
  initChecklist();
  initDynamicTables();
  initTheme();
  initValidationEvents();
  initFileUpload();
  initSignaturePad();
  initAutosave();
  initAuth(); // Setup login and signup logic
  initSchoolSync(); // Bind school manager data remote sync button
});

// 1. Navigation Controller (Tabs)
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.content-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      
      // Update active nav link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update active section
      sections.forEach(sec => sec.classList.remove('active-section'));
      const activeSection = document.getElementById(targetId);
      activeSection.classList.add('active-section');
      
      // Smooth scroll inside content container
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  });
}

// 2. Checklist (Guide Page) Interaction
function initChecklist() {
  for (let i = 1; i <= 5; i++) {
    const chk = document.getElementById(`chk_guide_${i}`);
    const badge = document.getElementById(`badge_guide_${i}`);
    
    if (chk && badge) {
      chk.addEventListener('change', () => {
        state.checklist[`chk_guide_${i}`] = chk.checked;
        if (chk.checked) {
          badge.textContent = '안내 완료';
          badge.classList.add('complete');
        } else {
          badge.textContent = '미확인';
          badge.classList.remove('complete');
        }
        triggerAutosave();
      });
    }
  }
}

// 3. Theme Controller
function initTheme() {
  themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      state.theme = 'light-theme';
      themeToggleBtn.querySelector('span').textContent = '다크 모드';
      themeToggleBtn.querySelector('i').setAttribute('data-lucide', 'moon');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      state.theme = 'dark-theme';
      themeToggleBtn.querySelector('span').textContent = '라이트 모드';
      themeToggleBtn.querySelector('i').setAttribute('data-lucide', 'sun');
    }
    if (window.lucide) window.lucide.createIcons();
    triggerAutosave();
  });
}

// 4. Dynamic Tables (Teachers & Planning)
function initDynamicTables() {
  // Teacher Table
  const btnAddTeacher = document.getElementById('btn-add-teacher');
  btnAddTeacher.addEventListener('click', () => {
    addTeacherRow();
    triggerAutosave();
  });
  
  // Planning Table
  const btnAddPlan = document.getElementById('btn-add-plan');
  btnAddPlan.addEventListener('click', () => {
    addPlanningRow();
    triggerAutosave();
  });
}

function addTeacherRow(data = {}) {
  const tbody = document.querySelector('#table-teachers tbody');
  const rowCount = tbody.rows.length;
  const newRowIndex = rowCount + 1;
  const tr = document.createElement('tr');
  
  tr.innerHTML = `
    <td class="row-num text-center">${newRowIndex}</td>
    <td><input type="text" class="teacher-name" value="${data.name || ''}" placeholder="성명"></td>
    <td><input type="text" class="teacher-role" value="${data.role || ''}" placeholder="직책 (예: 교사, 부장)"></td>
    <td><input type="text" class="teacher-subject" value="${data.subject || ''}" placeholder="담당교과"></td>
    <td>
      <div style="display:flex; align-items:center; gap:4px;">
        <input type="number" class="teacher-career" value="${data.career || ''}" min="0" max="50" style="width: 70px;">
        <span>년차</span>
      </div>
    </td>
    <td><input type="text" class="teacher-contact" value="${data.contact || ''}" placeholder="연락처 정보 기재"></td>
    <td class="text-center">
      <button type="button" class="btn btn-small btn-danger btn-delete-row"><i data-lucide="trash-2"></i></button>
    </td>
  `;
  
  tr.querySelector('.btn-delete-row').addEventListener('click', () => {
    tr.remove();
    recalculateRowNumbers('#table-teachers');
    triggerAutosave();
  });

  // Bind change events to dynamic inputs for autosave
  tr.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', triggerAutosave);
  });
  
  tbody.appendChild(tr);
  if (window.lucide) window.lucide.createIcons();
}

function addPlanningRow(data = {}) {
  const tbody = document.querySelector('#table-planning tbody');
  const tr = document.createElement('tr');
  
  // Generate options based on active/selected modules
  let moduleOptions = '';
  const moduleNames = {
    0: '모듈0 (우리 학교 알아보기)',
    1: '모듈1 (학교 AI·디지털 리더 과정)',
    2: '모듈2 (수업 혁신을 위한 학부모 이해)',
    3: '모듈3 (학생 AI·디지털 기초 소양)',
    4: '모듈4 (AI·디지털 문제해결 실무)',
    5: '모듈5 (교과별 AI·디지털 수업 실천)',
    6: '모듈6 (AI·디지털 수업 자율 주제)',
    7: '모듈7 (우리 학교 변화 돌아보기)'
  };
  
  for (let i = 0; i <= 7; i++) {
    const isSelected = data.moduleNum !== undefined ? (Number(data.moduleNum) === i) : false;
    moduleOptions += `<option value="${i}" ${isSelected ? 'selected' : ''}>${moduleNames[i]}</option>`;
  }

  tr.innerHTML = `
    <td>
      <select class="plan-module">
        ${moduleOptions}
      </select>
    </td>
    <td>
      <div style="display:flex; align-items:center; gap:4px;">
        <input type="number" class="plan-hours" value="${data.hours !== undefined ? data.hours : 1}" min="1" max="12" style="width:55px;">
        <span>차시</span>
      </div>
    </td>
    <td><input type="datetime-local" class="plan-date" value="${data.date || ''}"></td>
    <td>
      <select class="plan-method">
        <option value="강의/토론" ${data.method === '강의/토론' ? 'selected' : ''}>강의/토론</option>
        <option value="실습/워크숍" ${data.method === '실습/워크숍' ? 'selected' : ''}>실습/워크숍</option>
        <option value="피드백/자문" ${data.method === '피드백/자문' ? 'selected' : ''}>피드백/자문</option>
        <option value="기타" ${data.method === '기타' ? 'selected' : ''}>기타</option>
      </select>
    </td>
    <td><input type="text" class="plan-tool" value="${data.tool || ''}" placeholder="예: GEMINI, 패들렛 등"></td>
    <td><input type="text" class="plan-topic" value="${data.topic || ''}" placeholder="세부 운영 내용"></td>
    <td><input type="text" class="plan-note" value="${data.note || ''}" placeholder="비고"></td>
    <td class="text-center">
      <button type="button" class="btn btn-small btn-danger btn-delete-row"><i data-lucide="trash-2"></i></button>
    </td>
  `;
  
  tr.querySelector('.btn-delete-row').addEventListener('click', () => {
    tr.remove();
    triggerAutosave();
  });

  // Bind change events to dynamic inputs for autosave and validation
  tr.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => {
      performValidation();
      triggerAutosave();
    });
    el.addEventListener('input', triggerAutosave);
  });
  
  tbody.appendChild(tr);
  if (window.lucide) window.lucide.createIcons();
}

function recalculateRowNumbers(tableId) {
  const rows = document.querySelectorAll(`${tableId} tbody tr`);
  rows.forEach((row, index) => {
    row.querySelector('.row-num').textContent = index + 1;
  });
}

// 5. Training Modules Validation Controller
function toggleModuleHourInput(moduleId) {
  const activeChk = document.getElementById(`mod${moduleId}_active`);
  const hoursInput = document.getElementById(`mod${moduleId}_hours`);
  const card = document.querySelector(`.module-item-card[data-module-id="${moduleId}"]`);
  
  if (activeChk.checked) {
    hoursInput.disabled = false;
    if (hoursInput.value === '0') {
      hoursInput.value = (moduleId === 5 || moduleId === 6) ? 2 : 1;
    }
    card.classList.add('active-module');
  } else {
    hoursInput.disabled = true;
    hoursInput.value = 0;
    card.classList.remove('active-module');
  }
  
  performValidation();
  triggerAutosave();
}

// Validation logic implementation
function performValidation() {
  const mod0_hours = 1;
  const mod1_hours = document.getElementById('mod1_active').checked ? Number(document.getElementById('mod1_hours').value) : 0;
  const mod2_hours = document.getElementById('mod2_active').checked ? Number(document.getElementById('mod2_hours').value) : 0;
  const mod3_hours = document.getElementById('mod3_active').checked ? Number(document.getElementById('mod3_hours').value) : 0;
  const mod4_hours = document.getElementById('mod4_active').checked ? Number(document.getElementById('mod4_hours').value) : 0;
  const mod5_hours = document.getElementById('mod5_active').checked ? Number(document.getElementById('mod5_hours').value) : 0;
  const mod6_hours = document.getElementById('mod6_active').checked ? Number(document.getElementById('mod6_hours').value) : 0;
  const mod7_hours = 1;

  const totalHours = mod0_hours + mod1_hours + mod2_hours + mod3_hours + mod4_hours + mod5_hours + mod6_hours + mod7_hours;
  const limitedHours = mod1_hours + mod2_hours + mod3_hours;

  const totalHoursEl = document.getElementById('current-total-hours');
  const limitedHoursEl = document.getElementById('current-limited-hours');

  if (totalHoursEl) totalHoursEl.textContent = totalHours;
  if (limitedHoursEl) limitedHoursEl.textContent = limitedHours;

  let rule1_ok = true; 
  let rule2_ok = totalHours >= 12; 
  let rule3_ok = limitedHours <= 5; 
  
  let rule4_ok = true;
  if (document.getElementById('mod5_active').checked && mod5_hours < 2) rule4_ok = false;
  if (document.getElementById('mod6_active').checked && mod6_hours < 2) rule4_ok = false;

  updateRuleIndicator('rule-1', rule1_ok);
  updateRuleIndicator('rule-2', rule2_ok);
  updateRuleIndicator('rule-3', rule3_ok);
  updateRuleIndicator('rule-4', rule4_ok);

  updateSidebarIndicator('val-required-modules', rule1_ok);
  updateSidebarIndicator('val-total-hours', rule2_ok);
  updateSidebarIndicator('val-limit-modules', rule3_ok);
  updateSidebarIndicator('val-teacher-hours', rule4_ok);
}

function updateRuleIndicator(elementId, isSuccess) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isSuccess) {
    el.className = 'rule-success';
    el.querySelector('i').setAttribute('data-lucide', 'circle-check');
  } else {
    el.className = 'rule-error';
    el.querySelector('i').setAttribute('data-lucide', 'circle-x');
  }
  if (window.lucide) window.lucide.createIcons();
}

function updateSidebarIndicator(elementId, isSuccess) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const iconSpan = el.querySelector('.ind-icon');
  if (isSuccess) {
    iconSpan.className = 'ind-icon success';
    iconSpan.querySelector('i').setAttribute('data-lucide', 'circle-check');
  } else {
    iconSpan.className = 'ind-icon error';
    iconSpan.querySelector('i').setAttribute('data-lucide', 'circle-alert');
  }
  if (window.lucide) window.lucide.createIcons();
}

function initValidationEvents() {
  const inputsToValidate = [
    'mod1_hours', 'mod2_hours', 'mod3_hours', 
    'mod4_hours', 'mod5_hours', 'mod6_hours'
  ];
  inputsToValidate.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', performValidation);
  });
}

// 6. File Upload Dropzone (Photo proof)
function initFileUpload() {
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('photo-input');
  const previewContainer = document.getElementById('photo-preview-container');
  const previewImg = document.getElementById('photo-preview');
  const btnRemove = document.getElementById('btn-remove-photo');

  if (!dropzone) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnRemove && !btnRemove.contains(e.target)) {
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    state.photoBase64 = '';
    previewImg.src = '';
    previewContainer.classList.add('hidden');
    fileInput.value = '';
    triggerAutosave();
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 등록 가능합니다.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      state.photoBase64 = base64String;
      previewImg.src = base64String;
      previewContainer.classList.remove('hidden');
      triggerAutosave();
      showToast('사진이 등록되었습니다.', 'success');
    };
    reader.readAsDataURL(file);
  }
}

// 7. Signature Canvas Controller
function initSignaturePad() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const btnClear = document.getElementById('btn-clear-signature');
  const btnLock = document.getElementById('btn-lock-signature');
  const placeholder = document.getElementById('sig-placeholder');
  
  let isDrawing = false;
  let hasSigned = false;
  let isLocked = false;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.strokeStyle = document.body.classList.contains('dark-theme') ? '#ffffff' : '#000000';
    
    if (state.signatureBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = state.signatureBase64;
      placeholder.classList.add('hidden');
      hasSigned = true;
    }
  }

  setTimeout(resizeCanvas, 300);
  window.addEventListener('resize', resizeCanvas);
  
  themeToggleBtn.addEventListener('click', () => {
    setTimeout(() => {
      ctx.strokeStyle = document.body.classList.contains('dark-theme') ? '#ffffff' : '#000000';
    }, 100);
  });

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
  });

  function startDrawing(e) {
    if (isLocked) return;
    isDrawing = true;
    placeholder.classList.add('hidden');
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function draw(e) {
    if (!isDrawing || isLocked) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    hasSigned = true;
  }

  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      ctx.closePath();
      state.signatureBase64 = canvas.toDataURL();
      triggerAutosave();
    }
  }

  btnClear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.signatureBase64 = '';
    placeholder.classList.remove('hidden');
    hasSigned = false;
    isLocked = false;
    btnLock.innerHTML = '<i data-lucide="lock"></i> 서명 완료';
    canvas.style.cursor = 'crosshair';
    if (window.lucide) window.lucide.createIcons();
    triggerAutosave();
    showToast('서명이 지워졌습니다.', 'success');
  });

  btnLock.addEventListener('click', () => {
    if (!hasSigned && !state.signatureBase64) {
      showToast('서명 캔버스에 서명을 작성해 주세요.', 'error');
      return;
    }
    
    if (isLocked) {
      isLocked = false;
      btnLock.innerHTML = '<i data-lucide="lock"></i> 서명 완료';
      canvas.style.cursor = 'crosshair';
      showToast('서명 잠금이 해제되었습니다. 수정 가능합니다.', 'success');
    } else {
      isLocked = true;
      btnLock.innerHTML = '<i data-lucide="lock-open"></i> 서명 수정';
      canvas.style.cursor = 'not-allowed';
      state.signatureBase64 = canvas.toDataURL();
      triggerAutosave();
      showToast('서명이 잠겼습니다.', 'success');
    }
    if (window.lucide) window.lucide.createIcons();
  });
}

// 8. Autosave Implementation (Debounced)
function initAutosave() {
  const staticFields = [
    'interview_date', 'operator_contact', 'coord_leader', 'coord_member1', 'coord_member2',
    'school_name', 'school_address', 'school_level', 'school_est_type', 'school_lead_type',
    'count_teachers', 'count_staff', 'count_classes', 'count_students',
    'budget_status', 'infra_notes', 'capacity_opinion', 'consider_pre_level',
    'consider_infra', 'consider_school_req', 'consider_etc', 'sum_school_goal', 'sum_core_result',
    'teacher_device_etc', 'tech_difficulty_etc', 'participation_goal_etc'
  ];

  staticFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerAutosave);
    }
  });

  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', (e) => {
      if (e.target.id === 'teacher_device_etc_chk') {
        const target = document.getElementById('teacher_device_etc');
        if (target) target.disabled = !e.target.checked;
      }
      if (e.target.id === 'tech_difficulty_etc_chk') {
        const target = document.getElementById('tech_difficulty_etc');
        if (target) target.disabled = !e.target.checked;
      }
      if (e.target.id === 'participation_goal_etc_chk') {
        const target = document.getElementById('participation_goal_etc');
        if (target) target.disabled = !e.target.checked;
      }
      triggerAutosave();
    });
  });
}

function triggerAutosave() {
  if (!state.currentUser) return; // Prevent autosaving when not logged in
  document.getElementById('autosave-text').textContent = '입력 대기 중...';
  
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    saveToLocalStorage();
  }, 2000);
}

function saveToLocalStorage() {
  if (!state.currentUser) return;
  updateStateFromDOM();
  // Key data by current logged-in user ID for separation
  localStorage.setItem(`consult26_record_${state.currentUser.id}`, JSON.stringify(state));
  
  // If role is school, save infra data in a shared school slot for coordinators to sync
  if (state.currentUser.role === 'school' && state.infra.school_name) {
    const schoolNameClean = state.infra.school_name.trim();
    localStorage.setItem(`consult26_infra_${schoolNameClean}`, JSON.stringify(state.infra));
  }
  
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  document.getElementById('autosave-text').textContent = `자동 저장됨: ${timeStr}`;
}

function loadFromLocalStorage() {
  if (!state.currentUser) return;
  const data = localStorage.getItem(`consult26_record_${state.currentUser.id}`);
  if (data) {
    try {
      const savedState = JSON.parse(data);
      applyStateToDOM(savedState);
      showToast(`${state.currentUser.name} 코디네이터님의 데이터를 불러왔습니다.`, 'success');
    } catch (e) {
      console.error('Failed to restore data from LocalStorage', e);
    }
  } else {
    // Reset to defaults for new user
    applyStateToDOM({
      checklist: { chk_guide_1: false, chk_guide_2: false, chk_guide_3: false, chk_guide_4: false, chk_guide_5: false },
      overview: { interview_date: '', operator_contact: '', coord_leader: '', coord_member1: '', coord_member2: '' },
      teachers: [],
      infra: {
        school_name: '', school_region: '서울', school_address: '', school_level: '초', school_est_type: '공립', school_lead_type: '일반', school_lead_status: '유',
        count_teachers: '', count_staff: '', count_classes: '', count_students: '',
        teacher_devices: [], teacher_device_etc_chk: false, teacher_device_etc: '',
        student_device_ratio: '100% 이상',
        tech_difficulties: [], tech_difficulty_etc_chk: false, tech_difficulty_etc: '',
        budget_status: '', infra_notes: ''
      },
      goals: { participation_goals: [], participation_goal_etc_chk: false, participation_goal_etc: '' },
      diagnosis: { digital_capacity: '중', digital_reaction: '매우 긍정적 및 선도적', capacity_opinion: '' },
      modules: {
        mod0_hours: 1, mod1_active: false, mod1_hours: 0, mod2_active: false, mod2_hours: 0, mod3_active: false, mod3_hours: 0,
        mod4_active: false, mod4_hours: 0, mod5_active: false, mod5_hours: 0, mod6_active: false, mod6_hours: 0, mod7_hours: 1
      },
      planning: [],
      etc_considerations: { consider_pre_level: '', consider_infra: '', consider_school_req: '', consider_etc: '' },
      summary: { sum_school_goal: '', sum_core_result: '' },
      photoBase64: '',
      signatureBase64: ''
    });
    // Add default row items
    addTeacherRow();
    addTeacherRow();
    addPlanningRow({ moduleNum: 0, hours: 1 });
    addPlanningRow({ moduleNum: 7, hours: 1 });
  }
}

// Collect values from HTML and update the global state object
function updateStateFromDOM() {
  state.theme = document.body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
  
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`chk_guide_${i}`);
    if (el) state.checklist[`chk_guide_${i}`] = el.checked;
  }
  
  state.overview.interview_date = document.getElementById('interview_date').value;
  state.overview.operator_contact = document.getElementById('operator_contact').value;
  state.overview.coord_leader = document.getElementById('coord_leader').value;
  state.overview.coord_member1 = document.getElementById('coord_member1').value;
  state.overview.coord_member2 = document.getElementById('coord_member2').value;
  
  state.teachers = [];
  document.querySelectorAll('#table-teachers tbody tr').forEach(row => {
    state.teachers.push({
      name: row.querySelector('.teacher-name').value,
      role: row.querySelector('.teacher-role').value,
      subject: row.querySelector('.teacher-subject').value,
      career: row.querySelector('.teacher-career').value,
      contact: row.querySelector('.teacher-contact').value
    });
  });

  state.infra.school_name = document.getElementById('school_name').value;
  
  const regionActive = document.querySelector('input[name="school_region"]:checked');
  state.infra.school_region = regionActive ? regionActive.value : '서울';
  state.infra.school_address = document.getElementById('school_address').value;
  state.infra.school_level = document.getElementById('school_level').value;
  state.infra.school_est_type = document.getElementById('school_est_type').value;
  state.infra.school_lead_type = document.getElementById('school_lead_type').value;
  
  const leadActive = document.querySelector('input[name="school_lead_status"]:checked');
  state.infra.school_lead_status = leadActive ? leadActive.value : '유';
  
  state.infra.count_teachers = document.getElementById('count_teachers').value;
  state.infra.count_staff = document.getElementById('count_staff').value;
  state.infra.count_classes = document.getElementById('count_classes').value;
  state.infra.count_students = document.getElementById('count_students').value;
  
  state.infra.teacher_devices = [];
  document.querySelectorAll('input[name="teacher_device"]:checked').forEach(cb => {
    state.infra.teacher_devices.push(cb.value);
  });
  state.infra.teacher_device_etc_chk = document.getElementById('teacher_device_etc_chk').checked;
  state.infra.teacher_device_etc = document.getElementById('teacher_device_etc').value;
  
  const ratioActive = document.querySelector('input[name="student_device_ratio"]:checked');
  state.infra.student_device_ratio = ratioActive ? ratioActive.value : '100% 이상';
  
  state.infra.tech_difficulties = [];
  document.querySelectorAll('input[name="tech_difficulty"]:checked').forEach(cb => {
    state.infra.tech_difficulties.push(cb.value);
  });
  state.infra.tech_difficulty_etc_chk = document.getElementById('tech_difficulty_etc_chk').checked;
  state.infra.tech_difficulty_etc = document.getElementById('tech_difficulty_etc').value;
  
  state.infra.budget_status = document.getElementById('budget_status').value;
  state.infra.infra_notes = document.getElementById('infra_notes').value;
  
  state.goals.participation_goals = [];
  document.querySelectorAll('input[name="participation_goal"]:checked').forEach(cb => {
    state.goals.participation_goals.push(cb.value);
  });
  state.goals.participation_goal_etc_chk = document.getElementById('participation_goal_etc_chk').checked;
  state.goals.participation_goal_etc = document.getElementById('participation_goal_etc').value;

  const capacityActive = document.querySelector('input[name="digital_capacity"]:checked');
  state.diagnosis.digital_capacity = capacityActive ? capacityActive.value : '중';
  
  const reactionActive = document.querySelector('input[name="digital_reaction"]:checked');
  state.diagnosis.digital_reaction = reactionActive ? reactionActive.value : '매우 긍정적 및 선도적';
  state.diagnosis.capacity_opinion = document.getElementById('capacity_opinion').value;

  state.modules.mod1_active = document.getElementById('mod1_active').checked;
  state.modules.mod1_hours = Number(document.getElementById('mod1_hours').value);
  state.modules.mod2_active = document.getElementById('mod2_active').checked;
  state.modules.mod2_hours = Number(document.getElementById('mod2_hours').value);
  state.modules.mod3_active = document.getElementById('mod3_active').checked;
  state.modules.mod3_hours = Number(document.getElementById('mod3_hours').value);
  state.modules.mod4_active = document.getElementById('mod4_active').checked;
  state.modules.mod4_hours = Number(document.getElementById('mod4_hours').value);
  state.modules.mod5_active = document.getElementById('mod5_active').checked;
  state.modules.mod5_hours = Number(document.getElementById('mod5_hours').value);
  state.modules.mod6_active = document.getElementById('mod6_active').checked;
  state.modules.mod6_hours = Number(document.getElementById('mod6_hours').value);

  state.planning = [];
  document.querySelectorAll('#table-planning tbody tr').forEach(row => {
    state.planning.push({
      moduleNum: row.querySelector('.plan-module').value,
      hours: row.querySelector('.plan-hours').value,
      date: row.querySelector('.plan-date').value,
      method: row.querySelector('.plan-method').value,
      tool: row.querySelector('.plan-tool').value,
      topic: row.querySelector('.plan-topic').value,
      note: row.querySelector('.plan-note').value
    });
  });

  state.etc_considerations.consider_pre_level = document.getElementById('consider_pre_level').value;
  state.etc_considerations.consider_infra = document.getElementById('consider_infra').value;
  state.etc_considerations.consider_school_req = document.getElementById('consider_school_req').value;
  state.etc_considerations.consider_etc = document.getElementById('consider_etc').value;

  state.summary.sum_school_goal = document.getElementById('sum_school_goal').value;
  state.summary.sum_core_result = document.getElementById('sum_core_result').value;
}

// Restore form view from a given state object
function applyStateToDOM(savedState) {
  state = { ...state, ...savedState };
  
  document.body.className = state.theme;
  if (state.theme === 'light-theme') {
    themeToggleBtn.querySelector('span').textContent = '다크 모드';
    themeToggleBtn.querySelector('i').setAttribute('data-lucide', 'moon');
  } else {
    themeToggleBtn.querySelector('span').textContent = '라이트 모드';
    themeToggleBtn.querySelector('i').setAttribute('data-lucide', 'sun');
  }

  for (let i = 1; i <= 5; i++) {
    const chk = document.getElementById(`chk_guide_${i}`);
    const badge = document.getElementById(`badge_guide_${i}`);
    if (chk && badge) {
      chk.checked = !!state.checklist[`chk_guide_${i}`];
      if (chk.checked) {
        badge.textContent = '안내 완료';
        badge.classList.add('complete');
      } else {
        badge.textContent = '미확인';
        badge.classList.remove('complete');
      }
    }
  }

  document.getElementById('interview_date').value = state.overview.interview_date || '';
  document.getElementById('operator_contact').value = state.overview.operator_contact || '';
  document.getElementById('coord_leader').value = state.overview.coord_leader || '';
  document.getElementById('coord_member1').value = state.overview.coord_member1 || '';
  document.getElementById('coord_member2').value = state.overview.coord_member2 || '';

  const teachersTbody = document.querySelector('#table-teachers tbody');
  teachersTbody.innerHTML = '';
  if (state.teachers && state.teachers.length > 0) {
    state.teachers.forEach(t => addTeacherRow(t));
  } else {
    addTeacherRow();
    addTeacherRow();
  }

  document.getElementById('school_name').value = state.infra.school_name || '';
  
  const regionRadio = document.querySelector(`input[name="school_region"][value="${state.infra.school_region}"]`);
  if (regionRadio) regionRadio.checked = true;
  
  document.getElementById('school_address').value = state.infra.school_address || '';
  document.getElementById('school_level').value = state.infra.school_level || '초';
  document.getElementById('school_est_type').value = state.infra.school_est_type || '공립';
  document.getElementById('school_lead_type').value = state.infra.school_lead_type || '일반';
  
  const leadRadio = document.querySelector(`input[name="school_lead_status"][value="${state.infra.school_lead_status}"]`);
  if (leadRadio) leadRadio.checked = true;

  document.getElementById('count_teachers').value = state.infra.count_teachers || '';
  document.getElementById('count_staff').value = state.infra.count_staff || '';
  document.getElementById('count_classes').value = state.infra.count_classes || '';
  document.getElementById('count_students').value = state.infra.count_students || '';

  document.querySelectorAll('input[name="teacher_device"]').forEach(cb => {
    cb.checked = state.infra.teacher_devices.includes(cb.value);
  });
  document.getElementById('teacher_device_etc_chk').checked = !!state.infra.teacher_device_etc_chk;
  document.getElementById('teacher_device_etc').value = state.infra.teacher_device_etc || '';
  document.getElementById('teacher_device_etc').disabled = !state.infra.teacher_device_etc_chk;

  const ratioRadio = document.querySelector(`input[name="student_device_ratio"][value="${state.infra.student_device_ratio}"]`);
  if (ratioRadio) ratioRadio.checked = true;

  document.querySelectorAll('input[name="tech_difficulty"]').forEach(cb => {
    cb.checked = state.infra.tech_difficulties.includes(cb.value);
  });
  document.getElementById('tech_difficulty_etc_chk').checked = !!state.infra.tech_difficulty_etc_chk;
  document.getElementById('tech_difficulty_etc').value = state.infra.tech_difficulty_etc || '';
  document.getElementById('tech_difficulty_etc').disabled = !state.infra.tech_difficulty_etc_chk;

  document.getElementById('budget_status').value = state.infra.budget_status || '';
  document.getElementById('infra_notes').value = state.infra.infra_notes || '';

  document.querySelectorAll('input[name="participation_goal"]').forEach(cb => {
    cb.checked = state.goals.participation_goals.includes(cb.value);
  });
  document.getElementById('participation_goal_etc_chk').checked = !!state.goals.participation_goal_etc_chk;
  document.getElementById('participation_goal_etc').value = state.goals.participation_goal_etc || '';
  document.getElementById('participation_goal_etc').disabled = !state.goals.participation_goal_etc_chk;

  const capRadio = document.querySelector(`input[name="digital_capacity"][value="${state.diagnosis.digital_capacity}"]`);
  if (capRadio) capRadio.checked = true;

  const reactRadio = document.querySelector(`input[name="digital_reaction"][value="${state.diagnosis.digital_reaction}"]`);
  if (reactRadio) reactRadio.checked = true;

  document.getElementById('capacity_opinion').value = state.diagnosis.capacity_opinion || '';

  for (let i = 1; i <= 6; i++) {
    const active = !!state.modules[`mod${i}_active`];
    const chk = document.getElementById(`mod${i}_active`);
    const input = document.getElementById(`mod${i}_hours`);
    const card = document.querySelector(`.module-item-card[data-module-id="${i}"]`);

    if (chk) chk.checked = active;
    if (input) {
      input.value = state.modules[`mod${i}_hours`] || 0;
      input.disabled = !active;
    }
    
    if (card) {
      if (active) {
        card.classList.add('active-module');
      } else {
        card.classList.remove('active-module');
      }
    }
  }

  const planningTbody = document.querySelector('#table-planning tbody');
  planningTbody.innerHTML = '';
  if (state.planning && state.planning.length > 0) {
    state.planning.forEach(p => addPlanningRow(p));
  } else {
    addPlanningRow({ moduleNum: 0, hours: 1 });
    addPlanningRow({ moduleNum: 7, hours: 1 });
  }

  document.getElementById('consider_pre_level').value = state.etc_considerations.consider_pre_level || '';
  document.getElementById('consider_infra').value = state.etc_considerations.consider_infra || '';
  document.getElementById('consider_school_req').value = state.etc_considerations.consider_school_req || '';
  document.getElementById('consider_etc').value = state.etc_considerations.consider_etc || '';

  document.getElementById('sum_school_goal').value = state.summary.sum_school_goal || '';
  document.getElementById('sum_core_result').value = state.summary.sum_core_result || '';

  const previewImg = document.getElementById('photo-preview');
  const previewContainer = document.getElementById('photo-preview-container');
  if (state.photoBase64) {
    previewImg.src = state.photoBase64;
    previewContainer.classList.remove('hidden');
  } else {
    previewImg.src = '';
    previewContainer.classList.add('hidden');
  }

  const canvas = document.getElementById('signature-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('sig-placeholder');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.signatureBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = state.signatureBase64;
      placeholder.classList.add('hidden');
    } else {
      placeholder.classList.remove('hidden');
    }
  }

  if (window.lucide) window.lucide.createIcons();
  performValidation();
}

// 9. JSON Import / Export & Reset
btnExportJson.addEventListener('click', () => {
  updateStateFromDOM();
  const schoolName = state.infra.school_name || '미지정학교';
  const fileName = `2026_학교컨설팅_심층면담_${schoolName}.json`;
  
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('JSON 데이터 파일이 내보내기 되었습니다.', 'success');
});

btnImportJson.addEventListener('click', () => {
  fileImport.click();
});

fileImport.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsedData = JSON.parse(event.target.result);
      applyStateToDOM(parsedData);
      saveToLocalStorage();
      showToast('JSON 파일을 성공적으로 불러왔습니다.', 'success');
    } catch (err) {
      showToast('올바르지 않은 JSON 파일입니다.', 'error');
      console.error(err);
    }
  };
  reader.readAsText(file);
  fileImport.value = '';
});

btnReset.addEventListener('click', () => {
  if (confirm('정말로 모든 기록 데이터를 초기화하시겠습니까?\n작성 중인 정보가 모두 사라집니다.')) {
    if (state.currentUser) {
      localStorage.removeItem(`consult26_record_${state.currentUser.id}`);
    }
    
    state = {
      ...state,
      checklist: { chk_guide_1: false, chk_guide_2: false, chk_guide_3: false, chk_guide_4: false, chk_guide_5: false },
      overview: { interview_date: '', operator_contact: '', coord_leader: '', coord_member1: '', coord_member2: '' },
      teachers: [],
      infra: {
        school_name: '', school_region: '서울', school_address: '', school_level: '초', school_est_type: '공립', school_lead_type: '일반', school_lead_status: '유',
        count_teachers: '', count_staff: '', count_classes: '', count_students: '',
        teacher_devices: [], teacher_device_etc_chk: false, teacher_device_etc: '',
        student_device_ratio: '100% 이상',
        tech_difficulties: [], tech_difficulty_etc_chk: false, tech_difficulty_etc: '',
        budget_status: '', infra_notes: ''
      },
      goals: { participation_goals: [], participation_goal_etc_chk: false, participation_goal_etc: '' },
      diagnosis: { digital_capacity: '중', digital_reaction: '매우 긍정적 및 선도적', capacity_opinion: '' },
      modules: {
        mod0_hours: 1, mod1_active: false, mod1_hours: 0, mod2_active: false, mod2_hours: 0, mod3_active: false, mod3_hours: 0,
        mod4_active: false, mod4_hours: 0, mod5_active: false, mod5_hours: 0, mod6_active: false, mod6_hours: 0, mod7_hours: 1
      },
      planning: [],
      etc_considerations: { consider_pre_level: '', consider_infra: '', consider_school_req: '', consider_etc: '' },
      summary: { sum_school_goal: '', sum_core_result: '' },
      photoBase64: '',
      signatureBase64: ''
    };

    applyStateToDOM(state);
    
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      document.getElementById('sig-placeholder').classList.remove('hidden');
    }

    showToast('데이터가 초기화되었습니다.', 'success');
  }
});

// 10. Print / PDF Export Handler
btnPrint.addEventListener('click', () => {
  updateStateFromDOM();
  document.querySelectorAll('textarea').forEach(ta => {
    ta.textContent = ta.value;
  });
  window.print();
});

// 11. LOGIN & USER MANAGEMENT MODULE
function initAuth() {
  // Pre-seed some default users in LocalStorage if not exists
  let users = JSON.parse(localStorage.getItem('consult26_users')) || [];
  
  // Ensure default accounts are seeded (Admin and School Manager)
  const hasAdmin = users.some(u => u.id === 'admin');
  const hasSchool = users.some(u => u.id === 'school');
  
  if (!hasAdmin || !hasSchool) {
    if (!hasAdmin) {
      users.push({
        id: 'admin',
        name: '시스템 관리자',
        pw: 'admin123',
        role: 'admin',
        date: new Date().toLocaleDateString()
      });
    }
    if (!hasSchool) {
      users.push({
        id: 'school',
        name: '신성초 담당자',
        pw: 'school123',
        role: 'school',
        date: new Date().toLocaleDateString()
      });
    }
    localStorage.setItem('consult26_users', JSON.stringify(users));
  }

  // Switch between forms
  goToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  });

  goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // Handle Login submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value;

    const matchedUser = users.find(u => u.id === id && u.pw === pw);
    if (matchedUser) {
      authenticateUser(matchedUser);
      showToast(`${matchedUser.name}님 환영합니다!`, 'success');
    } else {
      showToast('아이디 또는 비밀번호가 일치하지 않습니다.', 'error');
    }
  });

  // Handle Signup submission
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('signup-id').value.trim();
    const name = document.getElementById('signup-name').value.trim();
    const pw = document.getElementById('signup-pw').value;
    const role = document.getElementById('signup-role').value;

    if (pw.length < 6) {
      showToast('비밀번호는 최소 6자리 이상이어야 합니다.', 'error');
      return;
    }

    // Refresh users list from localStorage
    users = JSON.parse(localStorage.getItem('consult26_users')) || [];
    if (users.some(u => u.id === id)) {
      showToast('이미 사용 중인 아이디입니다.', 'error');
      return;
    }

    const newUser = {
      id,
      name,
      pw,
      role,
      date: new Date().toLocaleDateString()
    };
    users.push(newUser);
    localStorage.setItem('consult26_users', JSON.stringify(users));
    
    showToast('회원가입이 완료되었습니다! 로그인 해 주세요.', 'success');
    
    // Switch to login
    signupForm.reset();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // Handle Logout
  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('consult26_session');
    state.currentUser = null;
    
    // Blur layout and show gateway overlay
    appMainLayout.classList.add('blur-content');
    authGateway.classList.remove('hidden');
    
    // Clear forms
    loginForm.reset();
    
    showToast('로그아웃 되었습니다.', 'success');
  });

  // Password Visibility Toggle Logic
  document.querySelectorAll('.btn-toggle-pw').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
      } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
      }
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });

  // Check existing session on load
  const activeSession = sessionStorage.getItem('consult26_session');
  if (activeSession) {
    try {
      const sessionUser = JSON.parse(activeSession);
      authenticateUser(sessionUser, true);
    } catch (err) {
      sessionStorage.removeItem('consult26_session');
    }
  }
}

// Authenticate user, reveal dashboard, and load specialized record data
function authenticateUser(user, isSessionRestore = false) {
  state.currentUser = user;
  sessionStorage.setItem('consult26_session', JSON.stringify(user));
  
  // Set UI profiles labels
  userDisplayName.textContent = `${user.name} 코디네이터`;
  
  const roleNames = {
    admin: '시스템 관리자',
    user: '일반 코디네이터',
    school: '학교 담당자'
  };
  userDisplayRole.textContent = roleNames[user.role] || '일반 회원';
  
  // Reveal layout and hide overlay gateway
  appMainLayout.classList.remove('blur-content');
  authGateway.classList.add('hidden');
  
  const syncBtn = document.getElementById('btn-sync-school-infra');
  
  // Check authorization roles
  if (user.role === 'admin') {
    navAdminLi.classList.remove('hidden');
    renderAdminUserManagement();
    enableAllTabs();
    if (syncBtn) syncBtn.classList.remove('hidden');
  } else if (user.role === 'school') {
    navAdminLi.classList.add('hidden');
    restrictTabsForSchool();
    if (syncBtn) syncBtn.classList.add('hidden');
  } else {
    navAdminLi.classList.add('hidden');
    enableAllTabs();
    if (syncBtn) syncBtn.classList.remove('hidden');
  }

  // Load this user's specific records
  loadFromLocalStorage();
  
  // Force canvas resizing inside restored view
  setTimeout(() => {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      window.dispatchEvent(new Event('resize'));
    }
  }, 200);
}

// Helper: Restrict UI navigation for school managers
function restrictTabsForSchool() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const target = link.getAttribute('data-target');
    if (target === 'section-infra') {
      link.parentElement.classList.remove('hidden');
      link.classList.add('active');
    } else {
      link.parentElement.classList.add('hidden');
      link.classList.remove('active');
    }
  });

  const sections = document.querySelectorAll('.content-section');
  sections.forEach(sec => {
    if (sec.id === 'section-infra') {
      sec.classList.add('active-section');
    } else {
      sec.classList.remove('active-section');
    }
  });

  // Hide system top buttons (export, import, print, reset)
  const sysActions = document.querySelector('.system-actions');
  if (sysActions) sysActions.classList.add('hidden');
}

// Helper: Restore UI navigation to full access
function enableAllTabs() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.parentElement.classList.remove('hidden');
  });
  
  // Restore top actions
  const sysActions = document.querySelector('.system-actions');
  if (sysActions) sysActions.classList.remove('hidden');
}

// Helper: School Manager remote infra data synchronization
function initSchoolSync() {
  const syncBtn = document.getElementById('btn-sync-school-infra');
  if (!syncBtn) return;

  syncBtn.addEventListener('click', () => {
    const schoolNameInput = document.getElementById('school_name');
    if (!schoolNameInput) return;

    const schoolName = schoolNameInput.value.trim();
    if (!schoolName) {
      showToast('학교명을 먼저 입력해 주세요. (예: 신성초)', 'error');
      return;
    }

    const sharedDataStr = localStorage.getItem(`consult26_infra_${schoolName}`);
    if (sharedDataStr) {
      try {
        const parsedInfra = JSON.parse(sharedDataStr);
        state.infra = { ...state.infra, ...parsedInfra };
        
        // Re-apply synced infra data to DOM
        applyInfraToDOM(state.infra);
        triggerAutosave();
        
        showToast(`[${schoolName}] 담당자가 작성한 최신 인프라 정보를 연동했습니다.`, 'success');
      } catch (err) {
        showToast('인프라 데이터를 불러오는 데 실패했습니다.', 'error');
      }
    } else {
      showToast(`가입된 [${schoolName}] 담당자의 인프라 데이터가 없습니다. (학교 담당자 계정으로 로그인해 인프라 정보를 먼저 저장해야 합니다.)`, 'error');
    }
  });
}

// Helper: Bind Sync Infra data to input controls
function applyInfraToDOM(infra) {
  document.getElementById('school_name').value = infra.school_name || '';
  
  const regionRadio = document.querySelector(`input[name="school_region"][value="${infra.school_region}"]`);
  if (regionRadio) regionRadio.checked = true;
  
  document.getElementById('school_address').value = infra.school_address || '';
  document.getElementById('school_level').value = infra.school_level || '초';
  document.getElementById('school_est_type').value = infra.school_est_type || '공립';
  document.getElementById('school_lead_type').value = infra.school_lead_type || '일반';
  
  const leadRadio = document.querySelector(`input[name="school_lead_status"][value="${infra.school_lead_status}"]`);
  if (leadRadio) leadRadio.checked = true;

  document.getElementById('count_teachers').value = infra.count_teachers || '';
  document.getElementById('count_staff').value = infra.count_staff || '';
  document.getElementById('count_classes').value = infra.count_classes || '';
  document.getElementById('count_students').value = infra.count_students || '';

  // Checkboxes for teacher devices
  document.querySelectorAll('input[name="teacher_device"]').forEach(cb => {
    cb.checked = infra.teacher_devices.includes(cb.value);
  });
  document.getElementById('teacher_device_etc_chk').checked = !!infra.teacher_device_etc_chk;
  document.getElementById('teacher_device_etc').value = infra.teacher_device_etc || '';
  document.getElementById('teacher_device_etc').disabled = !infra.teacher_device_etc_chk;

  // Student device ratio
  const ratioRadio = document.querySelector(`input[name="student_device_ratio"][value="${infra.student_device_ratio}"]`);
  if (ratioRadio) ratioRadio.checked = true;

  // Technical difficulties
  document.querySelectorAll('input[name="tech_difficulty"]').forEach(cb => {
    cb.checked = infra.tech_difficulties.includes(cb.value);
  });
  document.getElementById('tech_difficulty_etc_chk').checked = !!infra.tech_difficulty_etc_chk;
  document.getElementById('tech_difficulty_etc').value = infra.tech_difficulty_etc || '';
  document.getElementById('tech_difficulty_etc').disabled = !infra.tech_difficulty_etc_chk;

  document.getElementById('budget_status').value = infra.budget_status || '';
  document.getElementById('infra_notes').value = infra.infra_notes || '';
}

// Render registered users in admin management table
function renderAdminUserManagement() {
  const tbody = document.querySelector('#table-users-admin tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const users = JSON.parse(localStorage.getItem('consult26_users')) || [];
  
  users.forEach((u, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${u.id}</strong></td>
      <td>${u.name}</td>
      <td><span class="user-role-tag" style="background:${u.role === 'admin' ? 'var(--primary-glow)' : 'var(--secondary-glow)'}; color:${u.role === 'admin' ? 'var(--primary)' : 'var(--secondary)'}">${u.role === 'admin' ? '관리자' : '일반'}</span></td>
      <td>${u.date || '-'}</td>
      <td class="text-center">
        <button type="button" class="btn btn-small btn-danger btn-delete-user" data-user-id="${u.id}" ${u.id === 'admin' ? 'disabled' : ''}><i data-lucide="user-x"></i> 삭제</button>
      </td>
    `;
    
    // Wire delete event
    const btnDel = tr.querySelector('.btn-delete-user');
    if (btnDel) {
      btnDel.addEventListener('click', (e) => {
        const idToDelete = e.target.getAttribute('data-user-id') || e.target.closest('.btn-delete-user').getAttribute('data-user-id');
        if (confirm(`정말로 계정 [ ${idToDelete} ] 을 삭제하시겠습니까?\n이 회원이 저장한 모든 면담 데이터도 삭제됩니다.`)) {
          deleteUserAccount(idToDelete);
        }
      });
    }

    tbody.appendChild(tr);
  });
  
  if (window.lucide) window.lucide.createIcons();
}

function deleteUserAccount(userId) {
  let users = JSON.parse(localStorage.getItem('consult26_users')) || [];
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('consult26_users', JSON.stringify(users));
  
  // Wipe associated data
  localStorage.removeItem(`consult26_record_${userId}`);
  
  showToast(`계정 [ ${userId} ] 이 정상 삭제되었습니다.`, 'success');
  
  // Re-render admin board
  renderAdminUserManagement();
}

// Helper: Toast Notifications
function showToast(message, type = 'success') {
  toastMsg.textContent = message;
  
  if (type === 'error') {
    toastEl.className = 'toast show error';
    toastIcon.setAttribute('data-lucide', 'circle-x');
  } else {
    toastEl.className = 'toast show';
    toastIcon.setAttribute('data-lucide', 'check-circle');
  }
  
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}
