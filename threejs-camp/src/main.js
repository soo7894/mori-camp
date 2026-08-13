import './style.css';
import { CampWorld } from './world.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = 'mori-camp-save-v2';
const CAMP_STEP_TOTAL = 25;

const initialState = {
  version: 5,
  day: 1,
  minutes: 8 * 60,
  money: 2400,
  reputation: 12,
  guests: 3,
  cleanliness: 91,
  satisfaction: 82,
  energy: 72,
  campSetup: {
    siteSelected: false,
    tentUnpacked: false,
    polesAssembled: false,
    stakes: 0,
    tablePlaced: false,
    chairPlaced: false,
    seated: false,
    burnerPlaced: false,
    burnerOn: false,
    burnerUsed: false,
    meatStarted: false,
    meatTurns: 0,
    meatCooked: false,
    soupStarted: false,
    soupStirs: 0,
    soupCooked: false,
    mealPrepared: false,
    mealEaten: false,
    coffeeBrewed: false,
    coffeeDrunk: false,
    dishwashingStarted: false,
    dishesScrubbed: 0,
    dishesStored: false,
    lanternPlaced: false,
    lanternOn: false,
    campfirePlaced: false,
    fireOn: false,
    fireWatched: false,
    slept: false,
  },
  selectedFacilityId: null,
  facilities: [
    { id: 'tent-pine', type: 'tent', position: [-4.3, -2.3], rotation: 0.06, level: 1 },
    { id: 'tent-lake', type: 'tent', position: [0.0, -3.8], rotation: -0.12, level: 1 },
    { id: 'fire-central', type: 'firepit', position: [-1.15, 1.3], rotation: 0, level: 1 },
  ],
};

const buildCatalog = {
  tent: { cost: 320, capacity: 4, reputation: 0 },
  glamping: { cost: 780, capacity: 4, reputation: 0 },
  firepit: { cost: 260, capacity: 0, reputation: 0 },
  shop: { cost: 640, capacity: 0, reputation: 0 },
  caravan: { cost: 1100, capacity: 4, reputation: 20 },
};

const buildPlots = [
  [-5.4, 0.3, -0.04],
  [2.5, 3.55, 0.12],
  [6.7, 3.45, -0.2],
  [7.0, -5.15, 0.1],
  [-1.8, -5.6, 0.05],
  [-6.7, -5.2, -0.1],
  [7.1, 0.4, 0.05],
];

const bookings = [
  { name: '해솔 가족 · 3명', request: '텐트 사이트 · 모닥불 선호', nights: 2, reward: 420, reputation: 2, count: 3 },
  { name: '도토리 캠핑클럽 · 2명', request: '호숫가 자리 · 낚시 희망', nights: 1, reward: 260, reputation: 1, count: 2 },
  { name: '별빛 커플 · 2명', request: '글램핑 · 조용한 구역', nights: 2, reward: 510, reputation: 3, count: 2 },
  { name: '초보 캠퍼 민준 · 1명', request: '텐트 사이트 · 장비 대여', nights: 1, reward: 180, reputation: 1, count: 1 },
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if ([2, 3, 4, 5].includes(saved?.version) && Array.isArray(saved.facilities)) {
      const campSetup = saved.version >= 4
        ? { ...structuredClone(initialState.campSetup), ...saved.campSetup }
        : structuredClone(initialState.campSetup);
      if (saved.version < 5 && saved.campSetup?.mealPrepared) {
        Object.assign(campSetup, {
          meatStarted: true,
          meatTurns: 3,
          meatCooked: true,
          soupStarted: true,
          soupStirs: 3,
          soupCooked: true,
        });
      }
      return {
        ...structuredClone(initialState),
        ...saved,
        version: 5,
        campSetup,
        selectedFacilityId: null,
      };
    }
  } catch (error) {
    console.warn('저장 데이터를 불러오지 못했습니다.', error);
  }
  return structuredClone(initialState);
}

const state = loadState();
let currentMode = 'manage';
let bookingIndex = state.day % bookings.length;
let toastTimer = null;
let currentCampTool = null;
let lastSuggestedAction = null;
let lastSimulationTime = performance.now();
let lastHour = Math.floor(state.minutes / 60);

const dom = {
  loading: $('#loading-screen'),
  day: $('#day-label'),
  time: $('#time-label'),
  money: $('#money-label'),
  reputation: $('#reputation-label'),
  guests: $('#guest-label'),
  satisfaction: $('#satisfaction-label'),
  satisfactionBar: $('#satisfaction-bar'),
  clean: $('#clean-label'),
  cleanBar: $('#clean-bar'),
  mission: $('#mission-label'),
  missionCount: $('#mission-count'),
  energy: $('#energy-label'),
  energyBar: $('#energy-bar'),
  toast: $('#toast'),
  toastIcon: $('#toast-icon'),
  toastText: $('#toast-text'),
  selection: $('#selection-card'),
  selectionEmoji: $('#selection-emoji'),
  selectionType: $('#selection-type'),
  selectionName: $('#selection-name'),
  selectionDescription: $('#selection-description'),
  selectionIncome: $('#selection-income'),
  selectionStatus: $('#selection-status'),
  upgradeCost: $('#upgrade-cost'),
  bookingName: $('#booking-name'),
  bookingRequest: $('#booking-request'),
  floating: $('#floating-layer'),
  campGuide: $('#camp-guide'),
  campProgress: $('#camp-progress'),
  campProgressBar: $('#camp-progress-bar'),
  campTaskTitle: $('#camp-task-title'),
  campTaskText: $('#camp-task-text'),
  campTool: $('#camp-tool-label'),
};

const world = new CampWorld($('#game-canvas'), {
  facilities: state.facilities,
  guests: state.guests,
  campSetup: state.campSetup,
  onSelect: handleFacilitySelection,
  onActivityComplete: completeActivity,
  onCampInteract: handleCampInteract,
});

function capacity() {
  return state.facilities.reduce((sum, facility) => {
    return sum + (buildCatalog[facility.type]?.capacity ?? 0);
  }, 0);
}

function facilityById(id) {
  return state.facilities.find((facility) => facility.id === id);
}

function money(value) {
  return `${Math.max(0, Math.round(value)).toLocaleString('ko-KR')} G`;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function updateUI() {
  const hour = Math.floor(state.minutes / 60);
  const minute = Math.floor(state.minutes % 60);
  dom.day.textContent = `DAY ${String(state.day).padStart(2, '0')}`;
  dom.time.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  dom.money.textContent = money(state.money);
  dom.reputation.textContent = state.reputation;
  dom.guests.textContent = `${state.guests} / ${capacity()}`;
  dom.satisfaction.textContent = `${Math.round(state.satisfaction)}%`;
  dom.satisfactionBar.style.width = `${clamp(state.satisfaction)}%`;
  dom.clean.textContent = `${Math.round(state.cleanliness)}%`;
  dom.cleanBar.style.width = `${clamp(state.cleanliness)}%`;
  dom.energy.textContent = Math.round(state.energy);
  dom.energyBar.style.width = `${clamp(state.energy)}%`;
  dom.missionCount.textContent = `${Math.min(5, state.guests)}/5`;
  dom.mission.textContent = state.guests >= 5 ? '미션 완료! 평판을 받았어요' : '캠퍼 5명 맞이하기';

  const caravanButton = $('[data-build="caravan"]');
  const unlocked = state.reputation >= buildCatalog.caravan.reputation;
  caravanButton.classList.toggle('locked', !unlocked);
  const lockLabel = caravanButton.querySelector('i');
  if (lockLabel) lockLabel.textContent = unlocked ? 'OPEN' : 'LOCK';

  world.setGuestCount(state.guests);
  world.setTime(state.minutes);
  updateSelectionCard();
  updateHandsOnUI();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, selectedFacilityId: null }));
}

function showToast(message, icon = '✓') {
  clearTimeout(toastTimer);
  dom.toastText.textContent = message;
  dom.toastIcon.textContent = icon;
  dom.toast.classList.add('show');
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2600);
}

function floatText(text, x = window.innerWidth / 2, y = window.innerHeight / 2) {
  const element = document.createElement('span');
  element.className = 'float-text';
  element.textContent = text;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  dom.floating.append(element);
  setTimeout(() => element.remove(), 1400);
}

function nextBooking() {
  bookingIndex = (bookingIndex + 1) % bookings.length;
  const booking = bookings[bookingIndex];
  dom.bookingName.textContent = booking.name;
  dom.bookingRequest.textContent = booking.request;
  const tags = $$('.booking-tags b');
  tags[0].textContent = `${booking.nights}박`;
  tags[1].textContent = `+${booking.reward} G`;
  tags[2].textContent = `평판 +${booking.reputation}`;
}

function findBuildPlot() {
  return buildPlots.find(([x, z]) => {
    return state.facilities.every((facility) => {
      const dx = facility.position[0] - x;
      const dz = facility.position[1] - z;
      return Math.hypot(dx, dz) > 2.5;
    });
  });
}

function buildFacility(type) {
  const item = buildCatalog[type];
  if (!item) return;
  if (state.reputation < item.reputation) {
    showToast(`평판 ${item.reputation}부터 지을 수 있어요.`, '★');
    return;
  }
  if (state.money < item.cost) {
    showToast('골드가 부족해요. 예약을 더 받아보세요!', '!');
    return;
  }
  const plot = findBuildPlot();
  if (!plot) {
    showToast('빈 건설 구역이 없어요. 다음 확장을 기다려주세요.', '!');
    return;
  }

  const facility = {
    id: `${type}-${Date.now()}`,
    type,
    position: [plot[0], plot[1]],
    rotation: plot[2],
    level: 1,
  };
  state.money -= item.cost;
  state.facilities.push(facility);
  state.satisfaction = clamp(state.satisfaction + (type === 'firepit' ? 4 : 2));
  world.addFacility(facility, true);
  const info = world.getFacilityInfo(type);
  showToast(`${info.name} 건설을 시작했어요!`, '✦');
  floatText(`-${item.cost} G`, window.innerWidth * 0.52, window.innerHeight * 0.47);
  saveState();
  updateUI();
}

function handleFacilitySelection(selection) {
  state.selectedFacilityId = selection?.id ?? null;
  updateSelectionCard();
}

function updateSelectionCard() {
  const facility = facilityById(state.selectedFacilityId);
  if (!facility) {
    dom.selection.classList.remove('visible');
    return;
  }
  const info = world.getFacilityInfo(facility.type);
  const level = facility.level ?? 1;
  dom.selectionEmoji.textContent = info.emoji;
  dom.selectionType.textContent = `FACILITY · LV.${level}`;
  dom.selectionName.textContent = info.name;
  dom.selectionDescription.textContent = info.description;
  dom.selectionIncome.textContent = `+${info.income + (level - 1) * 20} G`;
  dom.selectionStatus.textContent = state.cleanliness > 70 ? '아주 좋음' : state.cleanliness > 45 ? '보통' : '정돈 필요';
  dom.upgradeCost.textContent = money(180 + level * 120);
  dom.selection.classList.add('visible');
}

function upgradeSelectedFacility() {
  const facility = facilityById(state.selectedFacilityId);
  if (!facility) return;
  const cost = 180 + (facility.level ?? 1) * 120;
  if (state.money < cost) {
    showToast('업그레이드 골드가 부족해요.', '!');
    return;
  }
  state.money -= cost;
  facility.level = (facility.level ?? 1) + 1;
  state.reputation += 1;
  state.satisfaction = clamp(state.satisfaction + 3);
  world.upgradeFacility(facility.id);
  showToast(`${world.getFacilityInfo(facility.type).name}이 더 멋져졌어요!`, '★');
  floatText('LEVEL UP!', window.innerWidth * 0.68, window.innerHeight * 0.46);
  saveState();
  updateUI();
}

function acceptBooking() {
  const booking = bookings[bookingIndex];
  if (state.guests + booking.count > capacity()) {
    showToast('빈 숙박 자리가 부족해요. 텐트나 글램핑을 지어주세요!', '!');
    return;
  }
  state.guests += booking.count;
  state.money += Math.round(booking.reward * 0.3);
  state.reputation += booking.reputation;
  state.satisfaction = clamp(state.satisfaction + 1);
  world.setGuestCount(state.guests);
  world.spawnSparkles({ x: 4.5, y: 2.2, z: -2.0 }, 0xf3c34f, 16);
  showToast(`${booking.name}의 예약을 받았어요!`, '♥');
  floatText(`+${Math.round(booking.reward * 0.3)} G`, window.innerWidth * 0.78, 235);
  nextBooking();
  saveState();
  updateUI();
}

function cleanCamp() {
  if (state.cleanliness >= 98) {
    showToast('이미 반짝반짝 깨끗해요!', '✦');
    return;
  }
  if (state.money < 80) {
    showToast('청소에 필요한 골드가 부족해요.', '!');
    return;
  }
  state.money -= 80;
  state.cleanliness = clamp(state.cleanliness + 18);
  state.satisfaction = clamp(state.satisfaction + 2);
  world.spawnSparkles({ x: 0, y: 1.2, z: 0 }, 0xffffff, 22);
  showToast('캠핑장을 말끔하게 정돈했어요!', '✦');
  saveState();
  updateUI();
}

function campProgressCount() {
  const camp = state.campSetup;
  return [
    camp.siteSelected,
    camp.tentUnpacked,
    camp.polesAssembled,
    camp.stakes >= 4,
    camp.tablePlaced,
    camp.chairPlaced,
    camp.seated,
    camp.burnerPlaced,
    camp.burnerUsed,
    camp.meatStarted,
    camp.meatCooked,
    camp.soupStarted,
    camp.soupCooked,
    camp.mealEaten,
    camp.coffeeBrewed,
    camp.coffeeDrunk,
    camp.dishwashingStarted,
    camp.dishesScrubbed >= 3,
    camp.dishesStored,
    camp.lanternPlaced,
    camp.lanternOn,
    camp.campfirePlaced,
    camp.fireOn,
    camp.fireWatched,
    camp.slept,
  ].filter(Boolean).length;
}

function nextCampInstruction() {
  const camp = state.campSetup;
  if (!camp.siteSelected) return ['오늘의 사이트 선택', '오른쪽의 비어 있는 캠핑 사이트 바닥을 직접 눌러 자리를 정하세요.'];
  if (!camp.tentUnpacked) return ['텐트 펼치기', '가방에서 텐트를 꺼내 사이트 위에 직접 펼쳐보세요.'];
  if (!camp.polesAssembled) return ['텐트 폴대 조립', '폴대를 연결해 납작한 텐트의 뼈대를 세워주세요.'];
  if (camp.stakes < 4) return ['말뚝 못질하기', `망치를 들고 텐트 주변 말뚝을 하나씩 눌러 박으세요. (${camp.stakes}/4)`];
  if (!camp.tablePlaced) return ['테이블 직접 배치', '테이블을 꺼낸 뒤 원하는 땅을 클릭해서 놓으세요.'];
  if (!camp.chairPlaced) return ['의자 직접 배치', '의자를 꺼낸 뒤 테이블 근처의 원하는 곳을 클릭하세요.'];
  if (!camp.seated) return ['잠깐 앉아볼까요?', '방금 놓은 카키색 로우 체어를 직접 클릭하면 캐릭터가 앉습니다.'];
  if (!camp.burnerPlaced) return ['휴대용 버너 꺼내기', '부탄가스 캠핑 버너를 꺼내고 테이블 옆 땅을 클릭해 배치하세요.'];
  if (!camp.burnerUsed) return ['버너 점화', '배치한 캠핑 버너를 직접 클릭해 파란 불꽃을 켜세요. 다시 누르면 꺼집니다.'];
  if (!camp.burnerOn && !camp.mealPrepared) return ['버너 다시 켜기', '요리를 계속하려면 휴대용 버너를 직접 눌러 불을 다시 켜주세요.'];
  if (!camp.meatStarted) return ['고기 굽기 시작', '불이 켜진 버너에 그릴 팬을 올리고 고기를 구워보세요.'];
  if (!camp.meatCooked) return ['고기 직접 뒤집기', `버너 위 고기를 눌러 앞뒤로 노릇하게 구우세요. (${camp.meatTurns}/3)`];
  if (!camp.soupStarted) return ['오뎅탕 끓이기', '구운 고기를 잠시 내려놓고 버너에 냄비를 올려 오뎅탕을 끓이세요.'];
  if (!camp.soupCooked) return ['오뎅탕 직접 젓기', `냄비를 눌러 국자로 오뎅탕을 골고루 저으세요. (${camp.soupStirs}/3)`];
  if (!camp.mealPrepared) return ['캠핑 식사 상차림', '구운 고기와 뜨끈한 오뎅탕을 테이블에 차리고 있어요.'];
  if (!camp.mealEaten) return ['맛있게 식사하기', '테이블 위에 완성된 접시를 직접 클릭해 식사하세요.'];
  if (!camp.burnerOn && !camp.coffeeBrewed) return ['커피 물 끓이기', '버너를 다시 켜 커피를 내릴 물을 끓여주세요.'];
  if (!camp.coffeeBrewed) return ['따뜻한 커피 내리기', '식사를 마쳤어요. 버너로 커피를 천천히 내려주세요.'];
  if (!camp.coffeeDrunk) return ['커피 한 모금', '테이블 위에 생긴 머그컵을 직접 클릭해 마셔보세요.'];
  if (camp.burnerOn) return ['버너 불 끄기', '요리가 끝났어요. 버너를 직접 클릭해 안전하게 불을 꺼주세요.'];
  if (!camp.dishwashingStarted) return ['설거지 준비', '설거지 통과 물을 준비해 사용한 식기를 씻어볼까요?'];
  if (camp.dishesScrubbed < 3) return ['식기 직접 닦기', `파란 설거지 통을 눌러 식기를 꼼꼼하게 닦으세요. (${camp.dishesScrubbed}/3)`];
  if (!camp.dishesStored) return ['식기 정리', '깨끗해진 식기를 수납함에 차곡차곡 넣어주세요.'];
  if (!camp.lanternPlaced) return ['캠핑 조명 설치', '랜턴을 꺼내 원하는 위치의 땅을 클릭해 설치하세요.'];
  if (!camp.lanternOn) return ['조명 켜기', '설치한 노란 랜턴을 직접 클릭해 사이트를 밝혀주세요.'];
  if (!camp.campfirePlaced) return ['불멍 자리 준비', '화로와 장작을 꺼내 원하는 자리에 직접 배치하세요.'];
  if (!camp.fireOn) return ['모닥불 피우기', '장작이 담긴 화로를 직접 클릭해 불을 붙이세요.'];
  if (!camp.fireWatched) return ['불멍하기', '의자에 앉아 타닥타닥 타는 불을 조용히 바라보세요.'];
  if (!camp.slept) return ['텐트에서 잠자기', '오늘의 캠핑을 마치고 포근한 텐트에서 쉬어볼까요?'];
  return ['캠핑의 하루 완성!', '설치부터 식사, 정리, 조명, 불멍과 취침까지 모두 직접 해냈어요.'];
}

function updateHandsOnUI() {
  const camp = state.campSetup;
  const progress = campProgressCount();
  const [title, text] = nextCampInstruction();
  dom.campProgress.textContent = `${progress} / ${CAMP_STEP_TOTAL}`;
  dom.campProgressBar.style.width = `${(progress / CAMP_STEP_TOTAL) * 100}%`;
  dom.campTaskTitle.textContent = title;
  dom.campTaskText.textContent = text;
  const toolNames = { hammer: '장착: 캠핑 망치', table: '배치 중: 테이블', chair: '배치 중: 의자', burner: '배치 중: 버너', lantern: '배치 중: 랜턴', campfire: '배치 중: 화로·장작' };
  dom.campTool.textContent = toolNames[currentCampTool] ?? (progress === CAMP_STEP_TOTAL ? '캠핑 하루 완성' : '맨손');

  const enabled = {
    tent: camp.siteSelected && !camp.tentUnpacked,
    poles: camp.tentUnpacked && !camp.polesAssembled,
    hammer: camp.polesAssembled && camp.stakes < 4,
    table: camp.stakes >= 4 && !camp.tablePlaced,
    chair: camp.tablePlaced && !camp.chairPlaced,
    burner: camp.chairPlaced && !camp.burnerPlaced,
    meat: camp.burnerOn && !camp.meatStarted,
    soup: camp.meatCooked && camp.burnerOn && !camp.soupStarted,
    coffee: camp.mealEaten && camp.burnerOn && !camp.coffeeBrewed,
    wash: camp.coffeeDrunk && !camp.burnerOn && !camp.dishwashingStarted,
    store: camp.dishesScrubbed >= 3 && !camp.dishesStored,
    lantern: camp.dishesStored && !camp.lanternPlaced,
    campfire: camp.lanternOn && !camp.campfirePlaced,
    firewatch: camp.fireOn && !camp.fireWatched,
    sleep: camp.fireWatched && !camp.slept,
  };
  $$('[data-camp-action]').forEach((button) => {
    button.disabled = !enabled[button.dataset.campAction];
    button.classList.toggle('equipped', currentCampTool === button.dataset.campAction);
  });
  const suggestedButton = $$('[data-camp-action]').find((button) => !button.disabled);
  if (currentMode === 'camp' && suggestedButton && suggestedButton.dataset.campAction !== lastSuggestedAction) {
    lastSuggestedAction = suggestedButton.dataset.campAction;
    setTimeout(() => suggestedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 80);
  }
}

function chooseCampAction(action) {
  if (currentMode !== 'camp') switchMode('camp');
  if (action === 'hammer') {
    currentCampTool = action;
    world.setCampTool(action);
    const messages = {
      hammer: '망치를 들었어요. 말뚝을 하나씩 정확히 클릭하세요.',
    };
    showToast(messages[action], '→');
  } else if (action === 'tent') {
    state.campSetup.tentUnpacked = true;
    currentCampTool = null;
    world.unpackHandsOnTent();
    showToast('텐트를 사이트 위에 넓게 펼쳤어요.', '▲');
  } else if (action === 'poles') {
    state.campSetup.polesAssembled = true;
    currentCampTool = null;
    world.assembleTentPoles();
    showToast('폴대를 연결해 텐트의 뼈대를 세웠어요!', '⌁');
  } else if (['table', 'chair', 'burner', 'lantern', 'campfire'].includes(action)) {
    currentCampTool = action;
    world.startPlacement(action);
    const names = { table: '테이블', chair: '의자', burner: '버너', lantern: '랜턴', campfire: '화로와 장작' };
    showToast(`${names[action]}을 움직여 원하는 땅을 클릭하세요.`, '＋');
  } else if (action === 'meat') {
    state.campSetup.meatStarted = true;
    world.startGrillingMeat();
    state.energy = clamp(state.energy - 5);
    showToast('치익— 그릴 팬에 고기를 올렸어요. 고기를 3번 눌러 뒤집어주세요.', '♨');
  } else if (action === 'soup') {
    state.campSetup.soupStarted = true;
    world.startFishcakeSoup();
    showToast('냄비에 육수와 오뎅 꼬치를 넣었어요. 냄비를 3번 눌러 저어주세요.', '♨');
  } else if (action === 'coffee') {
    state.campSetup.coffeeBrewed = true;
    currentCampTool = null;
    world.brewCoffee();
    state.energy = clamp(state.energy + 4);
    showToast('천천히 내린 따뜻한 커피가 완성됐어요.', '♨');
  } else if (action === 'wash') {
    state.campSetup.dishwashingStarted = true;
    world.startDishwashing();
    showToast('물과 세제를 준비했어요. 설거지 통을 세 번 눌러 닦아주세요.', '≈');
  } else if (action === 'store') {
    state.campSetup.dishesStored = true;
    world.storeDishes();
    showToast('마른 식기를 수납함에 차곡차곡 정리했어요.', '▤');
  } else if (action === 'firewatch') {
    state.campSetup.fireWatched = true;
    world.enjoyCampfire();
    state.satisfaction = clamp(state.satisfaction + 12);
    showToast('타닥타닥— 아무 생각 없이 불꽃을 바라봐요.', '◆');
  } else if (action === 'sleep') {
    state.campSetup.slept = true;
    world.sleepInTent();
    state.day += 1;
    state.minutes = 6 * 60 + 30;
    state.energy = 100;
    state.satisfaction = clamp(state.satisfaction + 8);
    showToast('포근한 침낭에서 푹 자고 상쾌한 아침을 맞았어요.', '☾');
  }
  saveState();
  updateUI();
}

function handleCampInteract(event) {
  const camp = state.campSetup;
  if (event.type === 'need-tool') {
    const names = { hammer: '망치' };
    showToast(`먼저 아래에서 ${names[event.tool]}을 선택하세요.`, '!');
    return;
  }
  if (event.type === 'site-selected') {
    if (!camp.siteSelected) {
      camp.siteSelected = true;
      showToast('호수와 가까운 평평한 사이트를 골랐어요!', '✓');
    }
  }
  if (event.type === 'stake-driven') {
    camp.stakes = Math.max(camp.stakes, event.count);
    showToast(`탕! 말뚝을 단단히 박았어요. (${camp.stakes}/4)`, '┓');
    if (camp.stakes >= 4) {
      currentCampTool = null;
      state.satisfaction = clamp(state.satisfaction + 4);
      showToast('마지막 말뚝까지 완료! 텐트가 팽팽하게 섰어요.', '★');
    }
  }
  if (event.type === 'placed') {
    camp[`${event.item}Placed`] = true;
    camp[`${event.item}Position`] = event.position;
    currentCampTool = null;
    const names = { table: '테이블', chair: '의자', burner: '버너', lantern: '랜턴', campfire: '화로와 장작' };
    showToast(`${names[event.item]}을 원하는 자리에 놓았어요.`, '✓');
  }
  if (event.type === 'sat-down') {
    camp.seated = true;
    showToast('의자에 앉으니 진짜 캠핑을 시작한 기분이에요.', '♨');
  }
  if (event.type === 'burner-toggle') {
    camp.burnerOn = event.on;
    if (event.on) camp.burnerUsed = true;
    showToast(event.on ? '딸깍! 버너에 파란 불이 붙었어요.' : '버너 불을 안전하게 껐어요.', event.on ? '◆' : '○');
  }
  if (event.type === 'cooking-needs-fire') {
    showToast('요리하려면 먼저 휴대용 버너의 불을 켜주세요.', '!');
  }
  if (event.type === 'meat-turned') {
    camp.meatTurns = Math.max(camp.meatTurns, event.count);
    if (event.count >= 3) {
      camp.meatCooked = true;
      showToast('고기가 앞뒤로 노릇하게 익었어요! 이제 오뎅탕을 끓여볼까요?', '♨');
    } else {
      showToast(`치익! 고기를 뒤집었어요. (${event.count}/3)`, '♨');
    }
  }
  if (event.type === 'soup-stirred') {
    camp.soupStirs = Math.max(camp.soupStirs, event.count);
    if (event.count >= 3) {
      camp.soupCooked = true;
      camp.mealPrepared = true;
      world.prepareMeal();
      showToast('구운 고기와 뜨끈한 오뎅탕 한 상이 완성됐어요!', '▣');
    } else {
      showToast(`보글보글— 오뎅탕을 저었어요. (${event.count}/3)`, '♨');
    }
  }
  if (event.type === 'meal-eaten') {
    camp.mealEaten = true;
    state.energy = clamp(state.energy + 16);
    showToast('직접 만든 따뜻한 식사라 더 맛있어요!', '♥');
  }
  if (event.type === 'coffee-drunk') {
    camp.coffeeDrunk = true;
    state.energy = clamp(state.energy + 14);
    state.satisfaction = clamp(state.satisfaction + 10);
    showToast('향긋한 커피 한 모금. 오늘의 직접 캠핑 완성!', '♥');
    floatText('행복 +10', window.innerWidth * 0.52, window.innerHeight * 0.42);
  }
  if (event.type === 'dish-scrubbed') {
    camp.dishesScrubbed = Math.max(camp.dishesScrubbed, event.count);
    showToast(event.count >= 3 ? '식기가 반짝반짝 깨끗해졌어요!' : `뽀득뽀득 식기를 닦았어요. (${event.count}/3)`, '≈');
  }
  if (event.type === 'lantern-toggle') {
    camp.lanternOn = event.on;
    showToast(event.on ? '딸깍! 따뜻한 조명이 사이트를 밝혀요.' : '랜턴 조명을 껐어요.', '✦');
  }
  if (event.type === 'campfire-lit') {
    camp.fireOn = true;
    showToast('장작에 불이 붙었어요. 이제 불멍할 시간이에요!', '◆');
  }
  saveState();
  updateUI();
}

function switchMode(mode) {
  currentMode = mode;
  $$('.mode-switch button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
  $('#manage-dock').classList.toggle('hidden', mode !== 'manage');
  $('#camp-dock').classList.toggle('visible', mode === 'camp');
  dom.campGuide.classList.toggle('visible', mode === 'camp');
  $('#booking-card').style.opacity = mode === 'camp' ? '0.45' : '1';
  world.setMode(mode);
  showToast(mode === 'camp' ? '빈 사이트를 내 손으로 하나씩 완성해볼까요?' : '캠핑장 운영 모드로 돌아왔어요.', mode === 'camp' ? '♨' : '⌂');
}

function startActivity(type) {
  if (currentMode !== 'camp') switchMode('camp');
  if (state.energy < 8 && type !== 'rest') {
    showToast('에너지가 부족해요. 텐트에서 쉬어볼까요?', '☾');
    return;
  }
  const labels = {
    wood: '장작이 많은 숲으로 이동해요.',
    fishing: '호숫가 낚시터로 이동해요.',
    fire: '따뜻한 모닥불로 이동해요.',
    rest: '포근한 텐트로 이동해요.',
  };
  showToast(labels[type], '→');
  world.startActivity(type);
}

function completeActivity(type) {
  const effects = {
    wood: () => {
      state.energy = clamp(state.energy + 5);
      state.money += 35;
      showToast('좋은 장작을 모았어요. 매점에 조금 판매했어요!', '⌁');
      floatText('+35 G', window.innerWidth * 0.42, window.innerHeight * 0.43);
    },
    fishing: () => {
      state.energy = clamp(state.energy - 8);
      state.money += 80;
      showToast('반짝이는 송어를 낚았어요!', '≈');
      floatText('+80 G', window.innerWidth * 0.37, window.innerHeight * 0.43);
    },
    fire: () => {
      state.energy = clamp(state.energy - 4);
      state.satisfaction = clamp(state.satisfaction + 8);
      showToast('타닥타닥, 마음까지 따뜻해졌어요.', '◆');
      floatText('행복 +8', window.innerWidth * 0.5, window.innerHeight * 0.43);
    },
    rest: () => {
      state.energy = clamp(state.energy + 12);
      showToast('텐트에서 한숨 푹 쉬었어요.', '☾');
      floatText('에너지 +12', window.innerWidth * 0.42, window.innerHeight * 0.43);
    },
  };
  effects[type]?.();
  saveState();
  updateUI();
}

function finishDay() {
  const facilityIncome = state.facilities.reduce((sum, facility) => {
    const info = world.getFacilityInfo(facility.type);
    return sum + info.income + ((facility.level ?? 1) - 1) * 20;
  }, 0);
  const guestIncome = state.guests * 48;
  const upkeep = 70 + state.facilities.length * 12;
  const profit = Math.max(0, facilityIncome + guestIncome - upkeep);
  const reputationGain = Math.max(1, Math.floor((state.satisfaction - 55) / 12));

  state.money += profit;
  state.reputation += reputationGain;
  state.day += 1;
  state.minutes = 8 * 60;
  state.cleanliness = clamp(state.cleanliness + 10);
  state.energy = clamp(state.energy + 20);
  state.guests = Math.min(capacity(), Math.max(2, Math.floor(state.guests * 0.55)));
  lastHour = 8;
  nextBooking();
  showToast(`${state.day - 1}일차 이익 ${money(profit)} · 평판 +${reputationGain}`, '★');
  floatText(`+${profit.toLocaleString('ko-KR')} G`, window.innerWidth / 2, window.innerHeight * 0.4);
  saveState();
  updateUI();
}

function advanceSimulation(deltaSeconds) {
  state.minutes += deltaSeconds * 4.2;
  const hour = Math.floor(state.minutes / 60);
  if (hour !== lastHour) {
    lastHour = hour;
    state.cleanliness = clamp(state.cleanliness - Math.max(1, Math.ceil(state.guests / 4)));
    if (state.cleanliness < 50) state.satisfaction = clamp(state.satisfaction - 2);
    if (hour === 18) showToast('해가 지고 모닥불이 더 환하게 빛나요.', '☾');
    updateUI();
  }
  if (state.minutes >= 22 * 60) finishDay();
  world.setTime(state.minutes);
}

function animate(now) {
  const delta = Math.min((now - lastSimulationTime) / 1000, 0.1);
  lastSimulationTime = now;
  advanceSimulation(delta);
  world.update();
  requestAnimationFrame(animate);
}

$$('[data-build]').forEach((button) => {
  button.addEventListener('click', () => buildFacility(button.dataset.build));
});

$$('[data-activity]').forEach((button) => {
  button.addEventListener('click', () => startActivity(button.dataset.activity));
});

$$('[data-camp-action]').forEach((button) => {
  button.addEventListener('click', () => chooseCampAction(button.dataset.campAction));
});

$$('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => switchMode(button.dataset.mode));
});

$('#clean-button').addEventListener('click', cleanCamp);
$('#upgrade-button').addEventListener('click', upgradeSelectedFacility);
$('#selection-close').addEventListener('click', () => handleFacilitySelection(null));
$('#accept-booking').addEventListener('click', acceptBooking);
$('#decline-booking').addEventListener('click', () => {
  nextBooking();
  showToast('다른 예약을 확인해볼게요.', '→');
});
$('#booking-toggle').addEventListener('click', () => {
  $('#booking-card').classList.toggle('collapsed');
  $('#booking-card').classList.toggle('mobile-open');
});
$('#camp-reset').addEventListener('click', () => {
  state.campSetup = structuredClone(initialState.campSetup);
  saveState();
  window.location.reload();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    handleFacilitySelection(null);
    world.cancelPlacement();
    currentCampTool = null;
    updateHandsOnUI();
  }
  if (event.key.toLowerCase() === 'm') switchMode('manage');
  if (event.key.toLowerCase() === 'c') switchMode('camp');
});
window.addEventListener('beforeunload', saveState);
setInterval(saveState, 8000);
setTimeout(() => $('#camera-hint').style.opacity = '0', 9000);

nextBooking();
updateUI();
requestAnimationFrame(animate);

setTimeout(() => {
  dom.loading.classList.add('done');
  showToast('MORI CAMP에 오신 걸 환영해요!', '▲');
}, 900);
