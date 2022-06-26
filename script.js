'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

//this is a short database for possible weather condition (for the API)
// prettier-ignore
const wmo = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall', 77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Heavy rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thuderstorm with slight hail', 97: 'Thuderstorm with heavy hail', };

/* ----------------------- VARIABLES ----------------------- */
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
/* ----------------------- Add-ons ----------------------- */
const workoutList = document.querySelector('.workouts');
const overlay = document.querySelector('.blockeverything');
const thisMap = document.querySelector('.thismap');
const modalWindowConfirm = document.querySelector('.confirm');
const dropMenu = document.querySelector('.dropdown-content');
const errorWindow = document.querySelector('.error_window');
const drawWindow = document.querySelector('.drawing_panel');
const confirmPhrase = document.querySelector('.confirm_content');
const drawInstructions = document.querySelector('.instructions');
const drawCancelBtn = document.querySelector('.btn_cancel_draw');
const drawCancelStroke = document.querySelector('.btn_cancel_stroke');
const drawCancelStrokeExtra = document.querySelector('.btn_cancel_stroke_extra');
const drawCancelBtnExtra = document.querySelector('.btn_cancel_draw_extra');
const modalDeleteBtn = document.querySelector('.modal__btn__delete');
const modalCancelBtn = document.querySelector('.modal__btn__cancel');
const errorOkBtn = document.querySelector('.modal__btn__ok');
const errorMsgBox = document.querySelector('.error_content');
const sortBtn = document.querySelector('.dropbtn');
const deleteAllBtn = document.querySelector('.delete_all');
const showAllBtn = document.querySelector('.show_all');
const saveWorkoutBtn = document.querySelector('.save_workout');
const saveWorkoutBtnExtra = document.querySelector('.save_workout-extra');
const weatherDesc = document.querySelector('.weather__desc');
const weatherModal = document.querySelector('.weather__window');
const weatherTemp = document.querySelector('.weather__temp');
const weatherWind = document.querySelector('.weather__wind');
const weatherCond = document.querySelector('.weather__cond');
const weatherData = document.querySelectorAll('.weather__data');
const toggleBtn = document.querySelector('.toggle-button');
const sidebar = document.querySelector('.sidebar');
let drawingProcess = false;
let drawingFinished = false;
let tempMapE;
const strategyWindow = document.querySelector('.define__strategy');
const btnModalDoDraw = document.querySelector('.strategy__btn--draw');
const btnModalDoNotDraw = document.querySelector('.strategy__btn--notdraw');
const btnModalCancel = document.querySelector('.strategy__btn--cancel');
const btnSaveChanges = document.querySelector('.btn_save_changes');
const btnInstructions = document.querySelector('.instructions-window__button');
const windowInstructions = document.querySelector('.instructions-window');
const btnLogo = document.querySelector('.logo');
let editFormBox;
let targetWorkout;
let targetWorkoutObj;
let seenTheInstruction = false;
///----------------------------------------------------///

// class with extensions for types of workouts
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  path = [];
  temperature;
  windspeed;
  weathercode;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat. lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    return (this.pace = this.duration / this.distance);
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
  }
  calcSpeed() {
    return (this.speed = this.distance / (this.duration / 60));
  }
}

///////////////////   APP ARCHITECTURE HERE   /////////////////////
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  /* ----------------------- Add-ons ----------------------- */
  #allMarkers = [];
  #allPaths = [];
  #allCoords = [];
  #sortedBy;
  currentTarget;
  currentTargetBtns;
  myCoords;
  indexDeletingItem;
  pathwayCoords = [];
  pathwayWorkout = false;
  pathDistance = 0;
  sorted = false;
  shownAll = false;
  listener = false;
  /// ------------------------------------------------------- ///

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    this._listenersCancelDrawing();
    this._listenersErrorBtn();
    form.addEventListener('submit', this._newWorkout.bind(this));
    saveWorkoutBtn.addEventListener('click', this._newWorkout.bind(this));
    saveWorkoutBtnExtra.addEventListener('click', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    /* ----------------------- Add-ons ----------------------- */
    containerWorkouts.addEventListener('click', this._confirmDelete.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    document.addEventListener('keydown', this.cancelOrDlt.bind(this));
    modalWindowConfirm.addEventListener('click', this.cancelOrDlt.bind(this));
    sortBtn.addEventListener('click', this.openTypeMenu.bind(this));
    deleteAllBtn.addEventListener('click', this._deleteAllWorkouts.bind(this));
    showAllBtn.addEventListener('click', this._showAllWorkouts.bind(this));
    toggleBtn.addEventListener('click', this._toggleWindow.bind(this));
    window.addEventListener('load', this._checkWidth.bind(this));
    drawCancelBtn.addEventListener('click', this._cancelDrawing.bind(this));
    drawCancelBtnExtra.addEventListener('click', this._cancelDrawing.bind(this));
    btnModalDoDraw.addEventListener('click', this.agreedToDraw.bind(this));
    btnModalDoNotDraw.addEventListener('click', this.disagreedToDraw.bind(this));
    btnModalCancel.addEventListener('click', this.cancelTheRecord.bind(this));
    btnSaveChanges.addEventListener('click', this.saveChangesEditForm.bind(this));
    btnInstructions.addEventListener('click', this.instructionsHideRemember.bind(this));
    btnLogo.addEventListener('click', this.displayInstructions.bind(this));
    overlay.addEventListener('click', this.overlayClicks.bind(this));
    drawCancelStroke.addEventListener('click', this._cancelLastDrawingLine.bind(this));
    drawCancelStrokeExtra.addEventListener('click', this._cancelLastDrawingLine.bind(this));
    ///----------------------------------------------------///
  }

  /**
   * identify user's coordinates  (определяет местоположение пользователя)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov (original idea by Jonas Shmedtmann)
   */
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert(`We couldn't get your current position`);
      });
    }
  }

  /**
   * load the Leaflet map with user's coordinates (прогружает карту от Leaflet API в районе местоположения пользователя)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov and Jonas Shmedtmann)
   */
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    this.myCoords = [latitude, longitude];

    this.#map = L.map('map', {
      minZoom: 4,
      doubleClickZoom: false,
      touchExtend: true,
    }).setView(this.myCoords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // add the click listener to the Map (привязывает приемник событий к карте)
    this.#map.on(
      'click',
      function (e) {
        if (form.classList.contains('hidden')) {
          if (window.innerWidth < 641) {
            tempMapE = e;
            overlay.classList.remove('hidden');
            strategyWindow.classList.remove('hidden');
          } else {
            this._showForm(e);
          }
        }
      }.bind(this)
    );
    //render workouts from the local storage (рендерит уже имеющиеся записи на карте)
    this.#workouts.forEach(wk => {
      this._renderWorkoutMarker(wk);
      this._renderWorkoutPath(wk);
      this.#allCoords.push(wk.coords);
    });
    // hides the app instructions, if required (прячет инструкии при повторном посещении приложения)
    if (seenTheInstruction === false) {
      windowInstructions.classList.add('instructions-window__shown');
      overlay.classList.remove('hidden');
    }
    // displays workout list buttons, if required (отображает кнопки над списком тренировок, если нужно)
    if (this.#workouts.length !== 0) {
      this.displayButtons();
    }
  }

  /**
   * triggers events for making a new workout record (запускает события необходимые для создания новой записи тренировок)
   * @param {event object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov and Jonas Shmedtmann
   */
  _showForm(mapE) {
    // return all workouts their original color (возвращает стили списка к изначальным значениям)
    this.defaultColor();
    // hide and/or displays certain buttons and windows (прячет и/или отображает нужные кнопки и окошки)
    this.clsWthrMdlWndw();
    if (window.innerWidth < 641 || window.innerHeight < 641) {
      saveWorkoutBtnExtra.classList.remove('hidden');
      drawCancelBtnExtra.classList.remove('hidden');
      drawCancelStrokeExtra.classList.remove('hidden');
    }
    if (window.innerWidth > 641 && window.innerHeight > 641) {
      this.shwDrwngWndw();
    }
    workoutList.scrollTo(0, 0);
    if (this.currentTargetBtns) this._hideBtns();
    // stores data in external variables (сохраняет данные во внешних переменных)
    this.#mapEvent = mapE;
    this.pathwayCoords.push([this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng]);
    //adapts interface for the task (изменяет интерфейс для выполнения задачи)
    form.classList.remove('hidden');
    inputDistance.focus();
    this._toggleDrawingListener();
    if (workoutList.querySelector('.form__edit')) {
      this.editFormRemove();
    }
  }

  /**
   * clears and hides edit form and drawing window (прячет форму для изменения записи а также диалоговое окно)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov and Jonas Shmedtmann
   */
  _clearForm() {
    // remove drawing custom listener (отключает специальный приемник событий для наложения маршрута)
    if (drawingProcess) {
      drawingFinished = true;
      this.#map.fire('click');
      drawingFinished = false;
      drawingProcess = false;
    }
    saveWorkoutBtnExtra.classList.add('hidden');
    drawCancelBtnExtra.classList.add('hidden');
    drawCancelStrokeExtra.classList.add('hidden');

    // removes new workout form (очищает и прячет форму записи тренировки)
    this.pathDistance = 0;
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 10);

    if (this.pathwayCoords) this.pathwayCoords = [];
    this.clsDrwngWndw();
  }
  // switch the workout type in the new workout form (изменяет форму при выборе типа тренировок)
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  /**
   * creates and saves a new record (создает и созраняет новую запись)
   * @param {array}
   * @returns {boolean}
   * @author Dmitriy Vnuchkov (original idea by Jonas Shmedtmann)
   */
  validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
  allPositive = (...inputs) => inputs.every(inp => inp > 0);

  /**
   * creates and saves a new record (создает и созраняет новую запись)
   * @param {event object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov and Jonas Shmedtmann
   */
  async _newWorkout(e) {
    try {
      e.preventDefault();
      if ((sidebar.style.invisibility = 'hidden') && window.innerWidth <= 640) this._toggleWindow();
      // get the data from the form (выводит данные из формы)
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      let lat;
      let lng;

      // check if the pathway was drawn and get coordinates (проверяет, был ли наложен маршрут)
      if (!this.pathwayWorkout) {
        lat = this.#mapEvent.latlng.lat;
        lng = this.#mapEvent.latlng.lng;
      }
      if (this.pathwayCoords.length >= 2) {
        lat = this.pathwayWorkout.getCenter().lat;
        lng = this.pathwayWorkout.getCenter().lng;
      }
      let workout;
      //identify workout type (определяет тип тренировки)
      if (type === 'running') {
        const cadence = +inputCadence.value;
        if (!this.validInput(distance, duration, cadence) || !this.allPositive(distance, duration, cadence))
          return this.showErrorWindow('Please, enter positive numbers only.'); // display ErrorModalWindow, if data is irrelevant (сообщает о наличии ошибки в веденных данных)
        workout = new Running([lat, lng], distance, duration, cadence);
      }
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (!this.validInput(distance, duration, elevation) || !this.allPositive(distance, duration))
          return this.showErrorWindow('Please, enter positive numbers only.');
        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // adds pathway data (добавляет данные о маршруте)
      if (this.pathwayWorkout) {
        this.pathwayWorkout.remove();
        workout.path = this.pathwayCoords;
        this.pathwayWorkout = false;
      }
      //add coords to the common array
      this.#allCoords.push([lat, lng]);

      if (window.innerWidth <= 640 && sidebar.style.visibility === 'visible') {
        this._toggleWindow();
      }
      // renders and stores data + weather, as well as returns default parameters and styles (рендерит и созраняет данные, а также возвращает исходные параметры и стили)
      this._clearForm();
      this._renderWorkoutPath(workout);
      this.#workouts.push(workout);
      this._renderWorkout(workout);
      this._renderWorkoutMarker(workout);
      await this._localWeather(workout);
      this._setLocalStorage();
      this._setDefaultDrawingParameters();
    } catch (err) {
      this.showErrorWindow(err.message);
    }
  }

  /**
   * adds markers to the map (добавляет маркеры на карту)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov (original idea by Jonas Shmedtmann)
   */
  _renderWorkoutMarker(workout) {
    this.#allMarkers.push(
      L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            closeOnEscapeKey: false,
            className: `${workout.type}-popup`,
          }),
          { autoPan: false }
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup()
    );
  }

  /**
   * renders the pathways of workouts (добавляет маршруты на карту)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _renderWorkoutPath(workout) {
    if (workout.path.length > 0) {
      this.#allPaths.push(
        L.polyline(workout.path, {
          color: `${workout.type === 'running' ? '#00c46a' : '#ffb545'}`,
          smoothfactor: 3,
          weight: 10,
          lineJoin: 'bevel',
          lineCap: 'butt',
          dashArray: '15 4',
          opacity: 0.8,
        }).addTo(this.#map)
      );
    }
  }

  /**
   * prepares workout description (подготавливает описание тренировки)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov (original idea by Jonas Shmedtmann)
   */
  _setDescription(workout) {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let date = new Date(workout.date);
    workout.description = `${workout.type[0].toUpperCase().concat(workout.type.slice(1))} on ${
      months[date.getMonth()]
    } ${date.getDate()}`;
  }

  /**
   * render workout in the sidebar(добавляет тренировку в список слева)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov (original idea by Jonas Shmedtmann)
   */
  _renderWorkout(workout) {
    this._setDescription(workout);
    const html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}" id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span> 
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;
    const html2 =
      workout.type === 'running'
        ? `          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          <div class="workout__details_2 btn btn_delete hidden">Delete
          </div>
          <div class="workout__details_2 btn btn_edit hidden">Edit
          </div>
          </li>`
        : ` <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
          <div class="workout__details_2 btn btn_delete hidden">
            <span class="workout__icon btn btn_delete">Delete</span>
          </div>
          <div class="workout__details_2 btn btn_edit hidden">
            <span class="workout__icon btn btn_edit">Edit</span>
          </div>
          </li>`;

    form.insertAdjacentHTML('afterend', html.concat(html2));

    // display delete/show/sort buttons (показывает кнопки из меню для списка)
    if (sortBtn.classList.contains('hidden')) {
      this.displayButtons();
    }
  }

  /**
   * moves to the clicked workout (переходит к выбранной тренировке на карте)
   * @param {event object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov and Jonas Shmedtmann
   */
  _moveToPopup(e) {
    // hides unnecessary forms (прячет ненужные формы и окна)
    if (e.target.classList.contains('btn')) return;
    if (e.target.closest('form')) return;
    this._clearForm();
    this.clsEdtWndwFn(e);

    const workoutEl = e.target.closest(`.workout`);
    if (!workoutEl) return;

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    if (this.currentTarget === workout.id) {
      this._displayBtns();
    } else if (!this.currentTarget || this.currentTarget !== workout.id) {
      // changes styles and animates transition (меняет стили и анимирует переход)
      this.defaultColor();
      workoutEl.style.backgroundColor = '#5d666e';
      workoutEl.scrollIntoView({ behavior: 'smooth' });
      window.scrollTo(0, 0);
      // hide sidebar, if necessary (прячет список в случае смартфонов)
      if (window.innerWidth <= 799) this._hideSidebarSoon();
      this._hideBtns();
      // find the place in the map (находит место на карте)
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: { duration: 0.75 },
      });
    }
    // display the weather conditions (отображает данные погоды)
    this._workoutWeather(workout);
    this.shwWthrMdlWndw();

    this.currentTarget = workout.id;
  }

  //Save workouts in the local storage (сохраняет данные в локальном хранилище)
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Retrieve workouts from the local storage and display it (выводит данные из хранилища и отображает их)
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    const seen = JSON.parse(localStorage.getItem('seenInstructions'));
    if (seen) seenTheInstruction = true;
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(wk => {
      this._renderWorkout(wk);
    });
  }

  ///////////////////// MY ADD-ONS /////////////////////////
  /**
   * a set of functions that display/hide elements (несколько функций отвечающих за оторажение и скрытие элементов)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  // Display "Delete" and "Edit" btns (оторажает кнопки 'Delete' и 'Edit')
  _displayBtns() {
    this.currentTargetBtns = document.getElementById(this.currentTarget).querySelectorAll('.workout__details_2');
    this.currentTargetBtns.forEach(btn => {
      btn.classList.toggle('hidden');
    });
  }
  // Hide "Delete" and "Edit" btns (прячет кнопки 'Delete' и 'Edit')
  _hideBtns() {
    if (!this.currentTargetBtns) return;
    this.currentTargetBtns.forEach(btn => {
      btn.classList.add('hidden');
    });
  }
  // Show ConfirmationModalWindow (показывает окно подтверждения запроса)
  shwMdlWndwFn() {
    modalWindowConfirm.classList.remove('hidden');
    modalWindowConfirm.style.display = 'grid';
    modalWindowConfirm.style.zIndex = '750';
    overlay.classList.remove('hidden');
  }
  // Hide ConfirmationModalWindow (прячет окно подтверждения запроса)
  clsMdlWndwFn() {
    modalWindowConfirm.classList.add('hidden');
    modalWindowConfirm.style.display = 'none';
    modalWindowConfirm.style.zIndex = '1';
    overlay.classList.add('hidden');
  }
  // Display ErrorModalWindow (показывает окно ошибки)
  showErrorWindow(message) {
    errorMsgBox.textContent = message;
    errorWindow.classList.remove('hidden');
    errorWindow.style.zIndex = '750';
    errorWindow.style.display = 'grid';
    overlay.classList.remove('hidden');
    //remove focus
    document.activeElement.blur();
  }
  // Hide ErrorModalWindow (прячет окно ошибки)
  _listenersErrorBtn() {
    //add listeners to close the window
    errorOkBtn.addEventListener('click', function () {
      errorWindow.style.zIndex = '1';
      errorWindow.style.display = 'none';
      errorWindow.classList.add('hidden');
      overlay.classList.add('hidden');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !errorWindow.classList.contains('hidden')) {
        errorWindow.classList.add('hidden');
        overlay.classList.add('hidden');
        errorWindow.style.zIndex = '1';
        errorWindow.style.display = 'none';
      }
    });
  }

  /////////////////  Functions for Editing Workouts  ////////////////////

  /**
   * allows to edit the recorded workout (позволяет корректировать сохраненные данные о тренировке)
   * @param {event object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _editWorkout(e) {
    if (!e.target.classList.contains('btn_edit') || workoutList.querySelector('.form__edit')) return;
    this._hideBtns();
    targetWorkout = e.target.closest('.workout');
    targetWorkoutObj = this.#workouts.find(work => work.id === targetWorkout.dataset.id);
    btnSaveChanges.classList.remove('hidden');
    //hide the edited workout record (прячет выбранную запись тренировки)
    targetWorkout.classList.add('hidden');
    // displays the edit form (отображает форму для корректировки данных)
    const editHtml = `<form class="form__edit animate">
          <div class="form__edit__heading form__label">${targetWorkoutObj.description}</div>
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type-2">
            ${
              targetWorkoutObj.type === 'running'
                ? `<option value="running">Running</option>
              <option value="cycling">Cycling</option>`
                : `<option value="cycling">Cycling</option><option value="running">Running</option>`
            }
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="km" value="${targetWorkoutObj.distance}"/>
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min"
            value="${targetWorkoutObj.duration}"/>
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__input--cadence-2"
              placeholder="step/min"
            value="${targetWorkoutObj.cadence ? targetWorkoutObj.cadence : ''}"/>
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__input--elevation-2"
              placeholder="meters"
            value="${targetWorkoutObj.elevation ? targetWorkoutObj.elevation : ''}"/>
          </div>
          <button class="form__btn">OK</button>
       </form>`;
    targetWorkout.insertAdjacentHTML('afterend', editHtml);
    editFormBox = workoutList.querySelector('.form__edit');
    editFormBox.scrollIntoView({ behavior: 'smooth' });
    //function to toggle the workout type in the EditForm (функция для смены типа тренировки в данной форме)
    const editFrmToggleFn = function () {
      editFormBox.querySelector('.form__input--cadence-2').closest('.form__row').classList.toggle('form__row--hidden');
      editFormBox
        .querySelector('.form__input--elevation-2')
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
    };
    if (targetWorkoutObj.type === 'cycling') {
      editFrmToggleFn();
    }
    editFormBox.querySelector('.form__input--type-2').addEventListener('change', function () {
      editFrmToggleFn();
    });
  }

  /**
   * saves the edited workout (сохраняет изменения в записи тренировки)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  saveChangesEditForm() {
    const typeToChange = editFormBox.querySelector('.form__input--type-2').value;
    const newDistance = +editFormBox.querySelector('.form__input--distance').value;
    const newDuration = +editFormBox.querySelector('.form__input--duration').value;
    targetWorkoutObj.type = typeToChange;
    targetWorkoutObj.distance = newDistance;
    targetWorkoutObj.duration = newDuration;
    if (typeToChange === 'cycling') {
      const newElevation = +editFormBox.querySelector('.form__input--elevation-2').value;
      if (
        !this.validInput(newDistance, newDuration, newElevation) ||
        !this.allPositive(newDistance, newDuration, newElevation)
      )
        return this.showErrorWindow('Please, enter positive numbers only.');

      targetWorkoutObj.elevation = newElevation;
      if (targetWorkoutObj.cadence) delete targetWorkoutObj.cadence;
      if (targetWorkoutObj.pace) delete targetWorkoutObj.pace;
      targetWorkoutObj.speed = targetWorkoutObj.distance / targetWorkoutObj.duration;
    }
    if (typeToChange === 'running') {
      const newCadence = +editFormBox.querySelector('.form__input--cadence-2').value;
      if (
        !this.validInput(newDistance, newDuration, newCadence) ||
        !this.allPositive(newDistance, newDuration, newCadence)
      )
        return this.showErrorWindow('Please, enter positive numbers only.');
      targetWorkoutObj.cadence = newCadence;
      if (targetWorkoutObj.elevation) delete targetWorkoutObj.elevation;
      if (targetWorkoutObj.speed) delete targetWorkoutObj.speed;
      targetWorkoutObj.pace = targetWorkoutObj.duration / targetWorkoutObj.distance;
    }
    // updates the list based on the introduced changes and saves data (обновляет список и сохраняет данные)
    this.clearSidebar();
    editFormBox.remove();
    this._setLocalStorage();
    btnSaveChanges.classList.add('hidden');
    this.reRendering(this.#workouts);
  }

  /**
   * hides the edit form and display the initial record (прячет форму для изменения записи тренировки и возращает саму запись)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  editFormRemove() {
    workoutList.querySelector('.form__edit').remove();
    btnSaveChanges.classList.add('hidden');
    containerWorkouts.querySelectorAll('.workout').forEach(wk => {
      if (wk.classList.contains('hidden')) wk.classList.remove('hidden');
    });
  }
  //tied to the previous one (связана с предыдущей)
  clsEdtWndwFn(e) {
    if (!workoutList.querySelector('.form__edit') || e.target.classList.contains('.form__edit')) return;
    this.editFormRemove();
  }

  /**
   * functions for deleting workout records (ряд функций для удаления записей)
   * @param {event object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  // Display ConfirmationModalWindow 9отображает диалоговое окно)
  _confirmDelete(e) {
    if (!e.target.classList.contains('btn_delete')) return;
    this.shwMdlWndwFn();
    //find index of the workout we plan to delete
    for (let work of this.#workouts) {
      if (work.id === this.currentTarget) {
        this.indexDeletingItem = this.#workouts.indexOf(work);
      }
    }
  }
  // Get confirmation through the ConfirmationModalWindow (получает подтверждение или отмену удаления)
  cancelOrDlt(e) {
    if (modalWindowConfirm.classList.contains('hidden')) return;
    if (e.target === modalCancelBtn) {
      //Cancel - close Modal Window
      this.clsMdlWndwFn();
    }
    if (e.key === 'Escape') {
      this.clsMdlWndwFn();
    }
    //Delete - delete workout
    if (e.target === modalDeleteBtn) {
      this._deleteWorkout();
    }
    if (e.key === 'Enter') {
      this._deleteWorkout();
    }
  }

  /**
   * deletes one workout record and updates storage and UI (удаляет запись тренировки и обновляет хранилище и UI)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _deleteWorkout() {
    this.clearSidebar();
    this.#workouts.splice(this.indexDeletingItem, 1);
    this._setLocalStorage();
    this.reRendering(this.#workouts);
    this.clsMdlWndwFn();
    this.clsWthrMdlWndw();
    if (this.#workouts.length === 0) {
      this.removeButtons();
    }
  }

  /**
   * deletes all workout records and updates storage and UI (удаляет все записи тренировок и обновляет хранилище и UI)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _deleteAllWorkouts() {
    confirmPhrase.innerHTML = 'Are you sure you want to delete all workout records?';
    this.shwMdlWndwFn();
    modalWindowConfirm.addEventListener(
      'click',
      function (e) {
        if (e.target.closest('.modal__btn__cancel')) {
          this.clsMdlWndwFn();
          confirmPhrase.innerHTML = 'Are you sure you want to delete this workout record?';
        }
        if (e.target.closest('.modal__btn__delete')) {
          this.clearMap();
          this.#workouts = [];
          localStorage.removeItem('workouts');
          this.clearSidebar();
          this.removeButtons();
          this.clsMdlWndwFn();
          confirmPhrase.innerHTML = 'Are you sure you want to delete this workout record?';
        }
      }.bind(this),
      { once: true }
    );
  }

  /**
   * a set of function for UI elements manipulations and responsiveness (функции для манипуляции UI элементами и адаптивности)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  // checks viewport width (проверяет ширину используемого экрана)
  _checkWidth() {
    if (window.innerWidth <= 641) {
      sidebar.style.visibility = 'hidden';
      sidebar.style.opacity = 0;
    } else {
      sidebar.style.visibility = 'visible';
      sidebar.style.opacity = 1;
    }
  }
  // hides workout list (прячет список тренировок)
  _hideSidebarSoon() {
    setTimeout(
      function () {
        sidebar.style.visibility = 'hidden';
        sidebar.style.opacity = 0;
      }.bind(this),
      300
    );
  }
  // toggles workout list (прячет/возвращает список тренировок)
  _toggleWindow() {
    if (sidebar.style.visibility === 'hidden') {
      sidebar.style.visibility = 'visible';
      sidebar.style.opacity = 1;
    } else {
      sidebar.style.visibility = 'hidden';
      sidebar.style.opacity = 0;
    }
  }
  // displays workout list btns (отображает кнопки из списка тренировок)
  displayButtons() {
    sortBtn.classList.remove('hidden');
    deleteAllBtn.classList.remove('hidden');
    showAllBtn.classList.remove('hidden');
  }
  // hides workout list btns (прячет кнопки из списка тренировок)
  removeButtons() {
    sortBtn.classList.add('hidden');
    deleteAllBtn.classList.add('hidden');
    showAllBtn.classList.add('hidden');
  }

  /**
   * display all the workouts at once (показывает сразу все тренировки на карте)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _showAllWorkouts() {
    //hide unnecessary windows
    this.clsWthrMdlWndw();
    //check if this function is on
    if (this.shownAll === false) {
      //make all markers viewed
      if (this.#allCoords.length > 0) {
        this.#map.fitBounds(this.#allCoords, {
          paddingTopLeft: [10, 72],
          paddingBottomRight: [10, 10],
          maxZoom: 13,
        });
      }
      //rename the button
      showAllBtn.textContent = 'Show Me';
      //save the toggled parameter
      this.shownAll = true;
    } else {
      //make the map targeted on where the user is
      this.#map.setView(this.myCoords, this.#mapZoomLevel);
      showAllBtn.textContent = 'Show All';
      this.shownAll = false;
    }

    this._hideSidebarSoon();
  }

  /**
   * set of supporting function for removing content from the list and the map (несколько вспомогательных функций для удаления контента в списке и на карте)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  // removes all records from the list (удаляет все записи из списка тренировок)
  clearSidebar() {
    workoutList.querySelectorAll('.workout').forEach(elem => {
      elem.remove();
    });
  }
  // remove all markers and paths from the map and the database (удаляет данные из хранилища и с карты)
  clearMap() {
    this.#allMarkers.forEach(marker => marker.remove());
    this.#allPaths.forEach(path => path.remove());
    this.#allMarkers = [];
    this.#allPaths = [];
  }
  // re-render workouts after editing and deleting (обновляет вид записей тренировок)
  reRendering(array) {
    //clear the map
    this.clearMap();
    //render updated workout array
    array.forEach(wk => {
      this._renderWorkout(wk);
      this._renderWorkoutMarker(wk);
      this._renderWorkoutPath(wk);
    });
  }
  // сolor each workout back (возвращает списку изначальные стили)
  defaultColor() {
    containerWorkouts.querySelectorAll('.workout').forEach(wk => (wk.style.backgroundColor = '#42484d'));
  }

  ///////  Functions for Sorting Workouts  ///////

  /**
   * display sorting options and prepare UI elements (отображает меню сортировки и подготавливает UI элементы)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  openTypeMenu() {
    //close all unnecessary forms (прячет все ненужные формы и окна)
    form.classList.add('hidden');
    this._hideBtns();
    this.clsDrwngWndw();
    this.clsMdlWndwFn();
    if (workoutList.querySelector('.form__edit')) {
      this.editFormRemove();
    }
    //check if the list is not sorted (проверяет, сортирован ли список на данный момент)
    if (this.sorted === false) {
      dropMenu.classList.add('drop_class');
      dropMenu.addEventListener('click', this._sortWorkouts.bind(this));
      setTimeout(function () {
        document.addEventListener(
          'click',
          function (t) {
            if (t.target !== dropMenu && t.target !== sortBtn) dropMenu.classList.remove('drop_class');
          },
          { once: true }
        );
      }, 10);
    } else {
      //if sorted, unsoft and return default parameters (если список уже сортирован, возвращает изначальные значения)
      this.sorted = false;
      sortBtn.innerHTML = 'Sort by';
      this.clearSidebar();
      this.#workouts.forEach(wk => {
        this._renderWorkout(wk);
      });
    }
  }

  /**
   * sorts the workout list based on user's choice (сортирует список по параметрам выбранным пользователем)
   * @param {event object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _sortWorkouts(e) {
    if (!e.target.closest('.btn__sort')) return;
    const chosenType = e.target.closest('.btn__sort').dataset.sorting;
    if (chosenType === 'distance') {
      this.#sortedBy = this.#workouts.slice().sort((a, b) => b.distance - a.distance);
    }
    if (chosenType === 'duration') {
      this.#sortedBy = this.#workouts.slice().sort((a, b) => b.duration - a.duration);
    }
    if (chosenType === 'type') {
      const onlyRunning = this.#workouts.filter(wk => wk.type === 'running');
      const onlyCycling = this.#workouts.filter(wk => wk.type === 'cycling');
      this.#sortedBy = onlyRunning.concat(onlyCycling);
    }
    this.clearSidebar();
    this.#sortedBy.forEach(wk => {
      this._renderWorkout(wk);
      dropMenu.classList.remove('drop_class');
      sortBtn.innerHTML = 'Unsort';
    });
    this.sorted = true;
  }

  /**
   * allows user to draw the workout path. if he wants (позволяет пользователю нарисовать маршрут тренировки)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _toggleDrawingListener() {
    // removes event listener added to the map once drawing is over or cancelled (отключает приемник событий на карте, когда прорисовка маршрута завершена или отмененаа)
    const offListener = function () {
      this.#map.off('click', gainCoords);
      drawCancelStroke.style.display = 'none';
    }.bind(this);

    const gainCoords = function (mapEv) {
      if (!drawingFinished) {
        if (drawCancelStroke.style.display !== 'block') drawCancelStroke.style.display = 'block';
        const { lat, lng } = mapEv.latlng;
        //save the added coords (сохраняет добавленные координаты)
        this.pathwayCoords.push([lat, lng]);
        if (this.pathwayWorkout) {
          this.pathwayWorkout.remove();
        }
        // update the polyline after every click (обновляет маршрут после каждого нажатия)
        this.pathwayWorkout = L.polyline(this.pathwayCoords, {
          color: 'red',
          smoothfactor: 5,
          weight: 8,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(this.#map);
        //count distance between point to measure the total distance (просчитывает длину маршрута)
        if (this.pathwayCoords.length >= 2) {
          const addDistance =
            this.#map.distance(
              this.pathwayCoords[this.pathwayCoords.length - 1],
              this.pathwayCoords[this.pathwayCoords.length - 2]
            ) / 1000;
          this.pathDistance += addDistance;
          inputDistance.value = +this.pathDistance.toFixed(1);
        }
      }
      if (drawingFinished) offListener();
    }.bind(this);
    // adds event listener to the map to draw the workout path (добавляет приемник событий на карту, чтобы накладывать маршрут)
    this.#map.on('click', gainCoords);
    drawingProcess = true;
  }

  /**
   * adds listeners at the page load (добавляет ряд примников событий при загрузке приложения)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _listenersCancelDrawing() {
    document.addEventListener(
      'click',
      function (e) {
        if ((!form.classList.contains('hidden') && e.target.closest('.workout')) || e.target.closest('.dropdown')) {
          this._cancelDrawing();
        }
      }.bind(this)
    );
    document.addEventListener(
      'keydown',
      function (e) {
        if (e.key === 'Escape') {
          this._cancelDrawing();
        }
        if (e.key === 'Enter') {
          setTimeout(
            function () {
              this._setDefaultDrawingParameters();
            }.bind(this),
            1000
          );
        }
      }.bind(this)
    );
  }

  /**
   * allows user modify the drawn path by removing the strokes (позволяет пользователю перерисовывать маршрут)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _cancelLastDrawingLine() {
    if (this.pathwayCoords.length === 2) return this._cancelDrawing();
    //first count the last distance that we want to cut off (отсчитывает расстояние, которое было отменено/убрано)
    if (this.pathwayCoords.length >= 2) {
      const removeDistance =
        this.#map.distance(
          this.pathwayCoords[this.pathwayCoords.length - 1],
          this.pathwayCoords[this.pathwayCoords.length - 2]
        ) / 1000;
      this.pathDistance -= removeDistance;
      inputDistance.value = +this.pathDistance.toFixed(1);
    }
    //remove the last stroke record (удаляет последний нанесенный штрих)
    this.pathwayCoords.pop();
    if (this.pathwayWorkout) {
      this.pathwayWorkout.remove();
    }
    // update the polyline after every click (обновляет маршрут)
    this.pathwayWorkout = L.polyline(this.pathwayCoords, {
      color: 'red',
      smoothfactor: 5,
      weight: 8,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(this.#map);
  }

  /**
   * set of supporting functions for path drawing feature (ряд функций для работы с наложением маршрута)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  // removes the workout record form (скрывает форму для записи тренировки)
  _cancelDrawing() {
    if (!form.classList.contains('hidden')) {
      this._clearForm();
    }
    this._setDefaultDrawingParameters();
  }
  // returns parameters to default values (возвращает изначальные параметры)
  _setDefaultDrawingParameters() {
    if (this.pathwayWorkout) {
      this.pathwayWorkout.remove();
    }
    this.pathwayCoords = [];
    this.pathwayWorkout = false;
    this.pathDistance = 0;
  }
  // show the drawing window (отображает диалоговое окно)
  shwDrwngWndw() {
    drawWindow.style.display = 'flex';
    drawWindow.style.zIndex = '500';
  }
  // hide the drawing window (скрывает диалоговое окно)
  clsDrwngWndw() {
    if (drawWindow.style.display === 'none') return;
    drawWindow.style.display = 'none';
    drawWindow.style.zIndex = '1';
  }

  //////////////// Weather Functions //////////////

  /**
   * determines the weather conditions in the given location (определяет погоду в выбранной локации)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  async _localWeather(wk) {
    try {
      // find info through the API (ищет информацию с помощью API)
      const curWeather = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${wk.coords[0]}&longitude=${wk.coords[1]}&current_weather=true`
      ).then(res => res.json());
      //set new parameters to the variables in the object (сохраняет данные о погоде)
      wk.temperature = curWeather.current_weather.temperature;
      wk.windspeed = curWeather.current_weather.windspeed;
      wk.weathercode = curWeather.current_weather.weathercode;
      this._workoutWeather(wk);
    } catch (err) {
      weatherDesc.textContent = `Couldn't collect weather data. Please, check your internet conection.`;
      this.shwWthrMdlWndw();
      setTimeout(
        function () {
          this.clsWthrMdlWndw();
        }.bind(this),
        5000
      );
    }
  }

  // Show weather ModalWindow
  shwWthrMdlWndw() {
    if (!weatherModal.classList.contains('hidden')) return;
    weatherModal.classList.remove('hidden');
    weatherData.forEach(param => param.classList.remove('hidden'));
  }

  // Close weatherModal Window
  clsWthrMdlWndw() {
    if (weatherModal.classList.contains('hidden')) return;
    weatherModal.classList.add('hidden');
    weatherData.forEach(param => param.classList.add('hidden'));
    //set default/empty values
    weatherDesc.textContent = 'Weather information loading...';
    weatherTemp.textContent = '';
    weatherWind.textContent = '';
    weatherCond.textContent = '';
  }

  /**
   * render the workout in the weatherModalWindow (рендерит тренировку и погодные данные)
   * @param {object}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  _workoutWeather(workout) {
    this.clsWthrMdlWndw();
    if (!workout.temperature) {
      weatherDesc.textContent = 'No weather records found';
      this.shwWthrMdlWndw();
      return;
    }
    weatherDesc.textContent = 'That day';
    weatherTemp.textContent = `${workout.temperature}`;
    weatherWind.textContent = `${workout.windspeed}`;
    //find the proper weather condition in the common object (находит название погодных условий в списке)
    let index = Object.keys(wmo).indexOf(`${workout.weathercode}`);
    weatherCond.textContent = `${Object.values(wmo)[index]}`;
    this.shwWthrMdlWndw();
  }

  /**
   * functions for a dialogue window in mobile version (функции для диалогового окна в мобильной версии)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  agreedToDraw() {
    this._showForm(tempMapE);
    strategyWindow.classList.add('hidden');
    overlay.classList.add('hidden');
  }
  disagreedToDraw() {
    this._toggleWindow();
    this._showForm(tempMapE);
    strategyWindow.classList.add('hidden');
    overlay.classList.add('hidden');
  }
  cancelTheRecord() {
    this._clearForm();
    strategyWindow.classList.add('hidden');
    overlay.classList.add('hidden');
  }

  /**
   * functions for instructions window (функции для окна с инструкциями)
   * @param {}
   * @returns {undefined}
   * @author Dmitriy Vnuchkov
   */
  // remembers if instructions have been read (запоминает, читали ли инструкции раньше)
  instructionsHideRemember() {
    if (seenTheInstruction === false) {
      seenTheInstruction = true;
      localStorage.setItem('seenInstructions', JSON.stringify(seenTheInstruction));
    }
    windowInstructions.classList.remove('instructions-window__shown');
    overlay.classList.add('hidden');
  }
  displayInstructions() {
    windowInstructions.classList.add('instructions-window__shown');
    overlay.classList.remove('hidden');
  }
  overlayClicks() {
    if (windowInstructions.classList.contains('instructions-window__shown')) {
      windowInstructions.classList.remove('instructions-window__shown');
      overlay.classList.add('hidden');
    }
  }

  // Empty the Local Storage and reload the page (for developers) удалить данные о тренировках (для разработчика)
  // reset() {
  //   localStorage.removeItem('workouts');
  //   location.reload();
  // }
}

//Run the App written above (запускает приложение)
const app = new App();
