function init_grid(path) {
  GetPreviousDir("Hello/World/Testing/This/Works/Right/Lol").then((data) => console.log(data));
  const grid = document.getElementById("grid"); // Get the grid element
  grid.innerHTML = ""; // Clear the grid
  fetch("/metadata?relpath=" + path).then((response) => response.json()).then((files) => {

    const gridSize = Math.ceil(files.length / 4);
    console.log("Grid size: " + gridSize);
    const lastRow = files.length % 4;
    console.log("Last row: " + lastRow);
    for (let i = 0; i < gridSize; i++) {
      const rowDiv = document.createElement("div");
      rowDiv.id = "row-" + i;
      rowDiv.className = "row";
      grid.appendChild(rowDiv);
      if (i < gridSize) {
        var rowLength = 4;
      } else {
        var rowLength = lastRow;
      }
      for (let j = 0; j < rowLength; j++) {
        const fIndex = i * 4 + j; // Associated file index
        const colDiv = document.createElement("div");
        colDiv.id = "col-" + i + "-" + j;
        colDiv.className = "col";
        if (files[fIndex].isDirectory) {
          colDiv.addEventListener("click", () => {
            event.preventDefault();
            const relpath = GetRelativePath(files[fIndex].dirPath + "/" + files[fIndex].fileName)
            init_grid(relpath);
            const currDir = document.getElementById("curr-dir");
            currDir.innerHTML = "My Drive" + relpath;
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
  })
}

function GetRelativePath(path) {
  // TEMP: Remove this when I get the server to return relative paths
  return path.replace("/Users/thomasgascoyne/SelfHostedCloudDrive", "");
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

// Add Event Listeners
async function AddEventListeners() {

}
document.getElementById("back-btn").addEventListener("click", () => {
  const prevDir = await GetPreviousDir(document.getElementById("curr-dir").innerHTML);
});

window.onload = init_grid("");
