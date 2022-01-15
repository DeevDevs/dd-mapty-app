'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// prettier-ignore
const wmo = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall', 77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Heavy rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thuderstorm with slight hail', 97: 'Thuderstorm with heavy hail', };

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
//My Updates ///-///
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
const drawEraseBtn = document.querySelector('.btn_erase_draw');
const modalDeleteBtn = document.querySelector('.modal__btn__delete');
const modalCancelBtn = document.querySelector('.modal__btn__cancel');
const errorOkBtn = document.querySelector('.modal__btn__ok');
const sortBtn = document.querySelector('.dropbtn');
const deleteAllBtn = document.querySelector('.delete_all');
const showAllBtn = document.querySelector('.show_all');
const weatherDesc = document.querySelector('.weather__desc');
const weatherModal = document.querySelector('.weather__window');
const weatherTemp = document.querySelector('.weather__temp');
const weatherWind = document.querySelector('.weather__wind');
const weatherCond = document.querySelector('.weather__cond');
const weatherData = document.querySelectorAll('.weather__data');
///----------------------------------------------------///

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
  //My Updates ///-///
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
  /// ------------------------------------ ///

  constructor() {
    //Get the user's position
    this._getPosition();
    //Retrieve data from the Local Storage
    this._getLocalStorage();
    //Add Event Listeners
    form.addEventListener('submit', this._newWorkout.bind(this)); // make the form submission create a new workout
    inputType.addEventListener('change', this._toggleElevationField); // switch the workout type
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); // move to the PopUp once I click on the workout

    //My Updates ///-///
    containerWorkouts.addEventListener('click', this._confirmDelete.bind(this)); // identify the target workout and show ModalWindow (RF)
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this)); // identify the target workout and show EditForm (RF)
    document.addEventListener('keydown', this.cancelOrDlt.bind(this)); // get confirmation through ModalWindow
    modalWindowConfirm.addEventListener('click', this.cancelOrDlt.bind(this)); // get ConfirmationModalWindow
    sortBtn.addEventListener('click', this.openTypeMenu.bind(this)); // activate dropDown menu for sorting
    deleteAllBtn.addEventListener('click', this._deleteAllWorkouts.bind(this)); // delete all workouts
    drawEraseBtn.addEventListener('click', this._eraseDrawing.bind(this)); // erase the path drawn by the user
    showAllBtn.addEventListener('click', this._showAllWorkouts.bind(this));
    /// ------------------------------------ ///
  }

  // Identify user's coordinates and load the Leaflet map
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`We couldn't get your current position`);
        }
      );
    }
  }

  // Load the Leaflet map
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    this.myCoords = [latitude, longitude];

    //show my current position area
    this.#map = L.map('map', { minZoom: 4, doubleClickZoom: false }).setView(
      this.myCoords,
      this.#mapZoomLevel
    );

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //add the dblclick listener to the Map
    this.#map.on('dblclick', this._showForm.bind(this));

    //render workouts from the local storage (on the map)
    this.#workouts.forEach(wk => {
      this._renderWorkoutMarker(wk);
      this._renderWorkoutPath(wk);
      this.#allCoords.push(wk.coords);
    });

    //My Updates ///-/// display btns, if necessary
    if (this.#workouts.length !== 0) {
      this.displayButtons();
    }
    /// ------------------------------------ ///
  }

  // Show the new workout form
  _showForm(mapE) {
    //return all workouts their original color
    this.defaultColor();
    //hide the weather window
    this.clsWthrMdlWndw();

    if (this.currentTargetBtns) this._hideBtns();
    this.#mapEvent = mapE;
    this.pathwayCoords.push([
      this.#mapEvent.latlng.lat,
      this.#mapEvent.latlng.lng,
    ]);
    form.classList.remove('hidden');
    inputDistance.focus();

    //My Updates ///-/// show the PathDrawing Modal Window
    this._drawPath();
    //close unnecessary forms
    if (workoutList.querySelector('.form__edit')) {
      this.editFormRemove();
    }
    /// ------------------------------------ ///
  }

  //Clear & hide the form and the DrawingModalWindow
  _clearForm() {
    // prettier-ignore
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 10);

    //My Updates ///-/// avoid error paths
    if (this.pathwayCoords) this.pathwayCoords = [];
    //check if the DrawingModalWindow is open
    this.clsDrwngWndw();
    //hide buttons
    if (!drawEraseBtn.classList.contains('hidden')) {
      drawEraseBtn.classList.add('hidden');
      drawCancelBtn.classList.add('hidden');
    }
    /// ------------------------------------ ///
  }

  //Switch the workout type in the new workout form
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //Functions to check validity of inputs
  validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
  allPositive = (...inputs) => inputs.every(inp => inp > 0);

  //Create and store new workout
  async _newWorkout(e) {
    try {
      e.preventDefault();

      //get the data from the form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      let lat;
      let lng;

      //My Updates ///-/// check if the pathway was drawn and get coordinates
      if (!this.pathwayWorkout) {
        lat = this.#mapEvent.latlng.lat;
        lng = this.#mapEvent.latlng.lng;
      }
      if (this.pathwayWorkout) {
        lat = this.pathwayWorkout.getCenter().lat;
        lng = this.pathwayWorkout.getCenter().lng;
      }
      /// ------------------------------------ ///

      let workout;

      //identify workout type
      if (type === 'running') {
        const cadence = +inputCadence.value;
        if (
          !this.validInput(distance, duration, cadence) ||
          !this.allPositive(distance, duration, cadence)
        )
          return this.showErrorWindow(); // display ErrorModalWindow, if data is irrelevant

        workout = new Running([lat, lng], distance, duration, cadence);
      }

      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !this.validInput(distance, duration, elevation) ||
          !this.allPositive(distance, duration)
        )
          return this.showErrorWindow();

        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      //My Updates ///-/// add pathway data
      if (this.pathwayWorkout) {
        this.pathwayWorkout.remove();
        workout.path = this.pathwayCoords;
        this.pathwayWorkout = false;
      }
      //add coords to the common array
      this.#allCoords.push([lat, lng]);
      /// ------------------------------------ ///

      //hide the Form and the PathDrawingModal + clear fields
      this._clearForm();
      //render the workout path, if nesessary
      this._renderWorkoutPath(workout);
      //add a new object to the workout array
      this.#workouts.push(workout);
      //render it on the list
      this._renderWorkout(workout);
      //render it on the map
      this._renderWorkoutMarker(workout);
      //record the weather
      await this._localWeather(workout);
      // //show the weather window
      // this._workoutWeather(workout);
      //save all workouts in the local storage
      this._setLocalStorage();
    } catch (err) {
      console.log(err);
    }
  }

  // Add markers to the map
  _renderWorkoutMarker(workout) {
    //save it into markers array
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
        .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
        )
        .openPopup()
    );
  }

  // Render workout path, if it was drawn
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

  // Prepare workout description for the new workout in the sidebar
  _setDescription(workout) {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let date = new Date(workout.date);
    workout.description = `${workout.type[0]
      .toUpperCase()
      .concat(workout.type.slice(1))} on ${
      months[date.getMonth()]
    } ${date.getDate()}`;
  }

  // Render workout in the sidebar
  _renderWorkout(workout) {
    //set Description
    this._setDescription(workout);
    //generate and add HTML elements
    const html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}" id="${
      workout.id
    }">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span> 
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
          <div class="workout__details_2 btn btn_delete hidden">
            <span class="workout__icon btn btn_delete">Delete</span>
          </div>
          <div class="workout__details_2 btn btn_edit hidden">
            <span class="workout__icon btn btn_edit">Edit</span>
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

    //show the buttons
    if (sortBtn.classList.contains('hidden')) {
      this.displayButtons();
    }
  }

  // On the map, move to the clicked workout
  _moveToPopup(e) {
    //My Updates ///-/// prevent errors and hide unnecessary forms
    if (e.target.classList.contains('btn')) return;
    if (e.target.closest('form')) return;
    this._clearForm();
    this.clsEdtWndwFn(e);

    //return all workouts their original color
    this.defaultColor();
    //---------------------------------///
    const workoutEl = e.target.closest(`.workout`);
    if (!workoutEl) return;

    //color the targeted workout
    workoutEl.style.backgroundColor = '#5d666e';

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // prettier-ignore
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {duration: 0.75,},
    });

    //My Updates ///-/// display or hide 'Edit' and 'Delete' buttons
    workoutEl.scrollIntoView({ behavior: 'smooth' });
    if (this.currentTarget === workout.id) {
      this._displayBtns();
    } else if (this.currentTarget && this.currentTarget !== workout.id) {
      this._hideBtns();
    }
    // display the weather conditions
    this._workoutWeather(workout);
    this.shwWthrMdlWndw();

    // store info about the clicked workout
    this.currentTarget = workout.id;
    ///-------------------------------///
  }

  //Save workouts in the local storage
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Retrieve workouts from the local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    //store and render workouts (in the sidebar)
    this.#workouts = data;
    this.#workouts.forEach(wk => {
      this._renderWorkout(wk);
    });
  }

  ///////////////////// MY UPDATES /////////////////////////

  // Display "Delete" and "Edit" btns
  _displayBtns() {
    this.currentTargetBtns = document
      .getElementById(this.currentTarget)
      .querySelectorAll('.workout__details_2');
    this.currentTargetBtns.forEach(btn => {
      btn.classList.toggle('hidden');
    });
  }

  // Hide "Delete" and "Edit" btns
  _hideBtns() {
    if (!this.currentTargetBtns) return;
    this.currentTargetBtns.forEach(btn => {
      btn.classList.add('hidden');
    });
  }

  ///////  Functions for Modal Windows  ///////

  // Show ConfirmationModalWindow fn
  shwMdlWndwFn() {
    modalWindowConfirm.classList.remove('hidden');
    modalWindowConfirm.style.display = 'grid';
    modalWindowConfirm.style.zIndex = '500';
    overlay.classList.remove('hidden');
  }

  // Hide ConfirmationModalWindow fn
  clsMdlWndwFn() {
    modalWindowConfirm.classList.add('hidden');
    modalWindowConfirm.style.display = 'none';
    modalWindowConfirm.style.zIndex = '1';
    overlay.classList.add('hidden');
  }

  // Display ErrorModalWindow
  showErrorWindow() {
    errorWindow.classList.remove('hidden');
    errorWindow.style.zIndex = '500';
    errorWindow.style.display = 'grid';
    overlay.classList.remove('hidden');

    //remove focus
    document.activeElement.blur();

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

  ///////  Functions for Editing Workouts  ///////

  //Add and display EditForm
  _editWorkout(e) {
    if (
      !e.target.classList.contains('btn_edit') ||
      workoutList.querySelector('.form__edit')
    )
      return;
    //hide unnecessary btns
    this._hideBtns();
    const workout = e.target.closest('.workout');
    const workoutObj = this.#workouts.find(
      work => work.id === workout.dataset.id
    );

    //hide the workout
    workout.classList.add('hidden');

    const editHtml = `<form class="form__edit animate">
          <div class="form__edit__heading form__label">${
            workoutObj.description
          }</div>
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type-2">
            ${
              workoutObj.type === 'running'
                ? `<option value="running">Running</option>
              <option value="cycling">Cycling</option>`
                : `<option value="cycling">Cycling</option><option value="running">Running</option>
              `
            }
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="km" value="${
              workoutObj.distance
            }"/>
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min"
            value="${workoutObj.duration}"/>
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__input--cadence-2"
              placeholder="step/min"
            value="${workoutObj.cadence ? workoutObj.cadence : ''}"/>
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__input--elevation-2"
              placeholder="meters"
            value="${workoutObj.elevation ? workoutObj.elevation : ''}"/>
          </div>
          <button class="form__btn">OK</button>
       </form>`;

    //insert the EditForm HTML
    workout.insertAdjacentHTML('afterend', editHtml);

    const editForm = workoutList.querySelector('.form__edit');
    editForm.scrollIntoView({ behavior: 'smooth' });

    //function to toggle the workout type in the EditForm
    const editFrmToggleFn = function () {
      editForm
        .querySelector('.form__input--cadence-2')
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      editForm
        .querySelector('.form__input--elevation-2')
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
    };

    if (workoutObj.type === 'cycling') {
      editFrmToggleFn();
    }

    //add listener to toggle the workout type field
    editForm
      .querySelector('.form__input--type-2')
      .addEventListener('change', function () {
        editFrmToggleFn();
      });

    //add listener to save and update the workout
    editForm.addEventListener(
      'submit',
      function (e) {
        e.preventDefault();

        //identify the chosen workout type
        const typeToChange = editForm.querySelector(
          '.form__input--type-2'
        ).value;

        // save new workout data and remove old data
        const newDistance = +editForm.querySelector('.form__input--distance')
          .value;
        const newDuration = +editForm.querySelector('.form__input--duration')
          .value;

        workoutObj.type = typeToChange;
        workoutObj.distance = newDistance;
        workoutObj.duration = newDuration;

        if (typeToChange === 'cycling') {
          const newElevation = +editForm.querySelector(
            '.form__input--elevation-2'
          ).value;
          if (
            !this.validInput(newDistance, newDuration, newElevation) ||
            !this.allPositive(newDistance, newDuration, newElevation)
          )
            return this.showErrorWindow();

          workoutObj.elevation = newElevation;
          if (workoutObj.cadence) delete workoutObj.cadence;
          if (workoutObj.pace) delete workoutObj.pace;
          workoutObj.speed = workoutObj.distance / workoutObj.duration;
        }

        if (typeToChange === 'running') {
          const newCadence = +editForm.querySelector('.form__input--cadence-2')
            .value;
          if (
            !this.validInput(newDistance, newDuration, newCadence) ||
            !this.allPositive(newDistance, newDuration, newCadence)
          )
            return this.showErrorWindow();

          workoutObj.cadence = newCadence;
          if (workoutObj.elevation) delete workoutObj.elevation;
          if (workoutObj.speed) delete workoutObj.speed;
          workoutObj.pace = workoutObj.duration / workoutObj.distance;
        }

        //remove all workouts from HTML (sidebar)
        this.clearSidebar();
        //remove the EditForm
        editForm.remove();
        //save the updated workout array in the Local Storage
        this._setLocalStorage();
        //Re-render all workouts again
        this.reRendering(this.#workouts);
      }.bind(this)
    );
  }

  // Remove EditForm HTML and show the workout
  editFormRemove() {
    workoutList.querySelector('.form__edit').remove();
    //Make the edited workout visible again
    containerWorkouts.querySelectorAll('.workout').forEach(wk => {
      if (wk.classList.contains('hidden')) wk.classList.remove('hidden');
    });
  }

  // Close EditForm
  clsEdtWndwFn(e) {
    if (
      !workoutList.querySelector('.form__edit') ||
      e.target.classList.contains('.form__edit')
    )
      return;
    this.editFormRemove();
  }

  ///////  Functions for Deleting Workouts  ///////

  // Display ConfirmationModalWindow and store data
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

  // Get confirmation through the ConfirmationModalWindow
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

  // Delete the chosen workout
  _deleteWorkout() {
    //remove all workouts from the sidebar
    this.clearSidebar();
    //remove workout from the database
    this.#workouts.splice(this.indexDeletingItem, 1);
    //save the updated workout array in Local Storage
    this._setLocalStorage();
    //Re-render all workouts
    this.reRendering(this.#workouts);
    //close ConfirmationModalWindow
    this.clsMdlWndwFn();
    //close weatherModalWindow
    this.clsWthrMdlWndw();
    if (this.#workouts.length === 0) {
      this.removeButtons();
    }
  }

  // Delete all workout and Clear the Map
  _deleteAllWorkouts() {
    //modify the ConfirmationModalWindow
    confirmPhrase.innerHTML =
      'Are you sure you want to delete all workout records?';
    this.shwMdlWndwFn();
    modalWindowConfirm.addEventListener(
      'click',
      function (e) {
        if (e.target.closest('.modal__btn__cancel')) {
          this.clsMdlWndwFn();
          confirmPhrase.innerHTML =
            'Are you sure you want to delete this workout record?';
        }
        if (e.target.closest('.modal__btn__delete')) {
          //clear the map
          this.clearMap();
          //empty the workouts array
          this.#workouts = [];
          //empty the storage
          localStorage.removeItem('workouts');
          //Remove workouts from HTML (sidebar)
          this.clearSidebar();
          //remove Sort and DeleteAll btns
          this.removeButtons();
          //set ConfirmationModalWIndow to default
          this.clsMdlWndwFn();
          confirmPhrase.innerHTML =
            'Are you sure you want to delete this workout record?';
        }
      }.bind(this),
      { once: true }
    );
  }

  ///////  Supporting Functions  ///////

  displayButtons() {
    sortBtn.classList.remove('hidden');
    deleteAllBtn.classList.remove('hidden');
    showAllBtn.classList.remove('hidden');
  }

  //Hide the buttons
  removeButtons() {
    sortBtn.classList.add('hidden');
    deleteAllBtn.classList.add('hidden');
    showAllBtn.classList.add('hidden');
  }

  //Make all workouts viewed at a time in the map
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
  }

  //Remove all workouts from the Sidebar
  clearSidebar() {
    workoutList.querySelectorAll('.workout').forEach(elem => {
      elem.remove();
    });
  }

  //Color each workout back
  defaultColor() {
    containerWorkouts
      .querySelectorAll('.workout')
      .forEach(wk => (wk.style.backgroundColor = '#42484d'));
  }

  // Remove all markers and paths from the map and the database
  clearMap() {
    //remove markers from the map
    this.#allMarkers.forEach(marker => marker.remove());
    //remove paths from the map
    this.#allPaths.forEach(path => path.remove());
    //empty the markers array
    this.#allMarkers = [];
    //empty paths array
    this.#allPaths = [];
  }

  // Re-render workouts after editing and deleting
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

  ///////  Functions for Sorting Workouts  ///////

  // Display dropDown menu to choose the sorting type
  openTypeMenu() {
    //close all unnecessary forms
    form.classList.add('hidden');
    this._hideBtns();
    this.clsMdlWndwFn();
    if (workoutList.querySelector('.form__edit')) {
      this.editFormRemove();
    }
    //check if the list is not sorted
    if (this.sorted === false) {
      //display the dropDown menu and add the oneTime listener
      dropMenu.classList.add('drop_class');
      dropMenu.addEventListener('click', this._sortWorkouts.bind(this));

      //also, make the dropDown disappear, if not clicked
      setTimeout(function () {
        document.addEventListener(
          'click',
          function (t) {
            if (t.target !== dropMenu && t.target !== sortBtn)
              dropMenu.classList.remove('drop_class');
          },
          { once: true }
        );
      }, 10);
    } else {
      //if sorted, change the button content
      this.sorted = false;
      sortBtn.innerHTML = 'Sort by';
      //remove sorted workouts
      this.clearSidebar();
      //display unsorted workouts
      this.#workouts.forEach(wk => {
        this._renderWorkout(wk);
      });
    }
  }

  // Sort workouts in the Sidebar
  _sortWorkouts(e) {
    if (!e.target.closest('.btn__sort')) return;

    //save the sorting choice
    const chosenType = e.target.closest('.btn__sort').dataset.sorting;
    //sort according to the user's choice
    if (chosenType === 'distance') {
      this.#sortedBy = this.#workouts
        .slice()
        .sort((a, b) => b.distance - a.distance);
    }
    if (chosenType === 'duration') {
      this.#sortedBy = this.#workouts
        .slice()
        .sort((a, b) => b.duration - a.duration);
    }

    if (chosenType === 'type') {
      const onlyRunning = this.#workouts.filter(wk => wk.type === 'running');
      const onlyCycling = this.#workouts.filter(wk => wk.type === 'cycling');

      this.#sortedBy = onlyRunning.concat(onlyCycling);
    }

    //empty the list
    this.clearSidebar();
    //display sorted workouts
    this.#sortedBy.forEach(wk => {
      this._renderWorkout(wk);

      //close the dropDown menu
      dropMenu.classList.remove('drop_class');
      sortBtn.innerHTML = 'Unsort';
    });

    //add the value to refer, when SortBtn is pressed
    this.sorted = true;
  }

  ///////  Functions for Drawing Workout Paths  ///////

  // Draw a path on the map
  _drawPath() {
    //show the DrawingModalWindow
    this.shwDrwngWndw();
    //supporting function - draw the line after each extra click
    const gainCoords = function (mapEv) {
      //display additional btns
      if (drawEraseBtn.classList.contains('hidden')) {
        drawEraseBtn.classList.remove('hidden');
        drawCancelBtn.classList.remove('hidden');
      }
      //get the click coordinates
      const { lat, lng } = mapEv.latlng;
      //save the new coords
      this.pathwayCoords.push([lat, lng]);
      if (this.pathwayWorkout) {
        this.pathwayWorkout.remove();
      }
      //display the line (update the polyline after every click)
      this.pathwayWorkout = L.polyline(this.pathwayCoords, {
        color: 'red',
        smoothfactor: 5,
        weight: 12,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(this.#map);

      //count distance between point to measure the total distance
      if (this.pathwayCoords.length >= 2) {
        const addDistance =
          this.#map.distance(
            this.pathwayCoords[this.pathwayCoords.length - 1],
            this.pathwayCoords[this.pathwayCoords.length - 2]
          ) / 1000;
        this.pathDistance += addDistance;
        //display it in the new workout form
        inputDistance.value = +this.pathDistance.toFixed(1);
      }
    }.bind(this);

    //start drawing the Path (add listener)
    this.#map.on('click', gainCoords);

    //add listeners to the Cancel button and to the document
    drawCancelBtn.addEventListener(
      'click',
      function () {
        this._cancelDrawing();
        //remove listener, if the user cancels drawing
        this.#map.off('click', gainCoords);
      }.bind(this)
    );

    document.addEventListener(
      'click',
      function (e) {
        if (
          e.target.closest('.workout') ||
          e.target === containerWorkouts ||
          e.target.closest('.dropdown')
        ) {
          this._cancelDrawing();
          this.#map.off('click', gainCoords);
        }
      }.bind(this)
    );

    document.addEventListener(
      'keydown',
      function (e) {
        if (e.key === 'Escape') {
          this._cancelDrawing();
          this.#map.off('click', gainCoords);
        }
        if (e.key === 'Enter') {
          this.#map.off('click', gainCoords);
        }
      }.bind(this)
    );
  }

  // Cancel drawing
  _cancelDrawing() {
    //clear and close the form
    if (!form.classList.contains('hidden')) {
      this._clearForm();
    }
    //erase the path, if it is there
    this._eraseDrawing();
    this.pathDistance = 0;
    //hide buttons
    if (!drawEraseBtn.classList.contains('hidden')) {
      drawEraseBtn.classList.add('hidden');
      drawCancelBtn.classList.add('hidden');
    }
  }

  // Erase the current path
  _eraseDrawing() {
    if (this.pathwayWorkout) {
      this.pathwayWorkout.remove();
    }
    //empty the pathway coords array
    this.pathwayCoords = [];
    this.pathwayWorkout = false;
  }

  //Show the drawing window
  shwDrwngWndw() {
    drawWindow.style.display = 'grid';
    drawWindow.style.zIndex = '500';
  }

  //Hide the drawing window
  clsDrwngWndw() {
    if (drawWindow.style.display === 'none') return;
    drawWindow.style.display = 'none';
    drawWindow.style.zIndex = '1';
  }

  //////////////// Weather Functions //////////////

  // Determine weather
  async _localWeather(wk) {
    try {
      //find info through the API
      const curWeather = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${wk.coords[0]}&longitude=${wk.coords[1]}&current_weather=true`
      ).then(res => res.json());
      //set new parameters to the variables in the object
      wk.temperature = curWeather.current_weather.temperature;
      wk.windspeed = curWeather.current_weather.windspeed;
      wk.weathercode = curWeather.current_weather.weathercode;
      //render the workout in the weatherModalWindow
      this._workoutWeather(wk);
    } catch (err) {
      console.log(err);
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

  // Close weatherModalW  indow
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

  // Render weatherModalWindow
  _workoutWeather(workout) {
    //first, close and clear the window
    this.clsWthrMdlWndw();
    //check, if the weather records exist
    if (!workout.temperature) {
      weatherDesc.textContent = 'No weather records found';
      this.shwWthrMdlWndw();
      return;
    }
    //set values in the weatherModalWindow
    weatherDesc.textContent = 'That day';
    weatherTemp.textContent = `${workout.temperature}`;
    weatherWind.textContent = `${workout.windspeed}`;
    //find the proper weather condition in the common object
    let index = Object.keys(wmo).indexOf(`${workout.weathercode}`);
    weatherCond.textContent = `${Object.values(wmo)[index]}`;
    this.shwWthrMdlWndw();
  }
  ////////-------------------------------////////

  // Empty the Local Storage and reload the page
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//Run the App written above
const app = new App();
