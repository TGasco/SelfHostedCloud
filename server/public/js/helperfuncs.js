function regexMatch(pattern, str) {
  const regex = new RegExp(pattern);
  return regex.test(str);
}

export function ConvertDate(date) {
  date = new Date(date);

  // Check time elapsed since the date
  const timeElapsed = Date.now() - date.getTime();

  if (timeElapsed < 60_000) {
    return "Just now";
  } else if (timeElapsed < 3_600_000) {
    const minutes = Math.floor(timeElapsed / 60_000);
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  } else if (timeElapsed < 86_400_000) {
    const hours = Math.floor(timeElapsed / 3_600_000);
    return `${hours === 1 ? "1 hour ago" : `${hours} hours ago`} (${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})`;
  } else if (timeElapsed > 86_400_000 && timeElapsed < 172_800_000) {
    return `Yesterday at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (timeElapsed < 604_800_000 && timeElapsed > 2_419_200_000) {
    const days = Math.floor(timeElapsed / 86_400_000);
    return `${days === 1 ? "1 day ago" : `${days} days ago`} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }
}

export function ConvertTime(timeSecs) {
  // Converts a time in seconds to a human readable form
  let hours = Math.floor(timeSecs / 3600);
  let minutes = Math.floor((timeSecs - (hours * 3600)) / 60);
  let seconds = Math.floor(timeSecs - (hours * 3600) - (minutes * 60));

  if (hours < 10) {
    hours = `0${hours}`;
  }
  if (minutes < 10) {
    minutes = `0${minutes}`;
  }
  if (seconds < 10) {
    seconds = `0${seconds}`;
  }

  return `${hours}:${minutes}:${seconds}`;
}


export function BytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  if (bytes == 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Math.round(bytes / 1024 ** i, 2)} ${sizes[i]}`;
}

export function truncatePath(filePath, element) {
  const tempElement = element.cloneNode();
  tempElement.style.visibility = 'hidden';
  tempElement.style.position = 'absolute';
  document.body.appendChild(tempElement);

  tempElement.textContent = filePath;

  if (tempElement.clientWidth < tempElement.parentElement.clientWidth * 0.75) {
    document.body.removeChild(tempElement);
    return filePath;
  }

  const pathSegments = filePath.split("/");
  let truncatedPath = `/${pathSegments.pop()}`;

  while (pathSegments.length > 0) {
    const newPath = `/${pathSegments.pop()}${truncatedPath}`;
    tempElement.textContent = newPath;

    if (tempElement.clientWidth >= tempElement.parentElement.clientWidth * 0.75) {
      document.body.removeChild(tempElement);
      break;
    } else {
      truncatedPath = newPath;
    }
  }

  return truncatedPath;
}

/**
 * Redirect the user to the login page.
 */
export function redirectToLogin() {
  console.log("Uh oh, you can't view this content!");
  window.location.href = "/login";
}

export async function fetchWithAuth(url, options = {}) {
  options.credentials = 'include'; // Send cookies with the request

  const response = await fetch(url, options);

  if (response.status === 401) {
    const refreshResponse = await fetch('/token', {
      method: 'POST',
      credentials: 'include', // Send cookies with the request
    });
    if (refreshResponse.ok) {
      // Update the accessToken cookie manually if necessary
      // e.g., if your client is on a different domain than your server

      // Retry the original request with the new accessToken
      const retryResponse = await fetch(url, options);
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        return { success: true, data, status: retryResponse.status };
      } else {
        const errorText = await retryResponse.text();
        return { success: false, error: errorText, status: retryResponse.status };
      }
    } else {
      // Redirect to login or handle refresh token error
      throw new Error('Refresh token failed');
    }
  }

  if (response.ok) {
    // const data = await response.json();
    return response;
  } else {
    const errorText = await response.text();
    return { success: false, error: errorText, status: response.status };
  }
}

export async function fetchStreamedFile(fileId) {
  const response = await fetchWithAuth(`/user-files/${fileId}`, {
    method: 'GET',
    headers: {
      // Range: 'bytes=0-', // Request the entire file in a single range
    },
  });

  if (!response.ok && response.status !== 206) {
    throw new Error('Failed to fetch file');
  }

  const contentType = response.headers.get('Content-Type');
  const stream = response.body;
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const blob = new Blob(chunks, { type: contentType });
  const url = URL.createObjectURL(blob);

  const releaseURL = () => {
    URL.revokeObjectURL(url);
  };

  return { url, contentType, releaseURL };
}
