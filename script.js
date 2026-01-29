// ========== 전역 변수 ==========
let classes = [];
let editingId = null;
const STORAGE_KEY = 'timetable-classes';

// 시간표 시간 (30분 단위)
const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const days = ['월', '화', '수', '목', '금'];

// 기본 강의 데이터 (수강신청 내역)
const defaultClasses = [];

// ========== 초기화 ==========
function init() {
    clearStorageData();
    loadClasses();
    renderTimetable();
    renderClassList();
    updateSummary();
    setupEventListeners();
}

// ========== LocalStorage ==========
function loadClasses() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        classes = JSON.parse(saved);
    } else {
        classes = [...defaultClasses];
        saveClasses();
    }
}

function saveClasses() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
}

// ========== 데이터 초기화 ==========
function clearStorageData() {
    localStorage.removeItem(STORAGE_KEY);
    classes = [];
}

// ========== 시간표 렌더링 ==========
function renderTimetable() {
    const timetable = document.getElementById('timetable');
    timetable.innerHTML = '';

    // 시간 열
    const timeColumn = document.createElement('div');
    timeColumn.className = 'time-column';
    timeColumn.innerHTML = '<div class="time-header"></div>';
    
    timeSlots.forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = time;
        timeColumn.appendChild(slot);
    });
    timetable.appendChild(timeColumn);

    // 요일 열
    days.forEach((day, dayIndex) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        dayColumn.appendChild(header);

        timeSlots.forEach((time, timeIndex) => {
            const slot = document.createElement('div');
            slot.className = 'class-slot';
            slot.dataset.day = dayIndex;
            slot.dataset.time = time;

            // 해당 시간에 수업이 있는지 확인
            const classAtTime = classes.find(c => 
                c.day === dayIndex && 
                c.startTime <= time && 
                c.endTime > time
            );

            if (classAtTime) {
                slot.classList.add('has-class', `color-${classAtTime.color}`);
                
                // 첫 슬롯에만 정보 표시
                if (classAtTime.startTime === time) {
                    slot.innerHTML = `
                        <div class="slot-name">${classAtTime.name}</div>
                        <div class="slot-room">${classAtTime.room || ''}</div>
                    `;
                }

                slot.onclick = () => editClass(classAtTime.id);
            }

            dayColumn.appendChild(slot);
        });

        timetable.appendChild(dayColumn);
    });
}

// ========== 강의 목록 렌더링 ==========
function renderClassList() {
    const classList = document.getElementById('classList');
    
    if (classes.length === 0) {
        classList.innerHTML = '<div class="empty-message">아직 추가된 강의가 없어요!<br>위의 폼에서 강의를 추가해보세요.</div>';
        return;
    }

    // 과목명으로 그룹화 (중복 제거)
    const uniqueClasses = {};
    classes.forEach(c => {
        if (!uniqueClasses[c.name]) {
            uniqueClasses[c.name] = {
                name: c.name,
                room: c.room,
                credit: c.credit,
                times: [],
                color: c.color,
                ids: []
            };
        }
        uniqueClasses[c.name].times.push({
            day: days[c.day],
            time: `${c.startTime}~${c.endTime}`
        });
        uniqueClasses[c.name].ids.push(c.id);
    });

    classList.innerHTML = Object.values(uniqueClasses).map(c => `
        <div class="class-item">
            <div class="class-item-header">
                <span class="class-item-name">${c.name}</span>
                <div class="class-item-actions">
                    <button class="btn-small btn-delete" onclick="deleteClassByName('${c.name}')">삭제</button>
                </div>
            </div>
            <div class="class-item-info">📍 ${c.room || '강의실 미지정'}</div>
            <div class="class-item-info">🕐 ${c.times.map(t => `${t.day} ${t.time}`).join(', ')}</div>
            <div class="class-item-info">⭐ ${c.credit}학점</div>
        </div>
    `).join('');
}

// ========== 요약 업데이트 ==========
function updateSummary() {
    const uniqueClasses = new Set(classes.map(c => c.name));
    const totalCredits = classes.reduce((sum, c) => sum + (c.credit || 0), 0);
    const totalMinutes = classes.reduce((sum, c) => {
        const start = timeToMinutes(c.startTime);
        const end = timeToMinutes(c.endTime);
        return sum + (end - start);
    }, 0);

    document.getElementById('totalCredits').textContent = `${totalCredits}학점`;
    document.getElementById('totalClasses').textContent = `${uniqueClasses.size}과목`;
    document.getElementById('weeklyHours').textContent = `${Math.round(totalMinutes / 60)}시간`;
}

// ========== 이벤트 리스너 ==========
function setupEventListeners() {
    document.getElementById('classForm').addEventListener('submit', handleSubmit);
}

// ========== 폼 제출 ==========
function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('className').value;
    const room = document.getElementById('classRoom').value;
    const credit = parseInt(document.getElementById('classCredit').value);
    const day = parseInt(document.getElementById('classDay').value);
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    // 유효성 검사
    if (startTime >= endTime) {
        alert('종료 시간은 시작 시간보다 늦어야 합니다.');
        return;
    }

    // 시간 충돌 검사
    const conflict = classes.find(c => 
        c.day === day && 
        !(c.endTime <= startTime || c.startTime >= endTime)
    );

    if (conflict) {
        if (!confirm(`"${conflict.name}"와 시간이 겹칩니다. 그래도 추가하시겠습니까?`)) {
            return;
        }
    }

    // 색상 할당
    const existingClass = classes.find(c => c.name === name);
    const color = existingClass ? existingClass.color : (classes.length % 8) + 1;

    // 강의 추가
    const newClass = {
        id: Date.now(),
        name,
        room,
        day,
        startTime,
        endTime,
        color,
        credit
    };

    classes.push(newClass);
    saveClasses();
    renderTimetable();
    renderClassList();
    updateSummary();

    // 폼 초기화
    e.target.reset();
    alert('강의가 추가되었습니다!');
}

// ========== 강의 수정 ==========
function editClass(id) {
    const classData = classes.find(c => c.id === id);
    if (!classData) return;

    document.getElementById('className').value = classData.name;
    document.getElementById('classRoom').value = classData.room;
    document.getElementById('classDay').value = classData.day;
    document.getElementById('startTime').value = classData.startTime;
    document.getElementById('endTime').value = classData.endTime;

    editingId = id;
    
    const btn = document.querySelector('.add-btn');
    btn.textContent = '✏️ 수정 완료';
    btn.style.background = 'linear-gradient(135deg, #fff7c4 0%, #fff4b8 100%)';
    btn.style.color = '#665000';

    // 수정 모드에서는 기존 데이터 삭제 후 추가
    classes = classes.filter(c => c.id !== id);
    saveClasses();
    renderTimetable();
    renderClassList();
}

// ========== 강의 삭제 (과목명으로) ==========
function deleteClassByName(name) {
    if (!confirm(`"${name}" 강의를 모두 삭제하시겠습니까?`)) return;

    classes = classes.filter(c => c.name !== name);
    saveClasses();
    renderTimetable();
    renderClassList();
    updateSummary();
}

// ========== 유틸리티 ==========
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// ========== 초기 실행 ==========
init();
