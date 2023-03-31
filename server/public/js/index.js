import { BytesToSize, ConvertDate } from './helperfuncs.js';

var currDir = "";

async function init_grid(path) {
  const oldGrid = document.getElementById("grid");
  oldGrid.className = "grid-container";

  // Create a temporary grid element
  const newGrid = document.createElement("div");
  newGrid.id = "grid";
  newGrid.className = "grid-container";

  const currDirElement = document.getElementById("curr-dir");
  // Change this to the path of the root directory of the cloud drive
  GetRelativePath(path).then((relativePath) => {
    currDirElement.textContent = relativePath;
  });

  // Create a document fragment to hold the grid items
  const gridFragment = document.createDocumentFragment();

  try {
    const filesResponse = await fetch("/metadata?path=" + path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token"),
      },
    });
    const files = await filesResponse.json();

    if (filesResponse.status !== 200) {
      // redirect to login page
      console.log("Uh oh, you can't view this content!");
      window.location.href = "/login";
    }

    // Create an array of promises for fetching file icons
    const iconPromises = files.map((file, i) => {
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
            init_grid(path + "/" + file.fileName);
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
        fileName.textContent = file.fileName;
        gridItem.appendChild(fileName);

        gridFragment.appendChild(gridItem);

        resolve();
      });
    });

    // Wait for all the promises to resolve
    await Promise.all(iconPromises);

    // Append the document fragment to the new grid
    newGrid.appendChild(gridFragment);

    // Replace the old grid with the new grid
    oldGrid.replaceWith(newGrid);

    const currDirResponse = await fetch("/currdir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ currDir: path }),
    });
    if (currDirResponse.status!== 200) {
      // redirect to login page
      console.log("Uh oh, you can't view this content!");
      window.location.href = "/login";
    }
    const data = await currDirResponse.json();
    currDir = data.currDir;
  } catch (error) {
    console.error("Error fetching metadata or current directory:", error);
  }
}

async function init_favourite_list() {
  const oldFavList = document.getElementById("favourites-list");

  // Create a temporary list element
  const newFavList = document.createElement("ul");
  newFavList.id = "favourites-list";

  // Create a document fragment to hold the list items
  const favFragment = document.createDocumentFragment();

  try {
    const favourites = await GetFavourites();
    if (favourites.length == 0) {
      const fav = document.createElement("p");
      fav.className = "sidebar-item";
      const text = document.createElement("span");
      text.textContent = "No favourites yet!";
      text.className = "fav-text";
      fav.appendChild(text);
      favFragment.appendChild(fav);
    } else {
      const favPromises = favourites.map((file, i) => {
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
            const filePath = file.isDirectory
              ? file.dirPath + "/" + file.fileName
              : file.dirPath;
            if (filePath !== currDir) {
              init_grid(filePath);
            }
          });

          favFragment.appendChild(fav);
          resolve();
        });
      });

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

async function GetRelativePath(path) {
  return await fetch("/basedir", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
  }).then((res) => {
    if (res.status !== 200) {
      // redirect to login page
      console.log("Uh oh, you can't view this content!");
      window.location.href = "/login";
    } else {
      return res.text()
    }
  }).then((baseDir) => {
    const relPath = path.replace(baseDir, "My Cloud");
    return relPath;
  });
}

async function GetPreviousDir(path) {
  const splitPath = path.split("/");
  let newPath = "";
  for (let i = 0; i < splitPath.length - 1; i++) {
    newPath += splitPath[i] + "/";
  }
  return newPath.slice(0, -1);
}

async function GetFavourites() {
  const response = await fetch("/get-favourites", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    }
  });
  if (response.status !== 200) {
    // redirect to login page
    console.log("Uh oh, you can't view this content!");
    window.location.href = "/login";
  } else {
    const favourites = await response.json();
    return favourites;
  }
}

function GetFileIcon(file) {
  if (file.isDirectory) {
    return "/images/filetypes/folder.png";
  } else {
    switch(file.fileExt) {
      case ".3ds":
        return "/images/filetypes/3ds.png";
      case ".aac":
        return "/images/filetypes/aac.png";
      case ".ai":
        return "/images/filetypes/ai.png";
      case ".avi":
        return "/images/filetypes/avi.png";
      case ".bmp":
        return "/images/filetypes/bmp.png";
      case ".cad":
        return "/images/filetypes/cad.png";
      case ".cdr":
        return "/images/filetypes/cdr.png";
      case ".css":
        return "/images/filetypes/css.png";
      case ".dat":
        return "/images/filetypes/dat.png";
      case ".dll":
        return "/images/filetypes/dll.png";
      case ".doc":
        return "/images/filetypes/doc.png";
      case ".docx":
        return "/images/filetypes/doc.png";
      case ".eps":
        return "/images/filetypes/eps.png";
      case ".fla":
        return "/images/filetypes/fla.png";
      case ".flv":
        return "/images/filetypes/flv.png";
      case ".gif":
        return "/images/filetypes/gif.png";
      case ".html":
        return "/images/filetypes/html.png";
      case ".indd":
        return "/images/filetypes/indd.png";
      case ".iso":
        return "/images/filetypes/iso.png";
      case ".jpg":
        return "/images/filetypes/jpg.png";
      case ".js":
        return "/images/filetypes/js.png";
      case ".midi":
        return "/images/filetypes/midi.png";
      case ".mov":
        return "/images/filetypes/mov.png";
      case ".mp3":
        return "/images/filetypes/mp3.png";
      case ".mpg":
        return "/images/filetypes/mpg.png";
      case ".pdf":
        return "/images/filetypes/pdf.png";
      case ".php":
        return "/images/filetypes/php.png";
      case ".png":
        return "/images/filetypes/png.png";
      case ".ppt":
        return "/images/filetypes/ppt.png";
      case ".ps":
        return "/images/filetypes/ps.png";
      case ".psd":
        return "/images/filetypes/psd.png";
      case ".raw":
        return "/images/filetypes/raw.png";
      case ".sql":
        return "/images/filetypes/sql.png";
      case ".svg":
        return "/images/filetypes/svg.png";
      case ".tif":
        return "/images/filetypes/tif.png";
      case ".txt":
        return "/images/filetypes/txt.png";
      case ".wmv":
        return "/images/filetypes/wmv.png";
      case ".xls":
        return "/images/filetypes/xls.png";
      case ".xml":
        return "/images/filetypes/xml.png";
      case ".zip":
        return "/images/filetypes/zip.png";
      default:
        return "/images/filetypes/file-unknown.png";
    }
  }
}

async function getElementClass(element, index=null) {
  return new Promise((resolve, reject) => {
    const classes = element.classList;
    console.log(classes);
    if (typeof index === "number") {
      resolve(classes[index]);
    } else {
      resolve(classes);
    }
  });
}

// Event Listeners
document.getElementById("back-btn").addEventListener("click", async () => {
  await getCurrentDir().then((currDir) => {
    fetch("/basedir", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      }
    }).then((response) => response.text()).then((baseDir) => {
      if (currDir === baseDir) {
      } else {
        GetPreviousDir(currDir).then((prevDir) => {
          init_grid(prevDir);
        });
      }
    });
  });
});

// Global event listeners
// Used for keeping track of dynamically added event listeners
let hideContextMenuListener;
let showContextMenuListener;
let downloadFileListener;
let showFileInfoListener;
let hideFileInfoListener;
let renameFileListener;
let deleteFileListener;
let favouriteFileListener;
let confirmRenameListener;
let hideInputFieldListener;
let keyEnterEventListener;

var hideContextMenu = (e, file) => {
  const contextMenu = document.getElementById("context-menu");
  if (!contextMenu.contains(e.target)) {

    contextMenu.style.opacity = 0;
    contextMenu.style.transform = "scale(0)";
    setTimeout(function() {
      contextMenu.classList.remove(file._id);
      contextMenu.classList.add("hidden");
    }, 300);

    document.removeEventListener("click", hideContextMenuListener);
    hideContextMenuListener = null;
    document.getElementById("download-file").removeEventListener("click", downloadFileListener);
    downloadFileListener = null;
    document.getElementById("rename-file").removeEventListener("click", renameFileListener);
    renameFileListener = null;
  }
};

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
      init_grid(currDir);
  });
}

var showDeleteConfirm = (e, file) => {
  e.preventDefault();
  if (hideDeleteConfirmListener != null) {
    document.removeEventListener("click", hideDeleteConfirmListener);
    hideDeleteConfirmListener = null;
  }
  // Show the delete confirmation panel here, populate it with file info
  const deleteConfirmation = document.getElementById("delete-confirm");
  deleteConfirmation.classList.remove("hidden");
  deleteConfirmation.classList.add(file._id);
  setTimeout(() => {
    deleteConfirmation.style.opacity = 1;
  }, 100);

  hideDeleteConfirmListener = hideDeleteConfirm.bind(null, e, file);
  const closeConfirmation = document.getElementById("close-delete-confirm");
  closeConfirmation.addEventListener("click", hideDeleteConfirmListener);
}

var showFileInfo = function showFileInfoListener(e, file) {
  e.preventDefault();
  if (hideFileInfoListener != null) {
    document.removeEventListener("click", hideFileInfoListener);
    hideFileInfoListener = null;
  }
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

  hideFileInfoListener = hideFileInfo.bind(null, e, file);
  const closeInfo = document.getElementById("close-file-info");
  closeInfo.addEventListener("click", hideFileInfoListener);
};

var hideFileInfo = (e, file) => {
  const fileInfo = document.getElementById("file-info-modal");
  fileInfo.style.opacity = 0;
  setTimeout(function() {
    fileInfo.classList.remove(file._id);
    fileInfo.classList.add("hidden");
  }, 250);
  document.removeEventListener("click", hideFileInfoListener);
  hideFileInfoListener = null;
}

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

var showContextMenu = function showContextMenuListener (e, file) {
  e.preventDefault();

  if (hideContextMenuListener != null) {
    document.removeEventListener("click", hideContextMenuListener);
    hideContextMenuListener = null;
  }
  hideContextMenuListener = hideContextMenu.bind(null, e, file);


  if (downloadFileListener != null) {
    document.getElementById("download-file").removeEventListener("click", downloadFileListener);
    downloadFileListener = null;
  }
  downloadFileListener = downloadFile.bind(null, e, file);

  if (showFileInfoListener != null) {
    document.getElementById("file-info").removeEventListener("click", showFileInfoListener);
    showFileInfoListener = null;
  }
  showFileInfoListener = showFileInfo.bind(null, e, file);

  if (renameFileListener != null) {
    document.getElementById("rename-file").removeEventListener("click", renameFileListener);
    renameFileListener = null;
  }
  renameFileListener = renameFile.bind(null, e, file);

  if (deleteFileListener != null) {
    document.getElementById("delete-file").removeEventListener("click", deleteFileListener);
    deleteFileListener = null;
  }
  deleteFileListener = deleteFile.bind(null, e, file);

  if (favouriteFileListener != null) {
    document.getElementById("favourite-file").removeEventListener("click", favouriteFileListener);
    favouriteFileListener = null;
  }
  favouriteFileListener = favouriteFile.bind(null, e, file);
  const favouriteItem = document.getElementById("favourite-file");
  fetch ("/isfavourited?fileId=" + file._id, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
  }).then((res) => {
    return res.json();
  }).then((data) => {
    if (data.isFavourited) {
      favouriteItem.innerHTML = "Unfavourite";
    } else {
      favouriteItem.innerHTML = "Favourite";
    }
  });

  // Show context menu
  const contextMenu = document.getElementById("context-menu");
  const contextMenuItems = contextMenu.querySelectorAll(".context-menu-item");
  contextMenu.classList.remove("hidden");
  contextMenu.classList.add(file._id);
  contextMenu.style.left = event.clientX + "px";
  contextMenu.style.top = event.clientY + "px";
  setTimeout(function() {
    contextMenu.style.opacity = 1;
    contextMenu.style.transform = "scale(1)";
  }, 0);

  let n = 0;
  contextMenuItems.forEach((item) => {
    setTimeout(function() {
      item.style.transform = "translateY(0)";
      item.style.opacity = 1;
    }, n * 50);
    n++;
  });


  document.getElementById("download-file").addEventListener("click", downloadFileListener);

  document.getElementById("file-info").addEventListener("click", showFileInfoListener);

  document.getElementById("favourite-file").addEventListener("click", favouriteFileListener);

  document.getElementById("rename-file").addEventListener("click", renameFileListener);

  document.getElementById("delete-file").addEventListener("click", deleteFileListener);

  document.addEventListener("click", hideContextMenuListener);
}

var uploadListener = () => {
  const input = document.createElement("input");
  input.type = "file";

  input.onchange = e => {
    const file = e.target.files[0];
    uploadFile(file);
  }
  input.click();
}

var uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  fetch("/upload", {
    method: "POST",
    headers: {
      // "Content-Type": "multipart/form-data",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    },
    body: formData
  }).then((res) => {
    console.log(res);
    init_grid(currDir);
  }).catch((err) => {
    console.log(err);
  });
}


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
  const file = e.dataTransfer.files[0];
  uploadFile(file);
});

document.getElementById("upload-btn").addEventListener("click", uploadListener);

document.addEventListener('DOMContentLoaded', function () {
  const sidebarToggle = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');

  function checkWindowWidth() {
    if (window.innerWidth >= 1250) {
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
  const result = await fetch("/get-currdir", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token"),
    }
  }).then((res) => res.text()).then((data) => data);
  return result;
}


// Initialise the grid on page load
window.onload = async () => {
  await getCurrentDir().then((data) => {
    init_grid(data);
    init_favourite_list();
  });
};
