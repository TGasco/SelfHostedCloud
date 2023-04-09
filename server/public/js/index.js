import { BytesToSize, ConvertDate, truncatePath, fetchWithAuth } from './helperfuncs.js';

// Store the current directory
let currDir = null;
let moveCurrDir = null;
let userPreferences;
let username;
let baseDir;

/**
 * Initialize the grid view with the files and folders at the given path.
 * @param {string} path - The path to display in the grid view.
 */
async function init_grid(path, documents = null) {
  let files;
  const oldGrid = document.getElementById("grid") || document.getElementById("empty-drive-message");
  oldGrid.className = "grid-container";

  // Create a temporary grid element
  const newGrid = document.createElement("div");
  newGrid.id = "grid";
  newGrid.className = "grid-container";

  const currDirElement = document.getElementById("curr-dir");

  const backBtn = document.getElementById("back-btn");
  if (path === baseDir) {
    backBtn.classList.add("hidden");
  } else {
    backBtn.classList.remove("hidden");
  }

  // Create a document fragment to hold the grid items
  const gridFragment = document.createDocumentFragment();

  try {
    // Fetch the file metadata
    if (!documents) {
      // Get and display the relative path
      const relativePath = await GetRelativePath(path);
      currDirElement.textContent = truncatePath(relativePath, currDirElement);
      // Get the files and folders at the given path
      files = await fetchFilesMetadata(path);
    } else {
      files = documents;
    }

    if (files.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.textContent = "Your Drive is empty! Upload some files to get started.";
      emptyMessage.id = "empty-drive-message";
      emptyMessage.className = "empty-drive-message center";
      oldGrid.replaceWith(emptyMessage);
    } else {
      // Sort the files
      const sortBtn = document.getElementById("sort-btn");
      if (sortBtn.classList.contains("sort-asc")) files = SortFiles(files, "fileName", true);
      else files = SortFiles(files, "fileName", false);
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
    }


    if (!documents) {
      // Update the current directory on the server
      const success = await updateCurrentDir(path);

      if (!success) {
        // redirectToLogin();
        console.log("Failed to update current directory");
        return;
      }
      currDir = path;
      // console.log("Current directory updated to:", currDir);
    }

  } catch (error) {
    console.error("Error fetching metadata or current directory:", error);
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
  moveCurrDir = path;

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

async function init_list_view(documents, elementId, onClickListener) {
  const oldList = document.getElementById(elementId);

  // Create a temporary list element
  const newList = document.createElement("ul");
  newList.id = elementId;
  newList.className = "sidebar-list";

  // Create a document fragment to hold the list items
  const documentFragment = document.createDocumentFragment();

  try {
    if (documents.length === 0) {
      // Display a message if there are no documents
      const fav = document.createElement("p");
      fav.className = "sidebar-item";
      const text = document.createElement("span");
      text.textContent = "No documents!";
      text.className = "fav-text";
      fav.appendChild(text);
      documentFragment.appendChild(fav);
    } else {
      // Create an array of promises for creating favourite items
      const docPromises = documents.map((file, i) => createItem(file, i, documentFragment, onClickListener.bind(null, file)));

      // Wait for all the promises to resolve
      await Promise.all(docPromises);
    }

    // Append the document fragment to the new list
    newList.appendChild(documentFragment);

    // Replace the old list with the new list
    oldList.replaceWith(newList);
  } catch (error) {
    console.error("Error fetching documents:", error);
  }
}

async function createItem(file, i, documentFragment, onClickListener = null) {
  return new Promise(async (resolve) => {
    const doc = document.createElement("li");
    doc.className = "sidebar-item fav-item";

    const img = document.createElement("img");
    img.src = GetFileIcon(file);
    img.className = "fav-img";
    doc.appendChild(img);

    const text = document.createElement("p");
    text.textContent = file.fileName;
    text.className = "fav-text";
    doc.appendChild(text);

    if (file.isDirectory) {
      const arrow = document.createElement("i");
      arrow.className = "dir-arrow fa fa-angle-right";
      arrow.style = "position: absolute; right: 10px; "
      doc.appendChild(arrow);
    }

    if (onClickListener) {
      doc.addEventListener("click", onClickListener);
    }

    documentFragment.appendChild(doc);
    resolve();
  });
}

async function init_preferences() {
  const preferences = await GetPreferences();
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
  slider.style.background = `linear-gradient(to right, #00B6FF 0%, #00B6FF ${prefValue}%, #d3d3d3 ${prefValue}%, #d3d3d3 100%)`;
  slider.addEventListener("click", (e) => {
    updatePreference(e);
  });

  slider.addEventListener("input", function() {
    let value = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = `linear-gradient(to right, #00B6FF 0%, #00B6FF ${value}%, #d3d3d3 ${value}%, #d3d3d3 100%)`;
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
    const relPath = path.replace(baseDir, "My Cloud");
    return relPath;
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
        // redirectToLogin();
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

    // const response = await currDirResponse.json();
    console.log(response.currDir);
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

    gridItem.addEventListener("contextmenu", (e) => {
      showContextMenu(e, file);
    });

    if (file.isDirectory) {
      gridItem.addEventListener("click", (e) => {
        e.preventDefault();
        // init_grid(path + "/" + file.fileName);
        init_grid(file.dirPath + "/" + file.fileName);
      });
    } else {
      gridItem.addEventListener("click", (e) => {
        e.preventDefault();
        // Open file here
      });
    }

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
    text.textContent = file.fileName;
    text.className = "fav-text";
    fav.appendChild(text);

    fav.addEventListener("contextmenu", (e) => {
      showContextMenu(e, file);
    });

    fav.addEventListener("click", (e) => {
      e.preventDefault();
      const filePath = file.isDirectory ? file.dirPath + "/" + file.fileName : file.dirPath;
      if (filePath !== currDir) {
        init_grid(filePath);
      }
    });

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
      ".iso", ".jpg", ".js", ".midi", ".mov", ".mp3", ".mpg", ".pdf", ".php",
      ".png", ".ppt", ".pptx", ".ps", ".psd", ".raw", ".sql", ".svg", ".tif", ".txt",
      ".wmv", ".xls", ".xml", ".zip"
    ]);

    const basePath = "/images/filetypes/";
    const sharedIconExtensions = {
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
    if (currDir !== baseDir) {
      const prevDir = await GetPreviousDir(currDir);
      backBtn.classList.remove("hidden");
      init_grid(prevDir);
    } else {
        console.log("You are already in the base directory.");
        backBtn.classList.add("hidden");
    }
  });
};

const addMoveBackBtnClickListener = (backBtn) => {
  backBtn.addEventListener("click", async () => {
    // const baseDir = await getBaseDir();

    if (moveCurrDir !== baseDir) {
      const prevDir = await GetPreviousDir(moveCurrDir);
      // if (backBtn.classList.contains("hidden")) {
      //   backBtn.classList.remove("hidden");
      // }
      init_move_list(prevDir);
    } else {
      // if (!backBtn.classList.contains("hidden")) {
      //   console.log("You are already in the base directory.");
      //   backBtn.classList.add("hidden");
      // }
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
  const element = document.getElementById(elementId);

  // Check if the element exists and if there's an existing event listener for the given key
  if (element && eventListeners[listenerKey]) {
    // Remove the event listener from the element
    element.removeEventListener(eventType, eventListeners[listenerKey]);
    // Set the event listener key in the eventListeners object to null
    eventListeners[listenerKey] = null;
  }
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
    document.addEventListener(eventType, eventListeners[listenerKey]);
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
    if (!userPanel.contains(e.target)) {
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

// var downloadFile = (e, file) => {
//   const token = localStorage.getItem('token'); // Get the JWT token from localStorage

//   fetch(`/download?fileId=${file._id}`, {
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${token}` // Send the JWT token in the Authorization header
//     }
//   })
//   .then(response => {
//     if (!response.ok) {
//       throw new Error('Network response was not ok');
//     }
//     return response.blob(); // Return the blob data from the response
//   })
//   .then(blob => {
//     // Create a URL for the blob data
//     const url = window.URL.createObjectURL(blob);

//     // Create a link and click it to download the file
//     const link = document.createElement('a');
//     link.href = url;
//     link.setAttribute('download', `${file.fileName}${file.fileExt}`);
//     document.body.appendChild(link);
//     link.click();
//   })
//   .catch(error => {
//     console.error('There was a problem with the fetch operation:', error);
//   });
// }

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
  }).then((res) => res.text());

  hideDeleteConfirm(e, file);
  getTotalStorage();
  init_grid(currDir);
}

var showDeleteConfirm = (e, file) => {
  e.preventDefault();
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
  const deleteConfirmation = document.getElementById("delete-confirm");
  deleteConfirmation.classList.remove(file._id);
  deleteConfirmation.style.opacity = 0;
  setTimeout(() => {
    deleteConfirmation.classList.add("hidden");
  }, 200);

  removeEventListenerIfExists("delete-cancel-btn", "click", "hideDeleteConfirmListener");
}

// Show file info panel
const showFileInfo = (e, file) => {
  e.preventDefault();
  e.stopPropagation();
  // removeEventListenerIfExists("close-file-info", "click", "hideFileInfo");

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
  fileInfoItems[1].textContent = "Size: " + BytesToSize(file.fileSize);
  if (file.isDirectory) {
    fileInfoItems[2].textContent = "Type: Folder";
  } else {
    fileInfoItems[2].textContent = "Type: " + file.fileExt;
  }
  fileInfoItems[3].textContent = "Last Modified: " + ConvertDate(file.lastModified);
  fileInfoItems[4].textContent = "Uploaded: " + ConvertDate(file.uploadDate);
  fileInfoItems[5].textContent = "Favourite: " + file.isFavourited;

  window.addEventListener("click", hideFileInfo);
};

// Hide file info panel
const hideFileInfo = (e, file) => {
  const fileInfo = document.getElementById("file-info-modal");
  const fileInfoItem = document.getElementById("file-info");
  if (e.target !== fileInfo && e.target !== fileInfoItem) {
    fileInfo.style.opacity = 0;
    setTimeout(function() {
      fileInfo.classList.add("hidden");
    }, 200);
    window.removeEventListener("click", hideFileInfo);
  }
};


var favouriteFile = async (e, file) => {
  const response = await fetchWithAuth('/toggle-favourite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId: file._id }),
  }).then((res) => res.json());

  init_favourite_list();
};

const renameFile = (e, file) => {
  const fileElement = document.getElementById(file._id);
  const fileName = fileElement.getElementsByClassName("grid-filename")[0];
  const editFileInputField = document.getElementById("edit-filename");
  editFileInputField.classList.remove("hidden");
  editFileInputField.value = fileName.textContent;
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
      fileName.textContent = editFileInputField.value;
      editFileInputField.style.display = "none";

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
    return init_grid(currDir);
  } else {
    console.log("file move failed!");
  }
};

const showContextMenu = async (e, file) => {
  e.preventDefault();

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
  const result = await fetchWithAuth("/isfavourited", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({fileId: file._id})
  }).then((res) => res.json());
  favouriteItem.textContent = result.isFavourited ? "Unfavourite" : "Favourite";

  const contextMenu = document.getElementById("context-menu");
  const contextMenuItems = contextMenu.querySelectorAll(".context-menu-item");
  contextMenu.classList.remove("hidden");
  contextMenu.classList.add(file._id);
  contextMenu.style.left = e.clientX + "px";
  contextMenu.style.top = e.clientY + "px";
  setTimeout(() => {
    contextMenu.style.opacity = 1;
    contextMenu.style.transform = "scale(1)";
  }, 0);

  let n = 0;
  contextMenuItems.forEach((item) => {
    setTimeout(() => {
      item.style.transform = "translateY(0)";
      item.style.opacity = 1;
    }, n * 50);
    n++;
  });

  removeEventListenerIfExists(null, "click", "hideContextMenuListener");
  addEventListenerAndStore(null, "click", "hideContextMenuListener", hideContextMenu.bind(null, e, file));
};

const showMoveFile = (e, file) => {
  const moveFileContainer = document.getElementById("move-file-container");

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
  if (e.target !== contextMenu) {

    contextMenu.style.opacity = 0;
    contextMenu.style.transform = "scale(0)";
    setTimeout(function() {
      contextMenu.classList.remove(file._id);
      contextMenu.classList.add("hidden");
    }, 300);

    removeEventListenerIfExists(null, "click", "hideContextMenuListener");
    removeEventListenerIfExists("download-file", "click", "downloadFileListener");
    removeEventListenerIfExists("rename-file", "click", "renameFileListener");
    removeEventListenerIfExists("file-info", "click", "showFileInfoListener");
    removeEventListenerIfExists("favourite-file", "click", "favouriteFileListener");
    removeEventListenerIfExists("delete-file", "click", "showDeleteConfirmListener");
  }
};

var uploadListener = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.webkitdirectory = true;

  input.onchange = e => {
    const files = e.target.files;
    uploadFiles(files);
  }
  input.click();
}

const uploadFiles = async (files) => {
  const formData = new FormData();
  const filePaths = [];

  for (const file of files) {
    // Ignore hidden files
    if (file.name.startsWith(".")) {
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
  init_grid(currDir);
};

const fileSearch = async (e) => {
  const searchQuery = e.target.value;
  if (searchQuery.length > 0) {
    const res = await SearchForFiles(searchQuery);
    init_grid(null, res);
  } else {
    init_grid(currDir);
  }
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
  init_grid(currDir);
};

document.getElementById("search-input").addEventListener("input", fileSearch);

document.getElementById("sort-btn").addEventListener("click", toggleSort);

const dropZone = document.getElementById("drop-zone");

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

// Highlight drop zone when item is dragged over
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, e => {
    dropZone.classList.add('dragover');
  }, false);
});

// Unhighlight drop zone when item is dragged away
['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, e => {
    dropZone.classList.remove('dragover');
  }, false);
});

// Handle dropped files
dropZone.addEventListener('drop', e => {
  const files = e.dataTransfer.files;
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

// Add the event listeners for the 'focus', 'blur', and 'visibilitychange' events
window.addEventListener('focus', handleFocus);
window.addEventListener('blur', handleBlur);
document.addEventListener('visibilitychange', handleVisibilityChange);


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

  // Check window width on resize
  window.addEventListener('resize', checkWindowWidth);
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
  }).then((res) => res.json());
  // Update last sync on page
  const readableDate = await ConvertDate(result);
  var lastSyncElement = document.getElementById("last-updated");
  lastSyncElement.textContent = `Last Updated: ${readableDate}`;
  return result;
}

function startLastSyncInterval() {
  // Call the function immediately to update the text element
  getLastSync();

  // Set up the interval to call getLastSync every minute
  setInterval(getLastSync, 60000);
}

startLastSyncInterval();


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
  } else {
    console.error("Sync Failed!");
  }
}

async function LoadPage(soft = false) {
  let path;
  userPreferences = await GetPreferences();
  baseDir = await getBaseDir();
  currDir = await getCurrentDir() || baseDir;
  if (soft) path = currDir;
  else path = baseDir;
  console.log("Current Directory: " + path);
  init_move_list(baseDir);
  init_grid(path);
  init_favourite_list();
  getTotalStorage();
}

async function GetUsername() {
  const result = await fetchWithAuth("/username", {
    method: "GET",
  }).then((res) => res.json());
  return result;
}

// Initialise the grid on page load
window.onload = async () => {
  init_preferences();
  SyncWithServer();
  await LoadPage();
  username = await GetUsername();
  document.getElementById("user-panel-username").textContent = `${username}'s Cloud`;
  startLastSyncInterval();
};
