var files = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const baseDir = "/Users/thomasgascoyne/SelfHostedCloudDrive";

function init_grid() {
  fetch("/metadata").then((response) => response.json()).then((files) => {
    const grid = document.getElementById("grid");
    const gridSize = Math.ceil(files.length / 4);
    console.log("Grid size: " + gridSize);
    const lastRow = files.length % 4;
    console.log("Last row: " + lastRow);
    for (let i = 0; i < gridSize; i++) {
      const rowDiv = document.createElement("div");
      rowDiv.id = "row-" + i;
      rowDiv.className = "row";
      grid.appendChild(rowDiv);
      if (i < gridSize - 1) {
        var rowLength = 4;
      } else {
        var rowLength = lastRow;
      }
      for (let j = 0; j < rowLength; j++) {
        const colDiv = document.createElement("div");
        colDiv.id = "col-" + i + "-" + j;
        colDiv.className = "col";
        rowDiv.appendChild(colDiv);
        const img = document.createElement("img");
        img.id = "img-" + i + "-" + j;
        img.className = "grid-img";
        img.src = GetFileIcon(files[i * 4 + j]);
        colDiv.appendChild(img);
      }
    }
  })
}

function GetFileIcon(file) {
  if (file.isDirectory) {
    return "/images/filetypes/folder.png";
  } else {
    switch(file.fileExt) {
      case ".png":
        return "/images/filetypes/png.png";
      case ".jpg":
        return "/images/filetypes/jpg.png";
      case ".js":
        return "/images/filetypes/js.png";
      case ".html":
        return "/images/filetypes/html.png";
      case ".css":
        return "/images/filetypes/css.png";
      case ".xml":
        return "/images/filetypes/xml.png";
      case ".psd":
        return "/images/filetypes/psd.png";
      case ".ai":
        return "/images/filetypes/ai.png";
      case "mp3":
        return "/images/filetypes/mp3.png";
      case ".wmv":
        return "/images/filetypes/wmv.png";
      case ".xls":
        return "/images/filetypes/xls.png";
      case ".doc":
        return "/images/filetypes/doc.png";
      case ".ppt":
        return "/images/filetypes/ppt.png";
      case ".zip":
        return "/images/filetypes/zip.png";
      case ".txt":
        return "/images/filetypes/txt.png";
      case ".pdf":
        return "/images/filetypes/pdf.png";
      default:
        return "/images/filetypes/file-unknown.png";
    }
  }
}

window.onload = init_grid();
