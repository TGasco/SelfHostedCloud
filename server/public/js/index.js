import { BytesToSize, ConvertDate, fetchWithAuth, fetchStreamedFile, ConvertTime } from './helperfuncs.js';

// Store the current directory
let currDir = null;
let moveCurrDir = null;
let userPreferences;
let username;
let fileView = false;
let baseDir;
let touchTimeout;
let longPress;
let renderedPages = new Map();
let renderingPages = new Set();
let pdf = null;

// Define the worker script for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.5.141/build/pdf.worker.min.js';


async function init_files(path, documents = null) {
  if (fileView) return;
  let files;
  let success;
  const oldGrid = document.getElementById("grid") || document.getElementById("empty-drive-message");
  // Fetch the file metadata
  if (documents) {
    files = documents;
  } else {
    if (!path) {
      path = currDir;
    } else {
      currDir = path;
    // Update the current directory on the server
    }
    // Get and display the relative path
    const relativePath = await GetRelativePath(path);
    const currDirElement = document.getElementById("curr-dir");
    currDirElement.textContent = relativePath;
    // Get the files and folders at the given path
    files = await fetchFilesMetadata(path);
    await updateCurrentDir(path);
  }


  const backBtn = document.getElementById("back-btn");
  if (path === baseDir) {
    backBtn.classList.add("hidden");
  } else {
    backBtn.classList.remove("hidden");
  }

  if (files.length === 0) {
    const emptyMessage = document.createElement("div");
    if (path === baseDir) {
      emptyMessage.textContent = "Your Drive is empty! Upload some files to get started.";
    } else {
      emptyMessage.textContent = "This folder is empty.";
    }
    emptyMessage.id = "empty-drive-message";
    emptyMessage.className = "empty-drive-message center";
    oldGrid.replaceWith(emptyMessage);
    return;
  }

  // Sort the files
  const sortBtn = document.getElementById("sort-btn");
  if (sortBtn.classList.contains("sort-asc")) files = SortFiles(files, "fileName", true);
  else files = SortFiles(files, "fileName", false);
  // use init_grid if User list view preference is set to grid
  if (userPreferences.useListView.prefValue == false) {
    success = init_grid(files);
    // return;
  } else {
    success = init_list(files);
  }

  if (!documents) {
    currDir = path;
    // Update the current directory on the server
    await updateCurrentDir(path);
  }
}

/**
 * Initialize the grid view with the files and folders at the given path.
 * @param {string} path - The path to display in the grid view.
 */
async function init_grid(files) {
  const oldGrid = document.getElementById("grid") || document.getElementById("empty-drive-message");
  oldGrid.className = "grid-container unselectable";

  // Create a temporary grid element
  const newGrid = document.createElement("div");
  newGrid.id = "grid";
  newGrid.className = "grid-container unselectable";

  // Create a document fragment to hold the grid items
  const gridFragment = document.createDocumentFragment();

  try {
      // Create an array of promises for creating grid items
      const iconPromises = files.map((file, i) => createGridItem(file, i, gridFragment));

      // Wait for all the promises to resolve
      await Promise.all(iconPromises);

      // Append the document fragment to the new grid
      newGrid.appendChild(gridFragment);

      // Only replace the grid if the new grid is different from the old grid
      if (!oldGrid.isEqualNode(newGrid)) {
        oldGrid.replaceWith(newGrid);
      }
      return true;

  } catch (error) {
    console.error("Error fetching metadata or current directory:", error);
    return false;
  }
}

/**
 * Sorts a list of files based on the provided attribute and order.
 * @param {Array} files - The list of files to sort.
 * @param {string} sortBy - The attribute to sort by: 'fileName', 'fileExt', 'fileSize', or 'lastViewed'.
 * @param {boolean} [ascending=true] - Whether to sort in ascending order (true) or descending order (false).
 * @return {Array} The sorted list of documents */
function SortFiles(files, sortBy, ascending = true) {
  // Copy the input array to avoid modifying the original
  const sortedFiles = [...files];

  // Define a custom comparison function for each sort option
  const compareFunctions = {
    fileName: (a, b) => a.fileName.localeCompare(b.fileName),
    fileExt: (a, b) => a.fileExt.localeCompare(b.fileExt),
    fileSize: (a, b) => a.fileSize - b.fileSize,
    lastViewed: (a, b) => a.lastViewed.getTime() - b.lastViewed.getTime(),
  };

  // Get the appropriate comparison function based on the sortBy parameter
  const compareFunction = compareFunctions[sortBy];

  // Sort the files using the selected comparison function
  sortedFiles.sort((a, b) => ascending ? compareFunction(a, b) : -compareFunction(a, b));

  return sortedFiles;
}

/**
 * Initialize the favourite list view with the user's favourite files and folders.
 */
async function init_favourite_list() {
  const oldFavList = document.getElementById("favourites-list");

  // Create a temporary list element
  const newFavList = document.createElement("ul");
  newFavList.id = "favourites-list";
  newFavList.className = "sidebar-list";

  // Create a document fragment to hold the list items
  const favFragment = document.createDocumentFragment();

  try {
    const favourites = await GetFavourites();

    if (favourites.length === 0) {
      // Display a message if there are no favourites
      const fav = document.createElement("p");
      fav.className = "sidebar-item";
      const text = document.createElement("span");
      text.textContent = "No favourites yet!";
      text.className = "fav-text";
      fav.appendChild(text);
      favFragment.appendChild(fav);
    } else {
      // Create an array of promises for creating favourite items
      const favPromises = favourites.map((file, i) => createFavItem(file, i, favFragment));

      // Wait for all the promises to resolve
      await Promise.all(favPromises);
    }

    // Append the document fragment to the new list
    newFavList.appendChild(favFragment);

    // Replace the old list with the new list
    oldFavList.replaceWith(newFavList);
  } catch (error) {
    console.error("Error fetching favourites:", error);
  }
}

async function init_move_list(path) {
  // Get the documents in the current directory
  const moveBackBtn = document.getElementById("move-back-btn");
  if (path === baseDir) {
    moveCurrDir = baseDir;
    moveBackBtn.classList.add("hidden");
  } else {
    moveCurrDir = path;
    moveBackBtn.classList.remove("hidden");
  }


  const onClickListener = async (file) => {
    const filePath = file.isDirectory ? file.dirPath + "/" + file.fileName : file.dirPath;
    if (filePath !== moveCurrDir) {
      init_move_list(filePath);
    }
  };

  let documents = await fetchFilesMetadata(path);
  documents = SortFiles(documents, "fileExt");
  init_list_view(documents, "move-list", onClickListener);
  // Update the current directory
}

async function init_list(files) {
  const onClickListener = async (file) => {
    const filePath = file.isDirectory ? file.dirPath + "/" + file.fileName : file.dirPath;
    if (filePath !== currDir) {
      init_files(filePath);
    }
  };

  init_list_view(files, "grid", onClickListener, true);
}

async function init_list_view(documents, elementId, onClickListener, allowFileView = false) {
  let oldList = document.getElementById(elementId);
  if (oldList === null) {
    oldList = document.getElementById("empty-drive-message");
  }

  // Create a temporary list element
  const newList = document.createElement("ul");
  newList.id = elementId;
  newList.className = "sidebar-list unselectable";

  // Create a document fragment to hold the list items
  const documentFragment = document.createDocumentFragment();

  try {
      // Create an array of promises for creating list items
    const docPromises = documents.map((file, i) => createItem(file, i, documentFragment, allowFileView, onClickListener.bind(null, file)));

    // Wait for all the promises to resolve
    await Promise.all(docPromises);
    // }

    // Append the document fragment to the new list
    newList.appendChild(documentFragment);

    // Replace the old list with the new list
    oldList.replaceWith(newList);
  } catch (error) {
    console.error("Error fetching documents:", error);
  }
}

async function createItem(file, i, documentFragment, allowFileView = false, onClickListener = null) {
  return new Promise(async (resolve) => {
    const doc = document.createElement("li");
    doc.className = "sidebar-item fav-item";

    const img = document.createElement("img");
    img.src = GetFileIcon(file);
    img.className = "fav-img";
    doc.appendChild(img);

    const text = document.createElement("p");
    text.textContent = userPreferences.showFileExtensions ? file.fileName + file.fileExt : file.fileName;
    text.className = "fav-text";
    doc.appendChild(text);

    if (file.isDirectory) {
      const arrow = document.createElement("i");
      arrow.className = "dir-arrow fas fa-angle-right";
      doc.appendChild(arrow);
    }

    if (onClickListener) {
      doc.addEventListener("click", onClickListener);
    }

    if (allowFileView) {
      addClickEventListeners(doc, file);
      addShowContextMenuListeners(doc, file);
    }

    documentFragment.appendChild(doc);
    resolve();
  });
}

async function init_preferences(preferences) {
  const preferencesList = document.getElementById("preferences-list");
  const newPreferences = document.createElement("ul");
  newPreferences.id = "preferences-list";
  newPreferences.className = "sidebar-list";

  const preferencesFragment = document.createDocumentFragment();

  try {
    if (preferences.length === 0) {
      const pref = document.createElement("p");
      pref.className = "sidebar-item";
      const text = document.createElement("span");
      text.textContent = "No preferences ";
      text.className = "pref-text";
      pref.appendChild(text);
      preferencesFragment.appendChild(pref);
    } else {
      const prefPromises = Object.entries(preferences).map((pref, i) => createPrefItem(pref, i, preferencesFragment));

      await Promise.all(prefPromises);
    }

    newPreferences.appendChild(preferencesFragment);
    preferencesList.replaceWith(newPreferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
  }
}

function createPrefItem(pref, i, prefFragment) {
  return new Promise(async (resolve) => {
    const [key, value] = pref;
    const prefValue = value.prefValue;
    const prefType = value.prefType;
    const prefItem = document.createElement("li");
    let prefInput;
    prefItem.className = "sidebar-item pref-item prefType-" + prefType;

    const prefName = document.createElement("p");
    prefName.textContent = value.prefString;
    prefName.className = "pref-name";
    prefItem.appendChild(prefName);

    switch(prefType) {
      case "toggle":
        prefInput = createSwitch(key, prefValue);
        break;
      case "slider":
        const prefOptions = value.prefOptions;
        prefInput = createSlider(key, prefValue, prefOptions);
        break;
      default:
        prefInput = createSwitch(key, prefValue);

    }

    // Add the input type to the prefItem
    prefItem.appendChild(prefInput);

    prefFragment.appendChild(prefItem);
    resolve();
  });
}

const createSwitch = (key, prefValue) => {
    // Create label element for the switch
    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const prefToggle = document.createElement("input");
    prefToggle.type = "checkbox";
    prefToggle.id = key;
    prefToggle.className = "prefType-toggle";
    if (prefValue) {
      prefToggle.checked = true;
    } else {
      prefToggle.checked = false;
    }
    prefToggle.addEventListener("click", (e) => {
      updatePreference(e);
    });

    // Add the input element to the switch label
    switchLabel.appendChild(prefToggle);

    // Create a span element for the slider and add it to the switch label
    const sliderSpan = document.createElement("span");
    sliderSpan.className = "slider";
    switchLabel.appendChild(sliderSpan);

    return switchLabel;
}

const createSlider = (key, prefValue, prefOptions) => {
  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = key;
  slider.className = "prefType-slider range-slider";
  slider.min = prefOptions[0].min;
  slider.max = prefOptions[0].max;
  slider.value = prefValue;
  slider.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${prefValue}%, var(--switch-background-color) ${prefValue}%, var(--switch-background-color) 100%)`;
  slider.addEventListener("click", (e) => {
    updatePreference(e);
  });

  slider.addEventListener("input", function() {
    let value = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${value}%, var(--switch-background-color) ${value}%, var(--switch-background-color) 100%)`;
  });

  return slider;
}

const extractPrefType = (element) => {
  const classNames = element.className.split(' ');
  const prefTypeClass = classNames.find((className) => className.startsWith('prefType-'));
  if (prefTypeClass) {
    return prefTypeClass.split('-')[1];
  }
  return null;
};

const getNewValueFromEvent = (e, prefType) => {
  switch (prefType) {
    case 'toggle':
      return e.target.checked;
    case 'slider':
      return parseInt(e.target.value, 10);
    case 'string':
    default:
      return e.target.textContent;
  }
};

const updatePreference = async (e) => {
  try {
    const prefName = e.target.id;
    const prefType = extractPrefType(e.target);
    const newValue = getNewValueFromEvent(e, prefType);
    const response = await fetchWithAuth('/update-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefKey: prefName,
        newValue: newValue,
      }),
    }).then((res) => {res.json()});

    LoadPage(true);
    return response;
  } catch (error) {
    console.error('Error updating preferences:', error);
  }
};

/**
 * Get the relative path for the given path, replacing the base directory with "My Cloud".
 * @param {string} path - The path to get the relative path for.
 * @returns {Promise<string>} A promise that resolves to the relative path.
 */
async function GetRelativePath(path) {
  try {
    const baseDir = await getBaseDir();
    return path.replace(baseDir, "My Cloud");
  } catch (error) {
    // redirectToLogin();
    throw error;
  }
}

/**
 * Get the parent directory of the given path.
 * @param {string} path - The path to get the parent directory for.
 * @returns {string} The parent directory path.
 */
function GetPreviousDir(path) {
  const splitPath = path.split("/");
  const newPath = splitPath.slice(0, -1).join("/");
  return newPath;
}

/**
 * Get the user's favourite files and folders.
 * @returns {Promise<Array>} A promise that resolves to an array of favourite files and folders.
 */
async function GetFavourites() {
  try {
    const response = await fetchWithAuth("/get-favourites", {
      method: "GET",
    });

    const favourites = await response.json();
    return favourites;
  } catch (error) {
    console.error("Error fetching favourites:", error);
    return [];
  }
}

async function GetPreferences() {
  try {
    const response = await fetchWithAuth("/get-preferences", {
      method: "GET",
    });

    if (response.status !== 200) {
      return [];
    }

    const preferences = await response.json();
    return preferences;
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return [];
  }
}

async function SearchForFiles(searchTerm) {
  try {
    const response = await fetchWithAuth("/file-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ searchTerm }),
    });

    if (response.status !== 200) {
      return [];
    }

    const files = await response.json();
    return files;
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
}

/**
 * Fetch the file metadata for the given path.
 * @param {string} path - The path to fetch metadata for.
 * @returns {Promise<Array|null>} A promise that resolves to an array of files, or null if an error occurs.
 */
async function fetchFilesMetadata(path) {
  try {
    const filesResponse = await fetchWithAuth("/metadata?path=" + path, {
      method: "GET",
    });

    if (filesResponse.status !== 200) {
      if (filesResponse.status === 401) {
        redirectToLogin();
      }
      return null;
    }

    const files = await filesResponse.json();
    return files;
  } catch (error) {
    console.error("Error fetching files metadata:", error);
    return null;
  }
}

/**
 * Update the current directory on the server.
 * @param {string} path - The path to set as the current directory.
 * @returns {Promise<boolean>} A promise that resolves to true if the update was successful, or false if an error occurs.
 */
async function updateCurrentDir(path) {
  try {
    const currDirResponse = await fetchWithAuth("/currdir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currDir: path }),
    });

    if (currDirResponse.status !== 200) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating current directory:", error);
    return false;
  }
}

async function getCurrentDir() {
  try {
    const response = await fetchWithAuth("/currdir", {
      method: "GET",
    }).then((res) => res.json());
    const currDir = response.currDir;
    return currDir;
  } catch (error) {
    console.error("Error getting current directory:", error);
    return null;
  }
}

// Additional helper functions for creating grid items and favourite items were omitted in the previous response.
// Add these functions to complete the refactoring.

/**
 * Create a grid item for the given file, and append it to the given document fragment.
 * @param {Object} file - The file metadata.
 * @param {string} path - The path of the file.
 * @param {number} i - The index of the file in the grid.
 * @param {DocumentFragment} gridFragment - The document fragment to append the grid item to.
 * @returns {Promise} A promise that resolves
 *  * when the grid item has been created and appended to the document fragment.
 */
function createGridItem(file, i, gridFragment) {
  return new Promise(async (resolve) => {
    const gridItem = document.createElement("div");
    gridItem.id = file._id;
    gridItem.className = "grid-item";

    addClickEventListeners(gridItem, file);

    addShowContextMenuListeners(gridItem, file);

    const img = document.createElement("img");
    img.id = "img-" + i;
    img.className = "grid-img";
    img.src = GetFileIcon(file);
    gridItem.appendChild(img);

    const fileName = document.createElement("div");
    fileName.id = "filename-" + i;
    fileName.className = "grid-filename";
    if (userPreferences.showFileExtensions.prefValue) {
      fileName.textContent = file.fileName + file.fileExt;
    } else {
      fileName.textContent = file.fileName;
    }
    gridItem.appendChild(fileName);

    gridFragment.appendChild(gridItem);

    resolve();
  });
}

async function addClickEventListeners(item, file) {
  if (file.isDirectory) {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      init_files(file.dirPath + "/" + file.fileName);
    });
  } else {
    item.addEventListener("click", async (e) => {
      showFileViewer(e, file);
    });
  }
}

async function addShowContextMenuListeners(gridItem, file) {
  gridItem.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e, file);
  });

  // Add touch event listeners to show context menu on long press
  let touchStartX;
  let touchStartY;
  const touchMoveThreshold = 10; // Adjust this value based on your needs

  gridItem.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    longPress = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchTimeout = setTimeout(() => {
      longPress = true;
      showContextMenu(e, file);
    }, 300);
  });

  gridItem.addEventListener("touchmove", (e) => {
    e.stopPropagation();
    const touchMoveX = e.touches[0].clientX;
    const touchMoveY = e.touches[0].clientY;
    const distanceMoved = Math.sqrt(
      Math.pow(touchMoveX - touchStartX, 2) + Math.pow(touchMoveY - touchStartY, 2)
    );

    if (distanceMoved > touchMoveThreshold) {
      clearTimeout(touchTimeout);
    }
  });

  gridItem.addEventListener("touchend", (e) => {
    e.stopPropagation();
    clearTimeout(touchTimeout);
    if (!longPress) {
      // Dispatch click event
      gridItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
}


/**
 * Create a favourite item for the given file, and append it to the given document fragment.
 * @param {Object} file - The file metadata.
 * @param {number} i - The index of the file in the favourites list.
 * @param {DocumentFragment} favFragment - The document fragment to append the favourite item to.
 * @returns {Promise} A promise that resolves when the favourite item has been created and appended to the document fragment.
 */
function createFavItem(file, i, favFragment) {
  return new Promise(async (resolve) => {
    const fav = document.createElement("li");
    fav.className = "sidebar-item fav-item";

    const img = document.createElement("img");
    img.src = GetFileIcon(file);
    img.className = "fav-img";
    fav.appendChild(img);

    const text = document.createElement("p");
    text.textContent = userPreferences.showFileExtensions.prefValue ? file.fileName + file.fileExt : file.fileName;
    text.className = "fav-text";
    fav.appendChild(text);

    fav.addEventListener("click", (e) => {
      e.preventDefault();

      document.getElementById("menu-btn").classList.remove('open');
      document.getElementById("sidebar").classList.remove('open');
      if (file.isDirectory) {
        const filePath = `${file.dirPath}/${file.fileName}`;
        if (filePath !== currDir) {
          init_files(filePath);
          // init_grid(filePath);
        }
      } else {
        showFileViewer(e, file);
      }
      // const filePath = file.isDirectory ? file.dirPath + "/" + file.fileName : file.dirPath;
    });

    addShowContextMenuListeners(fav, file);

    favFragment.appendChild(fav);
    resolve();
  });
}

function GetFileIcon(file) {
  if (file.isDirectory) {
    return "/images/filetypes/folder.png";
  } else {
    const fileExtensions = new Set([
      ".3ds", ".aac", ".ai", ".avi", ".bmp", ".cad", ".cdr", ".css", ".dat",
      ".dll", ".doc", ".docx", ".eps", ".fla", ".flv", ".gif", ".html", ".indd",
      ".iso", ".jpg", ".jpeg", ".js", ".midi", ".mov", ".mp3", ".mpg", ".pdf", ".php",
      ".png", ".ppt", ".pptx", ".ps", ".psd", ".raw", ".sql", ".svg", ".tif", ".txt",
      ".wmv", ".xls", ".xml", ".zip"
    ]);

    const basePath = "/images/filetypes/";
    const sharedIconExtensions = {
      ".jpeg": ".jpg",
      ".doc": ".docx",
      ".pptx": ".ppt",
    };

    const fileExt = sharedIconExtensions[file.fileExt] || file.fileExt;

    return fileExtensions.has(fileExt) ? basePath + fileExt.slice(1) + ".png" : basePath + "file-unknown.png";
  }
}


// Event Listeners
const addBackBtnClickListener = (backBtn) => {
  backBtn.addEventListener("click", async () => {
    if (fileView) {
      // Hide file viewer by triggering the hide file viewers event
      closeFileViewer();
    } else if (currDir === baseDir) {
        console.log("You are already in the base directory.");
        backBtn.classList.add("hidden");
    } else {
      const prevDir = await GetPreviousDir(currDir);
      backBtn.classList.remove("hidden");
      init_files(prevDir);
      // init_grid(prevDir);
    }
  });
};

const addMoveBackBtnClickListener = (backBtn) => {
  backBtn.addEventListener("click", async () => {
    if (moveCurrDir === baseDir) {
      backBtn.classList.add("hidden");
    } else {
      const prevDir = GetPreviousDir(moveCurrDir);
      init_move_list(prevDir);
    }
  });
};

// Global event listeners
// Used for keeping track of dynamically added event listeners
const eventListeners = {
  hideContextMenuListener: null,
  downloadFileListener: null,
  showFileInfoListener: null,
  hideFileInfoListener: null,
  renameFileListener: null,
  showDeleteConfirmListener: null,
  hideDeleteConfirmListener: null,
  deleteFileListener: null,
  favouriteFileListener: null,
  showMoveFileListener: null,
  hideMoveFileListener: null,
  moveFileListener: null,
  hideFileViewersListener: null,
  checkVisibilityScrollListener: null,
  checkVisibilityResizeListener: null,
};

// Event Listener Utility Functions

/**
 * Remove an event listener if it exists in the eventListeners object.
 *
 * @param {string} elementId - The ID of the DOM element to remove the event listener from.
 * @param {string} eventType - The type of the event to remove the listener for (e.g., "click").
 * @param {string} listenerKey - The key used to store the listener function in the eventListeners object.
 */
const removeEventListenerIfExists = (elementId, eventType, listenerKey) => {
  const element = elementId ? document.getElementById(elementId) : window;

  // Check if the element exists and if there's an existing event listener for the given key
  if (element && eventListeners[listenerKey]) {
    // Remove the event listener from the element
    element.removeEventListener(eventType, eventListeners[listenerKey]);
    // Set the event listener key in the eventListeners object to null
  } else {
    if (elementId === "window") {
      window.removeEventListener(eventType, eventListeners[listenerKey]);
    } else {
      document.removeEventListener(eventType, eventListeners[listenerKey]);
    }
  }
  eventListeners[listenerKey] = null;
};

/**
 * Add an event listener and store it in the eventListeners object.
 *
 * @param {string} elementId - The ID of the DOM element to add the event listener to.
 * @param {string} eventType - The type of the event to add the listener for (e.g., "click").
 * @param {string} listenerKey - The key used to store the listener function in the eventListeners object.
 * @param {function} listenerFn - The event listener function to add to the element.
 */
const addEventListenerAndStore = (elementId, eventType, listenerKey, listenerFn) => {
  const element = document.getElementById(elementId);
  eventListeners[listenerKey] = listenerFn;
  // Check if the element exists
  if (element) {
    // Store the event listener function in the eventListeners object
    // Add the event listener to the element
    element.addEventListener(eventType, eventListeners[listenerKey]);
  } else {
    if (elementId === "window") {
      window.addEventListener(eventType, eventListeners[listenerKey]);
    } else {
      document.addEventListener(eventType, eventListeners[listenerKey]);
    }
  }
};


// Event listener setup
const setupEventListeners = () => {
  const backBtn = document.getElementById("back-btn");
  const moveBackBtn = document.getElementById("move-back-btn");
  addBackBtnClickListener(backBtn);
  addMoveBackBtnClickListener(moveBackBtn);
};

// Call setupEventListeners on script load
setupEventListeners();

var showUserPanel = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const userPanel = document.getElementById("user-panel");
  userPanel.classList.remove("hidden");
  setTimeout(() => {
    userPanel.style.opacity = 1;
  }, 0);
  document.addEventListener("click", function hideUserPanelListener(ev) {
    if (!userPanel.contains(ev.target)) {
      hideUserPanel(ev);
      document.removeEventListener("click", hideUserPanelListener);
    }
  });
};

var hideUserPanel = (e) => {
  const userPanel = document.getElementById("user-panel");
  userPanel.style.opacity = 0;
  setTimeout(() => {
    userPanel.classList.add("hidden");
  }, 200);
};

var toggleUserPanel = (e) => {
  const userPanel = document.getElementById("user-panel");
  if (userPanel.classList.contains("hidden")) {
    showUserPanel(e);
  } else {
    hideUserPanel();
  }
}

async function downloadFile(e, file) {
  const token = localStorage.getItem('token'); // Get the JWT token from localStorage

  try {
    const response = await fetchWithAuth('/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId: file._id }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob(); // Get the blob data from the response

    // Create a URL for the blob data
    const url = window.URL.createObjectURL(blob);

    // Create a link and click it to download the file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.fileName}${file.fileExt}`);
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
}

var deleteFile = async (e, file) => {
  const response = await fetchWithAuth('/file-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId: file._id }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  } else {
    const data = await response.text();
  }

  hideDeleteConfirm(e, file);
  getTotalStorage();
  init_files(currDir);
}

var showDeleteConfirm = (e, file) => {
  e.preventDefault();
  showOverlay();
  removeEventListenerIfExists("delete-cancel-btn", "click", "hideDeleteConfirmListener");
  removeEventListenerIfExists("delete-confirm-btn", "click", "deleteFileListener");

  // Show the delete confirmation panel here, populate it with file info
  const deleteConfirmation = document.getElementById("delete-confirm");
  deleteConfirmation.classList.remove("hidden");
  deleteConfirmation.classList.add(file._id);
  setTimeout(() => {
    deleteConfirmation.style.opacity = 1;
  }, 0);

  addEventListenerAndStore("delete-cancel-btn", "click", "hideDeleteConfirmListener", hideDeleteConfirm.bind(null, e, file));
  addEventListenerAndStore("delete-confirm-btn", "click", "deleteFileListener", deleteFile.bind(null, e, file));
}

var hideDeleteConfirm = (e, file) => {
  hideOverlay();
  const deleteConfirmation = document.getElementById("delete-confirm");
  deleteConfirmation.classList.remove(file._id);
  deleteConfirmation.style.opacity = 0;
  setTimeout(() => {
    deleteConfirmation.classList.add("hidden");
  }, 200);

  removeEventListenerIfExists("delete-cancel-btn", "click", "hideDeleteConfirmListener");
}

// Show file info panel
const showFileInfo = async (e, file) => {
  e.preventDefault();
  e.stopPropagation();
  removeEventListenerIfExists("file-info", "click", "showFileInfoListener");
  // Show the file info panel here, populate it with file info
  const fileInfo = document.getElementById("file-info-modal");
  const fileInfoTitle = fileInfo.querySelectorAll(".file-info-title")[0];
  const fileInfoItems = fileInfo.querySelectorAll(".file-info-item");
  fileInfo.classList.remove("hidden");
  // fileInfo.classList.add(file._id);
  setTimeout(() => {
    fileInfo.style.opacity = 1;
  }, 0);
  fileInfoTitle.textContent = file.fileName;
  fileInfoItems[0].textContent = `Location: ${await GetRelativePath(file.dirPath)}`;
  fileInfoItems[1].textContent = `Size: ${BytesToSize(file.fileSize)}`;
  fileInfoItems[2].textContent = file.isDirectory ? "Type: Folder" : `Type: ${file.fileExt}`;
  fileInfoItems[3].textContent = `Last Viewed: ${ConvertDate(file.lastViewed)}`;
  fileInfoItems[4].textContent = `Last Modified: ${ConvertDate(file.lastModified)}`;
  fileInfoItems[5].textContent = `Uploaded: ${ConvertDate(file.uploadDate)}`;
  fileInfoItems[6].textContent = `Favourite: ${file.isFavourited}`;

  window.addEventListener("click", hideFileInfo);
};

// Hide file info panel
const hideFileInfo = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const fileInfo = document.getElementById("file-info-modal");
  const fileInfoItem = document.getElementById("file-info");
  const fileViewer = document.getElementById("file-viewer-info");
  if (fileInfo.contains(e.target) || fileInfoItem.contains(e.target) || fileViewer.contains(e.target)) {
    return;
  }
  fileInfo.style.opacity = 0;
  setTimeout(function() {
    fileInfo.classList.add("hidden");
  }, 200);
  window.removeEventListener("click", hideFileInfo);
};


var favouriteFile = async (e, file) => {
  const response = await fetchWithAuth('/toggle-favourite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId: file._id }),
  }).then((res) => res.json());
  console.log(response);


  init_favourite_list();
};

const renameFile = (e, file) => {
  const fileElement = document.getElementById(file._id);
  const fileName = fileElement.getElementsByClassName("grid-filename")[0];
  const editFileInputField = document.getElementById("edit-filename");
  editFileInputField.classList.remove("hidden");
  // Remove file extension from the file name

  editFileInputField.value = fileName.textContent.replace(file.fileExt, "");
  editFileInputField.style.left = fileName.offsetParent.offsetLeft + fileName.offsetLeft + "px";
  editFileInputField.style.top = fileName.offsetParent.offsetTop + fileName.offsetTop + "px";

  editFileInputField.style.width = fileName.offsetParent.offsetWidth + "px";
  // editFileInputField.style.width = width + "px";
  editFileInputField.focus();
  editFileInputField.select();
  fileName.classList.add("hidden");



  var hideInputField = (e) => {
    const renameItem = document.getElementById("rename-file");
    if (e.target !== editFileInputField && e.target !== fileName && e.target !== renameItem) {
      fileName.classList.remove("hidden");
      editFileInputField.classList.add("hidden");
      editFileInputField.removeEventListener("keydown", keyEnterEvent);
      window.removeEventListener("click", hideInputField);
    }
  };

  var keyEnterEvent = async (e) => {
    if (e.key === "Enter") {
      fileName.classList.remove("hidden");
      // fileName.textContent = userPreferences.showFileExtensions ? editFileInputField.value + file.fileExt : editFileInputField.value;
      editFileInputField.classList.add("hidden");

      const result = await fetchWithAuth("/file-rename", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileId: file._id,
          newName: editFileInputField.value
        })
      }).then((res) => res.text());
      editFileInputField.removeEventListener("keydown", keyEnterEvent);
      window.removeEventListener("click", hideInputField);
      LoadPage(true);
    } else if (e.key === "Escape") {
      fileName.classList.remove("hidden");
      editFileInputField.classList.add("hidden");
      editFileInputField.removeEventListener("keydown", keyEnterEvent);
      window.removeEventListener("click", hideInputField);
    }
  };

  editFileInputField.addEventListener("keydown", keyEnterEvent);

  window.addEventListener("click", hideInputField);
}

const moveFile = async (e, file) => {
  e.preventDefault();
  e.stopPropagation();
  const moveFileContainer = document.getElementById("move-file-container");
  moveFileContainer.style.opacity = 0;
  setTimeout(function() {
    moveFileContainer.classList.add("hidden");
  }, 150);

  const result = await fetchWithAuth("/file-move", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileId: file._id,
      newPath: moveCurrDir
    })
  });

  if (result.status === 200) {
    console.log("file moved!");
    init_files(currDir);
    // init_grid(currDir);
    init_move_list();
    hideOverlay();
    return;
  }
  console.log("file move failed!");
};

function setAnimationDelays(menu, animationType) {
  const items = menu.querySelectorAll('li');
  items.forEach((item, index) => {
    const delay = (animationType === 'closing') ? (items.length - index - 1) * 0.02 : index * 0.02;
    item.style.setProperty('--delay', `${delay}s`);
  });
}

function playAnimations(menu, animationType) {
  const items = menu.querySelectorAll('li');
  items.forEach((item) => {
    item.style.animationPlayState = 'running';
  });
  setTimeout(() => {
    if (animationType === 'closing') {
      menu.classList.add('hidden');
    }
  }, 60 * items.length + 10);
}

const showOverlay = () => {
  const overlay = document.getElementById("overlay");
  overlay.classList.remove("closed");
  overlay.classList.add("open");
};

const hideOverlay = () => {
  const overlay = document.getElementById("overlay");
  overlay.classList.remove("open");
  overlay.classList.add("closed");
};

const showContextMenu = async (e, file) => {
  let x, y;
  if (e.type === "touchstart" && e.changedTouches) {
    x = e.changedTouches[0].clientX;
    y = e.changedTouches[0].clientY;
  } else {
    x = e.clientX;
    y = e.clientY;
  }

  removeEventListenerIfExists("download-file", "click", "downloadFileListener");
  addEventListenerAndStore("download-file", "click", "downloadFileListener", downloadFile.bind(null, e, file));

  removeEventListenerIfExists("file-info", "click", "showFileInfoListener");
  addEventListenerAndStore("file-info", "click", "showFileInfoListener", showFileInfo.bind(null, e, file));

  removeEventListenerIfExists("rename-file", "click", "renameFileListener");
  addEventListenerAndStore("rename-file", "click", "renameFileListener", renameFile.bind(null, e, file));

  removeEventListenerIfExists("delete-file", "click", "showDeleteConfirmListener");
  addEventListenerAndStore("delete-file", "click", "showDeleteConfirmListener", showDeleteConfirm.bind(null, e, file));

  removeEventListenerIfExists("favourite-file", "click", "favouriteFileListener");
  addEventListenerAndStore("favourite-file", "click", "favouriteFileListener", favouriteFile.bind(null, e, file));

  removeEventListenerIfExists("move-file", "click", "showMoveFileListener");
  addEventListenerAndStore("move-file", "click", "showMoveFileListener", showMoveFile.bind(null, e, file));

  const favouriteItem = document.getElementById("favourite-file");
  const response = await fetchWithAuth("/isfavourited", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileId: file._id
    })
  }).then((res) => res.json());
  favouriteItem.textContent = response.isFavourited? "Unfavourite" : "Favourite";

  const contextMenu = document.getElementById("context-menu");
  contextMenu.classList.remove("closing");
  contextMenu.classList.add("opening");
  contextMenu.classList.remove("hidden");
  contextMenu.classList.add(file._id);
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  setAnimationDelays(contextMenu, 'opening');
  playAnimations(contextMenu, 'opening');

  removeEventListenerIfExists(null, "click", "hideContextMenuListener");
  addEventListenerAndStore(null, "click", "hideContextMenuListener", hideContextMenu.bind(null, e, file));
};

const showMoveFile = (e, file) => {
  const moveFileContainer = document.getElementById("move-file-container");
  showOverlay();
  // Show move file container
  moveFileContainer.classList.remove("hidden");
  setTimeout(() => {
    moveFileContainer.style.opacity = 1;
  }, 0);

  // Add event listener to move button
  removeEventListenerIfExists("move-btn", "click", "moveFileListener");
  addEventListenerAndStore("move-btn", "click", "moveFileListener", moveFile.bind(null, e, file));

  // Add event listener to cancel button
  removeEventListenerIfExists("move-cancel-btn", "click", "hideMoveFileListener");
  addEventListenerAndStore("move-cancel-btn", "click", "hideMoveFileListener", hideMoveFile.bind(null, e));
};

const hideMoveFile = (e) => {
  hideOverlay();
  const moveFileContainer = document.getElementById("move-file-container");
  moveFileContainer.style.opacity = 0;
  setTimeout(function() {
    moveFileContainer.classList.add("hidden");
  }, 200);
};

/**
 * Hide context menu and remove event listeners
 */
const hideContextMenu = (e, file) => {
  const contextMenu = document.getElementById("context-menu");
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.remove("opening");
    contextMenu.classList.add("closing");
    contextMenu.classList.remove(file._id);
    setAnimationDelays(contextMenu, 'closing');
    playAnimations(contextMenu, 'closing');

    removeEventListenerIfExists(null, "click", "hideContextMenuListener");
    removeEventListenerIfExists("download-file", "click", "downloadFileListener");
    removeEventListenerIfExists("rename-file", "click", "renameFileListener");
    removeEventListenerIfExists("file-info", "click", "showFileInfoListener");
    removeEventListenerIfExists("favourite-file", "click", "favouriteFileListener");
    removeEventListenerIfExists("delete-file", "click", "showDeleteConfirmListener");
  }
};

const uploadListener = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;

  if ('webkitdirectory' in input) {
    input.setAttribute('webkitdirectory', '');
  } else {
    input.setAttribute('directory', '');
    input.setAttribute('mozdirectory', ''); // for Firefox
  }

  input.onchange = e => {
    const files = e.target.files;
    uploadFiles(files);
  }

  input.click();
};


const uploadFiles = async (files) => {
  const formData = new FormData();
  const filePaths = [];

  for (const file of files) {
    const filesToIgnore = ["node_modules"];
    // Ignore hidden files
    if (file.name.startsWith(".") || file.webkitRelativePath.startsWith("node_modules")) {
      console.log("Ignoring file: ", file.name);
     continue;
    }
    console.log(file);
    formData.append("files", file);
    if (file.webkitRelativePath) {
      filePaths.push(file.webkitRelativePath);
    } else {
      filePaths.push(null);
    }
  }

  formData.append("filePaths", JSON.stringify(filePaths));
  console.log(filePaths);

  const result = await fetchWithAuth("/upload", {
    method: "POST",
    body: formData
  }).then((res) => res.json());
  getTotalStorage();
  init_files(currDir);
};

const fileSearch = async (e) => {
  const searchQuery = e.target.value;
  if (searchQuery.length > 0) {
    const res = await SearchForFiles(searchQuery);
    if (res) {
      init_files(null, res);
    }
    return;
  }
  init_files(currDir);
};

const toggleSort = async () => {
  const sortBtn = document.getElementById("sort-btn");
  if (sortBtn.classList.contains("sort-asc")) {
    sortBtn.classList.remove("sort-asc");
    sortBtn.classList.remove("fa-arrow-down-wide-short");
    sortBtn.classList.add("sort-desc");
    sortBtn.classList.add("fa-arrow-up-wide-short");
  } else {
    sortBtn.classList.remove("sort-desc");
    sortBtn.classList.remove("fa-arrow-up-wide-short");
    sortBtn.classList.add("sort-asc");
    sortBtn.classList.add("fa-arrow-down-wide-short");
  }
  // init_grid(currDir);
  init_files(currDir);
};

const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", fileSearch);
searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter" || e.key === "Escape") {
    // Unfocus search input
    searchInput.blur();
  }
});


document.getElementById("sort-btn").addEventListener("click", toggleSort);

const dropZoneElement = document.getElementById("drop-zone");

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZoneElement.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

// Highlight drop zone when item is dragged over
['dragenter', 'dragover'].forEach(eventName => {
  dropZoneElement.addEventListener(eventName, e => {
    dropZoneElement.classList.add('dragover');
  }, false);
});

// Unhighlight drop zone when item is dragged away
['dragleave', 'drop'].forEach(eventName => {
  dropZoneElement.addEventListener(eventName, e => {
    dropZoneElement.classList.remove('dragover');
  }, false);
});

// Handle dropped files
dropZoneElement.addEventListener('drop', async e => {
  e.preventDefault();
  const files = await e.dataTransfer.files;
  uploadFiles(files);
});

document.getElementById("upload-btn").addEventListener("click", uploadListener);

document.getElementById("user-btn").addEventListener("click", (e) => {toggleUserPanel(e);});

document.getElementById("user-panel-logout").addEventListener("click", logout);

let focusTriggered = false;

function handleFocus() {
  if (!focusTriggered) {
    focusTriggered = true;
    LoadPage(true);
  }
}

function handleBlur() {
  focusTriggered = false;
}

function handleVisibilityChange() {
  if (!document.hidden) {
    handleFocus();
  } else {
    handleBlur();
  }
}



document.addEventListener('DOMContentLoaded', function () {
  const sidebarToggle = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');

  function checkWindowWidth() {
    if (window.innerWidth >= 1500) {
      sidebar.classList.add('open');
      sidebarToggle.classList.add('open');
    } else {
      sidebar.classList.remove('open');
      sidebarToggle.classList.remove('open');
    }
  }

  sidebarToggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    sidebarToggle.classList.toggle('open');
  });

  // Check window width on load
  checkWindowWidth();

  // Add the event listeners for the 'focus', 'blur', and 'visibilitychange' events
  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // Check window width on resize
  window.addEventListener('resize', checkWindowWidth);
  const lastSyncElement = document.getElementById("last-updated");
  lastSyncElement.addEventListener("click", () => {SyncWithServer().then(() => {init_files(currDir)})});
});



var getBaseDir = async () => {
  const result = await fetchWithAuth("/basedir", {
    method: "GET",
  }).then((res) => res.json());
  const baseDir = result.baseDir;
  return baseDir;
}

function logout() {
  const result = fetch("/logout", {
    method: "GET",
    credentials: "include",
  }).then(() => {
    window.location.href = "/login";
  })

}

async function getLastSync() {
  const result = await fetchWithAuth("/last-sync", {
    method: "GET",
  });
  if (!result.ok) {
    return;
  }
  const lastSync = await result.json();
  // Update last sync on page
  const readableDate = await ConvertDate(lastSync.lastSync);
  var lastSyncElement = document.getElementById("last-updated");
  lastSyncElement.textContent = `Last Updated: ${readableDate}`;
  return lastSync;
}

function startLastSyncInterval() {
  // Call the function immediately to update the text element
  getLastSync();

  // Set up the interval to call getLastSync every minute
  setInterval(getLastSync, 60000);
}

async function getTotalStorage() {
  const storageInfo = await fetchWithAuth("/storage-info", {
    method: "GET",
  }).then((res) => res.json());
  var totalStorage = storageInfo.totalStorage * (userPreferences.storageAllocation.prefValue / 100);
  var usedStorage = storageInfo.usedStorage;

  var storageRatio = (usedStorage / totalStorage) * 100;

  var storageElement = document.getElementById("system-total-storage");
  storageElement.textContent = `Used: ${BytesToSize(usedStorage)} / ${BytesToSize(totalStorage)}`;

  const progressBarFill = document.getElementById("progress-bar-fill");
  progressBarFill.style.width = `${storageRatio}%`;

  if (storageRatio >= 90) {
    storageElement.classList.add("text-danger");
    progressBarFill.classList.add("fill-danger");
  } else if (storageRatio >= 80) {
    storageElement.classList.add("text-warning");
    progressBarFill.classList.add("fill-warning");
    storageElement.classList.remove("text-danger");
    progressBarFill.classList.remove("fill-danger");
  } else {
    storageElement.classList.remove("text-danger");
    progressBarFill.classList.remove("fill-danger");
    storageElement.classList.remove("text-warning");
    progressBarFill.classList.remove("fill-warning");
  }
}

async function SyncWithServer() {
  const result = await fetchWithAuth("/sync", {
    method: "GET",
  });
  if (result.status == 201) {
    console.log("Sync Complete!");
    getLastSync();
  } else {
    console.error("Sync Failed!");
  }
}

async function LoadPage(soft = false) {
  let path;
  userPreferences = await GetPreferences();
  init_preferences(userPreferences);
  GetTheme();
  path = soft ? currDir : baseDir;
  init_move_list(baseDir);
  init_files(path);
  init_favourite_list();
  getTotalStorage();
}

async function GetUsername() {
  const result = await fetchWithAuth("/username", {
    method: "GET",
  }).then((res) => res.json());
  return result;
}

const showFileViewer = async (e, file) => {
  e.preventDefault();
  // Open file here
  console.log("Opening file: " + file.fileName + file.fileExt);
  fileView = true;

  const fileViewerContent = document.getElementById("file-viewer-content");
  fileViewerContent.innerHTML = ''; // Clear previous content

  // Fetch the file data from the server
  const { url, contentType, releaseURL } = await fetchStreamedFile(file._id);

  // if (contentType === "application/pdf") {
  if(file.fileExt == ".pdf") {
    // Load the pdfData into the pdfViewer
    renderPDF(url);
    // renderPDF(file._id);

  } else if (contentType.startsWith("image/")) {
    // Render an image
    const img = document.createElement('img');
    img.src = url;
    img.alt = file.fileName + file.fileExt;
    img.classList.add("pdf-canvas");
    fileViewerContent.appendChild(img);
  } else if (contentType.startsWith("text/")) {
    // Render a text file with syntax highlighting
    const fileExtensionToLanguage = {
      '.js': 'javascript',
      '.css': 'css',
      '.html': 'markup',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      // Add more mappings as needed
    };

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch the text file');
    }

    const textData = await response.text();
    await renderTextFile(textData, fileExtensionToLanguage[file.fileExt]);
  }

  const currDirElement = document.getElementById("curr-dir");
  currDirElement.textContent = file.fileName + file.fileExt;
  // Hide the file explorer and show the file viewer
  document.getElementById("file-explorer").classList.add("hidden");
  document.getElementById("upload-btn").classList.add("hidden");
  document.getElementById("file-viewer").classList.remove("hidden");
  document.getElementById("back-btn").classList.remove("hidden");
  document.getElementById("file-viewer").classList.add("open");
  removeEventListenerIfExists("file-viewer-download-btn", "click", "downloadFileListener");
  addEventListenerAndStore("file-viewer-download-btn", "click", "downloadFileListener", downloadFile.bind(null, e, file));
  // addEventListenerAndStore("file-viewer-info", "click", "showFileInfoListener", showFileInfo.bind(null, e, file));
  document.getElementById("file-viewer-info").addEventListener("click", showFileInfo.bind(null, e, file));
  // Add close event listener to the file viewer
  // addEventListenerAndStore("file-viewer", "click", "closeFileViewerListener", closeFileViewer);
};

async function renderTextFile(textData, fileType) {
  const fileViewerContent = document.getElementById('file-viewer-content');

  // Create and configure the text-file-wrapper div
  const textFileWrapper = document.createElement('div');
  textFileWrapper.classList.add('text-file-wrapper');

  // Create and configure the pre element for PrismJS with line-numbers class
  const preElement = document.createElement('pre');
  preElement.className = 'line-numbers language-' + fileType;

  // Create and configure the code element for PrismJS
  const codeElement = document.createElement('code');
  codeElement.classList.add('language-' + fileType); // Set the language for PrismJS
  codeElement.textContent = textData;

  // Add the code element to the pre element
  preElement.appendChild(codeElement);

  // Append the pre element to the text-file-wrapper
  textFileWrapper.appendChild(preElement);

  // Append the text-file-wrapper to the file-viewer-content
  fileViewerContent.innerHTML = ''; // Clear the file-viewer-content
  fileViewerContent.appendChild(textFileWrapper);

  // Highlight the syntax using PrismJS
  Prism.highlightElement(codeElement);
}

function getPageNumberFromElement(element) {
  return parseInt(element.id.split('-')[2], 10);
}

async function renderPDF(pdfDataStream) {
  try {
    const pageBuffer = 5;
    pdf = await pdfjsLib.getDocument({ url: pdfDataStream, rangeChunkSize: 65536 }).promise;
    const numPages = pdf.numPages;
    const container = document.getElementById('file-viewer-content');

    document.getElementById("total-pages").textContent = numPages;

    let fadeTimeout;

    function resetFadeTimer() {
      clearTimeout(fadeTimeout);
      const pageIndicator = document.getElementById("page-indicator");
      pageIndicator.classList.remove("fade-out");
      fadeTimeout = setTimeout(() => {
        pageIndicator.classList.add("fade-out");
      }, 2500);
    }

    let isCheckingVisibility = false;

    async function renderPage(pageNum, scale=2) {
      if (renderedPages.has(pageNum)) return;

      const page = await pdf.getPage(pageNum);

      const canvas = document.createElement('canvas');
      canvas.id = `pdf-canvas-${pageNum}`;
      canvas.classList.add("pdf-canvas");

      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await page.render(renderContext).promise;
      renderedPages.set(pageNum, canvas);

      // Remove the placeholder if it exists
      const placeholder = container.querySelector(`#pdf-placeholder-${pageNum}`);
      if (placeholder) {
        container.replaceChild(canvas, placeholder);
      } else {
        // Insert the canvas at the correct position based on page number
        const nextCanvas = container.querySelector(`#pdf-canvas-${pageNum + 1}`);
        if (nextCanvas) {
          container.insertBefore(canvas, nextCanvas);
        } else {
          container.appendChild(canvas);
        }
      }
    }

    function isInViewport(element) {
      const rect = element.getBoundingClientRect();
      const visualViewport = window.visualViewport || window;
      return (
        rect.top < (visualViewport.height || document.documentElement.clientHeight) &&
        rect.left < (visualViewport.width || document.documentElement.clientWidth) &&
        rect.bottom > 0 &&
        rect.right > 0
      );
    }

    async function checkVisibility() {
      if (isCheckingVisibility || !fileView) return;
      console.log("Checking visibility");

      isCheckingVisibility = true;

      const pdfCanvases = Array.from(container.children).filter((el) => el.tagName === 'CANVAS' && el.id.startsWith('pdf-canvas-'));

      const visiblePages = pdfCanvases.filter(isInViewport);

      if (visiblePages.length > 0) {
        const firstVisiblePage = getPageNumberFromElement(visiblePages[0]);
        const lastVisiblePage = getPageNumberFromElement(visiblePages[visiblePages.length - 1]);

        for (let pageNum = Math.max(firstVisiblePage - pageBuffer, 1); pageNum <= Math.min(lastVisiblePage + pageBuffer, numPages); pageNum++) {
          if (!renderedPages.has(pageNum) && !renderingPages.has(pageNum)) {
            renderingPages.add(pageNum);
            renderPage(pageNum).then(() => renderingPages.delete(pageNum));
          }
        }

        Array.from(renderedPages.entries()).forEach(([pageNum, canvas]) => {
          if (!(pageNum < firstVisiblePage - pageBuffer || pageNum > lastVisiblePage + pageBuffer)) {
            return;
          }
          console.log(`Unrendering page ${pageNum}`);
          const placeholder = document.createElement('div');
          placeholder.id = `pdf-placeholder-${pageNum}`;
          placeholder.classList.add("pdf-canvas");
          placeholder.style.width = getComputedStyle(canvas).width;
          placeholder.style.height = getComputedStyle(canvas).height;
          container.replaceChild(placeholder, canvas);
          renderedPages.delete(pageNum);
        });
      }

      isCheckingVisibility = false;
      updatePageIndicator();
      resetFadeTimer();
    }


    function handleScroll() {
      requestAnimationFrame(checkVisibility);
    }

    function updatePageIndicator() {
      const visiblePages = Array.from(container.children)
      .filter((el) => el.tagName === "CANVAS" && el.id.startsWith("pdf-canvas-"))
      .filter(isInViewport);

      if (visiblePages.length > 0) {
        const firstVisiblePage = getPageNumberFromElement(visiblePages[0]);
        document.getElementById("current-page").textContent = firstVisiblePage;
        document.getElementById("total-pages").textContent = numPages;
      }
    }

    removeEventListenerIfExists("window", "scroll", "checkVisibilityScrollListener");
    removeEventListenerIfExists("window", "resize", "checkVisibilityResizeListener");
    addEventListenerAndStore("window", "scroll", "checkVisibilityScrollListener", throttle(handleScroll, 100));
    addEventListenerAndStore("window", "resize", "checkVisibilityResizeListener", throttle(checkVisibility, 100));

    // Initial render
    for (let pageNum = 1; pageNum <= Math.min(pageBuffer, numPages); pageNum++) {
      renderingPages.add(pageNum);
      renderPage(pageNum).then(() => {
        renderingPages.delete(pageNum);
      });
    }
    resetFadeTimer();

  } catch (err) {
    console.error("Error rendering PDF: ", err);
  }
}

const closeFileViewer = async () => {
  const pageContent = document.getElementById("file-viewer-content");
  fileView = false;
  // Reset the page inidicator
  document.getElementById("current-page").textContent = 1;
  document.getElementById("total-pages").textContent = 1;

  // Cancel any ongoing render tasks
  for (const task of renderingPages.values()) {
    task.cancel();
  }

  // Clean up internal resources for rendered pages
  for (let canvas of renderedPages.values()) {
    const page = await pdf.getPage(getPageNumberFromElement(canvas));
    await page.cleanup();
  }

  // Call cleanup on the pdf object itself
  if (pdf && pdf.cleanup) {
    await pdf.cleanup();
  }

  pdf = null;
  renderedPages.clear();
  pageContent.innerHTML = "";
  // Reset the current directory text
  document.getElementById("curr-dir").textContent = await GetRelativePath(currDir);
  if (currDir === baseDir) {
    document.getElementById("back-btn").classList.add("hidden");
  }
  // Hide the file viewer and show the file explorer
  document.getElementById("file-viewer").classList.remove("open");
  document.getElementById("file-viewer").classList.add("hidden");

  document.getElementById("file-explorer").classList.remove("hidden");
  document.getElementById("upload-btn").classList.remove("hidden");
  removeEventListenerIfExists("window", "scroll", "checkVisibilityScrollListener");
  removeEventListenerIfExists("window", "resize", "checkVisibilityResizeListener");
  removeEventListenerIfExists("file-viewer-download-btn", "click", "downloadFileListener");
  removeEventListenerIfExists("file-viewer-info", "click", "showFileInfoListener");
  removeEventListenerIfExists("file-viewer", "click", "closeFileViewerListener");
};


async function GetTheme() {
  if (userPreferences.useDarkTheme.prefValue == true) {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

async function GetUptime() {
  const response = await fetchWithAuth("/sys-uptime");
  const uptime = await response.json();
  document.getElementById("system-uptime").textContent = `Uptime: ${ConvertTime(uptime.uptime)}`;
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

async function GenerateNewAccessToken() {
  const response = await fetch('/token', {
    method: 'POST',
    credentials: 'include', // Send cookies with the request
  });
  if (response.ok) {
    console.log("Access token Generated");
  } else {
    console.log("Error generating access token");
    console.log(await response);
  }
}


// Initialise the grid on page load
window.onload = async () => {
  await GenerateNewAccessToken();
  SyncWithServer();
  baseDir = await getBaseDir();
  currDir = await getCurrentDir() || baseDir;
  await LoadPage();
  document.getElementById("curr-dir").addEventListener("click", (e) => {
    e.preventDefault();
    if (fileView) {
      closeFileViewer();
    }
    init_files(baseDir);
  });
  username = await GetUsername();
  document.getElementById("user-panel-username").textContent = `${username}'s Cloud`;
  GetUptime();
  startLastSyncInterval();
};
