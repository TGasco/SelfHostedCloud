// var currDir = null;

// async function init_grid(path) {
//   const oldGrid = document.getElementById("grid");
//   oldGrid.className = "grid-container";

//   // Create a temporary grid element
//   const newGrid = document.createElement("div");
//   newGrid.id = "grid";
//   newGrid.className = "grid-container";

//   const currDirElement = document.getElementById("curr-dir");
//   // Change this to the path of the root directory of the cloud drive
//   GetRelativePath(path).then((relativePath) => {
//     currDirElement.textContent = relativePath;
//   });

//   // Create a document fragment to hold the grid items
//   const gridFragment = document.createDocumentFragment();

//   try {
//     const filesResponse = await fetch("/metadata?path=" + path, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": "Bearer " + localStorage.getItem("token"),
//       },
//     });
//     const files = await filesResponse.json();

//     if (filesResponse.status !== 200) {
//       // redirect to login page
//       console.log("Uh oh, you can't view this content!");
//       window.location.href = "/login";
//     }

//     // Create an array of promises for fetching file icons
//     const iconPromises = files.map((file, i) => {
//       return new Promise(async (resolve) => {
//         const gridItem = document.createElement("div");
//         gridItem.id = file._id;
//         gridItem.className = "grid-item";

//         gridItem.addEventListener("contextmenu", (e) => {
//           showContextMenu(e, file);
//         });

//         if (file.isDirectory) {
//           gridItem.addEventListener("click", (e) => {
//             e.preventDefault();
//             init_grid(path + "/" + file.fileName);
//           });
//         } else {
//           gridItem.addEventListener("click", (e) => {
//             e.preventDefault();
//             // Open file here
//           });
//         }

//         const img = document.createElement("img");
//         img.id = "img-" + i;
//         img.className = "grid-img";
//         img.src = GetFileIcon(file);
//         gridItem.appendChild(img);

//         const fileName = document.createElement("div");
//         fileName.id = "filename-" + i;
//         fileName.className = "grid-filename";
//         fileName.textContent = file.fileName;
//         gridItem.appendChild(fileName);

//         gridFragment.appendChild(gridItem);

//         resolve();
//       });
//     });

//     // Wait for all the promises to resolve
//     await Promise.all(iconPromises);

//     // Append the document fragment to the new grid
//     newGrid.appendChild(gridFragment);

//     // Replace the old grid with the new grid
//     oldGrid.replaceWith(newGrid);

//     const currDirResponse = await fetch("/currdir", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": "Bearer " + localStorage.getItem("token"),
//       },
//       body: JSON.stringify({ currDir: path }),
//     });
//     if (currDirResponse.status!== 200) {
//       // redirect to login page
//       console.log("Uh oh, you can't view this content!");
//       window.location.href = "/login";
//     }
//     const data = await currDirResponse.json();
//     currDir = data.currDir;
//   } catch (error) {
//     console.error("Error fetching metadata or current directory:", error);
//   }
// }

// async function init_favourite_list() {
//   const oldFavList = document.getElementById("favourites-list");

//   // Create a temporary list element
//   const newFavList = document.createElement("ul");
//   newFavList.id = "favourites-list";

//   // Create a document fragment to hold the list items
//   const favFragment = document.createDocumentFragment();

//   try {
//     const favourites = await GetFavourites();
//     if (favourites.length == 0) {
//       const fav = document.createElement("p");
//       fav.className = "sidebar-item";
//       const text = document.createElement("span");
//       text.textContent = "No favourites yet!";
//       text.className = "fav-text";
//       fav.appendChild(text);
//       favFragment.appendChild(fav);
//     } else {
//       const favPromises = favourites.map((file, i) => {
//         return new Promise(async (resolve) => {
//           const fav = document.createElement("li");
//           fav.className = "sidebar-item fav-item";
//           const img = document.createElement("img");
//           img.src = GetFileIcon(file);
//           img.className = "fav-img";
//           fav.appendChild(img);
//           const text = document.createElement("span");
//           text.textContent = file.fileName;
//           text.className = "fav-text";
//           fav.appendChild(text);

//           fav.addEventListener("contextmenu", (e) => {
//             showContextMenu(e, file);
//           });

//           fav.addEventListener("click", (e) => {
//             e.preventDefault();
//             const filePath = file.isDirectory
//               ? file.dirPath + "/" + file.fileName
//               : file.dirPath;
//             if (filePath !== currDir) {
//               init_grid(filePath);
//             }
//           });

//           favFragment.appendChild(fav);
//           resolve();
//         });
//       });

//       // Wait for all the promises to resolve
//       await Promise.all(favPromises);
//     }

//     // Append the document fragment to the new list
//     newFavList.appendChild(favFragment);

//     // Replace the old list with the new list
//     oldFavList.replaceWith(newFavList);
//   } catch (error) {
//     console.error("Error fetching favourites:", error);
//   }
// }

// async function GetRelativePath(path) {
//   return await fetch("/basedir", {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": "Bearer " + localStorage.getItem("token"),
//     }
//   }).then((res) => {
//     if (res.status !== 200) {
//       // redirect to login page
//       console.log("Uh oh, you can't view this content!");
//       window.location.href = "/login";
//     } else {
//       return res.text()
//     }
//   }).then((baseDir) => {
//     const relPath = path.replace(baseDir, "My Cloud");
//     return relPath;
//   });
// }

// async function GetPreviousDir(path) {
//   const splitPath = path.split("/");
//   let newPath = "";
//   for (let i = 0; i < splitPath.length - 1; i++) {
//     newPath += splitPath[i] + "/";
//   }
//   return newPath.slice(0, -1);
// }

// async function GetFavourites() {
//   const response = await fetch("/get-favourites", {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + localStorage.getItem("token"),
//     }
//   });
//   if (response.status !== 200) {
//     // redirect to login page
//     console.log("Uh oh, you can't view this content!");
//     window.location.href = "/login";
//   } else {
//     const favourites = await response.json();
//     return favourites;
//   }
// }

// var showContextMenu = function showContextMenuListener (e, file) {
//   e.preventDefault();

//   if (hideContextMenuListener != null) {
//     document.removeEventListener("click", hideContextMenuListener);
//     hideContextMenuListener = null;
//   }
//   hideContextMenuListener = hideContextMenu.bind(null, e, file);


//   if (downloadFileListener != null) {
//     document.getElementById("download-file").removeEventListener("click", downloadFileListener);
//     downloadFileListener = null;
//   }
//   downloadFileListener = downloadFile.bind(null, e, file);

//   if (showFileInfoListener != null) {
//     document.getElementById("file-info").removeEventListener("click", showFileInfoListener);
//     showFileInfoListener = null;
//   }
//   showFileInfoListener = showFileInfo.bind(null, e, file);

//   if (renameFileListener != null) {
//     document.getElementById("rename-file").removeEventListener("click", renameFileListener);
//     renameFileListener = null;
//   }
//   renameFileListener = renameFile.bind(null, e, file);

//   if (showDeleteConfirmListener != null) {
//     document.getElementById("delete-file").removeEventListener("click", showDeleteConfirmListener);
//     showDeleteConfirmListener = null;
//   }
//   showDeleteConfirmListener = showDeleteConfirm.bind(null, e, file);

//   if (favouriteFileListener != null) {
//     document.getElementById("favourite-file").removeEventListener("click", favouriteFileListener);
//     favouriteFileListener = null;
//   }
//   favouriteFileListener = favouriteFile.bind(null, e, file);
//   const favouriteItem = document.getElementById("favourite-file");
//   fetch ("/isfavourited?fileId=" + file._id, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": "Bearer " + localStorage.getItem("token"),
//     }
//   }).then((res) => {
//     return res.json();
//   }).then((data) => {
//     if (data.isFavourited) {
//       favouriteItem.innerHTML = "Unfavourite";
//     } else {
//       favouriteItem.innerHTML = "Favourite";
//     }
//   });

//   // Show context menu
//   const contextMenu = document.getElementById("context-menu");
//   const contextMenuItems = contextMenu.querySelectorAll(".context-menu-item");
//   contextMenu.classList.remove("hidden");
//   contextMenu.classList.add(file._id);
//   contextMenu.style.left = event.clientX + "px";
//   contextMenu.style.top = event.clientY + "px";
//   setTimeout(function() {
//     contextMenu.style.opacity = 1;
//     contextMenu.style.transform = "scale(1)";
//   }, 0);

//   let n = 0;
//   contextMenuItems.forEach((item) => {
//     setTimeout(function() {
//       item.style.transform = "translateY(0)";
//       item.style.opacity = 1;
//     }, n * 50);
//     n++;
//   });


//   document.getElementById("download-file").addEventListener("click", downloadFileListener);

//   document.getElementById("file-info").addEventListener("click", showFileInfoListener);

//   document.getElementById("favourite-file").addEventListener("click", favouriteFileListener);

//   document.getElementById("rename-file").addEventListener("click", renameFileListener);

//   document.getElementById("delete-file").addEventListener("click", showDeleteConfirmListener);

//   document.addEventListener("click", hideContextMenuListener);
// }



// var hideContextMenu = (e, file) => {
//   const contextMenu = document.getElementById("context-menu");
//   if (!contextMenu.contains(e.target)) {

//     contextMenu.style.opacity = 0;
//     contextMenu.style.transform = "scale(0)";
//     setTimeout(function() {
//       contextMenu.classList.remove(file._id);
//       contextMenu.classList.add("hidden");
//     }, 300);

//     document.removeEventListener("click", hideContextMenuListener);
//     hideContextMenuListener = null;
//     document.getElementById("download-file").removeEventListener("click", downloadFileListener);
//     downloadFileListener = null;
//     document.getElementById("rename-file").removeEventListener("click", renameFileListener);
//     renameFileListener = null;
//   }
// };




// var showFileInfo = function showFileInfoListener(e, file) {
//   e.preventDefault();
//   if (hideFileInfoListener != null) {
//     document.removeEventListener("click", hideFileInfoListener);
//     hideFileInfoListener = null;
//   }
//   // Show the file info panel here, populate it with file info
//   const fileInfo = document.getElementById("file-info-modal");
//   const fileInfoItems = fileInfo.querySelectorAll(".file-info-item");
//   fileInfo.classList.remove("hidden");
//   fileInfo.classList.add(file._id);
//   setTimeout(() => {
//     fileInfo.style.opacity = 1;
//   }, 100);
//   fileInfoItems[0].innerHTML = file.fileName;
//   fileInfoItems[2].innerHTML = "Size: " + BytesToSize(file.fileSize);
//   if (file.isDirectory) {
//     fileInfoItems[3].innerHTML = "Type: Folder";
//   } else {
//     fileInfoItems[3].innerHTML = "Type: " + file.fileExt;
//   }
//   fileInfoItems[4].innerHTML = "Last Modified: " + ConvertDate(file.lastModified);
//   fileInfoItems[5].innerHTML = "Uploaded: " + ConvertDate(file.uploadDate);
//   fileInfoItems[6].innerHTML = "Favourite: " + file.isFavourited;

//   hideFileInfoListener = hideFileInfo.bind(null, e, file);
//   const closeInfo = document.getElementById("close-file-info");
//   closeInfo.addEventListener("click", hideFileInfoListener);
// };

// var hideFileInfo = (e, file) => {
//   const fileInfo = document.getElementById("file-info-modal");
//   fileInfo.style.opacity = 0;
//   setTimeout(function() {
//     fileInfo.classList.remove(file._id);
//     fileInfo.classList.add("hidden");
//   }, 250);
//   document.removeEventListener("click", hideFileInfoListener);
//   hideFileInfoListener = null;
// }



// Event Listeners
// document.getElementById("back-btn").addEventListener("click", async () => {
//   await getCurrentDir().then((currDir) => {
//     fetch("/basedir", {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: "Bearer " + localStorage.getItem("token"),
//       }
//     }).then((response) => response.text()).then((baseDir) => {
//       if (currDir === baseDir) {
//       } else {
//         const prevDir = GetPreviousDir(currDir)
//         init_grid(prevDir);
//       }
//     });
//   });
// });

// Global event listeners
// Used for keeping track of dynamically added event listeners
// let hideContextMenuListener;
// let downloadFileListener;
// let showFileInfoListener;
// let hideFileInfoListener;
// let renameFileListener;
// let showDeleteConfirmListener;
// let hideDeleteConfirmListener;
// let deleteFileListener;
// let favouriteFileListener;
// let hideUserPanelListener;
