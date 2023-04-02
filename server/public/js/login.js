function submitForm(event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const errorMessage = document.getElementById("errorMessage");

    // Check if the username and password are correct
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "username": username,
        "password": password
      })
    })
    .then(res => {
      if (res.status === 200) {
        res.json().then(data => {
          // Save the token, e.g., in the local storage
          localStorage.setItem("token", data.token);
          // Redirect the user to the homepage
        });
      } else {
        console.log(res);
        errorMessage.innerText = "Incorrect username or password";
        errorMessage.classList.add('show');
        return;
      }
      redirectToHomepage();
    });
  }

  function redirectToHomepage() {
    fetch('/myDrive', {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    })
    .then(response => {
      if (response.status === 200) {
        // Redirect the user to the homepage
        window.location.href = "/";
        // window.location.href = "/myDrive";
      } else {
        // Handle error scenarios
        console.log("Error:", response.status, response.statusText);
      }
    });
  }

  function redirectToSignup() {
    window.location.href = "/signup";
  }


function signUp(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const basedir = document.getElementById("basedir").value;

  const errorMessage = document.getElementById("errorMessage");

  // Check if the username and password are correct
  fetch("/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "username": username,
      "password": password,
      "basedir": basedir
    })
  }).then(res => {
    if (res.status === 201) {
      // Use server to redirect the user to the homepage
      window.location.href = "/login";
    } else {
      console.log(res);
      errorMessage.innerText = "Incorrect username or password";
      errorMessage.classList.add('show');
    }
  });
}

  function highlightField(field) {
    field.style.borderColor = "#3f51b5";
  }

  function removeHighlight(field) {
    field.style.borderColor = "#ddd";
  }

  function pressButton(button) {
    button.style.transform = "translateY(2px)";
  }

  function releaseButton(button) {
    button.style.transform = "translateY(0)";
  }

document.getElementById("signup-link").addEventListener("click", redirectToSignup);
