async function init_grid(path) {
  const grid = document.getElementById("grid"); // Get the grid element
  grid.innerHTML = ""; // Clear the grid
  fetch("/metadata?relpath=" + path).then((response) => response.json()).then((files) => {
    const currDir = document.getElementById("curr-dir");
    currDir.innerHTML = "My Drive" + path;
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

        const fileName = document.createElement("p");
        fileName.id = "filename-" + i + "-" + j;
        fileName.className = "grid-filename";
        fileName.innerHTML = files[fIndex].fileName;
        colDiv.appendChild(fileName);
      }
    }
  });
}

function GetRelativePath(path) {
  fetch("/basedir").then((response) => response.json()).then((baseDir) => {
    return path.replace(baseDir, "");
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
document.getElementById("back-btn").addEventListener("click", () => {
  GetPreviousDir(document.getElementById("curr-dir").innerHTML).then((prevDir) => {
    console.log(prevDir);
    init_grid(GetRelativePath2(prevDir));
  });
});

// Global event listeners
// Used for keeping track of dynamically added event listeners
let hideContextMenuListener;
let showContextMenuListener;
let downloadFileListener;
let showFileInfoListener;
let renameFileListener;
let deleteFileListener;
let favouriteFileListener;

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

var showFileInfo = (e, file) => {
  fetch ("/fileinfo?fileId=" + file._id).then((res) => {
    return res.json();
  }).then((data) => {
    console.log(data);
    // const fileInfo = document.getElementById("file-info");
    // const fileInfoItems = fileInfo.querySelectorAll(".file-info-item");
    // fileInfo.classList.remove("hidden");
    // fileInfo.classList.add(file._id);
    // fileInfo.style.left = event.clientX + "px";
    // fileInfo.style.top = event.clientY + "px";
    // setTimeout(() => {
    //   fileInfo.style.opacity = 1;
    //   fileInfo.style.transform = "scale(1)";
    // }, 100);
    // fileInfoItems[0].innerHTML = "Name: " + file.name;
    // fileInfoItems[1].innerHTML = "Size: " + data.size;
    // fileInfoItems[2].innerHTML = "Type: " + data.type;
    // fileInfoItems[3].innerHTML = "Last Modified: " + data.lastModified;
  });
}

var favouriteFile = (e, file) => {
  fetch ("/togglefavourite?fileId=" + file._id).then((res) => {
    return res.json();
  }).then((data) => {
    console.log( data.isFavourited);
  });
}

var renameFile = (e, file) => {
  fetch ("/file-rename?fileId=" + file._id).then((res) => {
    return res.text();
  }).then((data) => {
    console.log(data);
  });
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

  document.addEventListener("click", hideContextMenuListener);
}

var showFileInfo = function showFileInfoListener(e, file) {
  // Show the file info panel here, populate it with file info
  console.log(file);
}

var uploadFile = () => {
  const input = document.createElement("input");
  input.type = "file";

  input.onchange = e => {
    const file = e.target.files[0];
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
  input.click();
}

document.getElementById("upload-btn").addEventListener("click", uploadFile);

window.onload = init_grid("");
