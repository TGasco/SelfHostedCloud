import { BytesToSize, ConvertDate } from './helperfuncs.js';

var currDir = "";

async function init_grid(path) {
  const grid = document.getElementById("grid"); // Get the grid element
  grid.innerHTML = ""; // Clear the grid
  fetch("/metadata?path=" + path).then((res) => res.json()).then(async (files) => {
    const currDirElement = document.getElementById("curr-dir");
    currDirElement.innerHTML = path;
    const gridSize = Math.ceil(files.length / 4);
    const lastRow = files.length % 4;
    for (let i = 0; i < gridSize; i++) {
      const rowDiv = document.createElement("div");
      rowDiv.id = "row-" + i;
      rowDiv.className = "row";
      grid.appendChild(rowDiv);
      if (i < gridSize && gridSize > 1) {
        var rowLength = 4;
      } else {
        var rowLength = lastRow;
      }
      for (let j = 0; j < rowLength; j++) {
        const fIndex = i * 4 + j; // Associated file index
        const colDiv = document.createElement("div");
        colDiv.id = "col-" + i + "-" + j;
        colDiv.className = "col " + files[fIndex]._id;

        // Add the contextmenu event listener
        colDiv.addEventListener("contextmenu", (e) => {
          showContextMenu(e, files[fIndex]);
        });

        if (files[fIndex].isDirectory) {
          colDiv.addEventListener("click", (e) => {
            e.preventDefault();
            init_grid(path + "/" + files[fIndex].fileName);
          });
        } else {
          colDiv.addEventListener("click", (e) => {
            e.preventDefault();
          });
        }
        rowDiv.appendChild(colDiv);
        const img = document.createElement("img");
        img.id = "img-" + i + "-" + j;
        img.className = "grid-img";
        img.src = GetFileIcon(files[i * 4 + j]);
        colDiv.appendChild(img);

        const fileName = document.createElement("div");
        fileName.id = "filename-" + i + "-" + j;
        fileName.className = "grid-filename";
        fileName.innerHTML = files[fIndex].fileName;
        colDiv.appendChild(fileName);

        const editFileInputField = document.getElementById("edit-filename");
      }
    }

    // Set the current directory in the server
    fetch("/currdir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({currDir: path})
    }).then((res) => res.json())
    .then((data) => {
      // console.log(data.currDir + " is the current directory");
      currDir = data.currDir;
    });
  });
}

async function init_favourite_list() {
  const favList = document.getElementById("favourites-list");
  favList.innerHTML = "";
  const favourites = await GetFavourites();
  for (let i = 0; i < favourites.length; i++) {
    const fav = document.createElement("li");
    fav.className = "sidebar-item";
    const img = document.createElement("img");
    img.src = GetFileIcon(favourites[i]);
    img.style.width = "10%";
    img.style.height = "10%";
    img.className = "fav-img";
    fav.appendChild(img);
    const text = document.createElement("span");
    text.innerHTML = favourites[i].fileName;
    text.className = "fav-text";
    fav.appendChild(text);
    fav.addEventListener("click", (e) => {
      e.preventDefault();
      if (favourites[i].isDirectory) {
        var filePath = favourites[i].dirPath + "/" + favourites[i].fileName;
      } else {
        var filePath = favourites[i].dirPath;
      }
      if (filePath != currDir) {
        init_grid(filePath);
      }
    });
    favList.appendChild(fav);
  }
}


async function GetRelativePath(path) {
  return await fetch("/basedir").then((response) => response.json()).then((baseDir) => {
    return path.replace(baseDir, "My Drive");
  });
}

function GetRelativePath2(path) {
  // TEMP: Remove this when I get the server to return relative paths
  return path.replace("My Drive", "");
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
  const response = await fetch("/get-favourites");
  const favourites = await response.json();
  return favourites;
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
    fetch("/basedir").then((response) => response.text()).then((baseDir) => {
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
  var win = window.open("/download?fileId=" + file._id);
  setTimeout(() => {
    if (!win.closed) {
      win.close();
    }
  }, 2500);
}

var deleteFile = (e, file) => {
  fetch("/file-delete?fileId=" + file._id).then((res) => {
    return res.text();
  }).then((data) => {
    if (data.success) {
      // init_grid(data.dir);
    }
  });
}

var showFileInfo = function showFileInfoListener(e, file) {
  if (hideFileInfoListener !== null) {
    document.removeEventListener("click", hideFileInfoListener);
    hideFileInfoListener = null;
  }
  hideFileInfoListener = hideFileInfo.bind(null, e, file);
  console.log(file);
  // Show the file info panel here, populate it with file info
  const fileInfo = document.getElementById("file-info-modal");
  const fileInfoItems = fileInfo.querySelectorAll(".file-info-item");
  fileInfo.classList.remove("hidden");
  fileInfo.classList.add(file._id);
  // fileInfo.style.left = e.clientX + "px";
  // fileInfo.style.top = e.clientY + "px";
  setTimeout(() => {
    fileInfo.style.opacity = 1;
    // fileInfo.style.transform = "scale(1)";
  }, 100);
  fileInfoItems[0].innerHTML = file.fileName;
  // fileInfoItems[1].innerHTML = "Path: " + file.dirPath + "/" + file.fileName;
  fileInfoItems[2].innerHTML = "Size: " + BytesToSize(file.fileSize);
  if (file.isDirectory) {
    fileInfoItems[3].innerHTML = "Type: Folder";
  } else {
    fileInfoItems[3].innerHTML = "Type: " + file.fileExt;
  }
  fileInfoItems[4].innerHTML = "Last Modified: " + ConvertDate(file.lastModified);

  document.addEventListener("click", hideFileInfoListener);
};

var hideFileInfo = (e, file) => {
  console.log(e.target);
  const fileInfo = document.getElementById("file-info-modal");
  if (!fileInfo.contains(e.target)) {
    fileInfo.style.opacity = 0;
    // fileInfo.style.transform = "scale(0)";
    setTimeout(function() {
      fileInfo.classList.remove(file._id);
      fileInfo.classList.add("hidden");
    }, 300);
    document.removeEventListener("click", hideFileInfoListener);
    hideFileInfoListener = null;
  }
}

var favouriteFile = (e, file) => {
  fetch ("/togglefavourite?fileId=" + file._id).then((res) => {
    return res.json();
  }).then((data) => {
    console.log(data.isFavourited);
  });
};

var renameFile = (e, file) => {
  const fileElement = document.getElementsByClassName(file._id)[0];
  const fileName = fileElement.getElementsByClassName("grid-filename")[0];
  const editFileInputField = document.getElementById("edit-filename");

  editFileInputField.value = fileName.innerHTML;
  editFileInputField.style.display = "block";
  editFileInputField.style.left = fileName.offsetLeft + "px";
  editFileInputField.style.top = fileName.offsetTop + "px";
  editFileInputField.style.width = fileName.offsetWidth + "px";
  editFileInputField.focus();


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

      fetch ("/file-rename?" + params).then((res) => {
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
  fetch ("/isfavourited?fileId=" + file._id).then((res) => {
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
    body: formData
  }).then((res) => {
    console.log(res);
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
  const result = await fetch("/get-currdir").then((res) => res.text()).then((data) => data);
  return result;
}


// Initialise the grid on page load
window.onload = async () => {
  await getCurrentDir().then((data) => {
    init_grid(data);
    init_favourite_list();
  });
};
