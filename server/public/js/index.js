import { BytesToSize, ConvertDate } from './helperfuncs.js';

// Store the current directory
let currDir = null;
let userPreferences;
let username;
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


  // Create a document fragment to hold the grid items
  const gridFragment = document.createDocumentFragment();

  try {
    // Fetch the file metadata
    if (!documents) {
      // Get and display the relative path
      const relativePath = await GetRelativePath(path);
      currDirElement.textContent = relativePath;
      // Get the files and folders at the given path
      files = await fetchFilesMetadata(path);
    } else {
      files = documents;
    }

    if (!files) {
      redirectToLogin();
      return;
    }

    if (files.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.innerHTML = "Your Drive is empty!<br>Upload some files to get started.";
      emptyMessage.id = "empty-drive-message";
      emptyMessage.className = "empty-drive-message center";
      oldGrid.replaceWith(emptyMessage);
      // newGrid.appendChild(emptyMessage);
    } else {
      // Create an array of promises for creating grid items
      const iconPromises = files.map((file, i) => createGridItem(file, i, gridFragment));

      // Wait for all the promises to resolve
      await Promise.all(iconPromises);

      // Append the document fragment to the new grid
      newGrid.appendChild(gridFragment);
    }

    // Replace the old grid with the new grid
    oldGrid.replaceWith(newGrid);

    if (!documents) {
      // Update the current directory on the server
      const success = await updateCurrentDir(path);

      if (!success) {
        redirectToLogin();
        return;
      }
      currDir = path;
    }

  } catch (error) {
    console.error("Error fetching metadata or current directory:", error);
  }
}


/**
 * Initialize the favourite list view with the user's favourite files and folders.
 */
async function init_favourite_list() {
  const oldFavList = document.getElementById("favourites-list");

  // Create a temporary list element
  const newFavList = document.createElement("ul");
  newFavList.id = "favourites-list";

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
    const prefItem = document.createElement("li");
    prefItem.className = "sidebar-item preference-item";

    const prefName = document.createElement("p");
    prefName.textContent = value.prefString;
    prefName.className = "pref-name";
    prefItem.appendChild(prefName);

    // Create label element for the switch
    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const prefToggle = document.createElement("input");
    prefToggle.type = "checkbox";
    prefToggle.id = key;
    // prefToggle.id = "pref-toggle-" + i;
    prefToggle.className = "pref-toggle";
    if (prefValue) {
      prefToggle.checked = true;
    } else {
      prefToggle.checked = false;
    }
    // prefToggle.textContent = prefValue;
    prefToggle.addEventListener("click", (e) => {
      updatePreference(e);
    });

    // Add the input element to the switch label
    switchLabel.appendChild(prefToggle);

    // Create a span element for the slider and add it to the switch label
    const sliderSpan = document.createElement("span");
    sliderSpan.className = "slider";
    switchLabel.appendChild(sliderSpan);

    // Add the switch label to the prefItem
    prefItem.appendChild(switchLabel);

    prefFragment.appendChild(prefItem);
    resolve();
  });
}


const updatePreference = async (e) => {
  try {
    const prefName = e.target.id;
    const uri = `/update-preferences?prefKey=${prefName}&prefValue=${e.target.textContent}`;
    const response = await fetch("/update-preferences?prefKey=" + prefName, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await response.json();
    LoadPage();
    return data;
  } catch (error) {
    console.error("Error updating preferences:", error);
  }
}

/**
 * Get the relative path for the given path, replacing the base directory with "My Cloud".
 * @param {string} path - The path to get the relative path for.
 * @returns {Promise<string>} A promise that resolves to the relative path.
 */
async function GetRelativePath(path) {
  try {
    const res = await fetch("/basedir", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token"),
      },
    });

    const baseDir = await res.text();
    const relPath = path.replace(baseDir, "My Cloud");
    return relPath;
  } catch (error) {
    redirectToLogin();
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
    const response = await fetch("/get-favourites", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    if (response.status !== 200) {
      return [];
    }

    const favourites = await response.json();
    return favourites;
  } catch (error) {
    console.error("Error fetching favourites:", error);
    return [];
  }
}

async function GetPreferences() {
  try {
    const response = await fetch("/get-preferences", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
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
    const response = await fetch("/file-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ searchTerm }),
    });

    if (response.status !== 200) {
      return [];
    }

    const files = await response.json();
    console.log(files);
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
    const filesResponse = await fetch("/metadata?path=" + path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    if (filesResponse.status !== 200) {
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
    const currDirResponse = await fetch("/currdir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
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

/**
 * Redirect the user to the login page.
 */
function redirectToLogin() {
  console.log("Uh oh, you can't view this content!");
  window.location.href = "/login";
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

    const text = document.createElement("span");
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
const addBackBtnClickListener = () => {
  document.getElementById("back-btn").addEventListener("click", async () => {
    const currDir = await getCurrentDir();
    const baseDir = await fetch("/basedir", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      }
    }).then((response) => response.text());

    if (currDir !== baseDir) {
      const prevDir = await GetPreviousDir(currDir);
      init_grid(prevDir);
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
  addBackBtnClickListener();
};

// Call setupEventListeners on script load
setupEventListeners();

var showUserPanel = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const userPanel = document.getElementById("user-panel");
  userPanel.style.opacity = 1;
  userPanel.style.transform = "scale(1)";
  userPanel.classList.remove("hidden");
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
  userPanel.style.transform = "scale(0)";
  userPanel.classList.add("hidden");
};

var toggleUserPanel = (e) => {
  const userPanel = document.getElementById("user-panel");
  if (userPanel.classList.contains("hidden")) {
    showUserPanel(e);
  } else {
    hideUserPanel();
  }
}

var downloadFile = (e, file) => {
  const token = localStorage.getItem('token'); // Get the JWT token from localStorage

  fetch(`/download?fileId=${file._id}`, {
    headers: {
      'Authorization': `Bearer ${token}` // Send the JWT token in the Authorization header
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.blob(); // Return the blob data from the response
  })
  .then(blob => {
    // Create a URL for the blob data
    const url = window.URL.createObjectURL(blob);

    // Create a link and click it to download the file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.fileName}${file.fileExt}`);
    document.body.appendChild(link);
    link.click();
  })
  .catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  });
}


var deleteFile = (e, file) => {
  fetch("/file-delete?fileId=" + file._id, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    }
  }).then((res) => res.text()).then((data) => {
      hideDeleteConfirm(e, file);
      getTotalStorage();
      init_grid(currDir);
  });
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
  }, 100);

  addEventListenerAndStore("delete-cancel-btn", "click", "hideDeleteConfirmListener", hideDeleteConfirm.bind(null, e, file));
  addEventListenerAndStore("delete-confirm-btn", "click", "deleteFileListener", deleteFile.bind(null, e, file));
}

var hideDeleteConfirm = (e, file) => {
  const deleteConfirmation = document.getElementById("delete-confirm");
  deleteConfirmation.classList.remove(file._id);
  deleteConfirmation.classList.add("hidden");
  setTimeout(() => {
    deleteConfirmation.style.opacity = 0;
  }, 100);

  removeEventListenerIfExists("delete-cancel-btn", "click", "hideDeleteConfirmListener");
}

// Show file info panel
const showFileInfo = (e, file) => {
  e.preventDefault();
  removeEventListenerIfExists("close-file-info", "click", "hideFileInfo");

  // Show the file info panel here, populate it with file info
  const fileInfo = document.getElementById("file-info-modal");
  const fileInfoItems = fileInfo.querySelectorAll(".file-info-item");
  fileInfo.classList.remove("hidden");
  fileInfo.classList.add(file._id);
  setTimeout(() => {
    fileInfo.style.opacity = 1;
  }, 100);
  fileInfoItems[0].innerHTML = file.fileName;
  fileInfoItems[2].innerHTML = "Size: " + BytesToSize(file.fileSize);
  if (file.isDirectory) {
    fileInfoItems[3].innerHTML = "Type: Folder";
  } else {
    fileInfoItems[3].innerHTML = "Type: " + file.fileExt;
  }
  fileInfoItems[4].innerHTML = "Last Modified: " + ConvertDate(file.lastModified);
  fileInfoItems[5].innerHTML = "Uploaded: " + ConvertDate(file.uploadDate);
  fileInfoItems[6].innerHTML = "Favourite: " + file.isFavourited;

  const hideFileInfoListener = (e) => hideFileInfo(e, file);
  addEventListenerAndStore("close-file-info", "click", "hideFileInfo", hideFileInfoListener);
};

// Hide file info panel
const hideFileInfo = (e, file) => {
  const fileInfo = document.getElementById("file-info-modal");
  fileInfo.style.opacity = 0;
  setTimeout(function() {
    fileInfo.classList.remove(file._id);
    fileInfo.classList.add("hidden");
  }, 250);
  removeEventListenerIfExists("close-file-info", "click", "hideFileInfo");
};


var favouriteFile = (e, file) => {
  fetch ("/togglefavourite?fileId=" + file._id, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
  }).then((res) => {
    return res.json();
  }).then((data) => {
    console.log(data.isFavourited);
    init_favourite_list();
  });
};

var renameFile = (e, file) => {
  const fileElement = document.getElementById(file._id);
  const fileName = fileElement.getElementsByClassName("grid-filename")[0];
  const editFileInputField = document.getElementById("edit-filename");

  editFileInputField.value = fileName.innerHTML;
  editFileInputField.style.display = "block";
  editFileInputField.style.left = fileName.offsetParent.offsetLeft + fileName.offsetLeft + "px";
  editFileInputField.style.top = fileName.offsetParent.offsetTop + fileName.offsetTop + "px";

  editFileInputField.style.width = fileName.offsetParent.offsetWidth + "px";
  // editFileInputField.style.width = width + "px";
  editFileInputField.focus();
  editFileInputField.select();



  var hideInputField = (e) => {
    const renameItem = document.getElementById("rename-file");
    if (e.target !== editFileInputField && e.target !== fileName && e.target !== renameItem) {
      editFileInputField.style.display = "none";
      console.log("clicked outside!");
      editFileInputField.removeEventListener("keydown", keyEnterEvent);
      window.removeEventListener("click", hideInputField);
    }
  };

  var keyEnterEvent = (e) => {
    if (e.key === "Enter") {
      fileName.innerHTML = editFileInputField.value;
      editFileInputField.style.display = "none";

      const params = new URLSearchParams({
        fileId: file._id,
        newName: editFileInputField.value
      });

      fetch ("/file-rename?" + params, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        }
      }).then((res) => {
        return res.text();
      }).then((data) => {
        console.log(data);
      });
      editFileInputField.removeEventListener("keydown", keyEnterEvent);
      window.removeEventListener("click", hideInputField);
    }
  };

  editFileInputField.addEventListener("keydown", keyEnterEvent);

  window.addEventListener("click", hideInputField);
}



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

  const favouriteItem = document.getElementById("favourite-file");
  const res = await fetch("/isfavourited?fileId=" + file._id, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });
  const data = await res.json();
  favouriteItem.innerHTML = data.isFavourited ? "Unfavourite" : "Favourite";

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
    console.log(file);
    formData.append("files", file);
    if (file.webkitRelativePath) {
      filePaths.push(file.webkitRelativePath);
    }
  }

  formData.append("filePaths", JSON.stringify(filePaths));
  console.log(filePaths);

  fetch("/upload", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token"),
    },
    body: formData
  }).then((res) => {
    console.log(res);
    getTotalStorage();
    init_grid(currDir);
  }).catch((err) => {
    console.log(err);
  });
};

const fileSearch = async (e) => {
  const searchQuery = e.target.value;
  console.log(searchQuery);
  if (searchQuery.length > 0) {
    const res = await SearchForFiles(searchQuery);
    init_grid(null, res);
  } else {
    init_grid(currDir);
  }
};

document.getElementById("search-input").addEventListener("input", fileSearch);

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



var getCurrentDir = async () => {
  if (currDir == null) {
    const result = await fetch("/basedir", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token"),
      }
    }).then((res) => res.text());
    currDir = result;
  }
  return currDir;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

async function getTotalStorage() {
  var totalStorage = await fetch("/total-storage", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
  }).then((res) => res.text());
  var storageElement = document.getElementById("system-total-storage");
  storageElement.innerHTML = `Used: ${BytesToSize(totalStorage)} / 100 GB`;
}

async function SyncWithServer() {
  const result = await fetch("/sync", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
  });
  if (result.status == 201) {
    console.log("Sync Complete!");
  } else {
    console.error("Sync Failed!");
  }
}

async function LoadPage() {
  userPreferences = await GetPreferences();
  await getCurrentDir().then((data) => {
    init_grid(data);
    init_favourite_list();
  });
}

async function GetUsername() {
  const result = await fetch("/username", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
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
  getTotalStorage();
};
